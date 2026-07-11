const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('usbAPI', {
  listDevices: () => ipcRenderer.invoke('list-usb-devices'),
  killProcesses: (mountpoint) => ipcRenderer.invoke('kill-processes', mountpoint),
  ejectDevice: (partition, mountpoint) => ipcRenderer.invoke('eject-device', partition, mountpoint),
  mountDevice: (partition) => ipcRenderer.invoke('mount-device', partition),
  analyzeDevice: (partition, fsType, mountpoint) => ipcRenderer.invoke('analyze-device', partition, fsType, mountpoint),
  repairDevice: (partition, fsType) => ipcRenderer.invoke('repair-device', partition, fsType),
  formatDevice: (partition, fsType, label, password) => ipcRenderer.invoke('format-device', partition, fsType, label, password),
  cancelOperations: () => ipcRenderer.invoke('cancel-operations'),
  listPartitions: (device) => ipcRenderer.invoke('list-partitions', device),
  createPartition: (device, tableType, start, end, password) => ipcRenderer.invoke('create-partition', device, tableType, start, end, password),
  deletePartition: (device, partitionNumber, password) => ipcRenderer.invoke('delete-partition', device, partitionNumber, password),
  createSmartPartition: (device, preset, password) => ipcRenderer.invoke('createSmartPartition', device, preset, password),
  analyzeContent: (mountpoint) => ipcRenderer.invoke('analyze-content', mountpoint)
});
