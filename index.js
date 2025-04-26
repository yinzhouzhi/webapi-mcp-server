/**
 * WebAPI MCP服务器入口文件
 * 导出MCP服务器启动函数并处理直接运行
 */

// 导入核心模块
const { McpServer } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const path = require('path');
const fs = require('fs');

// 获取MCP服务器
const mcpServer = require('./src/mcp-server');

// 日志工具
const logger = require('./src/utils/logger');

// 确保日志目录存在
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 导出所有工具函数和主服务器启动功能
module.exports = {
  // 主服务器创建函数
  createServer: mcpServer.createServer,
  registerApi: mcpServer.registerApi,
  unregisterApi: mcpServer.unregisterApi,
  getRegisteredApis: mcpServer.getRegisteredApis,
  
  // 文件加载功能
  loadApiFile: mcpServer.loadApiFile,
  loadApisFromDirectory: mcpServer.loadApisFromDirectory,
  loadConfigFile: mcpServer.loadConfigFile,
  
  // 工具模块导出
  apiTools: require('./src/tools/api-tools'),
  jsonParser: require('./src/parsers/json-parser'),
  markdownParser: require('./src/parsers/markdown-parser'),
  
  // 日志工具
  logger
}; 

// 如果是直接运行这个文件，则启动服务器
if (require.main === module) {
  console.log('正在启动WebAPI MCP服务器...');
  
  // 从命令行获取配置文件路径
  const args = process.argv.slice(2);
  
  // 支持通过环境变量配置
  let configFile = process.env.WEBAPI_CONFIG_FILE || '';
  let apisDir = process.env.WEBAPI_APIS_DIR || '';
  let debug = process.env.WEBAPI_DEBUG === 'true' || process.env.DEBUG === 'true' || false;
  
  // 简单的参数解析（命令行参数优先级高于环境变量）
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' || args[i] === '-c') {
      configFile = args[i + 1];
      i++;
    } else if (args[i] === '--apis-dir' || args[i] === '-a') {
      apisDir = args[i + 1];
      i++;
    } else if (args[i] === '--debug' || args[i] === '-d') {
      debug = true;
    }
  }
  
  // 打印当前配置信息
  logger.info(`配置信息:
    配置文件: ${configFile || '未指定'}
    API目录: ${apisDir || '未指定'}
    调试模式: ${debug ? '启用' : '禁用'}
  `);
  
  // 创建服务器时传入命令行参数
  const server = mcpServer.createServer({
    debug,
    configFile,
    apisDir
  });
  
  const transport = new StdioServerTransport();
  
  server.connect(transport)
    .then(() => {
      console.log('服务器启动成功，等待连接...');
    })
    .catch(err => {
      console.error('服务器启动失败:', err);
      process.exit(1);
    });
} 