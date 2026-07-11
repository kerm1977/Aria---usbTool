const { ipcMain } = require('electron');
const { formatDevice } = require('./format-handler');
const { analyzeContent, findEmptyFolders, findDuplicateFiles, findLargeFiles } = require('./content-analysis-handler');
const { deletePath, openPath, getDiskSpace } = require('./file-operations-handler');
const { scanDiscs, scanDiscHealth, deepRepairDisc } = require('./disc-check-handler');

let activeProcesses = new Map();

ipcMain.handle('format-device', async (event, partition, fsType, label, password) => {
  return await formatDevice(partition, fsType, label, password);
});

ipcMain.handle('analyze-content', async (event, mountpoint) => {
  return await analyzeContent(mountpoint);
});

ipcMain.handle('find-empty-folders', async (event, mountpoint) => {
  return await findEmptyFolders(mountpoint);
});

ipcMain.handle('find-duplicate-files', async (event, mountpoint) => {
  return await findDuplicateFiles(mountpoint);
});

ipcMain.handle('find-large-files', async (event, mountpoint) => {
  return await findLargeFiles(mountpoint);
});

ipcMain.handle('delete-path', async (event, path, password) => {
  return await deletePath(path, password);
});

ipcMain.handle('open-path', async (event, path) => {
  return await openPath(path);
});

ipcMain.handle('get-disk-space', async (event, mountpoint) => {
  return await getDiskSpace(mountpoint);
});

ipcMain.handle('scan-discs', async () => {
  return await scanDiscs();
});

ipcMain.handle('scan-disc-health', async (event, devicePath) => {
  return await scanDiscHealth(devicePath);
});

ipcMain.handle('deep-repair-disc', async (event, devicePath, password) => {
  return await deepRepairDisc(devicePath, password);
});

ipcMain.handle('cancel-operations', async () => {
  try {
    let killed = 0;
    activeProcesses.forEach((proc, id) => {
      try {
        proc.kill('SIGTERM');
        killed++;
      } catch (e) {
        console.error(`Error killing process ${id}:`, e);
      }
    });
    activeProcesses.clear();
    return { success: true, output: `Canceladas ${killed} operaciones.` };
  } catch (e) {
    return { success: false, output: e.message || e.toString() };
  }
});
