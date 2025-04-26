/**
 * @file errors.js
 * @description 错误处理模块，定义统一的错误类型和处理机制
 */

/**
 * 基础应用错误类
 */
class AppError extends Error {
  /**
   * 构造函数
   * @param {string} message - 错误消息
   * @param {number} [statusCode=500] - HTTP状态码
   * @param {Object} [metadata={}] - 附加元数据
   */
  constructor(message, statusCode = 500, metadata = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.metadata = metadata;
    this.isOperational = true; // 标记为可操作的错误，便于区分系统错误

    // 捕获错误栈信息
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * 获取格式化的错误信息
   * @returns {Object} 格式化的错误信息
   */
  toJSON() {
    return {
      error: this.name,
      message: this.message,
      statusCode: this.statusCode,
      ...(Object.keys(this.metadata).length > 0 ? { metadata: this.metadata } : {})
    };
  }
}

/**
 * 400 错误 - 无效请求
 */
class BadRequestError extends AppError {
  /**
   * 构造函数
   * @param {string} [message='无效的请求参数'] - 错误消息
   * @param {Object} [metadata={}] - 附加元数据
   */
  constructor(message = '无效的请求参数', metadata = {}) {
    super(message, 400, metadata);
  }
}

/**
 * 401 错误 - 未授权
 */
class UnauthorizedError extends AppError {
  /**
   * 构造函数
   * @param {string} [message='未登录或登录已过期'] - 错误消息
   * @param {Object} [metadata={}] - 附加元数据
   */
  constructor(message = '未登录或登录已过期', metadata = {}) {
    super(message, 401, metadata);
  }
}

/**
 * 403 错误 - 禁止访问
 */
class ForbiddenError extends AppError {
  /**
   * 构造函数
   * @param {string} [message='没有权限执行此操作'] - 错误消息
   * @param {Object} [metadata={}] - 附加元数据
   */
  constructor(message = '没有权限执行此操作', metadata = {}) {
    super(message, 403, metadata);
  }
}

/**
 * 404 错误 - 资源未找到
 */
class NotFoundError extends AppError {
  /**
   * 构造函数
   * @param {string} [message='请求的资源不存在'] - 错误消息
   * @param {Object} [metadata={}] - 附加元数据
   */
  constructor(message = '请求的资源不存在', metadata = {}) {
    super(message, 404, metadata);
  }
}

/**
 * 409 错误 - 资源冲突
 */
class ConflictError extends AppError {
  /**
   * 构造函数
   * @param {string} [message='资源冲突'] - 错误消息
   * @param {Object} [metadata={}] - 附加元数据
   */
  constructor(message = '资源冲突', metadata = {}) {
    super(message, 409, metadata);
  }
}

/**
 * 422 错误 - 数据验证失败
 */
class ValidationError extends AppError {
  /**
   * 构造函数
   * @param {string} [message='数据验证失败'] - 错误消息
   * @param {Array|Object} [details=[]] - 验证错误详情
   */
  constructor(message = '数据验证失败', details = []) {
    super(message, 422, { details });
  }
}

/**
 * 429 错误 - 请求过多
 */
class TooManyRequestsError extends AppError {
  /**
   * 构造函数
   * @param {string} [message='请求过于频繁，请稍后再试'] - 错误消息
   * @param {Object} [metadata={}] - 附加元数据
   */
  constructor(message = '请求过于频繁，请稍后再试', metadata = {}) {
    super(message, 429, metadata);
  }
}

/**
 * 500 错误 - 服务器内部错误
 */
class InternalServerError extends AppError {
  /**
   * 构造函数
   * @param {string} [message='服务器内部错误'] - 错误消息
   * @param {Object} [metadata={}] - 附加元数据
   */
  constructor(message = '服务器内部错误', metadata = {}) {
    super(message, 500, metadata);
  }
}

/**
 * 503 错误 - 服务不可用
 */
class ServiceUnavailableError extends AppError {
  /**
   * 构造函数
   * @param {string} [message='服务暂时不可用'] - 错误消息
   * @param {Object} [metadata={}] - 附加元数据
   */
  constructor(message = '服务暂时不可用', metadata = {}) {
    super(message, 503, metadata);
  }
}

/**
 * 业务逻辑错误
 */
class BusinessError extends AppError {
  /**
   * 构造函数
   * @param {string} message - 错误消息
   * @param {string} [code='BUSINESS_ERROR'] - 业务错误代码
   * @param {Object} [metadata={}] - 附加元数据
   */
  constructor(message, code = 'BUSINESS_ERROR', metadata = {}) {
    super(message, 400, { ...metadata, code });
  }
}

/**
 * 数据库错误
 */
class DatabaseError extends AppError {
  /**
   * 构造函数
   * @param {string} [message='数据库操作失败'] - 错误消息
   * @param {Error} [originalError=null] - 原始错误
   */
  constructor(message = '数据库操作失败', originalError = null) {
    const metadata = originalError ? { originalError: originalError.message } : {};
    super(message, 500, metadata);
  }
}

/**
 * 第三方服务错误
 */
class ExternalServiceError extends AppError {
  /**
   * 构造函数
   * @param {string} [message='第三方服务请求失败'] - 错误消息
   * @param {string} [service=''] - 服务名称
   * @param {Error} [originalError=null] - 原始错误
   */
  constructor(message = '第三方服务请求失败', service = '', originalError = null) {
    const metadata = {
      service,
      ...(originalError ? { originalError: originalError.message } : {})
    };
    super(message, 502, metadata);
  }
}

/**
 * 处理错误的全局中间件
 * @param {Error} err - 错误对象
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
function errorHandler(err, req, res, next) {
  // 默认状态码和错误信息
  let statusCode = 500;
  let errorMessage = '服务器内部错误';
  let errorResponse = {
    error: 'InternalServerError',
    message: errorMessage
  };

  // 如果是自定义应用错误，则使用其信息
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorMessage = err.message;
    errorResponse = err.toJSON();
  } 
  // 处理常见的非自定义错误
  else if (err.name === 'ValidationError') {
    // Mongoose/Joi验证错误
    statusCode = 422;
    errorMessage = '数据验证失败';
    errorResponse = {
      error: 'ValidationError',
      message: errorMessage,
      details: err.details || err.errors || err.message
    };
  } 
  else if (err.name === 'JsonWebTokenError') {
    // JWT错误
    statusCode = 401;
    errorMessage = '无效的令牌';
    errorResponse = {
      error: 'UnauthorizedError',
      message: errorMessage
    };
  }
  else if (err.name === 'TokenExpiredError') {
    // JWT过期错误
    statusCode = 401;
    errorMessage = '令牌已过期';
    errorResponse = {
      error: 'UnauthorizedError',
      message: errorMessage
    };
  }
  else if (err.name === 'SyntaxError' && err.message.includes('JSON')) {
    // JSON解析错误
    statusCode = 400;
    errorMessage = '无效的JSON格式';
    errorResponse = {
      error: 'BadRequestError',
      message: errorMessage
    };
  }
  else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    // 连接错误
    statusCode = 503;
    errorMessage = '服务暂时不可用';
    errorResponse = {
      error: 'ServiceUnavailableError',
      message: errorMessage
    };
  }
  
  // 记录错误
  const logger = req.app.get('logger') || console;
  if (statusCode >= 500) {
    logger.error('服务器错误', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      requestId: req.headers['x-request-id'] || '-'
    });
  } else {
    logger.warn('客户端错误', {
      error: err.message,
      path: req.path,
      method: req.method,
      statusCode,
      requestId: req.headers['x-request-id'] || '-'
    });
  }

  // 在非生产环境中附加错误栈
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
  }

  // 发送错误响应
  res.status(statusCode).json(errorResponse);
}

// 导出
module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  TooManyRequestsError,
  InternalServerError,
  ServiceUnavailableError,
  BusinessError,
  DatabaseError,
  ExternalServiceError,
  errorHandler
}; 