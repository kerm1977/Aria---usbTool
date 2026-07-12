const { app, BrowserWindow } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

let mainWindow;
let discMonitoringInterval;
let previousDiscs = new Set();

async function getDiscList() {
  try {
    const { stdout } = await execPromise('lsblk -d -o NAME -n');
    const discs = stdout.trim().split('\n').filter(line => line.trim());
    return new Set(discs);
  } catch (error) {
    console.error('Error getting disc list:', error);
    return new Set();
  }
}

async function monitorDiscs() {
  const currentDiscs = await getDiscList();
  
  // Detectar nuevos discos
  const newDiscs = [...currentDiscs].filter(disc => !previousDiscs.has(disc));
  // Detectar discos desconectados
  const removedDiscs = [...previousDiscs].filter(disc => !currentDiscs.has(disc));
  
  if (newDiscs.length > 0 || removedDiscs.length > 0) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('discs-changed', {
        added: newDiscs,
        removed: removedDiscs
      });
    }
  }
  
  previousDiscs = currentDiscs;
}

function startDiscMonitoring() {
  // Verificar cada 3 segundos
  discMonitoringInterval = setInterval(monitorDiscs, 3000);
}

function stopDiscMonitoring() {
  if (discMonitoringInterval) {
    clearInterval(discMonitoringInterval);
    discMonitoringInterval = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '../../icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    backgroundColor: '#0f0f1a',
    show: true
  });

  mainWindow.loadFile(path.join(__dirname, '../../index.html'));
  mainWindow.once('ready-to-show', () => {
    // Iniciar monitoreo de discos cuando la ventana esté lista
    startDiscMonitoring();
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
    stopDiscMonitoring();
  });
  
  // Open DevTools for debugging
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  require('./ipc-handlers');
  require('./ipc-handlers-extended');
  // require('./performance-handler'); // Temporalmente desactivado para abrir la app
  createWindow();
});
app.on('window-all-closed', () => {
  stopDiscMonitoring();
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
