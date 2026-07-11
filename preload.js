const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('usbAPI', {
  listDevices: () => ipcRenderer.invoke('list-usb-devices'),
  killProcesses: (mountpoint) => ipcRenderer.invoke('kill-processes', mountpoint),
  ejectDevice: (partition, mountpoint) => ipcRenderer.invoke('eject-device', partition, mountpoint),
  analyzeDevice: (partition, fsType, mountpoint) => ipcRenderer.invoke('analyze-device', partition, fsType, mountpoint),
  repairDevice: (partition, fsType) => ipcRenderer.invoke('repair-device', partition, fsType),
  formatDevice: (partition, fsType, label) => ipcRenderer.invoke('format-device', partition, fsType, label),
  cancelOperations: () => ipcRenderer.invoke('cancel-operations')
});
