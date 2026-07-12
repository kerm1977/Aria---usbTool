const { exec, spawn } = require('child_process');
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

async function deepRepairDisc(devicePath, password, event = null, forceBadblocks = false) {
  try {
    let output = '';
    let errors = [];
    
    // Paso 1: Validar contraseña de sudo
    if (event) {
      event.sender.send('repair-progress', { step: 1, total: 5, message: 'Validando contraseña de sudo' });
    }
    
    try {
      await runCommandWithPassword('echo "Password OK"', password, 5000);
      output += '--- Validando contraseña de sudo ---\nContraseña válida\n';
    } catch (error) {
      output += `--- Validando contraseña de sudo (error) ---\nContraseña incorrecta o sin permisos\n`;
      return {
        success: false,
        error: 'Contraseña de sudo incorrecta o sin permisos',
        output
      };
    }
    
    // Detectar si es disco Kingston/SSD
    let isKingstonSSD = false;
    let isSSD = false;
    try {
      const smartResult = await getSmartInfo(devicePath);
      if (smartResult.success && smartResult.data) {
        const model = (smartResult.data.model_name || smartResult.data.model || '').toLowerCase();
        const deviceModel = model;
        isKingstonSSD = deviceModel.includes('kingston');
        isSSD = !smartResult.data.rotation_rate || smartResult.data.rotation_rate === 0;
        
        if (isKingstonSSD) {
          output += `--- Detectado disco Kingston SSD ---\nModelo: ${deviceModel}\n`;
        } else if (isSSD) {
          output += `--- Detectado SSD ---\nModelo: ${deviceModel}\n`;
        }
      }
    } catch (error) {
      output += `--- Detección de tipo de disco (error) ---\n${error.message || ''}\n`;
    }
    
    // Si forceBadblocks es true, saltar directamente a badblocks
    if (forceBadblocks) {
      if (event) {
        event.sender.send('repair-progress', { step: 1, total: 1, message: 'Ejecutando badblocks forzado' });
      }
      
      try {
        output += '--- Iniciando badblocks (forzado) ---\nComando: badblocks -sv ' + devicePath + '\n';
        const result = await runCommandWithPassword(`badblocks -sv ${devicePath}`, password, 60 * 60 * 1000);
        output += '--- Escaneo badblocks completado ---\nCompletado sin errores\n';
        output += 'Salida: ' + (result.stdout || 'Sin salida') + '\n';
      } catch (error) {
        output += `--- Escaneo badblocks (error) ---\n`;
        output += `Código: ${error.code}\n`;
        output += `Mensaje: ${error.message || 'Sin mensaje'}\n`;
        output += `Stderr: ${error.stderr || 'Sin stderr'}\n`;
        output += `Stdout: ${error.stdout || 'Sin stdout'}\n`;
        errors.push({ step: 'Badblocks forzado', error: error.message || error.stderr || 'Error desconocido' });
      }
      
      return {
        success: true,
        output: output || 'Badblocks forzado completado',
        errors: errors.length > 0 ? errors : undefined
      };
    }
    
    // Paso 2: Obtener particiones del dispositivo
    if (event) {
      event.sender.send('repair-progress', { step: 2, total: 5, message: 'Buscando particiones' });
    }
    
    let partitions = [];
    try {
      const result = await runCommandWithPassword(`lsblk -ln -o NAME ${devicePath}`, password, 10000);
      const lines = result.stdout.trim().split('\n');
      partitions = lines.filter(line => line.trim() && !line.includes(devicePath.split('/').pop()));
      output += `--- Particiones encontradas ---\n${partitions.length > 0 ? partitions.join(', ') : 'Ninguna partición encontrada'}\n`;
    } catch (error) {
      output += `--- Buscando particiones (error) ---\n${error.message || error.stderr || ''}\n`;
    }
    
    // Paso 3: Desmontar particiones (si existen)
    if (event) {
      event.sender.send('repair-progress', { step: 3, total: 5, message: 'Desmontando particiones' });
    }
    
    if (partitions.length > 0) {
      for (const partition of partitions) {
        const partitionPath = `/dev/${partition.trim()}`;
        try {
          await runCommandWithPassword(`umount ${partitionPath}`, password, 30000);
          output += `--- Desmontando ${partitionPath} ---\nDesmontado exitosamente\n`;
        } catch (error) {
          if (error.code === 32) {
            output += `--- Desmontando ${partitionPath} ---\nNo estaba montado (OK)\n`;
          } else {
            output += `--- Desmontando ${partitionPath} (error) ---\n${error.message || error.stderr || ''}\n`;
            errors.push({ step: `Desmontando ${partitionPath}`, error: error.message || error.stderr || 'Error desconocido' });
          }
        }
      }
    } else {
      output += '--- Desmontando particiones ---\nNo hay particiones que desmontar\n';
    }
    
    // Paso 4: Ejecutar fsck en particiones (si existen)
    if (event) {
      event.sender.send('repair-progress', { step: 4, total: 5, message: 'Ejecutando fsck' });
    }
    
    if (partitions.length > 0) {
      for (const partition of partitions) {
        const partitionPath = `/dev/${partition.trim()}`;
        try {
          await runCommandWithPassword(`fsck -y ${partitionPath}`, password, 300000);
          output += `--- fsck en ${partitionPath} ---\nCompletado\n`;
        } catch (error) {
          output += `--- fsck en ${partitionPath} (error) ---\n${error.message || error.stderr || ''}\n`;
          errors.push({ step: `fsck en ${partitionPath}`, error: error.message || error.stderr || 'Error desconocido' });
        }
      }
    } else {
      output += '--- Ejecutando fsck ---\nNo hay particiones para verificar\n';
    }
    
    // Paso 5: Escaneo de badblocks (opcional, puede tardar mucho)
    // Para discos Kingston SSD, priorizar smartctl sobre badblocks
    if (isKingstonSSD) {
      if (event) {
        event.sender.send('repair-progress', { step: 5, total: 5, message: 'Análisis S.M.A.R.T. (Kingston SSD)' });
      }
      
      output += '--- Kingston SSD detectado ---\nPriorizando análisis S.M.A.R.T. sobre badblocks\n';
      
      try {
        const smartResult = await getSmartInfo(devicePath);
        if (smartResult.success) {
          output += '--- Análisis S.M.A.R.T. completado ---\n';
          if (smartResult.data) {
            output += `Modelo: ${smartResult.data.model_name || smartResult.data.model || 'Desconocido'}\n`;
            output += `Estado: ${smartResult.data.smart_status?.passed ? 'OK' : 'Fallo'}\n`;
            if (smartResult.data.temperature) {
              output += `Temperatura: ${smartResult.data.temperature.current}°C\n`;
            }
            if (smartResult.data.power_on_time) {
              output += `Horas encendido: ${smartResult.data.power_on_time.hours}h\n`;
            }
          }
        } else {
          output += '--- Análisis S.M.A.R.T. (error) ---\n' + (smartResult.error || 'Error desconocido') + '\n';
          errors.push({ step: 'Análisis S.M.A.R.T.', error: smartResult.error || 'Error desconocido' });
        }
      } catch (error) {
        output += `--- Análisis S.M.A.R.T. (error) ---\n${error.message || ''}\n`;
        errors.push({ step: 'Análisis S.M.A.R.T.', error: error.message || 'Error desconocido' });
      }
      
      output += '⚠️ badblocks omitido para Kingston SSD (recomendado para SSDs)\n';
    } else if (isSSD) {
      if (event) {
        event.sender.send('repair-progress', { step: 5, total: 5, message: 'Análisis S.M.A.R.T. (SSD)' });
      }
      
      output += '--- SSD detectado ---\nPriorizando análisis S.M.A.R.T. sobre badblocks\n';
      
      try {
        const smartResult = await getSmartInfo(devicePath);
        if (smartResult.success) {
          output += '--- Análisis S.M.A.R.T. completado ---\n';
          if (smartResult.data) {
            output += `Modelo: ${smartResult.data.model_name || smartResult.data.model || 'Desconocido'}\n`;
            output += `Estado: ${smartResult.data.smart_status?.passed ? 'OK' : 'Fallo'}\n`;
            if (smartResult.data.temperature) {
              output += `Temperatura: ${smartResult.data.temperature.current}°C\n`;
            }
            if (smartResult.data.power_on_time) {
              output += `Horas encendido: ${smartResult.data.power_on_time.hours}h\n`;
            }
          }
        } else {
          output += '--- Análisis S.M.A.R.T. (error) ---\n' + (smartResult.error || 'Error desconocido') + '\n';
          errors.push({ step: 'Análisis S.M.A.R.T.', error: smartResult.error || 'Error desconocido' });
        }
      } catch (error) {
        output += `--- Análisis S.M.A.R.T. (error) ---\n${error.message || ''}\n`;
        errors.push({ step: 'Análisis S.M.A.R.T.', error: error.message || 'Error desconocido' });
      }
      
      output += '⚠️ badblocks omitido para SSD (recomendado para SSDs)\n';
    } else {
      // Para HDDs tradicionales, ejecutar badblocks
      if (event) {
        event.sender.send('repair-progress', { step: 5, total: 5, message: 'Escaneando superficie (badblocks)' });
      }
      
      try {
        output += '--- Iniciando badblocks ---\nComando: badblocks -sv ' + devicePath + '\n';
        const result = await runCommandWithPassword(`badblocks -sv ${devicePath}`, password, 60 * 60 * 1000);
        output += '--- Escaneando superficie (badblocks) ---\nCompletado sin errores\n';
        output += 'Salida: ' + (result.stdout || 'Sin salida') + '\n';
      } catch (error) {
        output += `--- Escaneando superficie (badblocks) (error) ---\n`;
        output += `Código: ${error.code}\n`;
        output += `Mensaje: ${error.message || 'Sin mensaje'}\n`;
        output += `Stderr: ${error.stderr || 'Sin stderr'}\n`;
        output += `Stdout: ${error.stdout || 'Sin stdout'}\n`;
        errors.push({ step: 'Escaneando superficie (badblocks)', error: error.message || error.stderr || 'Error desconocido' });
      }
    }
    
    return {
      success: true,
      output: output || 'Reparación profunda completada',
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function runCommandWithPassword(cmd, password, timeoutMs = 30 * 60 * 1000) {
  return new Promise((resolve, reject) => {
    const args = cmd.split(' ');
    const child = spawn('sudo', ['-S', ...args]);
    
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      reject({ stdout, stderr, code: 'TIMEOUT', message: `Comando cancelado por timeout después de ${timeoutMs/1000} segundos` });
    }, timeoutMs);
    
    child.stdin.write(password + '\n');
    child.stdin.end();
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (!timedOut) {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject({ stdout, stderr, code, message: `Comando falló con código ${code}` });
        }
      }
    });
    
    child.on('error', (err) => {
      clearTimeout(timeout);
      if (!timedOut) {
        reject({ stdout, stderr: err.message, code: 'ERROR' });
      }
    });
  });
}

module.exports = {
  scanDiscs,
  scanDiscHealth,
  deepRepairDisc
};
