
async function handleDeletePath(path) {
  const password = document.getElementById('sudoPassword').value;
  if (!password) {
    window.UIHelpers.appendLog('Se requiere contraseña de sudo', 'error');
    window.UIHelpers.setStatus('Falta contraseña', 'error');
    return;
  }
  window.UIHelpers.setStatus('Eliminando...');
  window.UIHelpers.showProgress();
  window.UIHelpers.showCancelButton();
  try {
    const result = await window.usbAPI.deletePath(path, password);
    window.UIHelpers.appendLog(result.output, result.success ? 'ok' : 'error');
    window.UIHelpers.setStatus(result.success ? 'Eliminado' : 'Error', result.success ? 'ok' : 'error');
  } catch (e) {
    window.UIHelpers.appendLog(`Error: ${e.message}`, 'error');
    window.UIHelpers.setStatus('Error', 'error');
  } finally {
    window.UIHelpers.hideProgress();
    window.UIHelpers.hideCancelButton();
  }
}

async function handleOpenPath(path) {
  try {
    const result = await window.usbAPI.openPath(path);
    window.UIHelpers.appendLog(result.output, result.success ? 'ok' : 'error');
  } catch (e) {
    window.UIHelpers.appendLog(`Error: ${e.message}`, 'error');
  }
}

window.ContentAnalysis = window.ContentAnalysis || {};
window.ContentAnalysis.handleDeletePath = handleDeletePath;
window.ContentAnalysis.handleOpenPath = handleOpenPath;
