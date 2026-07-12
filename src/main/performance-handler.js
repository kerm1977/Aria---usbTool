const { ipcMain } = require('electron');
const PerformanceAddon = require('usb-tools-performance-addon');

/**
 * Handler para operaciones de alto rendimiento usando el addon nativo
 */

// Cálculo síncrono de alto rendimiento
ipcMain.handle('performance-calculate-sync', async (event, data) => {
  try {
    const result = PerformanceAddon.calculateSync(data);
    return {
      success: true,
      result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Cálculo asíncrono de alto rendimiento (simulado)
ipcMain.handle('performance-calculate-async', async (event, data) => {
  try {
    const result = await PerformanceAddon.calculateAsync(data);
    return {
      success: true,
      result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Análisis de rendimiento de disco
ipcMain.handle('performance-analyze-disk', async (event, diskSizeGB) => {
  try {
    const result = PerformanceAddon.analyzeDiskPerformance(diskSizeGB);
    return {
      success: true,
      result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Procesamiento por lotes
ipcMain.handle('performance-process-batches', async (event, batches, useAsync = true) => {
  try {
    const result = await PerformanceAddon.processBatches(batches, useAsync);
    return {
      success: true,
      result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Análisis de integridad de datos
ipcMain.handle('performance-analyze-integrity', async (event, data) => {
  try {
    const result = PerformanceAddon.analyzeIntegrity(data);
    return {
      success: true,
      result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});
