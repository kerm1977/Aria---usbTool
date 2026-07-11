
// Configurar listener para cambios de discos en tiempo real
window.usbAPI.onDiscsChanged((data) => {
  if (data.added.length > 0) {
    window.UIHelpers.appendLog(`Discos conectados: ${data.added.join(', ')}`, 'ok');
  }
  if (data.removed.length > 0) {
    window.UIHelpers.appendLog(`Discos desconectados: ${data.removed.join(', ')}`, 'warn');
  }
  
  // Si estamos en el panel de discos, actualizar automáticamente
  const discosList = document.getElementById('discosList');
  if (discosList && discosList.children.length > 0) {
    window.UIHelpers.appendLog('Actualizando lista de discos...', 'info');
    handleScanDiscs();
  }
});

async function handleScanDiscs() {
  window.UIHelpers.setStatus('Escaneando discos...');
  window.UIHelpers.showProgress();
  window.UIHelpers.showCancelButton();
  
  try {
    const result = await window.usbAPI.scanDiscs();
    
    if (!result.success) {
      window.UIHelpers.appendLog(`Error: ${result.error}`, 'error');
      window.UIHelpers.setStatus('Error al escanear', 'error');
      return;
    }
    
    const discosList = document.getElementById('discosList');
    discosList.innerHTML = '';
    
    if (result.devices.length === 0) {
      discosList.innerHTML = '<p>No se encontraron discos.</p>';
      window.UIHelpers.appendLog('No se encontraron discos', 'warn');
      window.UIHelpers.setStatus('Sin discos', 'warn');
      return;
    }
    
    window.UIHelpers.appendLog(`Encontrados ${result.devices.length} discos`, 'ok');
    
    result.devices.forEach(device => {
      const discCard = document.createElement('div');
      discCard.className = 'disc-card';
      discCard.dataset.devicePath = device.path;
      
      const healthStatus = getHealthStatus(device.smart);
      const healthClass = healthStatus.class;
      
      discCard.innerHTML = `
        <div class="disc-header">
          <h4>${device.model || device.name}</h4>
          <div class="disc-header-info">
            <span class="disc-size">${device.size || device.sizeGB + ' GB'}</span>
            <span class="disc-health-status ${healthClass}" id="health-${device.path.replace(/\//g, '-')}">${healthStatus.text}</span>
          </div>
        </div>
        <div class="disc-info">
          <div class="disc-info-row">
            <span class="label">Dispositivo:</span>
            <span class="value">${device.path}</span>
          </div>
          <div class="disc-info-row">
            <span class="label">Tipo:</span>
            <span class="value">${device.isNVMe ? 'NVMe SSD' : (device.isRotational ? 'HDD' : 'SSD')}</span>
          </div>
          <div class="disc-info-row">
            <span class="label">Salud S.M.A.R.T.:</span>
            <span class="value ${healthClass}">${healthStatus.text}</span>
          </div>
          ${device.scheduler ? `
          <div class="disc-info-row">
            <span class="label">Scheduler:</span>
            <span class="value">${device.scheduler}</span>
          </div>
          ` : ''}
        </div>
        <div class="disc-actions">
          <button class="action-btn secondary small scan-health-btn" data-device="${device.path}">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            Escanear Salud
          </button>
          <button class="action-btn danger small deep-repair-btn" data-device="${device.path}">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            Reparación Profunda
          </button>
        </div>
        ${device.smart && device.smart.data ? renderSmartDetails(device.smart.data) : ''}
      `;
      
      discosList.appendChild(discCard);
    });
    
    window.UIHelpers.setStatus('Escaneo completado', 'ok');
    window.UIHelpers.appendLog('Escaneo de discos completado', 'ok');
  } catch (e) {
    window.UIHelpers.appendLog(`Error: ${e.message}`, 'error');
    window.UIHelpers.setStatus('Error', 'error');
  } finally {
    window.UIHelpers.hideProgress();
    window.UIHelpers.hideCancelButton();
  }
}

function getHealthStatus(smartInfo) {
  if (!smartInfo || !smartInfo.success) {
    return { text: 'No disponible', class: 'status-unknown' };
  }
  
  if (smartInfo.basic) {
    // Para versión básica de smartctl
    if (smartInfo.output.includes('PASSED')) {
      return { text: 'Bueno', class: 'status-good' };
    } else if (smartInfo.output.includes('FAILED')) {
      return { text: 'Fallo', class: 'status-bad' };
    }
    return { text: 'Desconocido', class: 'status-unknown' };
  }
  
  // Para versión JSON de smartctl
  const data = smartInfo.data;
  if (data.smart_status && data.smart_status.passed === false) {
    return { text: 'Fallo', class: 'status-bad' };
  }
  
  // Verificar atributos críticos
  if (data.ata_smart_attributes) {
    const criticalAttrs = [5, 10, 184, 187, 188, 197, 198];
    for (const attr of data.ata_smart_attributes.table) {
      if (criticalAttrs.includes(attr.id) && attr.when_failed) {
        return { text: 'Fallo', class: 'status-bad' };
      }
    }
  }
  
  return { text: 'Bueno', class: 'status-good' };
}

