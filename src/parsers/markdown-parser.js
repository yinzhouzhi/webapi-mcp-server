/**
 * @file markdown-parser.js
 * @description 解析Markdown文件中的API定义
 */

const { marked } = require('marked');

/**
 * 从Markdown内容解析API定义
 * @param {string} content - Markdown内容
 * @returns {Object|null} 解析出的API定义对象或null
 */
function parseMarkdownAPI(content) {
  try {
    // 将Markdown解析为HTML片段
    const tokens = marked.lexer(content);
    
    // 初始化API定义对象
    const apiDef = {
      parameters: {}
    };
    
    // 当前处理状态
    let currentSection = null;
    let inParametersTable = false;
    
    // 处理每个标记
    for (const token of tokens) {
      // 处理标题
      if (token.type === 'heading') {
        const title = token.text.toLowerCase();
        if (title === 'api名称' || title === 'api name') {
          currentSection = 'name';
        } else if (title === '描述' || title === 'description') {
          currentSection = 'description';
        } else if (title === 'url' || title === '接口地址') {
          currentSection = 'url';
        } else if (title === '方法' || title === 'method') {
          currentSection = 'method';
        } else if (title === '参数' || title === 'parameters') {
          currentSection = 'parameters';
          inParametersTable = false;
        } else if (title === '返回路径' || title === 'result path') {
          currentSection = 'resultPath';
        } else if (title === '标头' || title === 'headers') {
          currentSection = 'headers';
          apiDef.headers = {};
        } else {
          currentSection = null;
        }
        continue;
      }
      
      // 处理段落内容
      if (token.type === 'paragraph' && currentSection) {
        if (currentSection === 'name') {
          apiDef.name = token.text.trim();
        } else if (currentSection === 'description') {
          apiDef.description = token.text.trim();
        } else if (currentSection === 'url') {
          apiDef.url = token.text.trim();
        } else if (currentSection === 'method') {
          apiDef.method = token.text.trim().toUpperCase();
        } else if (currentSection === 'resultPath') {
          apiDef.resultPath = token.text.trim();
        }
      }
      
      // 处理表格 - 参数定义
      if (currentSection === 'parameters' && token.type === 'table') {
        inParametersTable = true;
        
        // 跳过表头
        for (let i = 1; i < token.rows.length; i++) {
          const row = token.rows[i];
          const [name, type, required, description] = row.map(cell => cell.text.trim());
          
          if (name) {
            apiDef.parameters[name] = {
              type: type.toLowerCase() || 'string',
              required: required.toLowerCase() === 'true' || required.toLowerCase() === '是',
              description: description || ''
            };
          }
        }
      }
      
      // 处理表格 - 标头定义
      if (currentSection === 'headers' && token.type === 'table') {
        // 跳过表头
        for (let i = 1; i < token.rows.length; i++) {
          const row = token.rows[i];
          const [name, value] = row.map(cell => cell.text.trim());
          
          if (name && value) {
            apiDef.headers[name] = value;
          }
        }
      }
    }
    
    // 验证API定义是否有必要的字段
    if (!apiDef.name || !apiDef.url) {
      return null;
    }
    
    return apiDef;
  } catch (error) {
    console.error('解析Markdown API定义失败:', error);
    return null;
  }
}

module.exports = {
  parseMarkdownAPI
}; 