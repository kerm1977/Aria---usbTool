const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec, spawn } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    backgroundColor: '#0f0f1a',
    show: false
  });

  mainWindow.loadFile('index.html');
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

function parseSize(sizeStr) {
  if (!sizeStr) return 0;
  const match = String(sizeStr).trim().replace(',', '.').match(/^([0-9.]+)\s*([KMGT]?)$/i);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = (match[2] || '').toUpperCase();
  const multipliers = { '': 1, 'K': 1024, 'M': 1024 * 1024, 'G': 1024 * 1024 * 1024, 'T': 1024 * 1024 * 1024 * 1024 };
  return Math.floor(value * (multipliers[unit] || 1));
}

function runShell(cmd, timeoutMs = 30000) {
  return new Promise((resolve) => {
    exec(`sudo ${cmd}`, { maxBuffer: 1024 * 1024, timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        if (error.killed && error.signal === 'SIGTERM') {
          resolve({ code: 'TIMEOUT', stdout, stderr: (stderr || '') + '\n[Comando cancelado por timeout]' });
        } else {
          resolve({ code: error.code || 1, stdout, stderr: stderr || error.message });
        }
      } else {
        resolve({ code: 0, stdout, stderr });
      }
    });
  });
}

function runShellAsUser(cmd, timeoutMs = 30000) {
  return new Promise((resolve) => {
    exec(cmd, { maxBuffer: 1024 * 1024, timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        if (error.killed && error.signal === 'SIGTERM') {
          resolve({ code: 'TIMEOUT', stdout, stderr: (stderr || '') + '\n[Comando cancelado por timeout]' });
        } else {
          resolve({ code: error.code || 1, stdout, stderr: stderr || error.message });
        }
      } else {
        resolve({ code: 0, stdout, stderr });
      }
    });
  });
}

function getBaseDevice(partition) {
  return partition.replace(/p?\d+$/, '');
}

function parseLsusb(stdout) {
  const lines = stdout.trim().split('\n');
  const devices = [];
  for (const line of lines) {
    const match = line.match(/Bus (\d+) Device (\d+): ID ([0-9a-fA-F]{4}):([0-9a-fA-F]{4}) (.+)/);
    if (match) {
      devices.push({
        bus: match[1],
        device: match[2],
        vendorId: match[3],
        productId: match[4],
        description: match[5].trim()
      });
    }
  }
  return devices;
}

function runCommand(command, args = [], timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const child = spawn('sudo', [command, ...args]);
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      stderr += '\n[Comando cancelado por timeout]';
    }, timeoutMs);
    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0 || (command === 'fuser' && code === 1)) {
        resolve({ code, stdout, stderr });
      } else {
        reject({ code, stdout, stderr });
      }
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject({ code: -1, stdout: '', stderr: err.message });
    });
  });
}

ipcMain.handle('list-usb-devices', async () => {
  try {
    const lsblkResult = await runShell('lsblk -J -o NAME,SIZE,TYPE,MOUNTPOINT,MODEL,LABEL,FSTYPE,RM,STATE', 10000);
    const lsusbResult = await runShell('lsusb', 5000);
    
    if (lsblkResult.code !== 0) throw new Error(lsblkResult.stderr || 'Error listando dispositivos');
    
    const data = JSON.parse(lsblkResult.stdout);
    const usbHardware = parseLsusb(lsusbResult.stdout || '');
    
    const blockDevices = data.blockdevices.filter((d) => {
      const isRemovable = d.rm === true || d.rm === 1 || d.rm === '1';
      const hasUsbModel = d.model && d.model.toLowerCase().includes('usb');
      const realSize = parseSize(d.size) > 1024 * 1024;
      return (isRemovable || hasUsbModel) && realSize;
    });
    
    const usbDevices = blockDevices.map(d => ({
      ...d,
      type: 'block',
      usbInfo: usbHardware.find(h => 
        h.description.toLowerCase().includes((d.model || '').toLowerCase()) ||
        h.description.toLowerCase().includes('usb')
      ) || null
    }));
    
    const usbOnly = usbHardware.filter(h => 
      h.description.toLowerCase().includes('storage') ||
      h.description.toLowerCase().includes('flash') ||
      h.description.toLowerCase().includes('reader') ||
      h.description.toLowerCase().includes('mass')
    ).filter(h => !usbDevices.find(d => d.usbInfo && d.usbInfo.device === h.device));
    
    usbOnly.forEach(h => {
      usbDevices.push({
        type: 'hardware',
        name: `usb-${h.bus}-${h.device}`,
        size: 'N/A',
        model: h.description,
        mountpoint: null,
        label: null,
        fstype: null,
        rm: true,
        state: 'connected',
        usbInfo: h
      });
    });
    
    return { success: true, devices: usbDevices };
  } catch (e) {
    return { success: false, error: e.message || e.toString() };
  }
});

