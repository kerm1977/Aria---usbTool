const addon = require('./build/Release/performance-addon.node');

/**
 * Módulo de addon nativo para cálculos de alto rendimiento
 * Proporciona funciones optimizadas en C++ para análisis de discos y cálculos complejos
 */

class PerformanceAddon {
  /**
   * Cálculo síncrono de alto rendimiento
   * @param {Array<number>} data - Array de datos numéricos para procesar
   * @returns {Array<number>} - Array con resultados procesados
   */
  static calculateSync(data) {
    if (!Array.isArray(data)) {
      throw new Error('El argumento debe ser un array de números');
    }
    
    try {
      return addon.calculateSync(data);
    } catch (error) {
      throw new Error(`Error en cálculo síncrono: ${error.message}`);
    }
  }

  /**
   * Análisis de rendimiento de disco
   * @param {number} diskSizeGB - Tamaño del disco en GB
   * @returns {Object} - Objeto con métricas de rendimiento
   */
  static analyzeDiskPerformance(diskSizeGB) {
    if (typeof diskSizeGB !== 'number' || diskSizeGB <= 0) {
      throw new Error('El tamaño del disco debe ser un número positivo');
    }

    try {
      return addon.analyzeDiskPerformance(diskSizeGB);
    } catch (error) {
      throw new Error(`Error en análisis de disco: ${error.message}`);
    }
  }

  /**
   * Cálculo asíncrono de alto rendimiento (simulado usando Promise)
   * @param {Array<number>} data - Array de datos numéricos para procesar
   * @returns {Promise<Array<number>>} - Promise que resuelve con los resultados
   */
  static calculateAsync(data) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(data)) {
        reject(new Error('El argumento debe ser un array de números'));
        return;
      }

      // Usar setTimeout para simular operación asíncrona
      setTimeout(() => {
        try {
          const result = this.calculateSync(data);
          resolve(result);
        } catch (error) {
          reject(new Error(`Error en cálculo asíncrono: ${error.message}`));
        }
      }, 0);
    });
  }

  /**
   * Procesamiento por lotes de datos
   * @param {Array<Array<number>>} batches - Array de lotes de datos
   * @param {boolean} async - Si es true, usa procesamiento asíncrono
   * @returns {Promise<Array<Array<number>>>} - Promise con resultados de cada lote
   */
  static processBatches(batches, async = true) {
    if (!Array.isArray(batches)) {
      throw new Error('El argumento debe ser un array de lotes');
    }

    if (async) {
      return Promise.all(
        batches.map(batch => this.calculateAsync(batch))
      );
    } else {
      return Promise.resolve(
        batches.map(batch => this.calculateSync(batch))
      );
    }
  }

  /**
   * Análisis de integridad de datos
   * @param {Array<number>} data - Datos a analizar
   * @returns {Object} - Resultados del análisis de integridad
   */
  static analyzeIntegrity(data) {
    if (!Array.isArray(data)) {
      throw new Error('El argumento debe ser un array de números');
    }

    const result = this.calculateSync(data);
    
    // Los últimos 3 valores son estadísticas calculadas
    const stats = result.slice(-3);
    const processedData = result.slice(0, -3);
    
    return {
      processedData,
      statistics: {
        mean: stats[0],
        standardDeviation: stats[1],
        sum: stats[2]
      },
      integrity: {
        totalPoints: processedData.length,
        checksum: stats[2] % 1000, // Checksum simple
        valid: true
      }
    };
  }
}

module.exports = PerformanceAddon;
