
async function handleListPartitions() {
  const device = document.getElementById('partitionDevice').value;
  if (!device) {
    window.UIHelpers.appendLog('No se especificó dispositivo', 'error');
    window.UIHelpers.setStatus('Error', 'error');
    return;
  }
  window.UIHelpers.setStatus('Listando particiones...');
  window.UIHelpers.showProgress();
  window.UIHelpers.showCancelButton();
  try {
    const result = await window.usbAPI.listPartitions(device);
    window.UIHelpers.appendLog(result.output, result.success ? 'ok' : 'error');
    window.UIHelpers.setStatus(result.success ? 'Listado completado' : 'Error', result.success ? 'ok' : 'error');
  } catch (e) {
    window.UIHelpers.appendLog(`Error: ${e.message}`, 'error');
    window.UIHelpers.setStatus('Error', 'error');
  } finally {
    window.UIHelpers.hideProgress();
    window.UIHelpers.hideCancelButton();
  }
}

async function handleCreatePartition() {
  const device = document.getElementById('partitionDevice').value;
  const tableType = document.getElementById('tableType').value;
  const start = document.getElementById('partitionStart').value;
  const end = document.getElementById('partitionEnd').value;
  const password = document.getElementById('sudoPassword').value;
  if (!device || !start || !end) {
    window.UIHelpers.appendLog('Faltan parámetros', 'error');
    window.UIHelpers.setStatus('Error', 'error');
    return;
  }
  if (!password) {
    window.UIHelpers.appendLog('Se requiere contraseña de sudo', 'error');
    window.UIHelpers.setStatus('Falta contraseña', 'error');
    return;
  }
  window.UIHelpers.setStatus('Creando partición...');
  window.UIHelpers.showProgress();
  window.UIHelpers.showCancelButton();
  try {
    const result = await window.usbAPI.createPartition(device, tableType, start, end, password);
    window.UIHelpers.appendLog(result.output, result.success ? 'ok' : 'error');
    window.UIHelpers.setStatus(result.success ? 'Partición creada' : 'Error', result.success ? 'ok' : 'error');
  } catch (e) {
    window.UIHelpers.appendLog(`Error: ${e.message}`, 'error');
    window.UIHelpers.setStatus('Error', 'error');
  } finally {
    window.UIHelpers.hideProgress();
    window.UIHelpers.hideCancelButton();
  }
}

async function handleDeletePartition() {
  const device = document.getElementById('partitionDevice').value;
  const partitionNumber = document.getElementById('partitionNumber').value;
  const password = document.getElementById('sudoPassword').value;
  if (!device || !partitionNumber) {
    window.UIHelpers.appendLog('Faltan parámetros', 'error');
    window.UIHelpers.setStatus('Error', 'error');
    return;
  }
  if (!password) {
    window.UIHelpers.appendLog('Se requiere contraseña de sudo', 'error');
    window.UIHelpers.setStatus('Falta contraseña', 'error');
    return;
  }
  window.UIHelpers.setStatus('Eliminando partición...');
  window.UIHelpers.showProgress();
  window.UIHelpers.showCancelButton();
  try {
    const result = await window.usbAPI.deletePartition(device, partitionNumber, password);
    window.UIHelpers.appendLog(result.output, result.success ? 'ok' : 'error');
    window.UIHelpers.setStatus(result.success ? 'Partición eliminada' : 'Error', result.success ? 'ok' : 'error');
  } catch (e) {
    window.UIHelpers.appendLog(`Error: ${e.message}`, 'error');
    window.UIHelpers.setStatus('Error', 'error');
  } finally {
    window.UIHelpers.hideProgress();
    window.UIHelpers.hideCancelButton();
  }
}

async function handleSmartPartition() {
  const device = document.getElementById('partitionDevice').value;
  const preset = document.getElementById('partitionPreset').value;
  const password = document.getElementById('sudoPassword').value;
  if (!device || !preset) {
    window.UIHelpers.appendLog('Faltan parámetros', 'error');
    window.UIHelpers.setStatus('Error', 'error');
    return;
  }
  if (!password) {
    window.UIHelpers.appendLog('Se requiere contraseña de sudo', 'error');
    window.UIHelpers.setStatus('Falta contraseña', 'error');
    return;
  }
  window.UIHelpers.setStatus('Creando particiones inteligentes...');
  window.UIHelpers.showProgress();
  window.UIHelpers.showCancelButton();
  try {
    const result = await window.usbAPI.createSmartPartition(device, preset, password);
    window.UIHelpers.appendLog(result.output, result.success ? 'ok' : 'error');
    window.UIHelpers.setStatus(result.success ? 'Particiones creadas' : 'Error', result.success ? 'ok' : 'error');
  } catch (e) {
    window.UIHelpers.appendLog(`Error: ${e.message}`, 'error');
    window.UIHelpers.setStatus('Error', 'error');
  } finally {
    window.UIHelpers.hideProgress();
    window.UIHelpers.hideCancelButton();
  }
}

window.PartitionOperations = {
  handleListPartitions,
  handleCreatePartition,
  handleDeletePartition,
  handleSmartPartition
};
