
async function handleFindEmptyFolders() {
  const mountpoint = window.DeviceHelpers.getSelectedMountpoint();
  if (!mountpoint || mountpoint === 'no montado') {
    window.UIHelpers.appendLog('El dispositivo no está montado', 'error');
    window.UIHelpers.setStatus('No montado', 'error');
    return;
  }
  window.UIHelpers.setStatus('Buscando carpetas vacías...');
  window.UIHelpers.showProgress();
  window.UIHelpers.showCancelButton();
  try {
    const result = await window.usbAPI.findEmptyFolders(mountpoint);
    
    if (result.success) {
      const folders = result.folders || [];
      const emptyFoldersList = document.getElementById('emptyFoldersList');
      emptyFoldersList.innerHTML = '';
      
      if (folders.length === 0) {
        emptyFoldersList.innerHTML = '<p>No se encontraron carpetas vacías.</p>';
      } else {
        folders.forEach(folder => {
          const div = document.createElement('div');
          div.className = 'file-item';
          div.textContent = folder;
          emptyFoldersList.appendChild(div);
        });
      }
      
      document.getElementById('advancedAnalysis').classList.remove('hidden');
      window.UIHelpers.appendLog(`Encontradas ${folders.length} carpetas vacías`, 'ok');
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
window.ContentAnalysis.handleFindEmptyFolders = handleFindEmptyFolders;
