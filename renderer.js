const deviceSelect = document.getElementById('deviceSelect');
const deviceInfo = document.getElementById('deviceInfo');
const refreshBtn = document.getElementById('refreshBtn');
const killBtn = document.getElementById('killBtn');
const ejectBtn = document.getElementById('ejectBtn');
const mountBtn = document.getElementById('mountBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const repairBtn = document.getElementById('repairBtn');
const formatBtn = document.getElementById('formatBtn');
const volumeLabel = document.getElementById('volumeLabel');
const sudoPassword = document.getElementById('sudoPassword');

// Convertir etiqueta a mayúsculas mientras el usuario escribe
volumeLabel.addEventListener('input', (e) => {
  e.target.value = e.target.value.toUpperCase();
});

let devices = [];
let selected = null;
let lastDeviceCount = 0;
let lastDeviceNames = '';
let autoRefreshInterval = null;

function getActivePanel() {
  return document.querySelector('.panel.active');
}

function getPanelElements() {
  const panel = getActivePanel();
  if (!panel) return null;
  return {
    log: panel.querySelector('.log-area'),
    statusText: panel.querySelector('.status-text'),
    cancelBtn: panel.querySelector('.cancel-btn'),
    copyLogsBtn: panel.querySelector('.copy-logs-btn'),
    progressContainer: panel.querySelector('.progress-container'),
    progressBar: panel.querySelector('.progress-bar'),
    progressText: panel.querySelector('.progress-text')
  };
}

function appendLog(text, type = 'info') {
  const elements = getPanelElements();
  if (!elements || !elements.log) return;
  const line = document.createElement('div');
  line.className = type;
  const timestamp = new Date().toLocaleTimeString();
  line.textContent = `[${timestamp}] ${text}`;
  elements.log.appendChild(line);
  elements.log.scrollTop = elements.log.scrollHeight;
}

function clearLog() {
  const elements = getPanelElements();
  if (!elements || !elements.log) return;
  elements.log.innerHTML = '';
}

function setStatus(text, type = 'info') {
  const elements = getPanelElements();
  if (!elements || !elements.statusText) return;
  elements.statusText.textContent = text;
  elements.statusText.style.color = type === 'error' ? '#e74c3c' : (type === 'ok' ? '#2ecc71' : '#f1c40f');
}

function showProgress() {
  const elements = getPanelElements();
  if (!elements || !elements.progressContainer) return;
  elements.progressContainer.classList.remove('hidden');
  elements.progressBar.style.width = '0%';
  elements.progressText.textContent = '0%';
}

function hideProgress() {
  const elements = getPanelElements();
  if (!elements || !elements.progressContainer) return;
  elements.progressContainer.classList.add('hidden');
}

function updateProgress(percent, text) {
  const elements = getPanelElements();
  if (!elements || !elements.progressBar) return;
  elements.progressBar.style.width = `${percent}%`;
  elements.progressText.textContent = text || `${percent}%`;
}

function showCancelButton() {
  const elements = getPanelElements();
  if (!elements || !elements.cancelBtn) return;
  elements.cancelBtn.classList.remove('hidden');
}

function hideCancelButton() {
  const elements = getPanelElements();
  if (!elements || !elements.cancelBtn) return;
  elements.cancelBtn.classList.add('hidden');
}

function getSelectedPartition() {
  if (!selected) return null;
  if (selected.type === 'hardware') return null;
  if (selected.children && selected.children.length > 0) {
    const part = selected.children.find(c => c.mountpoint && c.mountpoint.length > 0);
    return part ? part.name : selected.children[0].name;
  }
  return selected.name;
}

function getMountpoint(part) {
  if (!part || !part.mountpoint) return null;
  return Array.isArray(part.mountpoint) ? part.mountpoint[0] : part.mountpoint;
}

function getSelectedMountpoint() {
  if (!selected) return null;
  if (selected.type === 'hardware') return null;
  if (selected.children && selected.children.length > 0) {
    const part = selected.children.find(c => getMountpoint(c));
    return part ? getMountpoint(part) : null;
  }
  return getMountpoint(selected);
}

function getSelectedFsType() {
  if (!selected) return null;
  if (selected.type === 'hardware') return 'hardware';
  if (selected.children && selected.children.length > 0) {
    const part = selected.children.find(c => c.fstype);
    return part ? part.fstype : selected.fstype;
  }
  return selected.fstype;
}

async function loadDevices(forceRefresh = false) {
  try {
    const result = await window.usbAPI.listDevices();
    if (!result.success) {
      if (forceRefresh) {
        appendLog(`Error: ${result.error}`, 'error');
        setStatus('Error al listar', 'error');
      }
      return;
    }
    const newDevices = result.devices || [];
    const currentCount = newDevices.length;
    
    // Generar hash de nombres de dispositivos para comparar
    const currentNames = newDevices.map(d => `${d.name}-${d.model}-${d.size}`).join('|');
    
    // Detectar cambios en la cantidad o nombres de dispositivos (solo en auto-refresh)
    if (!forceRefresh && currentCount === lastDeviceCount && currentNames === lastDeviceNames) {
      return; // No hay cambios, no actualizar UI
    }
    
    lastDeviceCount = currentCount;
    lastDeviceNames = currentNames;
    devices = newDevices;
    
    setStatus('Cargando dispositivos...');
    deviceSelect.innerHTML = '<option value="">Cargando...</option>';
    deviceInfo.textContent = 'Ningún dispositivo detectado';
    
    deviceSelect.innerHTML = '';
    if (devices.length === 0) {
      deviceSelect.innerHTML = '<option value="">No se encontraron USB</option>';
      setStatus('No se encontraron USB');
      return;
    }
    devices.forEach((dev, index) => {
      const opt = document.createElement('option');
      opt.value = index;
      const typeLabel = dev.type === 'hardware' ? '[Solo hardware] ' : '';
      opt.textContent = `${typeLabel}${dev.model || dev.name} - ${dev.size}`;
      deviceSelect.appendChild(opt);
    });
    onDeviceChanged();
    setStatus('Listo', 'ok');
  } catch (e) {
    if (forceRefresh) {
      appendLog(`Error inesperado: ${e.message}`, 'error');
      setStatus('Error', 'error');
    }
  }
}

function startAutoRefresh() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  autoRefreshInterval = setInterval(() => {
    loadDevices(false); // Auto-refresh: solo actualizar si hay cambios
  }, 3000); // Verificar cada 3 segundos
}

