/**
 * @file mcp-server.js
 * @description WebAPI MCP服务器主程序入口文件
 * 负责将传统Web API转换为MCP工具，支持通过JSON和Markdown文件注册API
 */

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { glob } = require('glob');
const { marked } = require('marked');
const yaml = require('js-yaml');
const { z } = require('zod');
const logger = require('./utils/logger');
const { parseMarkdownAPI } = require('./parsers/markdown-parser');
const { parseJsonAPI } = require('./parsers/json-parser');
const { validateApiDefinition } = require('./validators/api-validator');

// API注册表
const apiRegistry = new Map();

/**
 * 创建并启动MCP服务器
 * @param {Object} options - 服务器配置选项
 * @param {boolean} options.debug - 是否启用调试模式
 * @param {string} options.apisDir - API定义文件目录
 * @param {string} options.configFile - 配置文件路径
 * @param {Function} options.onReady - 服务器就绪回调
 * @returns {McpServer} MCP服务器实例
 */
function createServer(options = {}) {
  const { debug = false, apisDir = '', configFile = '', onReady = null } = options;
  
  if (debug) {
    logger.level = 'debug';
  }
  
  logger.info('正在启动WebAPI MCP服务器...');
  
  // 创建MCP服务器
  const server = new McpServer({
    name: "webapi-mcp-server",
    version: "1.0.0"
  });
  
  // 注册内置工具
  registerBuiltinTools(server);
  
  // 如果指定了配置文件，则加载配置
  if (configFile && fs.existsSync(configFile)) {
    loadConfigFile(configFile, server);
  }
  
  // 如果指定了API目录，则加载该目录下的所有API定义
  if (apisDir && fs.existsSync(apisDir)) {
    loadApisFromDirectory(apisDir, server);
  }
  
  return server;
}

/**
 * 加载配置文件
 * @param {string} configFilePath - 配置文件路径
 * @param {McpServer} server - MCP服务器实例
 */
function loadConfigFile(configFilePath, server) {
  try {
    logger.info(`正在加载配置文件: ${configFilePath}`);
    const ext = path.extname(configFilePath).toLowerCase();
    
    let config;
    if (ext === '.json') {
      const content = fs.readFileSync(configFilePath, 'utf8');
      config = JSON.parse(content);
    } else if (ext === '.yaml' || ext === '.yml') {
      const content = fs.readFileSync(configFilePath, 'utf8');
      config = yaml.load(content);
    } else {
      throw new Error(`不支持的配置文件格式: ${ext}`);
    }
    
    // 处理API目录配置
    if (config.apiDirectories && Array.isArray(config.apiDirectories)) {
      config.apiDirectories.forEach(dir => {
        const dirPath = path.resolve(path.dirname(configFilePath), dir);
        if (fs.existsSync(dirPath)) {
          loadApisFromDirectory(dirPath, server);
        } else {
          logger.warn(`API目录不存在: ${dirPath}`);
        }
      });
    }
    
    // 处理API文件配置
    if (config.apiFiles && Array.isArray(config.apiFiles)) {
      config.apiFiles.forEach(file => {
        const filePath = path.resolve(path.dirname(configFilePath), file);
        if (fs.existsSync(filePath)) {
          loadApiFile(filePath, server);
        } else {
          logger.warn(`API文件不存在: ${filePath}`);
        }
      });
    }
    
    // 处理全局请求头配置
    if (config.globalHeaders && typeof config.globalHeaders === 'object') {
      server.invokeTool('set_default_headers', { headers: config.globalHeaders })
        .then(() => {
          logger.info('成功设置全局请求头');
        })
        .catch(err => {
          logger.error('设置全局请求头失败', err);
        });
    }
    
    logger.info('配置文件加载完成');
  } catch (err) {
    logger.error(`加载配置文件失败: ${configFilePath}`, err);
  }
}

/**
 * 加载单个API文件
 * @param {string} filePath - API文件路径
 * @param {McpServer} server - MCP服务器实例
 */
