/**
 * 日志工具模块
 * 提供不同级别的日志记录功能
 */
const fs = require('fs');
const path = require('path');
const util = require('util');

// 日志级别定义
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

// 默认日志配置
const defaultConfig = {
  level: LOG_LEVELS.INFO,
  logToConsole: true,
  logToFile: true,
  logFilePath: path.join(process.cwd(), 'logs', 'webapi-mcp-server.log'),
  format: 'text' // 'text' 或 'json'
};

let config = { ...defaultConfig };
let logFileStream = null;

/**
 * 初始化日志系统
 * @param {Object} options 日志配置
 */
function initialize(options = {}) {
  config = { ...defaultConfig, ...options };
  
  // 确保日志目录存在
  if (config.logToFile) {
    const logDir = path.dirname(config.logFilePath);
    if (!fs.existsSync(logDir)) {
      try {
        fs.mkdirSync(logDir, { recursive: true });
      } catch (error) {
        console.error(`无法创建日志目录: ${logDir}`, error.message);
        config.logToFile = false;
      }
    }
    
    // 如果已存在日志文件流，关闭它
    if (logFileStream) {
      logFileStream.end();
      logFileStream = null;
    }
    
    // 创建日志文件流
    try {
      logFileStream = fs.createWriteStream(config.logFilePath, { flags: 'a' });
    } catch (error) {
      console.error(`无法创建日志文件: ${config.logFilePath}`, error.message);
      config.logToFile = false;
    }
  }
  
  // 记录初始化信息
  info('日志系统初始化完成', { 
    level: getLevelName(config.level),
    logToConsole: config.logToConsole,
    logToFile: config.logToFile, 
    logFilePath: config.logFilePath
  });
}

/**
 * 获取日志级别名称
 * @param {number} level 日志级别
 * @returns {string} 日志级别名称
 */
function getLevelName(level) {
  return Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level) || 'UNKNOWN';
}

/**
 * 格式化日志消息
 * @param {string} level 日志级别
 * @param {string} message 日志消息
 * @param {Object} data 额外数据
 * @returns {string} 格式化的日志消息
 */
function formatLogMessage(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  if (config.format === 'json') {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...data
    });
  } else {
    const dataStr = Object.keys(data).length ? ' ' + util.inspect(data, { depth: 4 }) : '';
    return `[${timestamp}] [${level}] ${message}${dataStr}`;
  }
}

/**
 * 记录日志
 * @param {string} level 日志级别
 * @param {string} message 日志消息
 * @param {Object} data 额外数据
 */
function log(level, message, data = {}) {
  // 检查日志级别
  if (LOG_LEVELS[level] < config.level) {
    return;
  }
  
  const formattedMessage = formatLogMessage(level, message, data);
  
  // 输出到控制台
  if (config.logToConsole) {
    if (level === 'ERROR') {
      console.error(formattedMessage);
    } else if (level === 'WARN') {
      console.warn(formattedMessage);
    } else {
      console.log(formattedMessage);
    }
  }
  
  // 写入日志文件
  if (config.logToFile && logFileStream) {
    logFileStream.write(formattedMessage + '\n');
  }
}

/**
 * 记录调试日志
 * @param {string} message 日志消息
 * @param {Object} data 额外数据
 */
function debug(message, data = {}) {
  log('DEBUG', message, data);
}

/**
 * 记录信息日志
 * @param {string} message 日志消息
 * @param {Object} data 额外数据
 */
function info(message, data = {}) {
  log('INFO', message, data);
}

/**
 * 记录警告日志
 * @param {string} message 日志消息
 * @param {Object} data 额外数据
 */
function warn(message, data = {}) {
  log('WARN', message, data);
}

/**
 * 记录错误日志
 * @param {string} message 日志消息
 * @param {Object} data 额外数据
 */
function error(message, data = {}) {
  log('ERROR', message, data);
}

/**
 * 设置日志级别
 * @param {string} levelName 日志级别名称
 */
function setLevel(levelName) {
  const level = LOG_LEVELS[levelName.toUpperCase()];
  if (level !== undefined) {
    config.level = level;
    debug(`日志级别已设置为: ${levelName}`);
  } else {
    warn(`无效的日志级别: ${levelName}`);
  }
}

/**
 * 获取当前日志配置
 * @returns {Object} 当前日志配置
 */
function getConfig() {
  return { ...config };
}

/**
 * 关闭日志系统
 */
function shutdown() {
  if (logFileStream) {
    logFileStream.end();
    logFileStream = null;
  }
}

// 导出日志函数
module.exports = {
  initialize,
  debug,
  info,
  warn,
  error,
  setLevel,
  getConfig,
  shutdown,
  LOG_LEVELS
}; 