
async function handleFindDuplicates() {
  const mountpoint = window.DeviceHelpers.getSelectedMountpoint();
  if (!mountpoint || mountpoint === 'no montado') {
    window.UIHelpers.appendLog('El dispositivo no está montado', 'error');
    window.UIHelpers.setStatus('No montado', 'error');
    return;
  }
  window.UIHelpers.setStatus('Buscando archivos duplicados...');
  window.UIHelpers.showProgress();
  window.UIHelpers.showCancelButton();
  try {
    const result = await window.usbAPI.findDuplicateFiles(mountpoint);
    
    if (result.success) {
      const duplicates = result.duplicates || [];
      const duplicatesList = document.getElementById('duplicatesList');
      duplicatesList.innerHTML = '';
      
      if (duplicates.length === 0) {
        duplicatesList.innerHTML = '<p>No se encontraron archivos duplicados.</p>';
      } else {
        duplicates.forEach(dup => {
          const div = document.createElement('div');
          div.className = 'file-item';
          div.textContent = dup;
          duplicatesList.appendChild(div);
        });
      }
      
      document.getElementById('advancedAnalysis').classList.remove('hidden');
      window.UIHelpers.appendLog(`Encontrados ${duplicates.length} archivos duplicados`, 'ok');
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
window.ContentAnalysis.handleFindDuplicates = handleFindDuplicates;