function loadApiFile(filePath, server) {
  try {
    logger.info(`正在加载API文件: ${filePath}`);
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.json') {
      const content = fs.readFileSync(filePath, 'utf8');
      const apiDef = JSON.parse(content);
      registerApi(apiDef, server);
    } else if (ext === '.md' || ext === '.markdown') {
      const content = fs.readFileSync(filePath, 'utf8');
      const apiDef = parseMarkdownAPI(content);
      if (apiDef) {
        registerApi(apiDef, server);
      }
    } else {
      logger.warn(`不支持的API文件格式: ${ext}`);
    }
  } catch (err) {
    logger.error(`加载API文件失败: ${filePath}`, err);
  }
}

/**
 * 注册内置工具
 * @param {McpServer} server - MCP服务器实例
 */
function registerBuiltinTools(server) {
  // 全局默认请求头
  const globalHeaders = {};
  
  // 注册Web API工具
  server.tool(
    "register_web_api",
    "将Web API注册为MCP工具，使其可以通过MCP协议直接调用。您可以指定API名称、URL、HTTP方法、参数定义、请求头和结果处理路径。注册后将创建与API名称相同的新工具。",
    {
      name: z.string().describe("API名称"),
      url: z.string().describe("API端点URL"),
      method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).default("GET").describe("HTTP方法"),
      description: z.string().optional().describe("API描述"),
      parameters: z.record(z.object({
        type: z.enum(["string", "number", "boolean", "object", "array"]),
        required: z.boolean().default(false),
        description: z.string().optional()
      })).optional().describe("API参数定义"),
      headers: z.record(z.string()).optional().describe("API特定请求头"),
      resultPath: z.string().optional().describe("结果访问路径，例如 data.items")
    },
    async (params) => {
      try {
        // 合并API定义
        const apiDef = {
          ...params,
          headers: { ...globalHeaders, ...params.headers }
        };
        
        // 注册API
        registerApi(apiDef, server);
        
        return {
          content: [{ 
            type: "text", 
            text: `成功注册API: ${params.name}` 
          }]
        };
      } catch (error) {
        logger.error(`注册API失败: ${error.message}`, error);
        return {
          content: [{ 
            type: "text", 
            text: `注册API失败: ${error.message}` 
          }],
          isError: true
        };
      }
    }
  );
  
  // 设置全局默认请求头工具
  server.tool(
    "set_default_headers",
    "设置适用于所有API请求的全局默认请求头。这些请求头将自动应用于通过register_web_api注册的所有API调用，但可以被单个API的特定请求头覆盖。",
    {
      headers: z.record(z.string()).describe("全局默认请求头")
    },
    async (params) => {
      try {
        // 更新全局请求头
        Object.assign(globalHeaders, params.headers);
        
        return {
          content: [{ 
            type: "text", 
            text: `成功设置全局默认请求头: ${JSON.stringify(params.headers, null, 2)}` 
          }]
        };
      } catch (error) {
        logger.error(`设置全局默认请求头失败: ${error.message}`, error);
        return {
          content: [{ 
            type: "text", 
            text: `设置全局默认请求头失败: ${error.message}` 
          }],
          isError: true
        };
      }
    }
  );
  
  // 查看当前注册的全部API工具
  server.tool(
    "list_registered_apis",
    "列出当前已注册的所有Web API，包括它们的名称、URL、方法、参数定义和请求头配置等详细信息。",
    {},
    async () => {
      try {
        const apis = getRegisteredApis();
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify(apis, null, 2) 
          }]
        };
      } catch (error) {
        logger.error(`获取API列表失败: ${error.message}`, error);
        return {
          content: [{ 
            type: "text", 
            text: `获取API列表失败: ${error.message}` 
          }],
          isError: true
        };
      }
    }
  );
  
  // 移除API工具
  server.tool(
    "unregister_api",
    "移除已注册的Web API工具。成功移除后，相应的MCP工具将不再可用。",
    {
      name: z.string().describe("要移除的API名称")
    },
    async (params) => {
      try {
        const result = unregisterApi(params.name, server);
        if (result) {
          return {
            content: [{ 
              type: "text", 
              text: `成功移除API: ${params.name}` 
            }]
          };
        } else {
          return {
            content: [{ 
              type: "text", 
              text: `移除API失败: API不存在或已被移除` 
            }],
            isError: true
          };
        }
      } catch (error) {
        logger.error(`移除API失败: ${error.message}`, error);
        return {
          content: [{ 
            type: "text", 
            text: `移除API失败: ${error.message}` 
          }],
          isError: true
        };
      }
    }
  );
  
  // 从文件加载API定义
  server.tool(
    "load_api_from_file",
    "从JSON或Markdown文件加载API定义并注册为MCP工具",
    {
      filePath: z.string().describe("API定义文件路径，支持.json、.md、.markdown格式")
    },
    async (params) => {
      try {
        const result = loadApiFile(params.filePath, server);
        return {
          content: [{ 
            type: "text", 
            text: `成功从文件加载API: ${params.filePath}` 
          }]
        };
      } catch (error) {
        logger.error(`从文件加载API失败: ${error.message}`, error);
        return {
          content: [{ 
            type: "text", 
            text: `从文件加载API失败: ${error.message}` 
          }],
          isError: true
        };
      }
    }
  );
  
  // 从目录加载API定义
  server.tool(
    "load_apis_from_directory",
    "从目录加载所有API定义文件并注册为MCP工具",
    {
      directory: z.string().describe("API定义文件目录"),
      pattern: z.string().optional().describe("文件匹配模式，例如*.json")
    },
    async (params) => {
      try {
        await loadApisFromDirectory(params.directory, server, params.pattern);
        return {
          content: [{ 
            type: "text", 
            text: `成功从目录加载API: ${params.directory}` 
          }]
        };
      } catch (error) {
        logger.error(`从目录加载API失败: ${error.message}`, error);
        return {
          content: [{ 
            type: "text", 
            text: `从目录加载API失败: ${error.message}` 
          }],
          isError: true
        };
      }
    }
  );
  
  // 从配置文件加载API定义
  server.tool(
    "load_from_config",
    "从配置文件加载API定义",
    {
      configFile: z.string().describe("配置文件路径，支持.json、.yaml、.yml格式")
    },
    async (params) => {
      try {
        loadConfigFile(params.configFile, server);
        return {
          content: [{ 
            type: "text", 
            text: `成功从配置文件加载: ${params.configFile}` 
          }]
        };
      } catch (error) {
        logger.error(`从配置文件加载失败: ${error.message}`, error);
        return {
          content: [{ 
            type: "text", 
            text: `从配置文件加载失败: ${error.message}` 
          }],
          isError: true
        };
      }
    }
  );
}

