const { runShell, runShellWithPassword } = require('./shell-commands');

async function formatDevice(partition, fsType, label, password) {
  try {
    const fuser = await runShellWithPassword(`fuser -km /dev/${partition}`, password, 10000);
    const umount = await runShellWithPassword(`umount -f /dev/${partition}`, password, 10000);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mountCheck = await runShell(`mount | grep /dev/${partition}`, 3000);
    if (mountCheck.code === 0) {
      return { success: false, output: `El dispositivo /dev/${partition} todavía está montado. Desmóntalo manualmente primero.\n${mountCheck.stdout}` };
    }
    
    const roCheck = await runShell(`blockdev --getro /dev/${partition}`, 3000);
    if (roCheck.stdout && roCheck.stdout.trim() === '1') {
      const baseDevice = partition.replace(/\d+$/, '');
      
      const sizeCheck = await runShell(`blockdev --getsize64 /dev/${baseDevice}`, 3000);
      if (sizeCheck.code !== 0 || !sizeCheck.stdout || parseInt(sizeCheck.stdout) === 0) {
        return { success: false, output: `No se detecta medio en /dev/${baseDevice}. Verifica que la tarjeta SD esté insertada correctamente en el lector.` };
      }
      
      const ddFull = await runShellWithPassword(`dd if=/dev/zero of=/dev/${baseDevice} bs=1M count=1 conv=fdatasync`, password, 15000);
      
      await runShellWithPassword(`blockdev --setrw /dev/${baseDevice}`, password, 5000);
      await runShellWithPassword(`hdparm -r0 /dev/${baseDevice}`, password, 5000);
      
      await runShellWithPassword(`parted /dev/${baseDevice} mklabel gpt`, password, 10000);
      await runShellWithPassword(`parted /dev/${baseDevice} mkpart primary 0% 100%`, password, 10000);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newPartition = `${baseDevice}1`;
      const safeLabel = (label || 'USB').replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase().slice(0, 11);
      let cmd;
      if (fsType === 'fat32') {
        cmd = `mkfs.vfat -F 32 -n ${safeLabel} /dev/${newPartition}`;
      } else if (fsType === 'exfat') {
        cmd = `mkfs.exfat -n ${safeLabel} /dev/${newPartition}`;
      } else if (fsType === 'ntfs') {
        cmd = `mkfs.ntfs -f -L ${safeLabel} /dev/${newPartition}`;
      } else if (fsType === 'ext2') {
        cmd = `mkfs.ext2 -L ${safeLabel} /dev/${newPartition}`;
      } else if (fsType === 'ext3') {
        cmd = `mkfs.ext3 -L ${safeLabel} /dev/${newPartition}`;
      } else if (fsType === 'ext4') {
        cmd = `mkfs.ext4 -L ${safeLabel} /dev/${newPartition}`;
      } else {
        return { success: false, output: 'Formato no soportado. Use fat32, exfat, ntfs, ext2, ext3 o ext4.' };
      }
      const result = await runShellWithPassword(cmd, password, 60000);
      return { success: true, output: `Creada partición /dev/${newPartition} y formateada\n` + (result.stdout || '') + (result.stderr || '') };
    }
    
    const wipefs = await runShellWithPassword(`wipefs -a /dev/${partition}`, password, 10000);
    const dd = await runShellWithPassword(`dd if=/dev/zero of=/dev/${partition} bs=1M count=1 conv=fdatasync`, password, 15000);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const blockdev = await runShellWithPassword(`blockdev --setrw /dev/${partition}`, password, 5000);
    const hdparm = await runShellWithPassword(`hdparm -r0 /dev/${partition}`, password, 5000);
    
    const safeLabel = (label || 'USB').replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase().slice(0, 11);
    let cmd;
    if (fsType === 'fat32') {
      cmd = `mkfs.vfat -F 32 -n ${safeLabel} /dev/${partition}`;
    } else if (fsType === 'exfat') {
      cmd = `mkfs.exfat -n ${safeLabel} /dev/${partition}`;
    } else if (fsType === 'ntfs') {
      cmd = `mkfs.ntfs -f -L ${safeLabel} /dev/${partition}`;
    } else if (fsType === 'ext2') {
      cmd = `mkfs.ext2 -L ${safeLabel} /dev/${partition}`;
    } else if (fsType === 'ext3') {
      cmd = `mkfs.ext3 -L ${safeLabel} /dev/${partition}`;
    } else if (fsType === 'ext4') {
      cmd = `mkfs.ext4 -L ${safeLabel} /dev/${partition}`;
    } else {
      return { success: false, output: 'Formato no soportado. Use fat32, exfat, ntfs, ext2, ext3 o ext4.' };
    }
    const result = await runShellWithPassword(cmd, password, 60000);
    return { success: true, output: (result.stdout || '') + (result.stderr || '') };
  } catch (e) {
    return { success: false, output: (e.stdout || '') + (e.stderr || '') };
  }
}

module.exports = {
  formatDevice
};
