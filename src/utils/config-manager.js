/**
 * @file config-manager.js
 * @description 配置管理工具，用于加载和管理应用程序配置
 */

const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const logger = require('./logger');

// 默认配置
const DEFAULT_CONFIG = {
  server: {
    port: 3000,
    host: 'localhost',
    timeout: 30000
  },
  logging: {
    level: 'info',
    enableFileLogging: true,
    logDir: 'logs'
  },
  api: {
    definitions: {
      path: 'apis',
      extensions: ['.json', '.md', '.yaml', '.yml']
    }
  }
};

let currentConfig = { ...DEFAULT_CONFIG };

/**
 * 加载配置文件
 * @param {string} configPath - 配置文件路径
 * @returns {Object} 加载的配置对象
 */
function loadConfig(configPath) {
  try {
    if (!configPath) {
      logger.warn('未指定配置文件路径，使用默认配置');
      return { ...DEFAULT_CONFIG };
    }

    const resolvedPath = path.resolve(configPath);
    if (!fs.existsSync(resolvedPath)) {
      logger.warn(`配置文件不存在: ${resolvedPath}，使用默认配置`);
      return { ...DEFAULT_CONFIG };
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    let loadedConfig;

    if (ext === '.json') {
      const content = fs.readFileSync(resolvedPath, 'utf8');
      loadedConfig = JSON.parse(content);
    } else if (ext === '.yaml' || ext === '.yml') {
      const content = fs.readFileSync(resolvedPath, 'utf8');
      loadedConfig = yaml.load(content);
    } else {
      logger.warn(`不支持的配置文件格式: ${ext}，使用默认配置`);
      return { ...DEFAULT_CONFIG };
    }

    // 深度合并配置
    const mergedConfig = mergeConfigs(DEFAULT_CONFIG, loadedConfig);
    
    logger.info(`已加载配置文件: ${resolvedPath}`);
    currentConfig = mergedConfig;
    return mergedConfig;
  } catch (error) {
    logger.error(`加载配置文件失败: ${configPath}`, { error: error.message });
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * 深度合并配置对象
 * @param {Object} target - 目标对象
 * @param {Object} source - 源对象
 * @returns {Object} 合并后的对象
 */
function mergeConfigs(target, source) {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        // 如果是对象，则递归合并
        if (typeof target[key] === 'object' && !Array.isArray(target[key])) {
          result[key] = mergeConfigs(target[key], source[key]);
        } else {
          result[key] = { ...source[key] };
        }
      } else {
        // 对于非对象或数组，直接覆盖
        result[key] = source[key];
      }
    }
  }

  return result;
}

/**
 * 获取当前配置
 * @returns {Object} 当前配置对象
 */
function getConfig() {
  return { ...currentConfig };
}

/**
 * 获取特定配置项
 * @param {string} key - 配置项路径，如 "server.port"
 * @param {*} defaultValue - 如果配置项不存在则返回此默认值
 * @returns {*} 配置项值或默认值
 */
function get(key, defaultValue) {
  try {
    const keys = key.split('.');
    let value = { ...currentConfig };
    
    for (const k of keys) {
      if (value === undefined || value === null) {
        return defaultValue;
      }
      value = value[k];
    }
    
    return value !== undefined ? value : defaultValue;
  } catch (error) {
    logger.error(`获取配置项失败: ${key}`, { error: error.message });
    return defaultValue;
  }
}

/**
 * 更新配置项
 * @param {string} key - 配置项路径，如 "server.port"
 * @param {*} value - 新的配置值
 * @returns {boolean} 是否更新成功
 */
function set(key, value) {
  try {
    const keys = key.split('.');
    let target = currentConfig;
    
    // 遍历到最后一个键之前的所有键
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!target[k] || typeof target[k] !== 'object') {
        target[k] = {};
      }
      target = target[k];
    }
    
    // 设置最后一个键的值
    const lastKey = keys[keys.length - 1];
    target[lastKey] = value;
    
    logger.debug(`更新配置项: ${key} = ${JSON.stringify(value)}`);
    return true;
  } catch (error) {
    logger.error(`更新配置项失败: ${key}`, { error: error.message });
    return false;
  }
}

/**
 * 将当前配置保存到文件
 * @param {string} filePath - 保存的文件路径
 * @returns {boolean} 是否保存成功
 */
function saveConfig(filePath) {
  try {
    const resolvedPath = path.resolve(filePath);
    const ext = path.extname(resolvedPath).toLowerCase();
    const dir = path.dirname(resolvedPath);
    
    // 确保目录存在
    fs.ensureDirSync(dir);
    
    let content;
    if (ext === '.json') {
      content = JSON.stringify(currentConfig, null, 2);
    } else if (ext === '.yaml' || ext === '.yml') {
      content = yaml.dump(currentConfig);
    } else {
      logger.error(`不支持的配置文件格式: ${ext}`);
      return false;
    }
    
    fs.writeFileSync(resolvedPath, content, 'utf8');
    logger.info(`配置已保存至: ${resolvedPath}`);
    return true;
  } catch (error) {
    logger.error(`保存配置文件失败: ${filePath}`, { error: error.message });
    return false;
  }
}

module.exports = {
  DEFAULT_CONFIG,
  loadConfig,
  getConfig,
  get,
  set,
  saveConfig
}; 