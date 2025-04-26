/**
 * @file json-parser.js
 * @description JSON解析和处理工具
 */

/**
 * 解析JSON字符串
 * @param {string} jsonString - JSON字符串
 * @returns {Object|null} 解析后的JSON对象，解析失败则返回null
 */
function parseJson(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('JSON解析失败:', error.message);
    return null;
  }
}

/**
 * 将JavaScript对象转换为JSON字符串
 * @param {Object} object - JavaScript对象
 * @param {number} [indent=2] - 缩进空格数
 * @returns {string} 格式化的JSON字符串
 */
function stringify(object, indent = 2) {
  try {
    return JSON.stringify(object, null, indent);
  } catch (error) {
    console.error('对象序列化为JSON失败:', error.message);
    return '{}';
  }
}

/**
 * 通过点号路径获取对象中的值
 * @param {Object} object - 源对象
 * @param {string} path - 点号分隔的路径，如 "user.profile.name"
 * @param {*} [defaultValue=undefined] - 路径不存在时返回的默认值
 * @returns {*} 获取到的值或默认值
 */
function getValueByPath(object, path, defaultValue = undefined) {
  try {
    return path.split('.').reduce((obj, key) => 
      (obj && obj[key] !== undefined) ? obj[key] : defaultValue, object);
  } catch (error) {
    console.error('通过路径获取对象值失败:', error.message);
    return defaultValue;
  }
}

/**
 * 验证JSON是否符合指定的模式
 * @param {Object} json - 要验证的JSON对象
 * @param {Object} schema - 模式定义
 * @returns {boolean} 是否符合模式
 */
function validateJsonSchema(json, schema) {
  try {
    // 简化版的schema验证，实际应用中可以使用ajv等库
    for (const [key, spec] of Object.entries(schema)) {
      // 检查必需字段
      if (spec.required && (json[key] === undefined || json[key] === null)) {
        return false;
      }
      
      // 检查类型
      if (spec.type && json[key] !== undefined) {
        const actualType = Array.isArray(json[key]) ? 'array' : typeof json[key];
        if (actualType !== spec.type) {
          return false;
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('JSON schema验证失败:', error.message);
    return false;
  }
}

module.exports = {
  parseJson,
  stringify,
  getValueByPath,
  validateJsonSchema
}; 