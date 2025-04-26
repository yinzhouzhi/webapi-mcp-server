/**
 * @file httpClient.js
 * @description HTTP请求工具，基于axios封装，提供统一的请求接口
 */

const axios = require('axios');
const logger = require('./logger');

/**
 * 默认配置
 */
const defaultConfig = {
  // 请求超时时间
  timeout: 30000,
  // 请求头
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  // 是否携带凭证（cookies）
  withCredentials: false
};

/**
 * HTTP客户端类
 */
class HttpClient {
  /**
   * 构造函数
   * @param {Object} [config={}] - 全局配置参数
   */
  constructor(config = {}) {
    this.config = { ...defaultConfig, ...config };
    this.instance = axios.create(this.config);
    
    // 请求拦截器
    this.instance.interceptors.request.use(
      (config) => {
        const contextLogger = logger.child({ 
          url: config.url,
          method: config.method.toUpperCase(),
          requestId: config.headers['X-Request-ID'] || '-'
        });
        
        contextLogger.debug('发送HTTP请求');
        
        // 添加时间戳，方便计算请求耗时
        config._requestTime = Date.now();
        
        return config;
      },
      (error) => {
        logger.error('HTTP请求配置错误', { error: error.message });
        return Promise.reject(error);
      }
    );
    
    // 响应拦截器
    this.instance.interceptors.response.use(
      (response) => {
        const { config } = response;
        const elapsed = Date.now() - config._requestTime;
        
        const contextLogger = logger.child({
          url: config.url,
          method: config.method.toUpperCase(),
          status: response.status,
          elapsed: `${elapsed}ms`,
          requestId: config.headers['X-Request-ID'] || '-'
        });
        
        contextLogger.debug('HTTP请求成功');
        
        return response.data;
      },
      (error) => {
        const { config, response } = error;
        
        if (!config) {
          logger.error('HTTP请求发生网络错误', { error: error.message });
          return Promise.reject(new HttpError('网络错误', 0, error));
        }
        
        const elapsed = Date.now() - config._requestTime;
        const status = response ? response.status : 0;
        const responseData = response ? response.data : null;
        
        const contextLogger = logger.child({
          url: config.url,
          method: config.method.toUpperCase(),
          status,
          elapsed: `${elapsed}ms`,
          requestId: config.headers['X-Request-ID'] || '-'
        });
        
        contextLogger.error('HTTP请求失败', { 
          error: error.message,
          response: responseData
        });
        
        // 处理错误响应
        if (response) {
          return Promise.reject(
            new HttpError(
              responseData?.message || '请求失败',
              status,
              responseData
            )
          );
        } else if (error.code === 'ECONNABORTED') {
          return Promise.reject(new HttpError('请求超时', 408));
        } else {
          return Promise.reject(new HttpError('网络错误', 0, error));
        }
      }
    );
  }
  
  /**
   * 设置请求头
   * @param {Object} headers - 请求头对象
   */
  setHeaders(headers) {
    Object.assign(this.instance.defaults.headers.common, headers);
  }
  
  /**
   * 设置认证令牌
   * @param {string} token - 认证令牌
   * @param {string} [type='Bearer'] - 令牌类型
   */
  setAuthToken(token, type = 'Bearer') {
    if (token) {
      this.instance.defaults.headers.common['Authorization'] = `${type} ${token}`;
    } else {
      delete this.instance.defaults.headers.common['Authorization'];
    }
  }
  
  /**
   * 发送GET请求
   * @param {string} url - 请求URL
   * @param {Object} [params={}] - 查询参数
   * @param {Object} [config={}] - 请求配置
   * @returns {Promise<any>} - 请求结果
   */
  get(url, params = {}, config = {}) {
    return this.instance.get(url, { ...config, params });
  }
  
  /**
   * 发送POST请求
   * @param {string} url - 请求URL
   * @param {Object} [data={}] - 请求数据
   * @param {Object} [config={}] - 请求配置
   * @returns {Promise<any>} - 请求结果
   */
  post(url, data = {}, config = {}) {
    return this.instance.post(url, data, config);
  }
  
  /**
   * 发送PUT请求
   * @param {string} url - 请求URL
   * @param {Object} [data={}] - 请求数据
   * @param {Object} [config={}] - 请求配置
   * @returns {Promise<any>} - 请求结果
   */
  put(url, data = {}, config = {}) {
    return this.instance.put(url, data, config);
  }
  
  /**
   * 发送DELETE请求
   * @param {string} url - 请求URL
   * @param {Object} [params={}] - 查询参数
   * @param {Object} [config={}] - 请求配置
   * @returns {Promise<any>} - 请求结果
   */
  delete(url, params = {}, config = {}) {
    return this.instance.delete(url, { ...config, params });
  }
  
  /**
   * 发送PATCH请求
   * @param {string} url - 请求URL
   * @param {Object} [data={}] - 请求数据
   * @param {Object} [config={}] - 请求配置
   * @returns {Promise<any>} - 请求结果
   */
  patch(url, data = {}, config = {}) {
    return this.instance.patch(url, data, config);
  }
  
  /**
   * 并发请求
   * @param {Array<Promise>} requests - 请求数组
   * @returns {Promise<Array<any>>} - 所有请求结果
   */
  all(requests) {
    return Promise.all(requests);
  }
}

/**
 * HTTP错误类
 */
class HttpError extends Error {
  /**
   * 构造函数
   * @param {string} message - 错误消息
   * @param {number} status - HTTP状态码
   * @param {any} data - 错误数据
   */
  constructor(message, status, data = null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.data = data;
  }
  
  /**
   * 获取格式化后的错误信息
   * @returns {Object} - 格式化的错误信息
   */
  toJSON() {
    return {
      error: this.name,
      message: this.message,
      status: this.status,
      data: this.data
    };
  }
}

// 创建默认实例
const httpClient = new HttpClient();

// 导出
module.exports = {
  HttpClient,
  HttpError,
  httpClient
}; 