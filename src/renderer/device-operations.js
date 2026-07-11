
async function handleKill() {
  const mountpoint = window.DeviceHelpers.getSelectedMountpoint();
  if (!mountpoint || mountpoint === 'no montado') {
    window.UIHelpers.appendLog('El dispositivo no está montado', 'error');
    window.UIHelpers.setStatus('No montado', 'error');
    return;
  }
  window.UIHelpers.setStatus('Liberando procesos...');
  window.UIHelpers.showProgress();
  window.UIHelpers.showCancelButton();
  try {
    const result = await window.usbAPI.killProcesses(mountpoint);
    window.UIHelpers.appendLog(result.output, result.success ? 'ok' : 'error');
    window.UIHelpers.setStatus(result.success ? 'Procesos liberados' : 'Error', result.success ? 'ok' : 'error');
  } catch (e) {
    window.UIHelpers.appendLog(`Error: ${e.message}`, 'error');
    window.UIHelpers.setStatus('Error', 'error');
  } finally {
    window.UIHelpers.hideProgress();
    window.UIHelpers.hideCancelButton();
  }
}

async function handleEject() {
  const partition = window.DeviceHelpers.getSelectedPartition();
  const mountpoint = window.DeviceHelpers.getSelectedMountpoint();
  if (!partition) {
    window.UIHelpers.appendLog('No hay partición seleccionada', 'error');
    window.UIHelpers.setStatus('Error', 'error');
    return;
  }
  window.UIHelpers.setStatus('Expulsando dispositivo...');
  window.UIHelpers.showProgress();
  window.UIHelpers.showCancelButton();
  try {
    const result = await window.usbAPI.ejectDevice(partition, mountpoint);
    window.UIHelpers.appendLog(result.output, result.success ? 'ok' : 'error');
    window.UIHelpers.setStatus(result.success ? 'Dispositivo expulsado' : 'Error', result.success ? 'ok' : 'error');
    if (result.success) {
      setTimeout(() => window.DeviceHelpers.loadDevices(true), 1000);
    }
  } catch (e) {
    window.UIHelpers.appendLog(`Error: ${e.message}`, 'error');
    window.UIHelpers.setStatus('Error', 'error');
  } finally {
    window.UIHelpers.hideProgress();
    window.UIHelpers.hideCancelButton();
  }
}

async function handleMount() {
  const partition = window.DeviceHelpers.getSelectedPartition();
  if (!partition) {
    window.UIHelpers.appendLog('No hay partición seleccionada', 'error');
    window.UIHelpers.setStatus('Error', 'error');
    return;
  }
  window.UIHelpers.setStatus('Montando dispositivo...');
  window.UIHelpers.showProgress();
  window.UIHelpers.showCancelButton();
  try {
    const result = await window.usbAPI.mountDevice(partition);
    window.UIHelpers.appendLog(result.output, result.success ? 'ok' : 'error');
    window.UIHelpers.setStatus(result.success ? 'Dispositivo montado' : 'Error', result.success ? 'ok' : 'error');
    if (result.success) {
      setTimeout(() => window.DeviceHelpers.loadDevices(true), 1000);
    }
  } catch (e) {
    window.UIHelpers.appendLog(`Error: ${e.message}`, 'error');
    window.UIHelpers.setStatus('Error', 'error');
  } finally {
    window.UIHelpers.hideProgress();
    window.UIHelpers.hideCancelButton();
  }
}

async function handleAnalyze() {
  const partition = window.DeviceHelpers.getSelectedPartition();
  const fsType = window.DeviceHelpers.getSelectedFsType();
  const mountpoint = window.DeviceHelpers.getSelectedMountpoint();
  if (!partition) {
    window.UIHelpers.appendLog('No hay partición seleccionada', 'error');
    window.UIHelpers.setStatus('Error', 'error');
    return;
  }
  window.UIHelpers.setStatus('Analizando dispositivo...');
  window.UIHelpers.showProgress();
  window.UIHelpers.showCancelButton();
  try {
    const result = await window.usbAPI.analyzeDevice(partition, fsType, mountpoint);
    window.UIHelpers.appendLog(result.output, result.success ? 'ok' : 'error');
    window.UIHelpers.setStatus(result.success ? 'Análisis completado' : 'Error', result.success ? 'ok' : 'error');
  } catch (e) {
    window.UIHelpers.appendLog(`Error: ${e.message}`, 'error');
    window.UIHelpers.setStatus('Error', 'error');
  } finally {
    window.UIHelpers.hideProgress();
    window.UIHelpers.hideCancelButton();
  }
}

async function handleRepair() {
  const partition = window.DeviceHelpers.getSelectedPartition();
  const fsType = window.DeviceHelpers.getSelectedFsType();
  if (!partition) {
    window.UIHelpers.appendLog('No hay partición seleccionada', 'error');
    window.UIHelpers.setStatus('Error', 'error');
    return;
  }
  window.UIHelpers.setStatus('Reparando dispositivo...');
  window.UIHelpers.showProgress();
  window.UIHelpers.showCancelButton();
  try {
    const result = await window.usbAPI.repairDevice(partition, fsType);
    window.UIHelpers.appendLog(result.output, result.success ? 'ok' : 'error');
    window.UIHelpers.setStatus(result.success ? 'Reparación completada' : 'Error', result.success ? 'ok' : 'error');
  } catch (e) {
    window.UIHelpers.appendLog(`Error: ${e.message}`, 'error');
    window.UIHelpers.setStatus('Error', 'error');
  } finally {
    window.UIHelpers.hideProgress();
    window.UIHelpers.hideCancelButton();
  }
}

async function handleFormat() {
  const partition = window.DeviceHelpers.getSelectedPartition();
  const fsType = document.getElementById('fsType').value;
  const label = document.getElementById('volumeLabel').value;
  const password = document.getElementById('sudoPassword').value;
  if (!partition) {
    window.UIHelpers.appendLog('No hay partición seleccionada', 'error');
    window.UIHelpers.setStatus('Error', 'error');
    return;
  }
  if (!password) {
    window.UIHelpers.appendLog('Se requiere contraseña de sudo', 'error');
    window.UIHelpers.setStatus('Falta contraseña', 'error');
    return;
  }
  window.UIHelpers.setStatus('Formateando dispositivo...');
  window.UIHelpers.showProgress();
  window.UIHelpers.showCancelButton();
  try {
    const result = await window.usbAPI.formatDevice(partition, fsType, label, password);
    window.UIHelpers.appendLog(result.output, result.success ? 'ok' : 'error');
    window.UIHelpers.setStatus(result.success ? 'Formateo completado' : 'Error', result.success ? 'ok' : 'error');
    if (result.success) {
      setTimeout(() => window.DeviceHelpers.loadDevices(true), 2000);
    }
  } catch (e) {
    window.UIHelpers.appendLog(`Error: ${e.message}`, 'error');
    window.UIHelpers.setStatus('Error', 'error');
  } finally {
    window.UIHelpers.hideProgress();
    window.UIHelpers.hideCancelButton();
  }
}

window.DeviceOperations = {
  handleKill,
  handleEject,
  handleMount,
  handleAnalyze,
  handleRepair,
  handleFormat
};
