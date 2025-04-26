# WebAPI MCP 服务器

将传统Web API转换为MCP工具的服务器，支持通过MCP工具设置默认请求头。

## 功能特点

- **API转换** - 将任何Web API自动转换为MCP工具
- **动态注册** - 运行时动态注册和移除API
- **全局请求头** - 集中管理所有API的默认请求头
- **灵活参数** - 支持多种参数类型和验证
- **结果路径** - 支持从嵌套响应中提取特定数据
- **批量加载** - 支持从文件或目录批量加载API定义

## 安装

```bash
# 克隆项目
git clone <repository-url>
cd webapi-mcp-server

# 安装依赖
npm install

# 初始化项目目录
npm run setup
```

## 使用方法

### 启动服务器

```bash
npm start

# 使用自定义配置启动
npm start -- --config path/to/config.json --apis-dir path/to/apis

# 使用环境变量启动
WEBAPI_CONFIG_FILE=path/to/config.json WEBAPI_APIS_DIR=path/to/apis WEBAPI_DEBUG=true npm start
```

### 配置文件选项

配置文件支持JSON、YAML和YML格式，可以包含以下选项：

```json
{
  "apiDirectories": [ // 包含API定义文件的目录列表
    "./apis", 
    "./more-apis"
  ],
  "apiFiles": [ // 单独API定义文件的路径列表
    "./specific-api.json",
    "./another-api.md"
  ],
  "globalHeaders": { // 应用于所有API请求的默认请求头
    "User-Agent": "WebAPI MCP Client/1.0", // 用户代理  
    "Accept": "application/json", // 接受的内容类型
    "Authorization": "Bearer YOUR_TOKEN" // 授权令牌
  },
  "debug": true // 是否启用调试模式
}
```

| 配置项 | 类型 | 描述 |
|-------|------|------|
| `apiDirectories` | 数组 | 包含API定义文件的目录列表 |
| `apiFiles` | 数组 | 单独API定义文件的路径列表 |
| `globalHeaders` | 对象 | 应用于所有API请求的默认请求头 |
| `debug` | 布尔值 | 是否启用调试模式 |

### 运行示例

```bash
npm run run-example
```

### 通过CLI工具使用

```bash
# 启动服务器
npm run start

# 显示示例
npm run example
```

### 环境变量配置

服务器也可以通过环境变量进行配置：

| 环境变量 | 描述 |
|---------|------|
| `WEBAPI_CONFIG_FILE` | 配置文件的路径 |
| `WEBAPI_APIS_DIR` | API定义目录的路径 |
| `WEBAPI_DEBUG` | 启用调试模式（设置为 'true'） |

## MCP工具

服务器内置了以下MCP工具：

| 工具名称 | 描述 |
|---------|------|
| `register_web_api` | 将Web API注册为MCP工具，使其可以通过MCP协议直接调用。 |
| `set_default_headers` | 设置适用于所有API请求的全局默认请求头。 |
| `list_registered_apis` | 列出当前已注册的所有Web API及其配置。 |
| `unregister_api` | 移除已注册的Web API工具。 |
| `load_api_from_file` | 从指定文件加载API定义并注册为MCP工具。 |
| `load_apis_from_directory` | 从指定目录加载所有API定义文件并注册为MCP工具。 |
| `load_from_config` | 从配置文件加载API定义和设置。 |

## API定义格式

可以使用JSON或Markdown格式定义API：

### JSON格式
```json
{
  "name": "weather",
  "description": "获取当前天气信息",
  "url": "https://api.example.com/weather",
  "method": "GET",
  "parameters": {
    "city": {
      "type": "string",
      "required": true, // 是否必填
      "description": "城市名称"
    },
    "units": {
      "type": "string",
      "required": false,
      "description": "温度单位 (celsius, fahrenheit)"
    }
  },
  "headers": {
    "X-API-Key": "your-api-key"
  },
  "resultPath": "data.current"
}
```

#### JSON格式字段说明

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `name` | 字符串 | 是 | API工具的唯一名称，用于MCP调用 |
| `description` | 字符串 | 是 | API功能的简要描述 |
| `url` | 字符串 | 是 | API的完整URL地址，支持带参数的URL模板 |
| `method` | 字符串 | 是 | HTTP请求方法(GET, POST, PUT, DELETE等) |
| `parameters` | 对象 | 否 | API参数定义，每个参数包含type, required和description属性 |
| `headers` | 对象 | 否 | 特定于此API的请求头(会与全局请求头合并) |
| `resultPath` | 字符串 | 否 | 从响应中提取结果的路径，使用点表示法(如"data.items") |
| `bodyTemplate` | 对象/字符串 | 否 | POST/PUT请求的请求体模板 |
| `responseType` | 字符串 | 否 | 期望的响应类型(json, text, blob等) |
| `transform` | 字符串 | 否 | 用于转换响应的JavaScript代码字符串 |

### Markdown格式
```markdown
# Weather API

获取当前天气信息

## URL
https://api.example.com/weather

## 方法
GET

## 参数
- city (string, required): 城市名称
- units (string, optional): 温度单位 (celsius, fahrenheit)

## 请求头
- X-API-Key: your-api-key

## 结果路径
data.current
```

#### Markdown格式规范

Markdown格式的API定义需遵循以下结构:

1. **一级标题(#)**: API的名称，将用作MCP工具名称
2. **描述**: 标题下的文本作为API描述
3. **URL部分**: 以`## URL`开头，下一行为API的完整URL
4. **方法部分**: 以`## 方法`开头，下一行为HTTP方法(GET, POST等)
5. **参数部分(可选)**: 以`## 参数`开头，每个参数使用列表项格式
   - 格式: `参数名 (类型, required/optional): 描述`
6. **请求头部分(可选)**: 以`## 请求头`开头，每个请求头使用列表项格式
   - 格式: `请求头名: 值`
7. **结果路径部分(可选)**: 以`## 结果路径`开头，下一行为提取结果的路径
8. **请求体模板(可选)**: 以`## 请求体`开头，后面是JSON格式的请求体模板
9. **响应类型(可选)**: 以`## 响应类型`开头，指定期望的响应类型
10. **转换函数(可选)**: 以`## 转换函数`开头，包含JavaScript转换代码

## 详细文档

- [Web API转换为MCP工具](./docs/web-api-conversion.md) - 如何使用MCP工具注册和管理API

## 示例

查看[API示例](./examples/api-example.js)了解如何：
1. 设置全局默认请求头
2. 注册Web API
3. 列出已注册的API
4. 调用注册的API
5. 移除API

## 导出的API

```javascript
const webapi = require('webapi-mcp-server');

// 创建自定义服务器
const server = webapi.createServer({
  debug: true,
  configFile: './config.json',
  apisDir: './apis'
});

// 使用其他导出函数
webapi.registerApi(apiDefinition);
webapi.unregisterApi('apiName');
webapi.getRegisteredApis();
webapi.loadApiFile('./path/to/api.json');
webapi.loadApisFromDirectory('./apis');
```

## 许可证

MIT 