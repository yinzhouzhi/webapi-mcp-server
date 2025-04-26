/**
 * @file api-tools.js
 * @description API工具函数集合，用于处理API测试和管理
 */

const axios = require('axios');
const { z } = require('zod');
const logger = require('../utils/logger');

// API注册表 - 存储所有已注册的API
const apiRegistry = new Map();

/**
 * 注册API
 * @param {Object} apiDefinition - API定义对象
 */
function registerApi(apiDefinition) {
  try {
    logger.info(`注册API: ${apiDefinition.name}`);
    
    if (apiRegistry.has(apiDefinition.name)) {
      logger.warn(`API "${apiDefinition.name}" 已存在，将被覆盖`);
    }
    
    apiRegistry.set(apiDefinition.name, apiDefinition);
  } catch (error) {
    logger.error(`注册API失败: ${error.message}`, { error });
    throw error;
  }
}

/**
 * 移除API
 * @param {string} apiName - API名称
 * @returns {boolean} 是否成功移除
 */
function unregisterApi(apiName) {
  logger.info(`移除API: ${apiName}`);
  return apiRegistry.delete(apiName);
}

/**
 * 获取所有注册的API
 * @returns {Array} API定义对象数组
 */
function getAllApis() {
  return Array.from(apiRegistry.values());
}

/**
 * 获取API定义
 * @param {string} apiName - API名称
 * @returns {Object|null} API定义对象或null
 */
function getApi(apiName) {
  return apiRegistry.get(apiName) || null;
}

/**
 * 处理API请求
 * @param {Object} apiDefinition - API定义对象
 * @param {string} methodName - API方法名称
 * @param {Object} params - 请求参数
 * @returns {Promise<Object>} 响应数据
 */
async function executeApiMethod(apiDefinition, methodName, params) {
  try {
    // 查找方法定义
    const methodDefinition = apiDefinition.methods.find(m => m.name === methodName);
    if (!methodDefinition) {
      throw new Error(`未找到方法: ${methodName}`);
    }
    
    logger.debug(`执行API方法: ${apiDefinition.name}.${methodName}`, { params });
    
    // 构建URL
    let url = methodDefinition.endpoint;
    if (apiDefinition.baseUrl) {
      // 如果endpoint是相对路径，则与baseUrl合并
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `${apiDefinition.baseUrl.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
      }
    }
    
    // 替换URL中的参数，例如 /users/:id 中的 :id
    Object.keys(params).forEach(key => {
      const pattern = new RegExp(`:${key}\\b`, 'g');
      if (pattern.test(url)) {
        url = url.replace(pattern, encodeURIComponent(params[key]));
      }
    });
    
    // 构建请求配置
    const config = {
      method: methodDefinition.method,
      url,
      headers: {
        'Content-Type': 'application/json',
        ...apiDefinition.headers,
        ...methodDefinition.headers
      },
      responseType: methodDefinition.responseType || 'json'
    };
    
    // 根据HTTP方法添加参数
    if (methodDefinition.method === 'GET') {
      config.params = params;
    } else {
      config.data = params;
    }
    
    // 执行请求
    try {
      const response = await axios(config);
      logger.debug(`API响应: ${response.status}`, { 
        status: response.status,
        url: config.url,
        method: config.method
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        // 服务器返回错误
        logger.error(`API请求失败: ${error.response.status}`, {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
        throw new Error(`API请求失败: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        // 请求发送但没有收到响应
        logger.error(`API请求无响应`, { request: error.request });
        throw new Error('API请求无响应');
      } else {
        // 请求配置错误
        logger.error(`API请求配置错误: ${error.message}`, { error });
        throw new Error(`API请求配置错误: ${error.message}`);
      }
    }
  } catch (error) {
    logger.error(`执行API方法失败: ${error.message}`, { error });
    throw error;
  }
}

/**
 * 为API方法创建Zod参数模式
 * @param {Object} methodDefinition - API方法定义
 * @returns {Object} Zod参数模式
 */
function createMethodParameterSchema(methodDefinition) {
  const schema = {};
  
  // 为每个参数创建相应的Zod验证器
  methodDefinition.parameters.forEach(param => {
    let validator;
    
    switch (param.type) {
      case 'string':
        validator = z.string();
        break;
      case 'number':
        validator = z.number();
        break;
      case 'boolean':
        validator = z.boolean();
        break;
      case 'array':
        validator = z.array(z.any());
        break;
      case 'object':
        validator = z.object({}).passthrough();
        break;
      default:
        validator = z.any();
    }
    
    // 添加描述
    if (param.description) {
      validator = validator.describe(param.description);
    }
    
    // 处理可选参数
    if (!param.required) {
      validator = validator.optional();
    }
    
    // 处理默认值
    if (param.default !== undefined) {
      validator = validator.default(param.default);
    }
    
    schema[param.name] = validator;
  });
  
  return schema;
}

