let devices = [];
let selected = null;
let lastDeviceCount = 0;
let lastDeviceNames = '';
let autoRefreshInterval = null;

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
        window.UIHelpers.appendLog(`Error: ${result.error}`, 'error');
        window.UIHelpers.setStatus('Error al listar', 'error');
      }
      return;
    }
    const newDevices = result.devices || [];
    const currentCount = newDevices.length;
    
    const currentNames = newDevices.map(d => `${d.name}-${d.model}-${d.size}`).join('|');
    
    if (!forceRefresh && currentCount === lastDeviceCount && currentNames === lastDeviceNames) {
      return;
    }
    
    lastDeviceCount = currentCount;
    lastDeviceNames = currentNames;
    devices = newDevices;
    
    window.UIHelpers.setStatus('Cargando dispositivos...');
    deviceSelect.innerHTML = '<option value="">Cargando...</option>';
    deviceInfo.textContent = 'Ningún dispositivo detectado';
    
    deviceSelect.innerHTML = '';
    if (devices.length === 0) {
      deviceSelect.innerHTML = '<option value="">No se encontraron USB</option>';
      window.UIHelpers.setStatus('No se encontraron USB');
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
    window.UIHelpers.setStatus('Listo', 'ok');
  } catch (e) {
    if (forceRefresh) {
      window.UIHelpers.appendLog(`Error inesperado: ${e.message}`, 'error');
      window.UIHelpers.setStatus('Error', 'error');
    }
  }
}

function onDeviceChanged() {
  const idx = deviceSelect.value;
  selected = idx !== '' ? devices[idx] : null;
  if (selected) {
    if (selected.type === 'hardware') {
      const info = selected.usbInfo ? `Bus ${selected.usbInfo.bus} Device ${selected.usbInfo.device}` : 'USB desconocido';
      deviceInfo.textContent = `${info} | Hardware detectado | No montado`;
      window.UIHelpers.appendLog(`Seleccionado: ${selected.model} (hardware only)`);
    } else {
      const part = selected.children && selected.children.length > 0 ? selected.children[0] : selected;
      const mount = getMountpoint(part) || 'no montado';
      const fstype = part.fstype || 'desconocido';
      deviceInfo.textContent = `/dev/${part.name} | ${fstype} | ${mount}`;
      window.UIHelpers.appendLog(`Seleccionado: /dev/${part.name} (${fstype})`);
    }
    updateSpaceBar(selected);
  } else {
    deviceInfo.textContent = 'Ningún dispositivo detectado';
    document.getElementById('spaceBarContainer').classList.add('hidden');
  }
}

async function updateSpaceBar(device) {
  const spaceBarContainer = document.getElementById('spaceBarContainer');
  const spaceUsed = document.getElementById('spaceUsed');
  const spaceTotal = document.getElementById('spaceTotal');
  const spaceFree = document.getElementById('spaceFree');
  const spaceBarFill = document.getElementById('spaceBarFill');
  
  if (!device || device.type === 'hardware') {
    spaceBarContainer.classList.add('hidden');
    return;
  }
  
  try {
    const part = device.children && device.children.length > 0 ? device.children[0] : device;
    const mountpoint = getMountpoint(part);
    
    if (!mountpoint || mountpoint === 'no montado' || mountpoint === null) {
      spaceBarContainer.classList.add('hidden');
      return;
    }
    
    const result = await window.usbAPI.getDiskSpace(mountpoint);
    
    if (result.success) {
      spaceBarContainer.classList.remove('hidden');
      spaceUsed.textContent = result.used;
      spaceTotal.textContent = result.total;
      spaceFree.textContent = `(${result.available} libre)`;
      spaceBarFill.style.width = `${result.usedPercent}%`;
      
      if (result.usedPercent > 90) {
        spaceBarFill.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
      } else if (result.usedPercent > 70) {
        spaceBarFill.style.background = 'linear-gradient(90deg, #f39c12, #e67e22)';
      } else {
        spaceBarFill.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)';
      }
    } else {
      spaceBarContainer.classList.add('hidden');
    }
  } catch (err) {
    console.error('Error getting disk space:', err);
    spaceBarContainer.classList.add('hidden');
  }
}

function startAutoRefresh() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  autoRefreshInterval = setInterval(() => {
    loadDevices(false);
  }, 3000);
}

function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}

window.DeviceHelpers = {
  devices,
  selected,
  getSelectedPartition,
  getMountpoint,
  getSelectedMountpoint,
  getSelectedFsType,
  loadDevices,
  onDeviceChanged,
  updateSpaceBar,
  startAutoRefresh,
  stopAutoRefresh
};
