
async function handleFindLargeFiles() {
  const mountpoint = window.DeviceHelpers.getSelectedMountpoint();
  if (!mountpoint || mountpoint === 'no montado') {
    window.UIHelpers.appendLog('El dispositivo no está montado', 'error');
    window.UIHelpers.setStatus('No montado', 'error');
    return;
  }
  window.UIHelpers.setStatus('Buscando archivos grandes...');
  window.UIHelpers.showProgress();
  window.UIHelpers.showCancelButton();
  try {
    const result = await window.usbAPI.findLargeFiles(mountpoint);
    
    if (result.success) {
      const files = result.files || [];
      const largeFilesList = document.getElementById('largeFilesList');
      largeFilesList.innerHTML = '';
      
      if (files.length === 0) {
        largeFilesList.innerHTML = '<p>No se encontraron archivos grandes.</p>';
      } else {
        files.forEach(file => {
          const div = document.createElement('div');
          div.className = 'file-item';
          div.textContent = `${file.size} - ${file.path}`;
          largeFilesList.appendChild(div);
        });
      }
      
      document.getElementById('advancedAnalysis').classList.remove('hidden');
      window.UIHelpers.appendLog(`Encontrados ${files.length} archivos grandes`, 'ok');
      window.UIHelpers.setStatus('Búsqueda completada', 'ok');
    } else {
      window.UIHelpers.appendLog(result.output, 'error');
      window.UIHelpers.setStatus('Error', 'error');
    }
  } catch (e) {
    window.UIHelpers.appendLog(`Error: ${e.message}`, 'error');
    window.UIHelpers.setStatus('Error', 'error');
  } finally {
    window.UIHelpers.hideProgress();
    window.UIHelpers.hideCancelButton();
  }
}

window.ContentAnalysis = window.ContentAnalysis || {};
window.ContentAnalysis.handleFindLargeFiles = handleFindLargeFiles;