/**
 * 从目录加载API定义
 * @param {string} directory - API定义文件目录
 * @param {McpServer} server - MCP服务器实例
 * @param {string} pattern - 文件匹配模式
 */
async function loadApisFromDirectory(directory, server, pattern) {
  try {
    const absolutePath = path.resolve(directory);
    logger.info(`正在从目录加载API定义: ${absolutePath}`);
    
    // 查找所有.json和.md文件
    const jsonPattern = pattern || '**/*.json';
    const mdPattern = pattern || '**/*.{md,markdown}';
    
    const jsonFiles = await glob(jsonPattern, { cwd: absolutePath });
    const mdFiles = await glob(mdPattern, { cwd: absolutePath });
    
    logger.debug(`找到 ${jsonFiles.length} 个JSON文件和 ${mdFiles.length} 个Markdown文件`);
    
    // 处理JSON文件
    for (const file of jsonFiles) {
      const filePath = path.join(absolutePath, file);
      try {
        loadApiFile(filePath, server);
      } catch (err) {
        logger.error(`处理JSON文件失败: ${filePath}`, err);
      }
    }
    
    // 处理Markdown文件
    for (const file of mdFiles) {
      const filePath = path.join(absolutePath, file);
      try {
        loadApiFile(filePath, server);
      } catch (err) {
        logger.error(`处理Markdown文件失败: ${filePath}`, err);
      }
    }
    
    logger.info(`成功加载 ${apiRegistry.size} 个API定义`);
  } catch (err) {
    logger.error(`从目录加载API定义失败: ${directory}`, err);
    throw err;
  }
}