function renderSmartDetails(smartData) {
  let details = '<div class="smart-details">';
  
  if (smartData.model_family) {
    details += `<div class="smart-row"><span class="label">Modelo:</span><span class="value">${smartData.model_family}</span></div>`;
  }
  
  if (smartData.serial_number) {
    details += `<div class="smart-row"><span class="label">Serial:</span><span class="value">${smartData.serial_number}</span></div>`;
  }
  
  if (smartData.firmware_version) {
    details += `<div class="smart-row"><span class="label">Firmware:</span><span class="value">${smartData.firmware_version}</span></div>`;
  }
  
  if (smartData.power_on_time && smartData.power_on_time.hours) {
    details += `<div class="smart-row"><span class="label">Horas encendido:</span><span class="value">${smartData.power_on_time.hours}h</span></div>`;
  }
  
  if (smartData.temperature && smartData.temperature.current) {
    details += `<div class="smart-row"><span class="label">Temperatura:</span><span class="value">${smartData.temperature.current}°C</span></div>`;
  }
  
  if (smartData.ata_smart_attributes && smartData.ata_smart_attributes.table) {
    details += '<div class="smart-attributes"><h5>Atributos S.M.A.R.T.:</h5>';
    const importantAttrs = smartData.ata_smart_attributes.table.filter(attr => 
      [5, 10, 184, 187, 188, 197, 198, 199, 200, 201, 230, 233, 241].includes(attr.id)
    );
    
    importantAttrs.forEach(attr => {
      const attrName = attr.name || `ID ${attr.id}`;
      const attrValue = attr.value || attr.raw || 'N/A';
      details += `<div class="smart-attr"><span class="attr-name">${attrName}:</span><span class="attr-value">${attrValue}</span></div>`;
    });
    
    details += '</div>';
  }
  
  details += '</div>';
  return details;
}

async function handleScanDiscHealth(devicePath) {
  window.UIHelpers.setStatus(`Escaneando salud de ${devicePath}...`);
  window.UIHelpers.showProgress();
  window.UIHelpers.showCancelButton();
  
  try {
    const result = await window.usbAPI.scanDiscHealth(devicePath);
    
    if (!result.success) {
      window.UIHelpers.appendLog(`Error: ${result.error}`, 'error');
      window.UIHelpers.setStatus('Error al escanear salud', 'error');
      return;
    }
    
    window.UIHelpers.appendLog(`Salud de ${devicePath}: ${result.health}`, result.health === 'Bueno' ? 'ok' : 'warn');
    
    if (result.details) {
      window.UIHelpers.appendLog(`Detalles: ${result.details}`, 'ok');
    }
    
    // Actualizar el estado de salud en la tarjeta del disco
    const healthElementId = `health-${devicePath.replace(/\//g, '-')}`;
    const healthElement = document.getElementById(healthElementId);
    if (healthElement) {
      healthElement.textContent = result.health === 'Bueno' ? 'Buen Estado' : result.health;
      healthElement.className = `disc-health-status ${result.health === 'Bueno' ? 'status-good' : 'status-bad'}`;
    }
    
    window.UIHelpers.setStatus('Escaneo de salud completado', 'ok');
  } catch (e) {
    window.UIHelpers.appendLog(`Error: ${e.message}`, 'error');
    window.UIHelpers.setStatus('Error', 'error');
  } finally {
    window.UIHelpers.hideProgress();
    window.UIHelpers.hideCancelButton();
  }
}

async function handleDeepRepair(devicePath) {
  const password = document.getElementById('sudoPassword').value;
  if (!password) {
    window.UIHelpers.appendLog('Se requiere contraseña de sudo', 'error');
    window.UIHelpers.setStatus('Falta contraseña', 'error');
    return;
  }
  
  if (!confirm(`ADVERTENCIA: La reparación profunda puede causar pérdida de datos. ¿Deseas continuar con la reparación de ${devicePath}?`)) {
    return;
  }
  
  window.UIHelpers.setStatus(`Reparando profundamente ${devicePath}...`);
  window.UIHelpers.showProgress();
  window.UIHelpers.showCancelButton();
  
  try {
    const result = await window.usbAPI.deepRepairDisc(devicePath, password);
    
    if (!result.success) {
      window.UIHelpers.appendLog(`Error: ${result.error}`, 'error');
      window.UIHelpers.setStatus('Error en reparación', 'error');
      return;
    }
    
    window.UIHelpers.appendLog(result.output, 'ok');
    window.UIHelpers.setStatus('Reparación completada', 'ok');
  } catch (e) {
    window.UIHelpers.appendLog(`Error: ${e.message}`, 'error');
    window.UIHelpers.setStatus('Error', 'error');
  } finally {
    window.UIHelpers.hideProgress();
    window.UIHelpers.hideCancelButton();
  }
}

window.DiscCheck = {
  handleScanDiscs,
  handleScanDiscHealth,
  handleDeepRepair
};
