const { exec } = require('child_process');
const fs = require('fs');
const util = require('util');
const execPromise = util.promisify(exec);

async function getBlockDevices() {
  try {
    const { stdout } = await execPromise('lsblk -d -o NAME,SIZE,MODEL,TYPE,ROTA -n');
    const lines = stdout.trim().split('\n');
    const devices = [];
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const name = parts[0];
        const size = parts[1];
        const model = parts.slice(2, -2).join(' ') || 'Desconocido';
        const type = parts[parts.length - 2];
        const rota = parts[parts.length - 1];
        
        // Solo incluir discos (no particiones)
        if (type === 'disk') {
          devices.push({
            name,
            path: `/dev/${name}`,
            size,
            model,
            isRotational: rota === '1',
            isNVMe: name.startsWith('nvme')
          });
        }
      }
    }
    
    return devices;
  } catch (error) {
    console.error('Error getting block devices:', error);
    return [];
  }
}

async function getSmartInfo(devicePath) {
  try {
    // Intentar usar smartctl con formato JSON
    const { stdout } = await execPromise(`smartctl -a -j ${devicePath} 2>/dev/null || echo '{}'`);
    const smartData = JSON.parse(stdout);
    
    return {
      success: true,
      data: smartData
    };
  } catch (error) {
    // Si smartctl no está disponible o falla, intentar versión básica
    try {
      const { stdout } = await execPromise(`smartctl -H ${devicePath} 2>/dev/null || echo "SMART not available"`);
      return {
        success: true,
        basic: true,
        output: stdout
      };
    } catch (fallbackError) {
      return {
        success: false,
        error: fallbackError.message
      };
    }
  }
}

async function getSysBlockInfo(deviceName) {
  const sysPath = `/sys/class/block/${deviceName}`;
  const info = {};
  
  try {
    const sizePath = `${sysPath}/size`;
    if (fs.existsSync(sizePath)) {
      const size = fs.readFileSync(sizePath, 'utf8').trim();
      info.sectors = parseInt(size);
      info.sizeBytes = info.sectors * 512;
      info.sizeGB = (info.sizeBytes / (1024 * 1024 * 1024)).toFixed(2);
    }
    
    const modelPath = `${sysPath}/device/model`;
    if (fs.existsSync(modelPath)) {
      info.model = fs.readFileSync(modelPath, 'utf8').trim();
    }
    
    const vendorPath = `${sysPath}/device/vendor`;
    if (fs.existsSync(vendorPath)) {
      info.vendor = fs.readFileSync(vendorPath, 'utf8').trim();
    }
    
    const rotaPath = `${sysPath}/queue/rotational`;
    if (fs.existsSync(rotaPath)) {
      info.rotational = fs.readFileSync(rotaPath, 'utf8').trim() === '1';
    }
    
    const schedulerPath = `${sysPath}/queue/scheduler`;
    if (fs.existsSync(schedulerPath)) {
      const scheduler = fs.readFileSync(schedulerPath, 'utf8').trim();
      const match = scheduler.match(/\[([^\]]+)\]/);
      info.scheduler = match ? match[1] : scheduler;
    }
  } catch (error) {
    console.error('Error reading sys block info:', error);
  }
  
  return info;
}

async function scanDiscs() {
  try {
    const devices = await getBlockDevices();
    const results = [];
    
    for (const device of devices) {
      const sysInfo = await getSysBlockInfo(device.name);
      const smartInfo = await getSmartInfo(device.path);
      
      results.push({
        ...device,
        ...sysInfo,
        smart: smartInfo
      });
    }
    
    return {
      success: true,
      devices: results
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function scanDiscHealth(devicePath) {
  try {
    const smartInfo = await getSmartInfo(devicePath);
    
    if (!smartInfo.success) {
      return {
        success: false,
        error: smartInfo.error
      };
    }
    
    // Determinar estado de salud
    let health = 'Desconocido';
    let details = '';
    
    if (smartInfo.basic) {
      if (smartInfo.output.includes('PASSED')) {
        health = 'Bueno';
      } else if (smartInfo.output.includes('FAILED')) {
        health = 'Fallo';
      }
      details = smartInfo.output;
    } else {
      const data = smartInfo.data;
      if (data.smart_status && data.smart_status.passed === false) {
        health = 'Fallo';
      } else {
        health = 'Bueno';
      }
      
      if (data.temperature && data.temperature.current) {
        details += `Temperatura: ${data.temperature.current}°C `;
      }
      if (data.power_on_time && data.power_on_time.hours) {
        details += `Horas: ${data.power_on_time.hours}h `;
      }
    }
    
    return {
      success: true,
      health,
      details
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function deepRepairDisc(devicePath, password) {
  try {
    const commands = [];
    
    // Comando 1: Desmontar todas las particiones del disco
    commands.push(`echo "${password}" | sudo -S umount ${devicePath}* 2>/dev/null || true`);
    
    // Comando 2: Ejecutar fsck en todas las particiones
    commands.push(`echo "${password}" | sudo -S fsck -y ${devicePath}* 2>/dev/null || true`);
    
    // Comando 3: Para HDDs, ejecutar badblocks (escaneo de superficie)
    commands.push(`echo "${password}" | sudo -S badblocks -sv ${devicePath} 2>/dev/null || true`);
    
    // Comando 4: Ejecutar smartctl short self-test
    commands.push(`echo "${password}" | sudo -S smartctl -t short ${devicePath} 2>/dev/null || true`);
    
    let output = '';
    for (const cmd of commands) {
      try {
        const { stdout, stderr } = await execPromise(cmd);
        output += stdout + stderr + '\n';
      } catch (error) {
        output += error.message + '\n';
      }
    }
    
    return {
      success: true,
      output: output || 'Reparación profunda completada'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  scanDiscs,
  scanDiscHealth,
  deepRepairDisc
};
