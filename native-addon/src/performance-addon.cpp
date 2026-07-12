#include <node_api.h>
#include <string>
#include <vector>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <cmath>
#include <algorithm>

// Estructura para datos de cálculo asíncrono
struct AsyncData {
  napi_env env;
  napi_ref callback_ref;
  std::vector<double> input_data;
  std::vector<double> result_data;
  std::string error_message;
  bool completed = false;
  std::mutex mutex;
  std::condition_variable cv;
};

// Función de cálculo de alto rendimiento
void performHeavyCalculations(AsyncData* data) {
  try {
    std::vector<double> results;
    results.reserve(data->input_data.size());
    
    for (size_t i = 0; i < data->input_data.size(); ++i) {
      double value = data->input_data[i];
      double result = 0.0;
      for (int j = 0; j < 100; ++j) {
        result += std::sin(value * j) * std::cos(value / (j + 1));
        result += std::pow(value, 1.5) / (j + 1);
        result += std::sqrt(std::abs(value) + j);
      }
      results.push_back(result);
    }
    
    std::sort(results.begin(), results.end());
    
    double sum = 0.0;
    double sum_sq = 0.0;
    for (double val : results) {
      sum += val;
      sum_sq += val * val;
    }
    
    double mean = sum / results.size();
    double variance = (sum_sq / results.size()) - (mean * mean);
    double std_dev = std::sqrt(std::abs(variance));
    
    results.push_back(mean);
    results.push_back(std_dev);
    results.push_back(sum);
    
    data->result_data = results;
    data->error_message = "";
    
  } catch (const std::exception& e) {
    data->error_message = std::string("Error en cálculos: ") + e.what();
  }
  
  std::lock_guard<std::mutex> lock(data->mutex);
  data->completed = true;
  data->cv.notify_one();
}

// Función síncrona para cálculos rápidos
napi_value CalculateSync(napi_env env, napi_callback_info info) {
  napi_status status;
  size_t argc = 1;
  napi_value args[1];
  status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
  if (status != napi_ok || argc < 1) {
    napi_throw_type_error(env, nullptr, "Se requiere al menos un argumento");
    return nullptr;
  }
  
  bool is_array;
  status = napi_is_array(env, args[0], &is_array);
  if (status != napi_ok || !is_array) {
    napi_throw_type_error(env, nullptr, "El primer argumento debe ser un array");
    return nullptr;
  }
  
  uint32_t length;
  status = napi_get_array_length(env, args[0], &length);
  if (status != napi_ok) return nullptr;
  
  std::vector<double> input_data;
  for (uint32_t i = 0; i < length; ++i) {
    napi_value element;
    status = napi_get_element(env, args[0], i, &element);
    if (status != napi_ok) continue;
    
    napi_valuetype type;
    status = napi_typeof(env, element, &type);
    if (status != napi_ok || type != napi_number) continue;
    
    double value;
    status = napi_get_value_double(env, element, &value);
    if (status == napi_ok) {
      input_data.push_back(value);
    }
  }
  
  AsyncData data;
  data.env = env;
  data.input_data = input_data;
  
  performHeavyCalculations(&data);
  
  if (!data.error_message.empty()) {
    napi_throw_error(env, nullptr, data.error_message.c_str());
    return nullptr;
  }
  
  napi_value result_array;
  status = napi_create_array(env, &result_array);
  if (status != napi_ok) return nullptr;
  
  for (size_t i = 0; i < data.result_data.size(); ++i) {
    napi_value num;
    status = napi_create_double(env, data.result_data[i], &num);
    if (status != napi_ok) continue;
    
    status = napi_set_element(env, result_array, i, num);
  }
  
  return result_array;
}

// Función para análisis de discos
napi_value AnalyzeDiskPerformance(napi_env env, napi_callback_info info) {
  napi_status status;
  size_t argc = 1;
  napi_value args[1];
  status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
  if (status != napi_ok || argc < 1) {
    napi_throw_type_error(env, nullptr, "Se requiere el tamaño del disco en GB");
    return nullptr;
  }
  
  napi_valuetype type;
  status = napi_typeof(env, args[0], &type);
  if (status != napi_ok || type != napi_number) {
    napi_throw_type_error(env, nullptr, "El argumento debe ser un número");
    return nullptr;
  }
  
  double diskSizeGB;
  status = napi_get_value_double(env, args[0], &diskSizeGB);
  if (status != napi_ok) return nullptr;
  
  double sectors = diskSizeGB * 1024 * 1024 * 2;
  double estimatedReadTime = sectors * 0.0001;
  double estimatedWriteTime = sectors * 0.00015;
  double randomAccessTime = sectors * 0.0002;
  
  napi_value result;
  status = napi_create_object(env, &result);
  if (status != napi_ok) return nullptr;
  
  napi_value value;
  
  status = napi_create_double(env, diskSizeGB, &value);
  napi_set_named_property(env, result, "diskSizeGB", value);
  
  status = napi_create_double(env, sectors, &value);
  napi_set_named_property(env, result, "totalSectors", value);
  
  status = napi_create_double(env, estimatedReadTime, &value);
  napi_set_named_property(env, result, "estimatedReadTime", value);
  
  status = napi_create_double(env, estimatedWriteTime, &value);
  napi_set_named_property(env, result, "estimatedWriteTime", value);
  
  status = napi_create_double(env, randomAccessTime, &value);
  napi_set_named_property(env, result, "randomAccessTime", value);
  
  status = napi_create_double(env, diskSizeGB / estimatedReadTime, &value);
  napi_set_named_property(env, result, "sequentialReadSpeed", value);
  
  status = napi_create_double(env, diskSizeGB / estimatedWriteTime, &value);
  napi_set_named_property(env, result, "sequentialWriteSpeed", value);
  
  return result;
}

// Función de inicialización del addon
napi_value Init(napi_env env, napi_value exports) {
  napi_status status;
  napi_value fn;
  
  status = napi_create_function(env, nullptr, 0, CalculateSync, nullptr, &fn);
  if (status != napi_ok) return nullptr;
  napi_set_named_property(env, exports, "calculateSync", fn);
  
  status = napi_create_function(env, nullptr, 0, AnalyzeDiskPerformance, nullptr, &fn);
  if (status != napi_ok) return nullptr;
  napi_set_named_property(env, exports, "analyzeDiskPerformance", fn);
  
  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
