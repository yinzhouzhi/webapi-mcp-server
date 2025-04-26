/**
 * @file validator.js
 * @description 数据验证模块，提供统一的数据验证功能
 */

const Joi = require('joi');

/**
 * 验证器类，用于创建和管理验证规则
 */
class Validator {
  /**
   * 构造函数
   */
  constructor() {
    this.schemas = new Map();
  }

  /**
   * 添加验证模式
   * @param {string} name - 验证模式名称
   * @param {Object} schema - Joi 验证模式对象
   * @returns {Validator} - 当前验证器实例，用于链式调用
   */
  addSchema(name, schema) {
    if (typeof name !== 'string' || !name) {
      throw new Error('验证模式名称必须是非空字符串');
    }
    
    if (!schema || typeof schema !== 'object') {
      throw new Error('验证模式必须是有效的Joi对象');
    }
    
    this.schemas.set(name, schema);
    return this;
  }

  /**
   * 获取验证模式
   * @param {string} name - 验证模式名称
   * @returns {Object|null} - Joi验证模式或null
   */
  getSchema(name) {
    return this.schemas.get(name) || null;
  }

  /**
   * 验证数据
   * @param {string} schemaName - 验证模式名称
   * @param {Object} data - 要验证的数据
   * @param {Object} [options] - 验证选项
   * @returns {Object} - 验证结果 {value, error}
   */
  validate(schemaName, data, options = {}) {
    const schema = this.getSchema(schemaName);
    
    if (!schema) {
      throw new Error(`未找到名为"${schemaName}"的验证模式`);
    }
    
    const defaultOptions = {
      abortEarly: false,  // 返回所有错误而不是在第一个错误时停止
      allowUnknown: true, // 允许额外的未知字段
      stripUnknown: true  // 移除未知字段
    };
    
    const validationOptions = { ...defaultOptions, ...options };
    return schema.validate(data, validationOptions);
  }

  /**
   * 异步验证数据并返回清理后的数据或抛出错误
   * @param {string} schemaName - 验证模式名称
   * @param {Object} data - 要验证的数据
   * @param {Object} [options] - 验证选项
   * @returns {Promise<Object>} - 清理后的数据
   * @throws {ValidationError} - 如果验证失败
   */
  async validateAsync(schemaName, data, options = {}) {
    const { error, value } = this.validate(schemaName, data, options);
    
    if (error) {
      const validationError = new ValidationError(
        '数据验证失败',
        error.details
      );
      throw validationError;
    }
    
    return value;
  }
}

/**
 * 验证错误类
 */
class ValidationError extends Error {
  /**
   * 构造函数
   * @param {string} message - 错误消息
   * @param {Array} details - 错误详情
   */
  constructor(message, details) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
    this.statusCode = 400; // 对API响应有用
  }

  /**
   * 获取格式化后的错误信息
   * @returns {Object} - 格式化的错误信息
   */
  toJSON() {
    return {
      error: this.name,
      message: this.message,
      details: this.details.map(item => ({
        path: item.path.join('.'),
        message: item.message
      }))
    };
  }
}

/**
 * 通用验证模式
 */
const commonSchemas = {
  /**
   * ID验证
   */
  id: Joi.object({
    id: Joi.alternatives().try(
      Joi.number().integer().positive(),
      Joi.string().pattern(/^[a-zA-Z0-9_-]+$/)
    ).required().messages({
      'any.required': 'ID是必填项',
      'alternatives.match': 'ID必须是正整数或有效字符串'
    })
  }),

  /**
   * 分页参数验证
   */
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      'number.base': '页码必须是数字',
      'number.integer': '页码必须是整数',
      'number.min': '页码必须大于或等于1'
    }),
    pageSize: Joi.number().integer().min(1).max(100).default(20).messages({
      'number.base': '每页条数必须是数字',
      'number.integer': '每页条数必须是整数', 
      'number.min': '每页条数必须大于或等于1',
      'number.max': '每页条数不能超过100'
    }),
    sortBy: Joi.string().pattern(/^[a-zA-Z0-9_]+$/).messages({
      'string.pattern.base': '排序字段包含无效字符'
    }),
    sortOrder: Joi.string().valid('asc', 'desc').messages({
      'any.only': '排序方向必须是asc或desc'
    })
  })
};

// 创建默认验证器实例
const validator = new Validator();

// 添加通用验证模式
Object.entries(commonSchemas).forEach(([name, schema]) => {
  validator.addSchema(name, schema);
});

// 导出
module.exports = {
  Validator,
  ValidationError,
  validator,
  Joi
}; 