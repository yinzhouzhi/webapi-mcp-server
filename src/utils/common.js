/**
 * @file common.js
 * @description 通用工具模块，提供各种常用的辅助函数
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * 生成UUID
 * @returns {string} UUID字符串
 */
function generateUUID() {
  return uuidv4();
}

/**
 * 深度合并对象
 * @param {...Object} objects - 要合并的对象
 * @returns {Object} 合并后的对象
 */
function deepMerge(...objects) {
  const isObject = obj => obj && typeof obj === 'object' && !Array.isArray(obj);
  
  return objects.reduce((result, current) => {
    if (!current) return result;
    
    Object.keys(current).forEach(key => {
      if (isObject(result[key]) && isObject(current[key])) {
        result[key] = deepMerge(result[key], current[key]);
      } else {
        result[key] = current[key];
      }
    });
    
    return result;
  }, {});
}

/**
 * 安全解析JSON字符串
 * @param {string} jsonString - JSON字符串
 * @param {any} defaultValue - 解析失败时的默认值
 * @returns {any} 解析结果
 */
function safeJsonParse(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return defaultValue;
  }
}

/**
 * 生成随机字符串
 * @param {number} [length=32] - 字符串长度
 * @param {string} [chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'] - 字符集
 * @returns {string} 随机字符串
 */
function randomString(length = 32, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
  let result = '';
  const randomBytes = crypto.randomBytes(length);
  const charsLength = chars.length;
  
  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytes[i] % charsLength;
    result += chars.charAt(randomIndex);
  }
  
  return result;
}

/**
 * 计算字符串的哈希值
 * @param {string} data - 要计算哈希的数据
 * @param {string} [algorithm='sha256'] - 哈希算法
 * @param {string} [encoding='hex'] - 输出编码
 * @returns {string} 哈希值
 */
function hash(data, algorithm = 'sha256', encoding = 'hex') {
  return crypto.createHash(algorithm).update(data).digest(encoding);
}

/**
 * 睡眠函数
 * @param {number} ms - 睡眠时间（毫秒）
 * @returns {Promise<void>} Promise对象
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 防抖函数
 * @param {Function} fn - 要执行的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
function debounce(fn, wait) {
  let timeout;
  
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    
    timeout = setTimeout(() => {
      fn.apply(context, args);
    }, wait);
  };
}

/**
 * 节流函数
 * @param {Function} fn - 要执行的函数
 * @param {number} limit - 限制时间（毫秒）
 * @returns {Function} 节流后的函数
 */
function throttle(fn, limit) {
  let lastCall = 0;
  
  return function(...args) {
    const now = Date.now();
    
    if (now - lastCall >= limit) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}

/**
 * 去除对象中的空值（null/undefined）
 * @param {Object} obj - 输入对象
 * @returns {Object} 处理后的对象
 */
function removeEmpty(obj) {
  const result = {};
  
  Object.keys(obj).forEach(key => {
    if (obj[key] !== null && obj[key] !== undefined) {
      result[key] = obj[key];
    }
  });
  
  return result;
}

/**
 * 格式化日期时间
 * @param {Date|number|string} [date=new Date()] - 日期对象、时间戳或日期字符串
 * @param {string} [format='YYYY-MM-DD HH:mm:ss'] - 格式化模板
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date = new Date(), format = 'YYYY-MM-DD HH:mm:ss') {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    return '';
  }
  
  const pad = (num) => String(num).padStart(2, '0');
  
  const replacements = {
    YYYY: d.getFullYear(),
    MM: pad(d.getMonth() + 1),
    DD: pad(d.getDate()),
    HH: pad(d.getHours()),
    mm: pad(d.getMinutes()),
    ss: pad(d.getSeconds()),
    SSS: String(d.getMilliseconds()).padStart(3, '0')
  };
  
  return format.replace(/YYYY|MM|DD|HH|mm|ss|SSS/g, match => replacements[match]);
}

/**
 * 检查是否为空值（null, undefined, '', [], {}）
 * @param {any} value - 要检查的值
 * @returns {boolean} 是否为空
 */
function isEmpty(value) {
  if (value === null || value === undefined) {
    return true;
  }
  
  if (typeof value === 'string' && value.trim() === '') {
    return true;
  }
  
  if (Array.isArray(value) && value.length === 0) {
    return true;
  }
  
  if (typeof value === 'object' && Object.keys(value).length === 0) {
    return true;
  }
  
  return false;
}

/**
 * 尝试执行函数并处理可能的错误
 * @param {Function} fn - 要执行的函数
 * @param {any} [defaultValue=null] - 发生错误时的默认返回值
 * @returns {any} 函数执行结果或默认值
 */
function tryExecute(fn, defaultValue = null) {
  try {
    return fn();
  } catch (error) {
    return defaultValue;
  }
}

/**
 * 确保某个函数只执行一次
 * @param {Function} fn - 要执行的函数
 * @returns {Function} 包装后的函数
 */
function once(fn) {
  let called = false;
  let result;
  
  return function(...args) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
    }
    
    return result;
  };
}

/**
 * 将对象转换为查询字符串
 * @param {Object} params - 参数对象
 * @returns {string} 查询字符串
 */
function toQueryString(params) {
  return Object.keys(params)
    .filter(key => params[key] !== null && params[key] !== undefined)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
}

/**
 * 解析查询字符串
 * @param {string} queryString - 查询字符串
 * @returns {Object} 解析后的对象
 */
function parseQueryString(queryString) {
  if (!queryString || typeof queryString !== 'string') {
    return {};
  }
  
  // 移除开头的 ?
  const str = queryString.startsWith('?') ? queryString.substring(1) : queryString;
  
  if (!str) {
    return {};
  }
  
  return str.split('&').reduce((result, param) => {
    const [key, value] = param.split('=');
    if (key) {
      result[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
    }
    return result;
  }, {});
}

// 导出工具函数
module.exports = {
  generateUUID,
  deepMerge,
  safeJsonParse,
  randomString,
  hash,
  sleep,
  debounce,
  throttle,
  removeEmpty,
  formatDate,
  isEmpty,
  tryExecute,
  once,
  toQueryString,
  parseQueryString
}; 