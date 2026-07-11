const { runShell, runShellWithPassword } = require('./shell-commands');
const { shell } = require('electron');

async function deletePath(path, password) {
  try {
    const cmd = `rm -rf "${path}"`;
    const result = await runShellWithPassword(cmd, password, 30000);
    
    if (result.code !== 0) {
      return { success: false, output: result.stderr || 'Error eliminando' };
    }

    return { success: true, output: `Eliminado: ${path}` };
  } catch (e) {
    return { success: false, output: (e.stdout || '') + (e.stderr || '') };
  }
}

async function openPath(path) {
  try {
    await shell.openPath(path);
    return { success: true, output: `Abierto: ${path}` };
  } catch (e) {
    return { success: false, output: e.message || 'Error abriendo ruta' };
  }
}

async function getDiskSpace(mountpoint) {
  try {
    if (!mountpoint || mountpoint === 'no montado' || mountpoint === null) {
      return { success: false, output: 'El dispositivo no está montado.' };
    }

    const cmd = `df -h "${mountpoint}" 2>/dev/null | tail -n 1`;
    const result = await runShell(cmd, 10000);
    
    if (result.code !== 0) {
      return { success: false, output: result.stderr || 'Error obteniendo espacio' };
    }

    const parts = result.stdout.trim().split(/\s+/);
    if (parts.length >= 4) {
      const total = parts[1];
      const used = parts[2];
      const available = parts[3];
      const usedPercent = parseInt(parts[4]) || 0;
      
      return { 
        success: true, 
        total, 
        used, 
        available, 
        usedPercent 
      };
    }

    return { success: false, output: 'Formato de salida no reconocido' };
  } catch (e) {
    return { success: false, output: (e.stdout || '') + (e.stderr || '') };
  }
}

module.exports = {
  deletePath,
  openPath,
  getDiskSpace
};
