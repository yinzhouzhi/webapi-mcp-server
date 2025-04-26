/**
 * @file json-parser.js
 * @description 解析JSON文件中的API定义
 */

/**
 * 从JSON内容解析API定义
 * @param {string|Object} content - JSON内容字符串或已解析的对象
 * @returns {Object|null} 解析出的API定义对象或null
 */
function parseJsonAPI(content) {
  try {
    // 如果输入是字符串，则解析为对象
    const apiDef = typeof content === 'string' ? JSON.parse(content) : content;
    
    // 验证API定义是否有必要的字段
    if (!apiDef.name || !apiDef.url) {
      return null;
    }
    
    // 确保参数字段存在
    if (!apiDef.parameters) {
      apiDef.parameters = {};
    }
    
    // 确保方法字段格式正确
    if (apiDef.method) {
      apiDef.method = apiDef.method.toUpperCase();
    } else {
      apiDef.method = 'GET';
    }
    
    // 确保headers字段存在
    if (!apiDef.headers) {
      apiDef.headers = {};
    }
    
    return apiDef;
  } catch (error) {
    console.error('解析JSON API定义失败:', error);
    return null;
  }
}

module.exports = {
  parseJsonAPI
}; 