ipcMain.handle('kill-processes', async (event, mountpoint) => {
  try {
    const kill = await runCommand('fuser', ['-k', '-m', '-9', mountpoint], 10000);
    const unmount = await runCommand('umount', ['-l', mountpoint], 10000);
    return { success: true, output: (kill.stdout || '') + (kill.stderr || '') + (unmount.stdout || '') + (unmount.stderr || '') };
  } catch (e) {
    return { success: false, output: (e.stdout || '') + (e.stderr || '') };
  }
});

ipcMain.handle('eject-device', async (event, partition, mountpoint) => {
  try {
    const output = [];
    if (mountpoint && mountpoint !== 'no montado') {
      const kill = await runCommand('fuser', ['-k', '-m', '-9', mountpoint], 10000);
      const unmount = await runCommand('umount', ['-l', mountpoint], 10000);
      output.push(kill.stdout || '', kill.stderr || '', unmount.stdout || '', unmount.stderr || '');
    }

    const device = getBaseDevice(partition);
    const devicePath = `/dev/${device}`;

    const udisks = await runShellAsUser(`udisksctl power-off -b ${devicePath}`, 15000);
    if (udisks.code === 0) {
      output.push(udisks.stdout || '', udisks.stderr || '');
      return { success: true, output: output.join('\n') };
    }

    const eject = await runShell(`eject ${devicePath}`, 15000);
    output.push(eject.stdout || '', eject.stderr || '');
    if (eject.code === 0) {
      return { success: true, output: output.join('\n') };
    }

    return { success: false, output: output.join('\n') };
  } catch (e) {
    return { success: false, output: (e.stdout || '') + (e.stderr || '') };
  }
});

ipcMain.handle('analyze-device', async (event, partition, fsType, mountpoint) => {
  try {
    const lines = [];
    const blkid = await runShell(`blkid /dev/${partition}`, 30000);
    lines.push('--- blkid ---');
    lines.push(blkid.stdout || blkid.stderr || '(sin salida)');

    if (mountpoint && mountpoint !== 'no montado') {
      const df = await runShell(`df -h ${mountpoint}`, 5000);
      lines.push('--- df -h ---');
      lines.push(df.stdout || df.stderr || '(sin salida)');
    } else {
      lines.push('--- df -h ---');
      lines.push('Dispositivo no montado. No se puede mostrar uso de espacio.');
    }

    const lower = (fsType || '').toLowerCase();
    if (lower.includes('ntfs')) {
      const ntfs = await runShell(`ntfsfix -n /dev/${partition}`, 15000);
      lines.push('--- ntfsfix -n ---');
      lines.push(ntfs.stdout || ntfs.stderr || '(sin salida)');
    } else if (lower.includes('fat') || lower.includes('exfat') || lower.includes('ext')) {
      const fsck = await runShell(`fsck -n /dev/${partition}`, 15000);
      lines.push('--- fsck -n ---');
      lines.push(fsck.stdout || fsck.stderr || '(sin salida)');
    } else {
      lines.push('--- fsck -n ---');
      lines.push('Tipo de filesystem desconocido o no soportado para fsck automatico.');
    }

    let smart = await runShell(`smartctl -H /dev/${partition}`, 10000);
    if (smart.code !== 0 && (smart.stderr || smart.stdout).toLowerCase().includes('usb')) {
      const smartSat = await runShell(`smartctl -d sat -H /dev/${partition}`, 10000);
      if (smartSat.code === 0) smart = smartSat;
    }
    lines.push('--- smartctl -H ---');
    lines.push(smart.stdout || smart.stderr || '(smartctl no disponible)');

    return { success: true, output: lines.join('\n') };
  } catch (e) {
    return { success: false, output: e.message || e.toString() };
  }
});

ipcMain.handle('repair-device', async (event, partition, fsType) => {
  try {
    let result;
    const lower = (fsType || '').toLowerCase();
    if (lower.includes('ntfs')) {
      result = await runShell(`ntfsfix /dev/${partition}`, 60000);
    } else if (lower.includes('exfat')) {
      result = await runShell(`fsck.exfat -y /dev/${partition}`, 60000);
    } else {
      result = await runShell(`fsck -y /dev/${partition}`, 60000);
    }
    return { success: true, output: (result.stdout || '') + (result.stderr || '') };
  } catch (e) {
    return { success: false, output: (e.stdout || '') + (e.stderr || '') };
  }
});

ipcMain.handle('format-device', async (event, partition, fsType, label) => {
  try {
    const safeLabel = (label || 'USB').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 11);
    let cmd;
    if (fsType === 'fat32') {
      cmd = `mkfs.vfat -F 32 -n ${safeLabel} /dev/${partition}`;
    } else if (fsType === 'ntfs') {
      cmd = `mkfs.ntfs -f -L ${safeLabel} /dev/${partition}`;
    } else {
      return { success: false, output: 'Formato no soportado. Use fat32 o ntfs.' };
    }
    const result = await runShell(cmd, 60000);
    return { success: true, output: (result.stdout || '') + (result.stderr || '') };
  } catch (e) {
    return { success: false, output: (e.stdout || '') + (e.stderr || '') };
  }
});
