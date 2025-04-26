#!/usr/bin/env node

/**
 * WebAPI MCP服务器命令行工具
 * 提供通过命令行启动和配置MCP服务器的功能
 */

const { program } = require('commander');
const { createServer } = require('../index');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const path = require('path');
const fs = require('fs');
const os = require('os');
const packageJson = require('../package.json');

// 获取版本号
const version = packageJson.version;

// 显示Banner
function showBanner() {
  console.log('=================================================');
  console.log('          WebAPI MCP服务器 CLI                  ');
  console.log('=================================================');
  console.log(`版本: ${version}`);
  console.log('框架: Model Context Protocol SDK');
  console.log('=================================================');
}

// 配置命令行参数
program
  .name('webapi-mcp-server')
  .description('将传统WebAPI转换为MCP工具的服务器')
  .version(version);

// 启动服务器命令
program
  .command('start')
  .description('启动WebAPI MCP服务器')
  .option('-d, --debug', '启用调试模式')
  .option('-l, --log-level <level>', '设置日志级别 (debug, info, warn, error)', 'info')
  .option('-p, --log-path <path>', '设置日志目录路径', path.join(process.cwd(), 'logs'))
  .option('-a, --api-directory <path>', '从目录加载API定义')
  .option('-f, --api-format <format>', '指定API定义格式 (json, markdown, both)', 'both')
  .option('-P, --api-pattern <pattern>', '文件匹配模式，如"*.json"')
  .action(async (options) => {
    // 显示Banner
    showBanner();
    
    // 设置环境变量
    process.env.DEBUG_MODE = options.debug ? 'true' : 'false';
    process.env.LOG_LEVEL = options.logLevel;
    
    // 确保日志目录存在
    const logDir = options.logPath;
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    console.log('系统信息:');
    console.log(`- 操作系统: ${os.type()} ${os.release()}`);
    console.log(`- Node.js: ${process.version}`);
    console.log(`- 工作目录: ${process.cwd()}`);
    console.log(`- 日志级别: ${options.logLevel}`);
    console.log(`- 调试模式: ${options.debug ? '启用' : '禁用'}`);
    console.log(`- 日志目录: ${logDir}`);
    
    if (options.apiDirectory) {
      console.log(`- API目录: ${options.apiDirectory}`);
      console.log(`- API格式: ${options.apiFormat}`);
      if (options.apiPattern) console.log(`- 匹配模式: ${options.apiPattern}`);
    }
    
    console.log('=================================================');
    
    console.log('开始启动WebAPI MCP服务器...');
    
    try {
      // 创建服务器
      const server = createServer({
        debug: options.debug,
        logLevel: options.logLevel,
        logDir: logDir,
        apisDir: options.apiDirectory
      });
      
      // 创建传输通道
      const transport = new StdioServerTransport();
      
      // 连接传输通道
      await server.connect(transport);
      
      console.log('WebAPI MCP服务器启动成功!');
      console.log('服务器正在运行中，等待MCP连接...');
      console.log('按 Ctrl+C 停止服务器');
      
    } catch (error) {
      console.error('服务器启动错误:', error);
      process.exit(1);
    }
  });

// 显示工具列表命令
program
  .command('list-tools')
  .description('列出所有可用的MCP工具')
  .action(() => {
    console.log('=================================================');
    console.log('          可用MCP工具列表                        ');
    console.log('=================================================');
    console.log('API管理工具:');
    console.log('- register_api_from_json_file: 从JSON文件注册API');
    console.log('- register_api_from_json_string: 从JSON字符串注册API');
    console.log('- register_api_from_markdown_file: 从Markdown文件注册API');
    console.log('- register_apis_from_directory: 从目录批量注册API');
    console.log('- unregister_api: 移除已注册的API');
    console.log('- list_apis: 获取所有已注册的API');
    console.log('- get_api_details: 获取API详细信息');
    console.log('- generate_api_tool_names: 获取所有API工具名称列表');
    console.log('- get_server_status: 获取服务器状态');
    console.log('=================================================');
    console.log('自动生成的API工具将以<api_name>_<method_name>的形式命名');
    console.log('例如: weather_api_get_current_weather');
    console.log('=================================================');
  });