/**
 * 注册单个API
 * @param {Object} apiDef - API定义对象
 * @param {McpServer} server - MCP服务器实例
 * @returns {boolean} 是否成功注册
 */
function registerApi(apiDef, server) {
  try {
    // 验证API定义
    const validatedApi = validateApiDefinition(apiDef);
    
    // 检查是否已经注册
    if (apiRegistry.has(validatedApi.name)) {
      logger.warn(`API已存在，将被覆盖: ${validatedApi.name}`);
    }
    
    // 创建参数schema
    const paramSchema = {};
    if (validatedApi.parameters) {
      Object.entries(validatedApi.parameters).forEach(([key, param]) => {
        // 根据参数类型创建适当的zod schema
        switch (param.type) {
          case 'string':
            paramSchema[key] = param.required ? z.string() : z.string().optional();
            break;
          case 'number':
            paramSchema[key] = param.required ? z.number() : z.number().optional();
            break;
          case 'boolean':
            paramSchema[key] = param.required ? z.boolean() : z.boolean().optional();
            break;
          default:
            paramSchema[key] = z.any();
        }
      });
    }
    
    // 创建MCP工具
    server.tool(
      validatedApi.name,
      validatedApi.description,
      paramSchema,
      async (params) => {
        try {
          // 构建请求配置
          const requestConfig = {
            method: validatedApi.method || 'GET',
            url: validatedApi.url,
            headers: validatedApi.headers || {},
            timeout: validatedApi.timeout || 30000
          };
          
          // 根据HTTP方法处理参数
          if (['GET', 'DELETE'].includes(requestConfig.method.toUpperCase())) {
            requestConfig.params = params;
          } else {
            requestConfig.data = params;
          }
          
          // 发送请求
          logger.debug(`发送请求: ${requestConfig.method} ${requestConfig.url}`);
          const response = await axios(requestConfig);
          
          // 结果转换
          let result = response.data;
          if (validatedApi.resultPath) {
            // 支持使用点号路径访问嵌套属性
            result = validatedApi.resultPath.split('.').reduce((obj, key) => 
              (obj && obj[key] !== undefined) ? obj[key] : undefined, result);
          }
          
          return {
            content: [{ type: "text", text: JSON.stringify(result) }]
          };
        } catch (error) {
          logger.error(`API调用失败: ${validatedApi.name}`, error);
          throw new Error(`API调用失败: ${error.message}`);
        }
      }
    );
    
    // 添加到注册表
    apiRegistry.set(validatedApi.name, validatedApi);
    logger.info(`成功注册API: ${validatedApi.name}`);
    
    return true;
  } catch (error) {
    logger.error(`注册API失败`, error);
    return false;
  }
}

/**
 * 获取已注册的API列表
 * @returns {Array} 已注册API的数组
 */
function getRegisteredApis() {
  return Array.from(apiRegistry.values());
}

/**
 * 根据名称获取API定义
 * @param {string} name - API名称
 * @returns {Object|null} API定义对象或null
 */
function getApiByName(name) {
  return apiRegistry.has(name) ? apiRegistry.get(name) : null;
}

/**
 * 取消注册API
 * @param {string} name - API名称
 * @param {McpServer} server - MCP服务器实例
 * @returns {boolean} 是否成功取消注册
 */
function unregisterApi(name, server) {
  if (!apiRegistry.has(name)) {
    logger.warn(`API不存在: ${name}`);
    return false;
  }
  
  try {
    // 在最新版SDK中，需要先获取工具再移除它
    const tool = server.getTool(name);
    if (tool) {
      tool.remove();
      apiRegistry.delete(name);
      logger.info(`成功取消注册API: ${name}`);
      return true;
    } else {
      logger.warn(`找不到工具: ${name}`);
      return false;
    }
  } catch (error) {
    logger.error(`取消注册API失败: ${name}`, error);
    return false;
  }
}

module.exports = {
  createServer,
  registerApi,
  unregisterApi,
  getRegisteredApis,
  getApiByName,
  loadApisFromDirectory,
  loadApiFile,
  loadConfigFile
}; 