function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}

function onDeviceChanged() {
  const idx = deviceSelect.value;
  selected = idx !== '' ? devices[idx] : null;
  if (selected) {
    if (selected.type === 'hardware') {
      const info = selected.usbInfo ? `Bus ${selected.usbInfo.bus} Device ${selected.usbInfo.device}` : 'USB desconocido';
      deviceInfo.textContent = `${info} | Hardware detectado | No montado`;
      appendLog(`Seleccionado: ${selected.model} (hardware only)`);
    } else {
      const part = selected.children && selected.children.length > 0 ? selected.children[0] : selected;
      const mount = getMountpoint(part) || 'no montado';
      const fstype = part.fstype || 'desconocido';
      deviceInfo.textContent = `/dev/${part.name} | ${fstype} | ${mount}`;
      appendLog(`Seleccionado: /dev/${part.name} (${fstype})`);
    }
  } else {
    deviceInfo.textContent = 'Ningún dispositivo detectado';
  }
}

deviceSelect.addEventListener('change', onDeviceChanged);
refreshBtn.addEventListener('click', () => {
  loadDevices(true); // Forzar recarga completa
});

function getSelectedFormat() {
  const radios = document.getElementsByName('fsType');
  for (const r of radios) {
    if (r.checked) return r.value;
  }
  return 'fat32';
}

killBtn.addEventListener('click', async () => {
  const mount = getSelectedMountpoint();
  if (!mount) {
    appendLog('La unidad no tiene un punto de montaje activo.', 'error');
    setStatus('Sin punto de montaje', 'error');
    return;
  }
  clearLog();
  appendLog(`Buscando procesos en ${mount}...`);
  setStatus('Liberando USB...');
  killBtn.disabled = true;
  try {
    const result = await window.usbAPI.killProcesses(mount);
    appendLog(result.output, result.success ? 'ok' : 'error');
    appendLog(result.success ? 'Unidad liberada correctamente.' : 'No se pudo liberar la unidad.', result.success ? 'ok' : 'error');
    setStatus(result.success ? 'USB liberado' : 'Error', result.success ? 'ok' : 'error');
    await loadDevices();
  } catch (e) {
    appendLog(`Error: ${e.message}`, 'error');
    setStatus('Error', 'error');
  } finally {
    killBtn.disabled = false;
  }
});

