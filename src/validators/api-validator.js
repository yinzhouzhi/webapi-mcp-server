/**
 * @file api-validator.js
 * @description 验证API定义的完整性和正确性
 */

/**
 * 验证API定义
 * @param {Object} apiDef - API定义对象
 * @returns {Object} 验证并规范化后的API定义
 * @throws {Error} 如果验证失败
 */
function validateApiDefinition(apiDef) {
  if (!apiDef) {
    throw new Error('API定义不能为空');
  }
  
  // 验证必需字段
  if (!apiDef.name) {
    throw new Error('API定义必须包含名称(name)字段');
  }
  
  if (!apiDef.url) {
    throw new Error('API定义必须包含URL字段');
  }
  
  // 规范化方法
  if (apiDef.method) {
    apiDef.method = apiDef.method.toUpperCase();
    
    if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(apiDef.method)) {
      throw new Error(`不支持的HTTP方法: ${apiDef.method}`);
    }
  } else {
    apiDef.method = 'GET';
  }
  
  // 确保描述字段存在
  if (!apiDef.description) {
    apiDef.description = `${apiDef.name} API`;
  }
  
  // 验证参数定义
  if (apiDef.parameters) {
    for (const [paramName, paramDef] of Object.entries(apiDef.parameters)) {
      // 确保参数定义是对象
      if (typeof paramDef !== 'object' || paramDef === null) {
        throw new Error(`参数定义必须是对象: ${paramName}`);
      }
      
      // 规范化参数类型
      if (paramDef.type) {
        paramDef.type = paramDef.type.toLowerCase();
        
        if (!['string', 'number', 'boolean', 'object', 'array'].includes(paramDef.type)) {
          throw new Error(`不支持的参数类型: ${paramDef.type} (${paramName})`);
        }
      } else {
        paramDef.type = 'string';
      }
      
      // 确保required字段是布尔值
      if ('required' in paramDef) {
        if (typeof paramDef.required === 'string') {
          paramDef.required = paramDef.required.toLowerCase() === 'true' || 
                             paramDef.required.toLowerCase() === '是';
        } else {
          paramDef.required = !!paramDef.required;
        }
      } else {
        paramDef.required = false;
      }
      
      // 确保description字段存在
      if (!paramDef.description) {
        paramDef.description = `${paramName} 参数`;
      }
    }
  } else {
    apiDef.parameters = {};
  }
  
  // 确保headers字段存在
  if (!apiDef.headers) {
    apiDef.headers = {};
  }
  
  return apiDef;
}

module.exports = {
  validateApiDefinition
}; 