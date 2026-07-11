
document.addEventListener('DOMContentLoaded', () => {
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

  volumeLabel.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
  });

  deviceSelect.addEventListener('change', window.DeviceHelpers.onDeviceChanged);
  refreshBtn.addEventListener('click', () => {
    window.DeviceHelpers.loadDevices(true);
  });

  killBtn.addEventListener('click', window.DeviceOperations.handleKill);
  ejectBtn.addEventListener('click', window.DeviceOperations.handleEject);
  mountBtn.addEventListener('click', window.DeviceOperations.handleMount);
  analyzeBtn.addEventListener('click', window.DeviceOperations.handleAnalyze);
  repairBtn.addEventListener('click', window.DeviceOperations.handleRepair);
  formatBtn.addEventListener('click', window.DeviceOperations.handleFormat);

  const listPartitionsBtn = document.getElementById('listPartitionsBtn');
  if (listPartitionsBtn) listPartitionsBtn.addEventListener('click', window.PartitionOperations.handleListPartitions);
  const createPartitionBtn = document.getElementById('createPartitionBtn');
  if (createPartitionBtn) createPartitionBtn.addEventListener('click', window.PartitionOperations.handleCreatePartition);
  const deletePartitionBtn = document.getElementById('deletePartitionBtn');
  if (deletePartitionBtn) deletePartitionBtn.addEventListener('click', window.PartitionOperations.handleDeletePartition);
  const smartPartitionBtn = document.getElementById('smartPartitionBtn');
  if (smartPartitionBtn) smartPartitionBtn.addEventListener('click', window.PartitionOperations.handleSmartPartition);

  const analyzeContentBtn = document.getElementById('analyzeContentBtn');
  if (analyzeContentBtn) analyzeContentBtn.addEventListener('click', window.ContentAnalysis.handleAnalyzeContent);
  const findEmptyFoldersBtn = document.getElementById('findEmptyFoldersBtn');
  if (findEmptyFoldersBtn) findEmptyFoldersBtn.addEventListener('click', window.ContentAnalysis.handleFindEmptyFolders);
  const findDuplicatesBtn = document.getElementById('findDuplicatesBtn');
  if (findDuplicatesBtn) findDuplicatesBtn.addEventListener('click', window.ContentAnalysis.handleFindDuplicates);
  const findLargeFilesBtn = document.getElementById('findLargeFilesBtn');
  if (findLargeFilesBtn) findLargeFilesBtn.addEventListener('click', window.ContentAnalysis.handleFindLargeFiles);

  const scanDiscsBtn = document.getElementById('scanDiscsBtn');
  if (scanDiscsBtn) scanDiscsBtn.addEventListener('click', window.DiscCheck.handleScanDiscs);

  // Event delegation for dynamically created disc action buttons
  document.addEventListener('click', (e) => {
    if (e.target.closest('.scan-health-btn')) {
      const btn = e.target.closest('.scan-health-btn');
      const devicePath = btn.dataset.device;
      window.DiscCheck.handleScanDiscHealth(devicePath);
    }
    if (e.target.closest('.deep-repair-btn')) {
      const btn = e.target.closest('.deep-repair-btn');
      const devicePath = btn.dataset.device;
      window.DiscCheck.handleDeepRepair(devicePath);
    }
  });

  const cancelBtn = document.getElementById('cancelBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', async () => {
    try {
      const result = await window.usbAPI.cancelOperations();
      window.UIHelpers.appendLog(result.output, result.success ? 'ok' : 'error');
      window.UIHelpers.setStatus(result.success ? 'Operaciones canceladas' : 'Error', result.success ? 'ok' : 'error');
    } catch (e) {
      window.UIHelpers.appendLog(`Error: ${e.message}`, 'error');
      window.UIHelpers.setStatus('Error', 'error');
    }
  });

  const copyLogsBtn = document.getElementById('copyLogsBtn');
  if (copyLogsBtn) copyLogsBtn.addEventListener('click', () => {
    const elements = document.querySelector('.panel.active');
    if (elements) {
      const log = elements.querySelector('.log-area');
      if (log) {
        navigator.clipboard.writeText(log.textContent);
        window.UIHelpers.appendLog('Logs copiados al portapapeles', 'ok');
      }
    }
  });

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panelId = btn.dataset.target;
      const panel = document.getElementById(panelId);
      if (panel) panel.classList.add('active');
      window.UIHelpers.clearLog();
      window.UIHelpers.setStatus('Listo', 'ok');
    });
  });

  document.querySelectorAll('.collapsible-header').forEach(header => {
    header.addEventListener('click', () => {
      const targetId = header.dataset.target;
      const content = document.getElementById(targetId);
      const toggleBtn = header.querySelector('.toggle-btn');
      
      if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        toggleBtn.classList.add('collapsed');
      } else {
        content.classList.add('expanded');
        toggleBtn.classList.remove('collapsed');
      }
    });
  });

  window.DeviceHelpers.loadDevices(true);
  window.DeviceHelpers.startAutoRefresh();
});
