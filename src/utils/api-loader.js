/**
 * @file api-loader.js
 * @description API加载工具，用于从JSON和Markdown文件加载API定义
 */

const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const yaml = require('js-yaml');
const matter = require('gray-matter');
const logger = require('./logger');

/**
 * 从JSON文件加载API定义
 * @param {string} filePath - JSON文件路径
 * @returns {Object|null} API定义对象，如果加载失败则返回null
 */
function loadApiFromJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const apiDef = JSON.parse(content);
    return validateApiDefinition(apiDef) ? apiDef : null;
  } catch (error) {
    logger.error(`从JSON文件加载API失败: ${filePath}`, { error: error.message });
    return null;
  }
}

/**
 * 从Markdown文件加载API定义
 * @param {string} filePath - Markdown文件路径
 * @returns {Object|null} API定义对象，如果加载失败则返回null
 */
function loadApiFromMarkdown(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { data } = matter(content);
    
    // 检查是否包含API定义
    if (!data || !data.api) {
      logger.warn(`Markdown文件不包含API定义: ${filePath}`);
      return null;
    }
    
    return validateApiDefinition(data.api) ? data.api : null;
  } catch (error) {
    logger.error(`从Markdown文件加载API失败: ${filePath}`, { error: error.message });
    return null;
  }
}

/**
 * 从YAML文件加载API定义
 * @param {string} filePath - YAML文件路径
 * @returns {Object|null} API定义对象，如果加载失败则返回null
 */
function loadApiFromYaml(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const apiDef = yaml.load(content);
    return validateApiDefinition(apiDef) ? apiDef : null;
  } catch (error) {
    logger.error(`从YAML文件加载API失败: ${filePath}`, { error: error.message });
    return null;
  }
}

/**
 * 验证API定义是否有效
 * @param {Object} apiDef - API定义对象
 * @returns {boolean} 如果API定义有效则返回true，否则返回false
 */
function validateApiDefinition(apiDef) {
  if (!apiDef) {
    logger.error('API定义为空');
    return false;
  }
  
  // 验证必要字段
  const requiredFields = ['name', 'method', 'endpoint'];
  const missingFields = requiredFields.filter(field => !apiDef[field]);
  
  if (missingFields.length > 0) {
    logger.error(`API定义缺少必要字段: ${missingFields.join(', ')}`, { apiDef });
    return false;
  }
  
  return true;
}

/**
 * 从目录中加载所有API定义
 * @param {string} directory - API定义文件所在目录
 * @param {Object} options - 加载选项
 * @param {boolean} options.recursive - 是否递归搜索子目录
 * @param {string[]} options.extensions - 要加载的文件扩展名
 * @returns {Object[]} API定义对象数组
 */
function loadApisFromDirectory(directory, options = {}) {
  const { recursive = true, extensions = ['.json', '.md', '.yaml', '.yml'] } = options;
  const apis = [];
  
  try {
    // 确保目录存在
    if (!fs.existsSync(directory)) {
      logger.error(`API目录不存在: ${directory}`);
      return apis;
    }
    
    // 创建查询模式
    const pattern = path.join(
      directory, 
      recursive ? '**/*' : '*',
      `+(${extensions.map(ext => ext.replace('.', '')).join('|')})`
    );
    
    // 查找匹配的文件
    const files = glob.sync(pattern);
    
    // 加载每个文件中的API定义
    files.forEach(file => {
      let apiDef = null;
      const ext = path.extname(file).toLowerCase();
      
      if (ext === '.json') {
        apiDef = loadApiFromJson(file);
      } else if (ext === '.md') {
        apiDef = loadApiFromMarkdown(file);
      } else if (ext === '.yaml' || ext === '.yml') {
        apiDef = loadApiFromYaml(file);
      }
      
      if (apiDef) {
        // 添加源文件信息
        apiDef._source = {
          file,
          type: ext.replace('.', '')
        };
        apis.push(apiDef);
        logger.debug(`已加载API定义: ${apiDef.name} (从 ${file})`);
      }
    });
    
    logger.info(`从目录 ${directory} 加载了 ${apis.length} 个API定义`);
    return apis;
  } catch (error) {
    logger.error(`从目录加载API定义失败: ${directory}`, { error: error.message });
    return apis;
  }
}

module.exports = {
  loadApisFromDirectory,
  loadApiFromJson,
  loadApiFromMarkdown,
  loadApiFromYaml,
  validateApiDefinition
}; 