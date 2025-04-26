/**
 * @file config.js
 * @description 配置管理模块，提供统一的配置加载和访问方式
 */

const path = require('path');
const fs = require('fs-extra');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');

/**
 * 配置管理类
 */
class ConfigManager {
  /**
   * 构造函数
   */
  constructor() {
    this.config = {};
    this.isLoaded = false;
  }

  /**
   * 初始化配置
   * @param {Object} [options={}] - 初始化选项
   * @param {string} [options.configPath] - 配置文件路径
   * @param {string} [options.env] - 环境名称
   * @returns {ConfigManager} - 配置管理器实例
   */
  init(options = {}) {
    if (this.isLoaded) {
      return this;
    }

    const env = options.env || process.env.NODE_ENV || 'development';
    process.env.NODE_ENV = env;

    // 加载 .env 文件
    this._loadEnvFiles(env, options.configPath);

    // 加载基础配置
    this._loadBaseConfig();

    this.isLoaded = true;
    return this;
  }

  /**
   * 加载环境变量文件
   * @param {string} env - 环境名称
   * @param {string} [configPath] - 配置文件路径
   * @private
   */
  _loadEnvFiles(env, configPath) {
    const rootDir = configPath || process.cwd();
    
    // 按优先级从低到高加载环境变量文件
    const envFiles = [
      '.env',                  // 基础环境变量
      `.env.${env}`,           // 特定环境变量
      '.env.local',            // 本地覆盖变量
      `.env.${env}.local`      // 特定环境的本地覆盖变量
    ];

    // 从低优先级到高优先级加载配置文件
    envFiles.forEach(file => {
      const envPath = path.resolve(rootDir, file);
      
      if (fs.existsSync(envPath)) {
        const envConfig = dotenv.config({ path: envPath });
        dotenvExpand.expand(envConfig);
      }
    });
  }

  /**
   * 加载基础配置
   * @private
   */
  _loadBaseConfig() {
    // 服务器配置
    this.config.server = {
      port: this._parseIntValue(process.env.PORT, 3000),
      host: process.env.HOST || '127.0.0.1',
      env: process.env.NODE_ENV || 'development',
      isDev: (process.env.NODE_ENV || 'development') === 'development',
      isProd: process.env.NODE_ENV === 'production',
      isTest: process.env.NODE_ENV === 'test',
      baseUrl: process.env.BASE_URL || '/',
      apiPrefix: process.env.API_PREFIX || '/api'
    };

    // 日志配置
    this.config.log = {
      level: process.env.LOG_LEVEL || (this.config.server.isDev ? 'debug' : 'info'),
      dir: process.env.LOG_DIR || './logs',
      maxSize: process.env.LOG_MAX_SIZE || '10m',
      maxFiles: this._parseIntValue(process.env.LOG_MAX_FILES, 5),
      console: this._parseBoolValue(process.env.LOG_CONSOLE, !this.config.server.isProd)
    };

    // 数据库配置
    this.config.db = {
      url: process.env.DB_URL,
      host: process.env.DB_HOST || 'localhost',
      port: this._parseIntValue(process.env.DB_PORT, 27017),
      name: process.env.DB_NAME || 'app_db',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }
    };

    // 认证配置
    this.config.auth = {
      jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
      jwtExpire: process.env.JWT_EXPIRE || '1d',
      saltRounds: this._parseIntValue(process.env.SALT_ROUNDS, 10)
    };

    // 缓存配置
    this.config.cache = {
      type: process.env.CACHE_TYPE || 'memory',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: this._parseIntValue(process.env.REDIS_PORT, 6379),
        password: process.env.REDIS_PASSWORD || '',
        db: this._parseIntValue(process.env.REDIS_DB, 0),
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'app:'
      },
      ttl: this._parseIntValue(process.env.CACHE_TTL, 60 * 60) // 默认1小时
    };
  }

  /**
   * 获取配置值
   * @param {string} key - 配置键，支持点表示法，如 'server.port'
   * @param {any} [defaultValue] - 默认值
   * @returns {any} - 配置值
   */
  get(key, defaultValue) {
    if (!this.isLoaded) {
      this.init();
    }

    if (!key) {
      return this.config;
    }

    const keyParts = key.split('.');
    let value = this.config;

    for (const part of keyParts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * 设置配置值
   * @param {string} key - 配置键，支持点表示法，如 'server.port'
   * @param {any} value - 配置值
   * @returns {ConfigManager} - 配置管理器实例
   */
  set(key, value) {
    if (!this.isLoaded) {
      this.init();
    }

    if (!key) {
      return this;
    }

    const keyParts = key.split('.');
    let config = this.config;

    for (let i = 0; i < keyParts.length - 1; i++) {
      const part = keyParts[i];
      
      if (!(part in config) || typeof config[part] !== 'object') {
        config[part] = {};
      }
      
      config = config[part];
    }

    const lastKey = keyParts[keyParts.length - 1];
    config[lastKey] = value;

    return this;
  }

  /**
   * 重置配置
   * @returns {ConfigManager} - 配置管理器实例
   */
  reset() {
    this.config = {};
    this.isLoaded = false;
    return this;
  }

  /**
   * 将字符串解析为整数
   * @param {string|number} value - 要解析的值
   * @param {number} defaultValue - 默认值
   * @returns {number} - 解析后的整数
   * @private
   */
  _parseIntValue(value, defaultValue) {
    if (value === undefined || value === null) {
      return defaultValue;
    }
    
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * 将字符串解析为布尔值
   * @param {string|boolean} value - 要解析的值
   * @param {boolean} defaultValue - 默认值
   * @returns {boolean} - 解析后的布尔值
   * @private
   */
  _parseBoolValue(value, defaultValue) {
    if (value === undefined || value === null) {
      return defaultValue;
    }
    
    if (typeof value === 'boolean') {
      return value;
    }
    
    const strValue = String(value).toLowerCase();
    return strValue === 'true' || strValue === '1' || strValue === 'yes';
  }
}

// 创建单例实例
const config = new ConfigManager();

// 导出
module.exports = config; 