// 显示示例命令
program
  .command('example')
  .description('显示API定义和使用示例')
  .option('--json', '显示JSON格式API定义示例')
  .option('--markdown', '显示Markdown格式API定义示例')
  .option('--usage', '显示API使用示例')
  .action((options) => {
    showBanner();
    
    if (options.json) {
      console.log('=================================================');
      console.log('      JSON格式API定义示例                       ');
      console.log('=================================================');
      console.log('```json');
      console.log(JSON.stringify({
        "name": "天气API",
        "version": "1.0.0",
        "description": "提供天气预报和当前天气信息",
        "baseUrl": "https://api.weather.example.com",
        "methods": [
          {
            "name": "获取当前天气",
            "description": "获取指定城市的当前天气信息",
            "endpoint": "/v1/current",
            "method": "GET",
            "parameters": [
              {
                "name": "city",
                "type": "string",
                "description": "城市名称",
                "required": true
              },
              {
                "name": "units",
                "type": "string",
                "description": "温度单位，可选值: celsius, fahrenheit",
                "required": false,
                "default": "celsius"
              }
            ],
            "responseType": "json"
          },
          {
            "name": "获取天气预报",
            "description": "获取指定城市的未来天气预报",
            "endpoint": "/v1/forecast",
            "method": "GET",
            "parameters": [
              {
                "name": "city",
                "type": "string",
                "description": "城市名称",
                "required": true
              },
              {
                "name": "days",
                "type": "number",
                "description": "预报天数，1-7天",
                "required": false,
                "default": 3
              },
              {
                "name": "units",
                "type": "string",
                "description": "温度单位，可选值: celsius, fahrenheit",
                "required": false,
                "default": "celsius"
              }
            ],
            "responseType": "json"
          }
        ],
        "headers": {
          "X-API-Key": "your-api-key-here"
        }
      }, null, 2));
      console.log('```');
    } else if (options.markdown) {
      console.log('=================================================');
      console.log('      Markdown格式API定义示例                    ');
      console.log('=================================================');
      console.log('# 天气API');
      console.log('');
      console.log('提供天气预报和当前天气信息。');
      console.log('');
      console.log('基础URL: `https://api.weather.example.com`');
      console.log('');
      console.log('## 获取当前天气');
      console.log('');
      console.log('获取指定城市的当前天气信息。');
      console.log('');
      console.log('```http');
      console.log('GET /v1/current?city=Beijing&units=celsius');
      console.log('```');
      console.log('');
      console.log('### 参数');
      console.log('');
      console.log('- `city` (string) - 城市名称');
      console.log('- `units` (string) - 温度单位，可选值: celsius, fahrenheit，可选，默认为celsius');
      console.log('');
      console.log('### 请求头');
      console.log('');
      console.log('- `X-API-Key` - your-api-key-here');
      console.log('');
      console.log('### 响应');
      console.log('');
      console.log('```json');
      console.log(JSON.stringify({
        "city": "Beijing",
        "temperature": 23,
        "units": "celsius",
        "conditions": "Sunny",
        "humidity": 45,
        "wind": {
          "speed": 10,
          "direction": "NE"
        },
        "updated_at": "2023-10-15T10:30:00Z"
      }, null, 2));
      console.log('```');
      console.log('');
      console.log('## 获取天气预报');
      console.log('');
      console.log('获取指定城市的未来天气预报。');
      console.log('');
      console.log('```http');
      console.log('GET /v1/forecast?city=Beijing&days=3&units=celsius');
      console.log('```');
      console.log('');
      console.log('### 参数');
      console.log('');
      console.log('- `city` (string) - 城市名称');
      console.log('- `days` (number) - 预报天数，1-7天，可选，默认为3');
      console.log('- `units` (string) - 温度单位，可选值: celsius, fahrenheit，可选，默认为celsius');
      console.log('');
      console.log('### 请求头');
      console.log('');
      console.log('- `X-API-Key` - your-api-key-here');
      console.log('');
      console.log('### 响应');
      console.log('');
      console.log('```json');
      console.log(JSON.stringify({
        "city": "Beijing",
        "units": "celsius",
        "forecast": [
          {
            "date": "2023-10-16",
            "high": 25,
            "low": 15,
            "conditions": "Sunny",
            "precipitation": 0
          },
          {
            "date": "2023-10-17",
            "high": 23,
            "low": 14,
            "conditions": "Partly Cloudy",
            "precipitation": 20
          },
          {
            "date": "2023-10-18",
            "high": 22,
            "low": 15,
            "conditions": "Cloudy",
            "precipitation": 30
          }
        ]
      }, null, 2));
      console.log('```');
    } else if (options.usage) {
      console.log('=================================================');
      console.log('      API使用示例                                ');
      console.log('=================================================');
      console.log('1. 启动WebAPI MCP服务器:');
      console.log('   npx @yinzhouzhi/webapi-mcp-server start');
      console.log('');
      console.log('2. 从目录加载API定义:');
      console.log('   npx @yinzhouzhi/webapi-mcp-server start -a ./api-definitions -f both');
      console.log('');
      console.log('3. 在Node.js中使用:');
      console.log('```javascript');
      console.log('const { spawn } = require(\'child_process\');');
      console.log('const { McpClient } = require(\'@modelcontextprotocol/sdk/client/mcp.js\');');
      console.log('const { StdioClientTransport } = require(\'@modelcontextprotocol/sdk/client/stdio.js\');');
      console.log('');
      console.log('async function connectToMCP() {');
      console.log('  // 启动MCP服务器进程');
      console.log('  const serverProcess = spawn(\'npx\', [\'@yinzhouzhi/webapi-mcp-server\', \'start\'], {');
      console.log('    stdio: [\'pipe\', \'pipe\', \'pipe\']');
      console.log('  });');
      console.log('');
      console.log('  // 创建STDIO传输');
      console.log('  const transport = new StdioClientTransport({');
      console.log('    input: serverProcess.stdout,');
      console.log('    output: serverProcess.stdin,');
      console.log('    error: serverProcess.stderr');
      console.log('  });');
      console.log('');
      console.log('  // 创建客户端');
      console.log('  const client = new McpClient();');
      console.log('  await client.connect(transport);');
      console.log('');
      console.log('  // 注册API');
      console.log('  const result = await client.invokeTool(\'register_api_from_json_file\', {');
      console.log('    filePath: \'./apis/weather-api.json\'');
      console.log('  });');
      console.log('');
      console.log('  console.log(\'API注册结果:\', result);');
      console.log('');
      console.log('  // 调用API工具');
      console.log('  const weatherResult = await client.invokeTool(\'天气api_获取当前天气\', {');
      console.log('    city: \'Beijing\'');
      console.log('  });');
      console.log('');
      console.log('  console.log(\'天气信息:\', weatherResult);');
      console.log('');
      console.log('  // 关闭连接');
      console.log('  await client.disconnect();');
      console.log('  serverProcess.kill();');
      console.log('}');
      console.log('');
      console.log('connectToMCP().catch(console.error);');
      console.log('```');
    } else {
      console.log('请选择要显示的示例类型:');
      console.log('  webapi-mcp-server example --json     # 显示JSON格式API定义示例');
      console.log('  webapi-mcp-server example --markdown # 显示Markdown格式API定义示例');
      console.log('  webapi-mcp-server example --usage    # 显示API使用示例');
    }
  });

// 解析命令行参数
program.parse(process.argv);

// 如果没有提供命令，显示帮助
if (!process.argv.slice(2).length) {
  showBanner();
  program.help();
}

// 处理进程退出
process.on('exit', () => {
  console.log('WebAPI MCP服务器已关闭');
});

// 处理Ctrl+C
process.on('SIGINT', () => {
  console.log('接收到停止信号，WebAPI MCP服务器即将关闭...');
  process.exit(0);
}); 