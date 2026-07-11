const { runShell, runShellWithPassword } = require('./shell-commands');

function getBaseDevice(partition) {
  return partition.replace(/p?\d+$/, '');
}

async function listPartitions(device) {
  try {
    const result = await runShell(`parted /dev/${device} print`, 10000);
    return { success: true, output: result.stdout || result.stderr || '' };
  } catch (e) {
    return { success: false, output: (e.stdout || '') + (e.stderr || '') };
  }
}

async function createPartition(device, tableType, start, end, password) {
  try {
    const umount = await runShellWithPassword(`umount /dev/${device}*`, password, 10000);
    const mklabel = await runShellWithPassword(`parted -s /dev/${device} mklabel ${tableType}`, password, 10000);
    const mkpart = await runShellWithPassword(`parted -s /dev/${device} mkpart primary ${start} ${end}`, password, 10000);
    return { success: true, output: (mklabel.stdout || '') + (mkpart.stdout || '') + (mklabel.stderr || '') + (mkpart.stderr || '') };
  } catch (e) {
    return { success: false, output: (e.stdout || '') + (e.stderr || '') };
  }
}

async function deletePartition(device, partitionNumber, password) {
  try {
    const umount = await runShellWithPassword(`umount /dev/${device}${partitionNumber}`, password, 10000);
    const rm = await runShellWithPassword(`parted -s /dev/${device} rm ${partitionNumber}`, password, 10000);
    return { success: true, output: (umount.stdout || '') + (rm.stdout || '') + (umount.stderr || '') + (rm.stderr || '') };
  } catch (e) {
    return { success: false, output: (e.stdout || '') + (e.stderr || '') };
  }
}

async function createSmartPartition(device, preset, password) {
  try {
    const output = [];
    const umount = await runShellWithPassword(`umount /dev/${device}*`, password, 10000);
    output.push(umount.stdout || '', umount.stderr || '');
    
    const mklabel = await runShellWithPassword(`parted -s /dev/${device} mklabel gpt`, password, 10000);
    output.push(mklabel.stdout || '', mklabel.stderr || '');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    let partitions = [];
    
    switch (preset) {
      case 'windows':
        partitions = [{ start: '0%', end: '100%', fs: 'ntfs', label: 'WINDOWS' }];
        break;
      case 'linux':
        partitions = [{ start: '0%', end: '100%', fs: 'ext4', label: 'LINUX' }];
        break;
      case 'multimedia':
        partitions = [{ start: '0%', end: '100%', fs: 'exfat', label: 'MEDIA' }];
        break;
      case 'dual':
        partitions = [
          { start: '0%', end: '50%', fs: 'ntfs', label: 'WINDOWS' },
          { start: '50%', end: '100%', fs: 'ext4', label: 'LINUX' }
        ];
        break;
      default:
        return { success: false, output: 'Preset no reconocido.' };
    }
    
    for (let i = 0; i < partitions.length; i++) {
      const part = partitions[i];
      const mkpart = await runShellWithPassword(`parted -s /dev/${device} mkpart primary ${part.start} ${part.end}`, password, 10000);
      output.push(mkpart.stdout || '', mkpart.stderr || '');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const partitionNum = i + 1;
      const partitionPath = `/dev/${device}${partitionNum}`;
      let formatCmd;
      
      switch (part.fs) {
        case 'ntfs':
          formatCmd = `mkfs.ntfs -f -L ${part.label} ${partitionPath}`;
          break;
        case 'ext4':
          formatCmd = `mkfs.ext4 -L ${part.label} ${partitionPath}`;
          break;
        case 'exfat':
          formatCmd = `mkfs.exfat -n ${part.label} ${partitionPath}`;
          break;
        default:
          formatCmd = `mkfs.ext4 -L ${part.label} ${partitionPath}`;
      }
      
      const format = await runShellWithPassword(formatCmd, password, 60000);
      output.push(`Formateando partición ${partitionNum} como ${part.fs}...`, format.stdout || '', format.stderr || '');
    }
    
    return { success: true, output: output.join('\n') };
  } catch (e) {
    return { success: false, output: (e.stdout || '') + (e.stderr || '') };
  }
}

module.exports = {
  getBaseDevice,
  listPartitions,
  createPartition,
  deletePartition,
  createSmartPartition
};