/**
 * 生成MCP工具注册函数
 * @param {Object} apiDefinition - API定义对象
 * @returns {Function} 工具注册函数
 */
function generateToolRegistrationFunction(apiDefinition) {
  return (server) => {
    apiDefinition.methods.forEach(method => {
      const toolName = `${apiDefinition.name.toLowerCase().replace(/\s+/g, '_')}_${method.name.toLowerCase().replace(/\s+/g, '_')}`;
      const toolDescription = method.description || `${apiDefinition.name} - ${method.name}`;
      
      // 创建参数模式
      const paramSchema = createMethodParameterSchema(method);
      
      // 注册工具
      server.tool(
        toolName,
        toolDescription,
        paramSchema,
        async (params) => {
          try {
            // 执行API调用
            const result = await executeApiMethod(apiDefinition, method.name, params);
            
            // 返回结果
            return {
              content: [{ 
                type: 'text', 
                text: typeof result === 'string' ? result : JSON.stringify(result) 
              }]
            };
          } catch (error) {
            logger.error(`工具执行失败: ${error.message}`, { error, toolName });
            return {
              content: [{ 
                type: 'text', 
                text: `调用失败: ${error.message}` 
              }],
              isError: true
            };
          }
        }
      );
      
      logger.debug(`已注册工具: ${toolName}`);
    });
    
    logger.info(`已为API "${apiDefinition.name}" 注册 ${apiDefinition.methods.length} 个工具`);
  };
}

/**
 * 注册所有API到MCP服务器
 * @param {Object} server - MCP服务器实例
 */
function registerAllApisToServer(server) {
  const apis = getAllApis();
  
  apis.forEach(api => {
    const registerFn = generateToolRegistrationFunction(api);
    registerFn(server);
  });
  
  logger.info(`已注册 ${apis.length} 个API，共 ${apis.reduce((sum, api) => sum + api.methods.length, 0)} 个工具`);
}

/**
 * 测试API连接
 * @param {string} url - API URL
 * @param {string} method - HTTP方法
 * @param {Object} headers - 请求标头
 * @param {Object} params - 请求参数
 * @param {number} timeout - 超时时间(毫秒)
 * @returns {Promise<Object>} 测试结果
 */
async function testApiConnection(url, method = 'GET', headers = {}, params = {}, timeout = 10000) {
  try {
    logger.debug(`测试API连接: ${method} ${url}`);
    
    const config = {
      method: method.toUpperCase(),
      url,
      headers,
      timeout
    };
    
    // 根据HTTP方法设置参数
    if (['GET', 'DELETE'].includes(config.method)) {
      config.params = params;
    } else {
      config.data = params;
    }
    
    const start = Date.now();
    const response = await axios(config);
    const duration = Date.now() - start;
    
    return {
      success: true,
      status: response.status,
      statusText: response.statusText,
      duration,
      contentType: response.headers['content-type'],
      dataSize: JSON.stringify(response.data).length,
      data: response.data
    };
  } catch (error) {
    logger.error(`API连接测试失败: ${url}`, error);
    
    return {
      success: false,
      status: error.response?.status,
      statusText: error.response?.statusText || error.message,
      duration: Date.now() - start,
      error: error.message
    };
  }
}

/**
 * 格式化API响应为可读字符串
 * @param {Object} response - API响应对象
 * @returns {string} 格式化后的字符串
 */
function formatApiResponse(response) {
  if (!response) {
    return '无响应数据';
  }
  
  if (!response.success) {
    return `请求失败: ${response.statusText} (${response.status})`;
  }
  
  let result = `状态: ${response.status} ${response.statusText}\n`;
  result += `耗时: ${response.duration}ms\n`;
  result += `内容类型: ${response.contentType}\n`;
  result += `数据大小: ${response.dataSize} 字节\n\n`;
  
  if (response.data) {
    result += '数据:\n';
    result += JSON.stringify(response.data, null, 2);
  }
  
  return result;
}

// 导出函数
module.exports = {
  registerApi,
  unregisterApi,
  getAllApis,
  getApi,
  executeApiMethod,
  generateToolRegistrationFunction,
  registerAllApisToServer,
  testApiConnection,
  formatApiResponse
}; 