ejectBtn.addEventListener('click', async () => {
  const partition = getSelectedPartition();
  const mount = getSelectedMountpoint();
  if (!partition) {
    appendLog('Selecciona una unidad primero.', 'error');
    return;
  }
  clearLog();
  appendLog(`Expulsando /dev/${partition}...`);
  setStatus('Expulsando...');
  ejectBtn.disabled = true;
  try {
    const result = await window.usbAPI.ejectDevice(partition, mount);
    appendLog(result.output, result.success ? 'ok' : 'error');
    appendLog(result.success ? 'Unidad expulsada correctamente.' : 'No se pudo expulsar la unidad.', result.success ? 'ok' : 'error');
    setStatus(result.success ? 'USB expulsado' : 'Error', result.success ? 'ok' : 'error');
    await loadDevices();
  } catch (e) {
    appendLog(`Error: ${e.message}`, 'error');
    setStatus('Error', 'error');
  } finally {
    ejectBtn.disabled = false;
  }
});

mountBtn.addEventListener('click', async () => {
  const partition = getSelectedPartition();
  if (!partition) {
    appendLog('Selecciona una unidad primero.', 'error');
    return;
  }
  clearLog();
  appendLog(`Montando /dev/${partition}...`);
  setStatus('Montando...');
  mountBtn.disabled = true;
  try {
    const result = await window.usbAPI.mountDevice(partition);
    appendLog(result.output, result.success ? 'ok' : 'error');
    setStatus(result.success ? 'Montado' : 'Error', result.success ? 'ok' : 'error');
    await loadDevices();
  } catch (e) {
    appendLog(`Error: ${e.message}`, 'error');
    setStatus('Error', 'error');
  } finally {
    mountBtn.disabled = false;
  }
});

analyzeBtn.addEventListener('click', async () => {
  const partition = getSelectedPartition();
  const fsType = getSelectedFsType();
  const mountpoint = getSelectedMountpoint();
  if (!partition) {
    appendLog('Selecciona una unidad primero.', 'error');
    return;
  }
  clearLog();
  appendLog(`Analizando /dev/${partition} (tipo: ${fsType || 'desconocido'})...`);
  setStatus('Analizando...');
  analyzeBtn.disabled = true;
  showProgress();
  showCancelButton();
  
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += 10;
    if (progress > 90) progress = 90;
    updateProgress(progress, 'Analizando...');
  }, 500);
  
  try {
    const result = await window.usbAPI.analyzeDevice(partition, fsType, mountpoint);
    clearInterval(progressInterval);
    updateProgress(100, 'Completado');
    appendLog(result.output, result.success ? 'ok' : 'error');
    setStatus(result.success ? 'Análisis completo' : 'Error', result.success ? 'ok' : 'error');
    setTimeout(hideProgress, 500);
  } catch (e) {
    clearInterval(progressInterval);
    hideProgress();
    hideCancelButton();
    appendLog(`Error: ${e.message}`, 'error');
    setStatus('Error', 'error');
  } finally {
    analyzeBtn.disabled = false;
  }
});

repairBtn.addEventListener('click', async () => {
  const partition = getSelectedPartition();
  const fsType = getSelectedFsType();
  if (!partition) {
    appendLog('Selecciona una unidad primero.', 'error');
    return;
  }
  clearLog();
  appendLog(`Reparando /dev/${partition} (tipo: ${fsType || 'auto'})...`);
  setStatus('Reparando...');
  repairBtn.disabled = true;
  showProgress();
  showCancelButton();
  
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += 15;
    if (progress > 90) progress = 90;
    updateProgress(progress, 'Reparando...');
  }, 500);
  
  try {
    const result = await window.usbAPI.repairDevice(partition, fsType);
    clearInterval(progressInterval);
    updateProgress(100, 'Completado');
    appendLog(result.output, result.success ? 'ok' : 'error');
    setStatus(result.success ? 'Reparación finalizada' : 'Error', result.success ? 'ok' : 'error');
    await loadDevices();
    setTimeout(hideProgress, 500);
  } catch (e) {
    clearInterval(progressInterval);
    hideProgress();
    hideCancelButton();
    appendLog(`Error: ${e.message}`, 'error');
    setStatus('Error', 'error');
  } finally {
    repairBtn.disabled = false;
  }
});

