const { ipcMain } = require('electron');
const { runShell, runShellWithPassword, runShellAsUser, runCommand } = require('./shell-commands');
const { listUsbDevices } = require('./device-manager');
const { getBaseDevice, listPartitions, createPartition, deletePartition, createSmartPartition } = require('./partition-manager');

ipcMain.handle('list-usb-devices', async () => {
  return await listUsbDevices();
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
      const df = await runShell(`df -h "${mountpoint}"`, 5000);
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
    const lower = (fsType || '').toLowerCase();
    
    if (lower.includes('iso9660')) {
      return { success: false, output: 'ISO9660 es un filesystem de solo lectura (CD/DVD/ISO). No se puede reparar.' };
    }
    
    const fuser = await runShell(`fuser -km /dev/${partition}`, 10000);
    const umount = await runShell(`umount /dev/${partition}`, 10000);
    
    let result;
    if (lower.includes('ntfs')) {
      result = await runShell(`ntfsfix /dev/${partition}`, 60000);
    } else if (lower.includes('exfat')) {
      result = await runShell(`fsck.exfat -y /dev/${partition}`, 60000);
    } else if (lower.includes('ext2') || lower.includes('ext3') || lower.includes('ext4')) {
      result = await runShell(`fsck -y /dev/${partition}`, 60000);
    } else {
      result = await runShell(`fsck -y /dev/${partition}`, 60000);
    }
    return { success: true, output: (result.stdout || '') + (result.stderr || '') };
  } catch (e) {
    return { success: false, output: (e.stdout || '') + (e.stderr || '') };
  }
});

ipcMain.handle('list-partitions', async (event, device) => {
  return await listPartitions(device);
});

ipcMain.handle('create-partition', async (event, device, tableType, start, end, password) => {
  return await createPartition(device, tableType, start, end, password);
});

ipcMain.handle('delete-partition', async (event, device, partitionNumber, password) => {
  return await deletePartition(device, partitionNumber, password);
});

ipcMain.handle('createSmartPartition', async (event, device, preset, password) => {
  return await createSmartPartition(device, preset, password);
});

ipcMain.handle('mount-device', async (event, partition) => {
  try {
    const devicePath = `/dev/${partition}`;
    
    const udisks = await runShellAsUser(`udisksctl mount -b ${devicePath}`, 10000);
    if (udisks.code === 0) {
      return { success: true, output: udisks.stdout || 'Montado con udisksctl' };
    }
    
    const mountPoint = `/media/${process.env.USER || 'pmint'}/${partition}`;
    const mkdir = await runShell(`mkdir -p ${mountPoint}`, 5000);
    if (mkdir.code !== 0) {
      return { success: false, output: `Error creando punto de montaje: ${mkdir.stderr}` };
    }
    const mount = await runShell(`mount ${devicePath} ${mountPoint}`, 10000);
    if (mount.code === 0) {
      return { success: true, output: `Montado en ${mountPoint}\n${mount.stdout || ''}` };
    }
    
    return { success: false, output: `udisksctl: ${udisks.stderr}\nmount: ${mount.stderr || mount.stdout}` };
  } catch (e) {
    return { success: false, output: (e.stdout || '') + (e.stderr || '') };
  }
});
