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

window.UIHelpers = {
  getActivePanel,
  getPanelElements,
  appendLog,
  clearLog,
  setStatus,
  showProgress,
  hideProgress,
  updateProgress,
  showCancelButton,
  hideCancelButton
};