formatBtn.addEventListener('click', async () => {
  const partition = getSelectedPartition();
  const fsType = getSelectedFormat();
  const label = volumeLabel.value.trim() || 'USB';
  const password = sudoPassword.value.trim();
  if (!partition) {
    appendLog('Selecciona una unidad primero.', 'error');
    return;
  }
  if (!password) {
    appendLog('Ingresa la contraseña sudo para formatear.', 'error');
    return;
  }
  const confirmText = `¿Seguro que deseas formatear /dev/${partition} como ${fsType.toUpperCase()}? Se perderán todos los datos.`;
  if (!confirm(confirmText)) {
    appendLog('Formateo cancelado por el usuario.', 'warn');
    return;
  }
  clearLog();
  appendLog(`Formateando /dev/${partition} como ${fsType.toUpperCase()} con etiqueta "${label}"...`);
  setStatus('Formateando...');
  formatBtn.disabled = true;
  showProgress();
  showCancelButton();
  
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += 20;
    if (progress > 90) progress = 90;
    updateProgress(progress, 'Formateando...');
  }, 500);
  
  try {
    const result = await window.usbAPI.formatDevice(partition, fsType, label, password);
    clearInterval(progressInterval);
    updateProgress(100, 'Completado');
    appendLog(result.output, result.success ? 'ok' : 'error');
    appendLog(result.success ? 'Formato completado.' : 'Error al formatear.', result.success ? 'ok' : 'error');
    setStatus(result.success ? 'Formateado' : 'Error', result.success ? 'ok' : 'error');
    await loadDevices();
    setTimeout(hideProgress, 500);
  } catch (e) {
    clearInterval(progressInterval);
    hideProgress();
    hideCancelButton();
    appendLog(`Error: ${e.message}`, 'error');
    setStatus('Error', 'error');
  } finally {
    formatBtn.disabled = false;
  }
});

// Copy logs to clipboard
document.addEventListener('click', async (e) => {
  if (e.target.classList.contains('copy-logs-btn')) {
    const elements = getPanelElements();
    if (!elements || !elements.log) return;
    const text = elements.log.innerText || '';
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Logs copiados', 'ok');
      appendLog('Logs copiados al portapapeles.', 'ok');
    } catch (err) {
      try {
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(elements.log);
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand('copy');
        selection.removeAllRanges();
        setStatus('Logs copiados', 'ok');
        appendLog('Logs copiados al portapapeles.', 'ok');
      } catch (err2) {
        setStatus('No se pudo copiar', 'error');
        appendLog('No se pudo copiar: ' + err2.message, 'error');
      }
    }
  }
});

// Cancel operations
document.addEventListener('click', async (e) => {
  if (e.target.classList.contains('cancel-btn')) {
    try {
      const result = await window.usbAPI.cancelOperations();
      appendLog(result.output, result.success ? 'warn' : 'error');
      setStatus('Operación cancelada', 'warn');
      hideProgress();
      hideCancelButton();
      analyzeBtn.disabled = false;
      repairBtn.disabled = false;
      formatBtn.disabled = false;
    } catch (err) {
      appendLog(`Error al cancelar: ${err.message}`, 'error');
      setStatus('Error', 'error');
    }
  }
});

// Navigation tabs
const navButtons = document.querySelectorAll('.nav-btn');
const panels = document.querySelectorAll('.panel');
navButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    navButtons.forEach((b) => b.classList.remove('active'));
    panels.forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.target).classList.add('active');
  });
});

// Initial load
loadDevices(true); // Forzar actualización en carga inicial
startAutoRefresh();
