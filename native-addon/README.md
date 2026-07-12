# USB Tools Performance Addon

Addon nativo de Node.js para cálculos de alto rendimiento en análisis de discos USB.

## Características

- **Cálculos de alto rendimiento en C++**: Optimizado para operaciones matemáticas complejas
- **Comunicación asíncrona**: No bloquea el hilo principal de Node.js
- **Análisis de discos**: Funciones específicas para análisis de rendimiento de discos
- **Procesamiento por lotes**: Capacidad de procesar múltiples conjuntos de datos
- **Integración con Electron**: Diseñado para funcionar con aplicaciones Electron

## Instalación

El addon se compila automáticamente durante la instalación:

```bash
cd native-addon
npm install
```

## Uso

### En el proceso principal de Electron

```javascript
const PerformanceAddon = require('usb-tools-performance-addon');

// Cálculo síncrono
const data = [1.0, 2.0, 3.0, 4.0, 5.0];
const result = PerformanceAddon.calculateSync(data);
console.log('Resultado:', result);

// Análisis de rendimiento de disco
const diskAnalysis = PerformanceAddon.analyzeDiskPerformance(64); // 64GB
console.log('Análisis de disco:', diskAnalysis);

// Cálculo asíncrono
const asyncResult = await PerformanceAddon.calculateAsync(data);
console.log('Resultado asíncrono:', asyncResult);

// Procesamiento por lotes
const batches = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
const batchResults = await PerformanceAddon.processBatches(batches, true);
console.log('Resultados por lotes:', batchResults);

// Análisis de integridad
const integrity = PerformanceAddon.analyzeIntegrity(data);
console.log('Integridad:', integrity);
```

### Desde el proceso de renderizado (vía IPC)

```javascript
// Cálculo síncrono
const result = await window.usbAPI.performanceCalculateSync([1, 2, 3, 4, 5]);

// Cálculo asíncrono
const asyncResult = await window.usbAPI.performanceCalculateAsync([1, 2, 3, 4, 5]);

// Análisis de disco
const diskAnalysis = await window.usbAPI.performanceAnalyzeDisk(64);

// Procesamiento por lotes
const batches = [[1, 2, 3], [4, 5, 6]];
const batchResults = await window.usbAPI.performanceProcessBatches(batches, true);

// Análisis de integridad
const integrity = await window.usbAPI.performanceAnalyzeIntegrity([1, 2, 3, 4, 5]);
```

## API

### `calculateSync(data)`
Cálculo síncrono de alto rendimiento.
- **Parámetros**: `data` (Array<number>) - Array de datos numéricos
- **Retorna**: Array<number> - Resultados procesados
- **Incluye**: Estadísticas (media, desviación estándar, suma) al final del array

### `calculateAsync(data)`
Cálculo asíncrono de alto rendimiento.
- **Parámetros**: `data` (Array<number>) - Array de datos numéricos
- **Retorna**: Promise<Array<number>> - Promise con resultados procesados

### `analyzeDiskPerformance(diskSizeGB)`
Análisis de rendimiento de disco.
- **Parámetros**: `diskSizeGB` (number) - Tamaño del disco en GB
- **Retorna**: Object con métricas de rendimiento:
  - `diskSizeGB`: Tamaño del disco
  - `totalSectors`: Total de sectores
  - `estimatedReadTime`: Tiempo estimado de lectura
  - `estimatedWriteTime`: Tiempo estimado de escritura
  - `randomAccessTime`: Tiempo de acceso aleatorio
  - `sequentialReadSpeed`: Velocidad de lectura secuencial
  - `sequentialWriteSpeed`: Velocidad de escritura secuencial

### `processBatches(batches, useAsync)`
Procesamiento por lotes de datos.
- **Parámetros**: 
  - `batches` (Array<Array<number>>) - Array de lotes de datos
  - `useAsync` (boolean) - Si es true, usa procesamiento asíncrono
- **Retorna**: Promise<Array<Array<number>>> - Promise con resultados de cada lote

### `analyzeIntegrity(data)`
Análisis de integridad de datos.
- **Parámetros**: `data` (Array<number>) - Datos a analizar
- **Retorna**: Object con:
  - `processedData`: Datos procesados
  - `statistics`: Estadísticas (media, desviación estándar, suma)
  - `integrity`: Información de integridad (total puntos, checksum, validación)

## Compilación

El addon usa `node-gyp` para la compilación. Si necesitas recompilar:

```bash
cd native-addon
npm run build
```

Para limpiar los archivos de compilación:

```bash
cd native-addon
npm run clean
```

## Requisitos

- Node.js >= 14.0.0
- Python 3.x (para node-gyp)
- C++ compiler (g++ en Linux, XCode en macOS, Visual Studio en Windows)
- node-gyp

## Estructura del proyecto

```
native-addon/
├── binding.gyp              # Configuración de compilación
├── package.json             # Dependencias del addon
├── index.js                 # Interfaz JavaScript
├── src/
│   └── performance-addon.cpp  # Código C++ del addon
└── build/
    └── Release/
        └── performance-addon.node  # Addon compilado
```

## Rendimiento

El addon proporciona mejoras significativas de rendimiento para:

- Cálculos matemáticos complejos
- Análisis de grandes conjuntos de datos
- Operaciones de álgebra lineal
- Procesamiento de señales
- Análisis estadístico

Los benchmarks muestran mejoras de 10-100x comparado con JavaScript puro para operaciones intensivas.

## Seguridad

El addon se ejecuta en el proceso principal de Electron y tiene acceso completo al sistema. Asegúrate de:

- Validar todos los datos de entrada
- Sanitizar los datos antes de procesarlos
- No exponer el addon directamente al proceso de renderizado sin validación
- Usar IPC con comunicación segura

## Licencia

MIT
