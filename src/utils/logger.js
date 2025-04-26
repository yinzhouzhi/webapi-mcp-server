/**
 * @file logger.js
 * @description 日志管理模块，基于Winston提供应用程序日志记录功能
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs-extra');
const { format } = winston;
const { combine, timestamp, printf, colorize, splat } = format;

// 日志目录
const LOG_DIR = process.env.LOG_DIR || path.resolve(process.cwd(), './logs');

// 确保日志目录存在
fs.ensureDirSync(LOG_DIR);

// 自定义格式
const customFormat = printf(({ level, message, timestamp, ...rest }) => {
  let logMessage = `${timestamp} [${level}]: ${message}`;
  
  // 如果有其他数据，将其添加到日志中
  if (Object.keys(rest).length > 0) {
    const meta = JSON.stringify(rest);
    logMessage += ` | ${meta}`;
  }
  
  return logMessage;
});

// 创建 Winston 日志记录器
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    splat(),
    customFormat
  ),
  defaultMeta: { service: 'mcp-server' },
  transports: [
    // 错误日志文件
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: 1024 * 1024 * 10, // 10MB
      maxFiles: 5,
    }),
    // 所有日志文件
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      maxsize: 1024 * 1024 * 20, // 20MB
      maxFiles: 10,
    }),
  ],
});

// 在非生产环境中，同时输出到控制台
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      splat(),
      customFormat
    ),
  }));
}

/**
 * 创建一个特定上下文的日志记录器
 * @param {string} context - 日志上下文标识
 * @returns {Object} - 上下文化的日志记录器
 */
function createContextLogger(context) {
  return {
    error: (message, ...meta) => logger.error(`[${context}] ${message}`, ...meta),
    warn: (message, ...meta) => logger.warn(`[${context}] ${message}`, ...meta),
    info: (message, ...meta) => logger.info(`[${context}] ${message}`, ...meta),
    debug: (message, ...meta) => logger.debug(`[${context}] ${message}`, ...meta),
    verbose: (message, ...meta) => logger.verbose(`[${context}] ${message}`, ...meta),
  };
}

/**
 * 基于文件创建上下文日志记录器
 * @param {string} filename - 文件名
 * @returns {Object} - 上下文化的日志记录器
 */
logger.forFile = function(filename) {
  const basename = path.basename(filename);
  return createContextLogger(basename);
};

/**
 * 配置日志记录器
 * @param {Object} options - 配置选项
 * @param {string} [options.level] - 日志级别
 * @param {string} [options.directory] - 日志目录
 * @param {number|string} [options.maxSize] - 日志文件最大大小
 * @param {number|string} [options.maxFiles] - 保留的最大日志文件数
 */
logger.configure = function({ level, directory, maxSize, maxFiles }) {
  // 更新日志级别
  if (level) {
    logger.level = level;
  }
  
  // 更新日志目录和相关配置
  if (directory || maxSize || maxFiles) {
    const logDir = directory || LOG_DIR;
    fs.ensureDirSync(logDir);
    
    // 移除现有的文件传输器
    logger.transports.forEach((transport, index) => {
      if (transport instanceof winston.transports.File) {
        logger.transports.splice(index, 1);
      }
    });
    
    // 添加新的文件传输器
    logger.add(new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: maxSize ? (typeof maxSize === 'number' ? maxSize : filesize(maxSize)) : 1024 * 1024 * 10,
      maxFiles: maxFiles || 5,
    }));
    
    logger.add(new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: maxSize ? (typeof maxSize === 'number' ? maxSize : filesize(maxSize)) : 1024 * 1024 * 20,
      maxFiles: maxFiles || 10,
    }));
  }
};

/**
 * 简单的文件大小字符串解析函数
 * @param {string} size - 文件大小字符串，例如 "10MB"
 * @returns {number} - 字节数
 */
function filesize(size) {
  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };
  
  const match = size.toString().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/);
  if (!match) return parseInt(size, 10) || 0;
  
  const [, num, unit] = match;
  return parseFloat(num) * (units[unit] || 1);
}

// 导出日志记录器实例
module.exports = logger; 