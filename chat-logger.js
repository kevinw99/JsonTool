#!/usr/bin/env node

/**
 * Chat Logger - Automated Copilot Chat Request Logging System
 * 
 * This script helps track chat requests, responses, and potential regressions
 * for the JSON Tool project development.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ChatLogger {
  constructor() {
    this.logFile = path.join(__dirname, 'CHAT_LOG.md');
    this.screenshotDir = path.join(__dirname, 'screenshots');
    this.requestCounter = this.getLastRequestNumber() + 1;
    
    // Ensure screenshot directory exists
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir);
    }
  }

  getLastRequestNumber() {
    if (!fs.existsSync(this.logFile)) return 0;
    
    const content = fs.readFileSync(this.logFile, 'utf8');
    const matches = content.match(/### Request #(\d+)/g);
    if (!matches) return 0;
    
    const numbers = matches.map(match => parseInt(match.match(/\d+/)[0]));
    return Math.max(...numbers);
  }

  logRequest(data) {
    const {
      request,
      context = '',
      issues = [],
      solution = '',
      status = '🚧 In Progress',
      screenshots = [],
      notes = ''
    } = data;

    const timestamp = new Date().toISOString().split('T')[0];
    const requestNumber = this.requestCounter++;

    const entry = `
### Request #${requestNumber} - ${this.generateTitle(request)}
**Date**: ${timestamp}  
**Request**: "${request}"  
${context ? `**Context**: ${context}  ` : ''}
${issues.length ? `**Issues**: \n${issues.map(issue => `- ${issue}`).join('\n')}  ` : ''}
${solution ? `**Solution**: ${solution}  ` : ''}
${screenshots.length ? `**Screenshots**: ${screenshots.map(s => `![${s}](./screenshots/${s})`).join(', ')}  ` : ''}
${notes ? `**Notes**: ${notes}  ` : ''}
**Status**: ${status}  

`;

    // Append to log file
    let content = '';
    if (fs.existsSync(this.logFile)) {
      content = fs.readFileSync(this.logFile, 'utf8');
    }

    // Insert before the "Key Patterns & Regressions" section
    const insertPoint = content.indexOf('## Key Patterns & Regressions Identified');
    if (insertPoint !== -1) {
      content = content.slice(0, insertPoint) + entry + content.slice(insertPoint);
    } else {
      content += entry;
    }

    fs.writeFileSync(this.logFile, content);
    console.log(`✅ Logged request #${requestNumber}: ${this.generateTitle(request)}`);
    
    return requestNumber;
  }

  generateTitle(request) {
    // Extract meaningful keywords for title
    const words = request.toLowerCase().split(' ');
    const keywords = ['fix', 'implement', 'add', 'remove', 'update', 'create', 'bug', 'issue', 'feature'];
    
    for (let word of keywords) {
      if (words.includes(word)) {
        const index = words.indexOf(word);
        const title = words.slice(index, index + 3).join(' ');
        return title.charAt(0).toUpperCase() + title.slice(1);
      }
    }
    
    return request.slice(0, 50) + (request.length > 50 ? '...' : '');
  }

  markCompleted(requestNumber, solution = '') {
    this.updateStatus(requestNumber, '✅ Completed', solution);
  }

  markFailed(requestNumber, reason = '') {
    this.updateStatus(requestNumber, '❌ Failed', reason);
  }

  updateStatus(requestNumber, status, additionalInfo = '') {
    if (!fs.existsSync(this.logFile)) return;

    let content = fs.readFileSync(this.logFile, 'utf8');
    const regex = new RegExp(`(### Request #${requestNumber}[\\s\\S]*?)\\*\\*Status\\*\\*: [^\\n]*`);
    
    const replacement = `$1**Status**: ${status}${additionalInfo ? `\n**Update**: ${additionalInfo}` : ''}`;
    content = content.replace(regex, replacement);
    
    fs.writeFileSync(this.logFile, content);
    console.log(`✅ Updated request #${requestNumber} status to: ${status}`);
  }

  searchRequests(keyword) {
    if (!fs.existsSync(this.logFile)) return [];

    const content = fs.readFileSync(this.logFile, 'utf8');
    const requests = content.split('### Request #').slice(1);
    
    return requests
      .filter(request => request.toLowerCase().includes(keyword.toLowerCase()))
      .map(request => {
        const lines = request.split('\n');
        const number = lines[0].match(/\d+/)[0];
        const title = lines[0].split(' - ')[1];
        return { number, title, content: request };
      });
  }

  generateReport() {
    const content = fs.readFileSync(this.logFile, 'utf8');
    const requests = content.match(/### Request #\d+/g) || [];
    const completed = content.match(/\*\*Status\*\*: ✅ Completed/g) || [];
    const failed = content.match(/\*\*Status\*\*: ❌ Failed/g) || [];
    const inProgress = content.match(/\*\*Status\*\*: 🚧 In Progress/g) || [];

    return {
      total: requests.length,
      completed: completed.length,
      failed: failed.length,
      inProgress: inProgress.length,
      completionRate: ((completed.length / requests.length) * 100).toFixed(1)
    };
  }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const logger = new ChatLogger();

  switch (args[0]) {
    case 'log':
      const request = args[1];
      if (!request) {
        console.error('Usage: node chat-logger.js log "your request here"');
        process.exit(1);
      }
      logger.logRequest({ request });
      break;

    case 'complete':
      const requestNum = parseInt(args[1]);
      const solution = args[2] || '';
      logger.markCompleted(requestNum, solution);
      break;

    case 'search':
      const keyword = args[1];
      const results = logger.searchRequests(keyword);
      console.log(`Found ${results.length} requests matching "${keyword}":`);
      results.forEach(r => console.log(`#${r.number}: ${r.title}`));
      break;

    case 'report':
      const report = logger.generateReport();
      console.log('📊 Chat Request Report:');
      console.log(`Total Requests: ${report.total}`);
      console.log(`Completed: ${report.completed} (${report.completionRate}%)`);
      console.log(`In Progress: ${report.inProgress}`);
      console.log(`Failed: ${report.failed}`);
      break;

    default:
      console.log(`
Usage: node chat-logger.js <command> [args]

Commands:
  log "request"         Log a new chat request
  complete <num> [sol]  Mark request as completed with optional solution
  search <keyword>      Search requests by keyword
  report               Generate status report

Examples:
  node chat-logger.js log "fix alignment issue"
  node chat-logger.js complete 15 "Updated CSS flexbox"
  node chat-logger.js search "navigation"
  node chat-logger.js report
      `);
  }
}

export default ChatLogger;
