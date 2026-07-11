
async function handleAnalyzeContent() {
  const mountpoint = window.DeviceHelpers.getSelectedMountpoint();
  if (!mountpoint || mountpoint === 'no montado') {
    window.UIHelpers.appendLog('El dispositivo no está montado', 'error');
    window.UIHelpers.setStatus('No montado', 'error');
    return;
  }
  window.UIHelpers.setStatus('Analizando contenido...');
  window.UIHelpers.showProgress();
  window.UIHelpers.showCancelButton();
  try {
    const result = await window.usbAPI.analyzeContent(mountpoint);
    
    if (result.success) {
      const stats = result.stats;
      document.getElementById('videoCount').textContent = stats.videos;
      document.getElementById('imageCount').textContent = stats.images;
      document.getElementById('audioCount').textContent = stats.audio;
      document.getElementById('documentCount').textContent = stats.documents;
      document.getElementById('otherCount').textContent = stats.other;
      document.getElementById('totalCount').textContent = stats.total;
      
      document.getElementById('advancedAnalysis').classList.remove('hidden');
      
      const contentStatsList = document.getElementById('contentStatsList');
      if (contentStatsList) {
        contentStatsList.classList.add('expanded');
        const header = document.querySelector('[data-target="contentStatsList"]');
        if (header) {
          const toggleBtn = header.querySelector('.toggle-btn');
          if (toggleBtn) toggleBtn.classList.remove('collapsed');
        }
      }
      
      window.UIHelpers.appendLog(`Análisis completado:\n- Videos: ${stats.videos}\n- Imágenes: ${stats.images}\n- Audios: ${stats.audio}\n- Documentos: ${stats.documents}\n- Otros: ${stats.other}\n- Total: ${stats.total}`, 'ok');
      window.UIHelpers.setStatus('Análisis completado', 'ok');
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
window.ContentAnalysis.handleAnalyzeContent = handleAnalyzeContent;
