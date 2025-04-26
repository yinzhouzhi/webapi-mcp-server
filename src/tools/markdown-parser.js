/**
 * @file markdown-parser.js
 * @description Markdown解析工具，用于解析markdown格式的API文档
 */

const { marked } = require('marked');

/**
 * 解析Markdown字符串
 * @param {string} markdown - Markdown字符串
 * @returns {string} 解析后的HTML
 */
function parseMarkdown(markdown) {
  try {
    return marked.parse(markdown);
  } catch (error) {
    console.error('Markdown解析失败:', error.message);
    return '';
  }
}

/**
 * 从Markdown提取标题
 * @param {string} markdown - Markdown字符串
 * @returns {Array<{level: number, text: string, id: string}>} 标题列表
 */
function extractHeadings(markdown) {
  try {
    const headings = [];
    const tokens = marked.lexer(markdown);
    
    tokens.forEach(token => {
      if (token.type === 'heading') {
        const id = token.text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-');
        
        headings.push({
          level: token.depth,
          text: token.text,
          id
        });
      }
    });
    
    return headings;
  } catch (error) {
    console.error('提取Markdown标题失败:', error.message);
    return [];
  }
}

/**
 * 从Markdown提取表格数据
 * @param {string} markdown - Markdown字符串
 * @returns {Array<{headers: string[], rows: string[][]}>} 表格数据列表
 */
function extractTables(markdown) {
  try {
    const tables = [];
    const tokens = marked.lexer(markdown);
    
    tokens.forEach(token => {
      if (token.type === 'table') {
        tables.push({
          headers: token.header,
          rows: token.rows
        });
      }
    });
    
    return tables;
  } catch (error) {
    console.error('提取Markdown表格失败:', error.message);
    return [];
  }
}

/**
 * 从Markdown提取代码块
 * @param {string} markdown - Markdown字符串
 * @returns {Array<{language: string, code: string}>} 代码块列表
 */
function extractCodeBlocks(markdown) {
  try {
    const codeBlocks = [];
    const tokens = marked.lexer(markdown);
    
    tokens.forEach(token => {
      if (token.type === 'code') {
        codeBlocks.push({
          language: token.lang || '',
          code: token.text
        });
      }
    });
    
    return codeBlocks;
  } catch (error) {
    console.error('提取Markdown代码块失败:', error.message);
    return [];
  }
}

/**
 * 将Markdown转换为纯文本
 * @param {string} markdown - Markdown字符串
 * @returns {string} 纯文本内容
 */
function markdownToPlainText(markdown) {
  try {
    // 替换标题
    let text = markdown.replace(/#{1,6}\s+([^\n]+)/g, '$1\n');
    
    // 替换粗体和斜体
    text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '$1');
    text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
    text = text.replace(/\*([^*]+)\*/g, '$1');
    
    // 替换链接
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    
    // 替换列表
    text = text.replace(/^\s*[-*+]\s+/gm, '- ');
    
    // 替换代码块
    text = text.replace(/```[\s\S]*?```/g, '');
    text = text.replace(/`([^`]+)`/g, '$1');
    
    return text.trim();
  } catch (error) {
    console.error('Markdown转文本失败:', error.message);
    return markdown;
  }
}

module.exports = {
  parseMarkdown,
  extractHeadings,
  extractTables,
  extractCodeBlocks,
  markdownToPlainText
}; 