const deviceSelect = document.getElementById('deviceSelect');
const deviceInfo = document.getElementById('deviceInfo');
const refreshBtn = document.getElementById('refreshBtn');
const log = document.getElementById('log');
const statusText = document.getElementById('statusText');
const killBtn = document.getElementById('killBtn');
const ejectBtn = document.getElementById('ejectBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const repairBtn = document.getElementById('repairBtn');
const formatBtn = document.getElementById('formatBtn');
const volumeLabel = document.getElementById('volumeLabel');
const copyLogsBtn = document.getElementById('copyLogsBtn');

let devices = [];
let selected = null;

function appendLog(text, type = 'info') {
  const line = document.createElement('div');
  line.className = type;
  const timestamp = new Date().toLocaleTimeString();
  line.textContent = `[${timestamp}] ${text}`;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

function clearLog() {
  log.innerHTML = '';
}

function setStatus(text, type = 'info') {
  statusText.textContent = text;
  statusText.style.color = type === 'error' ? '#e74c3c' : (type === 'ok' ? '#2ecc71' : '#f1c40f');
}

function getSelectedPartition() {
  if (!selected) return null;
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
  if (selected.children && selected.children.length > 0) {
    const part = selected.children.find(c => getMountpoint(c));
    return part ? getMountpoint(part) : null;
  }
  return getMountpoint(selected);
}

function getSelectedFsType() {
  if (!selected) return null;
  if (selected.children && selected.children.length > 0) {
    const part = selected.children.find(c => c.fstype);
    return part ? part.fstype : selected.fstype;
  }
  return selected.fstype;
}

async function loadDevices() {
  setStatus('Cargando dispositivos...');
  deviceSelect.innerHTML = '<option value="">Cargando...</option>';
  deviceInfo.textContent = 'Ningún dispositivo detectado';
  try {
    const result = await window.usbAPI.listDevices();
    if (!result.success) {
      appendLog(`Error: ${result.error}`, 'error');
      setStatus('Error al listar', 'error');
      return;
    }
    devices = result.devices || [];
    deviceSelect.innerHTML = '';
    if (devices.length === 0) {
      deviceSelect.innerHTML = '<option value="">No se encontraron USB</option>';
      setStatus('No se encontraron USB');
      return;
    }
    devices.forEach((dev, index) => {
      const opt = document.createElement('option');
      opt.value = index;
      opt.textContent = `${dev.model || dev.name} - ${dev.size}`;
      deviceSelect.appendChild(opt);
    });
    onDeviceChanged();
    setStatus('Listo', 'ok');
  } catch (e) {
    appendLog(`Error inesperado: ${e.message}`, 'error');
    setStatus('Error', 'error');
  }
}

function onDeviceChanged() {
  const idx = deviceSelect.value;
  selected = idx !== '' ? devices[idx] : null;
  if (selected) {
    const part = selected.children && selected.children.length > 0 ? selected.children[0] : selected;
    const mount = getMountpoint(part) || 'no montado';
    const fstype = part.fstype || 'desconocido';
    deviceInfo.textContent = `/dev/${part.name} | ${fstype} | ${mount}`;
    appendLog(`Seleccionado: /dev/${part.name} (${fstype})`);
  } else {
    deviceInfo.textContent = 'Ningún dispositivo detectado';
  }
}

deviceSelect.addEventListener('change', onDeviceChanged);
refreshBtn.addEventListener('click', loadDevices);

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
  try {
    const result = await window.usbAPI.analyzeDevice(partition, fsType, mountpoint);
    appendLog(result.output, result.success ? 'ok' : 'error');
    setStatus(result.success ? 'Análisis completo' : 'Error', result.success ? 'ok' : 'error');
  } catch (e) {
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
  try {
    const result = await window.usbAPI.repairDevice(partition, fsType);
    appendLog(result.output, result.success ? 'ok' : 'error');
    setStatus(result.success ? 'Reparación finalizada' : 'Error', result.success ? 'ok' : 'error');
    await loadDevices();
  } catch (e) {
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
  if (!partition) {
    appendLog('Selecciona una unidad primero.', 'error');
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
  try {
    const result = await window.usbAPI.formatDevice(partition, fsType, label);
    appendLog(result.output, result.success ? 'ok' : 'error');
    appendLog(result.success ? 'Formato completado.' : 'Error al formatear.', result.success ? 'ok' : 'error');
    setStatus(result.success ? 'Formateado' : 'Error', result.success ? 'ok' : 'error');
    await loadDevices();
  } catch (e) {
    appendLog(`Error: ${e.message}`, 'error');
    setStatus('Error', 'error');
  } finally {
    formatBtn.disabled = false;
  }
});

// Copy logs to clipboard
copyLogsBtn.addEventListener('click', async () => {
  const text = log.innerText || '';
  try {
    await navigator.clipboard.writeText(text);
    setStatus('Logs copiados', 'ok');
    appendLog('Logs copiados al portapapeles.', 'ok');
  } catch (e) {
    try {
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(log);
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand('copy');
      selection.removeAllRanges();
      setStatus('Logs copiados', 'ok');
      appendLog('Logs copiados al portapapeles.', 'ok');
    } catch (err) {
      setStatus('No se pudo copiar', 'error');
      appendLog('No se pudo copiar: ' + err.message, 'error');
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
loadDevices();
