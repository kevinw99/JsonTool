#!/usr/bin/env node

/**
 * Smart Chat Logger - Zero-Effort Automated Logging System
 * 
 * Features:
 * - Auto-detects new chat sessions
 * - Auto-increments request numbers with sub-request support
 * - Auto-commits with meaningful messages
 * - Auto-links to git commits
 * - Smart request categorization
 * - Minimal typing required for reference
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SmartLogger {
  constructor() {
    this.logFile = path.join(__dirname, 'CHAT_LOG.md');
    this.stateFile = path.join(__dirname, '.chat-state.json');
    this.testCasesDir = path.join(__dirname, 'test-cases');
    
    // Ensure directories exist
    if (!fs.existsSync(this.testCasesDir)) {
      fs.mkdirSync(this.testCasesDir, { recursive: true });
    }
    
    this.loadState();
  }

  loadState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        this.state = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
      } else {
        this.state = {
          lastRequestNumber: this.getLastRequestNumber(),
          currentSession: null,
          lastCommit: this.getCurrentCommit()
        };
        this.saveState();
      }
    } catch (error) {
      console.error('Error loading state:', error.message);
      this.state = { lastRequestNumber: 0, currentSession: null, lastCommit: null };
    }
  }

  saveState() {
    try {
      fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
    } catch (error) {
      console.error('Error saving state:', error.message);
    }
  }

  getCurrentCommit() {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim().substring(0, 8);
    } catch {
      return null;
    }
  }

  getLastRequestNumber() {
    if (!fs.existsSync(this.logFile)) return 0;
    
    const content = fs.readFileSync(this.logFile, 'utf8');
    const matches = content.match(/### Request #(\d+)(?:\.(\d+))?/g);
    if (!matches) return 0;
    
    let maxNumber = 0;
    matches.forEach(match => {
      const nums = match.match(/\d+/g);
      const mainNum = parseInt(nums[0]);
      if (mainNum > maxNumber) maxNumber = mainNum;
    });
    
    return maxNumber;
  }

  // Auto-detect if this is a new request or continuation
  autoLog(request, options = {}) {
    const {
      isSubRequest = false,
      parentRequest = null,
      createTestCase = true,
      autoCommit = true
    } = options;

    // Auto-detect request type
    const requestType = this.categorizeRequest(request);
    
    let requestNumber;
    if (isSubRequest && parentRequest) {
      requestNumber = this.getNextSubRequestNumber(parentRequest);
    } else {
      requestNumber = ++this.state.lastRequestNumber;
    }

    // Auto-commit current changes before logging
    if (autoCommit) {
      this.autoCommit(`Before request #${requestNumber}`);
    }

    const logEntry = this.createLogEntry(requestNumber, request, requestType);
    this.insertLogEntry(logEntry, isSubRequest, parentRequest);
    
    // Create test case if needed
    if (createTestCase && requestType.needsTestCase) {
      this.createTestCase(requestNumber, request, requestType);
    }

    // Update state
    this.state.currentSession = requestNumber;
    this.state.lastCommit = this.getCurrentCommit();
    this.saveState();

    console.log(`📝 Auto-logged request #${requestNumber} (${requestType.category})`);
    console.log(`🔗 Commit: ${this.state.lastCommit}`);
    console.log(`📋 Quick ref: ref ${requestNumber}`);
    
    return requestNumber;
  }

  categorizeRequest(request) {
    const text = request.toLowerCase();
    
    if (text.includes('fix') || text.includes('bug') || text.includes('issue') || text.includes('broken')) {
      return { 
        category: 'Bug Fix', 
        icon: '🐛', 
        needsTestCase: true,
        priority: 'high'
      };
    }
    
    if (text.includes('implement') || text.includes('add') || text.includes('create')) {
      return { 
        category: 'Feature', 
        icon: '✨', 
        needsTestCase: true,
        priority: 'medium'
      };
    }
    
    if (text.includes('ui') || text.includes('css') || text.includes('style') || text.includes('responsive')) {
      return { 
        category: 'UI/UX', 
        icon: '🎨', 
        needsTestCase: false,
        priority: 'medium'
      };
    }
    
    if (text.includes('refactor') || text.includes('clean') || text.includes('optimize')) {
      return { 
        category: 'Refactor', 
        icon: '♻️', 
        needsTestCase: false,
        priority: 'low'
      };
    }
    
    return { 
      category: 'General', 
      icon: '💬', 
      needsTestCase: false,
      priority: 'medium'
    };
  }

  createLogEntry(requestNumber, request, requestType) {
    const timestamp = new Date().toISOString().split('T')[0];
    const commit = this.getCurrentCommit();
    
    return `### Request #${requestNumber} - ${requestType.icon} ${requestType.category}
**Date**: ${timestamp}  
**Request**: "${request}"  
**Commit**: ${commit ? `[\`${commit}\`](https://github.com/user/repo/commit/${commit})` : 'N/A'}  
**Priority**: ${requestType.priority}  
**Status**: 🚧 In Progress  

`;
  }

  insertLogEntry(logEntry, isSubRequest, parentRequest) {
    let content = fs.readFileSync(this.logFile, 'utf8');
    
    if (isSubRequest && parentRequest) {
      // Insert as sub-request under parent
      const parentPattern = new RegExp(`(### Request #${parentRequest}[\\s\\S]*?)(?=### Request #|$)`);
      content = content.replace(parentPattern, (match) => {
        return match + '\n' + logEntry;
      });
    } else {
      // Insert as new main request
      const insertPoint = content.indexOf('## Key Patterns & Regressions Identified');
      if (insertPoint !== -1) {
        content = content.slice(0, insertPoint) + logEntry + '\n' + content.slice(insertPoint);
      } else {
        content += '\n' + logEntry;
      }
    }
    
    fs.writeFileSync(this.logFile, content);
  }

  getNextSubRequestNumber(parentRequest) {
    const content = fs.readFileSync(this.logFile, 'utf8');
    const pattern = new RegExp(`### Request #${parentRequest}\\.(\\d+)`, 'g');
    const matches = [...content.matchAll(pattern)];
    
    if (matches.length === 0) return `${parentRequest}.1`;
    
    const maxSub = Math.max(...matches.map(m => parseInt(m[1])));
    return `${parentRequest}.${maxSub + 1}`;
  }

  createTestCase(requestNumber, request, requestType) {
    const testCase = {
      id: requestNumber,
      request: request,
      category: requestType.category,
      created: new Date().toISOString(),
      testSteps: this.generateTestSteps(request, requestType),
      expectedResult: this.generateExpectedResult(request, requestType),
      sampleData: this.generateSampleData(request, requestType)
    };
    
    const testFile = path.join(this.testCasesDir, `test-${requestNumber}.json`);
    fs.writeFileSync(testFile, JSON.stringify(testCase, null, 2));
    
    console.log(`📋 Test case created: test-cases/test-${requestNumber}.json`);
  }

  generateTestSteps(request, requestType) {
    const text = request.toLowerCase();
    
    if (text.includes('navigation') || text.includes('click') || text.includes('goto')) {
      return [
        "1. Load sample JSON files",
        "2. Open differences panel",
        "3. Click on a difference item",
        "4. Verify navigation to correct JSON node",
        "5. Verify node is expanded and highlighted"
      ];
    }
    
    if (text.includes('responsive') || text.includes('ui') || text.includes('css')) {
      return [
        "1. Load JSON comparison",
        "2. Resize browser window to different sizes",
        "3. Verify layout remains functional",
        "4. Check text alignment and overflow handling",
        "5. Test on mobile device sizes"
      ];
    }
    
    return [
      "1. Load application",
      "2. Perform the requested action",
      "3. Verify expected behavior",
      "4. Test edge cases",
      "5. Verify no regressions"
    ];
  }

  generateExpectedResult(request, requestType) {
    if (requestType.category === 'Bug Fix') {
      return "Issue should be resolved without breaking existing functionality";
    }
    
    if (requestType.category === 'Feature') {
      return "New feature should work as specified and integrate seamlessly";
    }
    
    if (requestType.category === 'UI/UX') {
      return "UI should be improved while maintaining usability";
    }
    
    return "Request should be completed successfully";
  }

  generateSampleData(request, requestType) {
    const text = request.toLowerCase();
    
    if (text.includes('json') || text.includes('compare')) {
      return {
        file1: "sample1.json",
        file2: "sample2.json",
        description: "Use standard sample files for testing"
      };
    }
    
    return {
      description: "Use existing application state for testing"
    };
  }

  autoCommit(message) {
    try {
      // Check if there are changes to commit
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      if (status.trim()) {
        execSync('git add .');
        execSync(`git commit -m "${message}"`, { encoding: 'utf8' });
        console.log(`📝 Auto-committed: ${message}`);
      }
    } catch (error) {
      console.log(`⚠️ Auto-commit failed: ${error.message}`);
    }
  }

  // Quick reference commands
  ref(requestNumber) {
    const content = fs.readFileSync(this.logFile, 'utf8');
    const pattern = new RegExp(`### Request #${requestNumber}(?:\\.\\d+)?[\\s\\S]*?(?=### Request #|## Key Patterns|$)`);
    const match = content.match(pattern);
    
    if (match) {
      console.log(match[0]);
    } else {
      console.log(`❌ Request #${requestNumber} not found`);
    }
  }

  find(query) {
    const content = fs.readFileSync(this.logFile, 'utf8');
    const requests = content.split('### Request #').slice(1);
    
    const results = requests.filter(request => 
      request.toLowerCase().includes(query.toLowerCase())
    ).map(request => {
      const numberMatch = request.match(/^(\d+(?:\.\d+)?)/);
      const titleMatch = request.match(/- (.+)/);
      return {
        number: numberMatch ? numberMatch[1] : '?',
        title: titleMatch ? titleMatch[1] : 'Unknown'
      };
    });
    
    console.log(`🔍 Found ${results.length} requests matching "${query}":`);
    results.forEach(r => console.log(`  #${r.number}: ${r.title}`));
  }

  complete(requestNumber, solution) {
    const content = fs.readFileSync(this.logFile, 'utf8');
    const pattern = new RegExp(`(### Request #${requestNumber}[\\s\\S]*?)\\*\\*Status\\*\\*: [^\\n]*`);
    
    const updatedContent = content.replace(pattern, (match, requestPart) => {
      return requestPart + `**Status**: ✅ Completed  
**Solution**: ${solution}  `;
    });
    
    fs.writeFileSync(this.logFile, updatedContent);
    
    // Auto-commit completion
    this.autoCommit(`Complete request #${requestNumber}: ${solution.substring(0, 50)}...`);
    
    console.log(`✅ Completed request #${requestNumber}`);
  }

  // Show current status
  status() {
    console.log('📊 Smart Logger Status:');
    console.log(`Last Request: #${this.state.lastRequestNumber}`);
    console.log(`Current Session: ${this.state.currentSession || 'None'}`);
    console.log(`Last Commit: ${this.state.lastCommit || 'None'}`);
    
    // Show pending requests
    const content = fs.readFileSync(this.logFile, 'utf8');
    const inProgress = content.match(/\*\*Status\*\*: 🚧 In Progress/g);
    console.log(`In Progress: ${inProgress ? inProgress.length : 0} requests`);
  }
}

// CLI handling
if (import.meta.url === `file://${process.argv[1]}`) {
  const logger = new SmartLogger();
  const command = process.argv[2];
  const args = process.argv.slice(3);

  switch (command) {
    case 'auto':
      const request = args.join(' ');
      if (!request) {
        console.error('Usage: node smart-logger.js auto "your request here"');
        process.exit(1);
      }
      logger.autoLog(request);
      break;
      
    case 'sub':
      const parentNum = parseInt(args[0]);
      const subRequest = args.slice(1).join(' ');
      if (!parentNum || !subRequest) {
        console.error('Usage: node smart-logger.js sub <parent_number> "sub request"');
        process.exit(1);
      }
      logger.autoLog(subRequest, { isSubRequest: true, parentRequest: parentNum });
      break;
      
    case 'ref':
      const refNum = args[0];
      if (!refNum) {
        console.error('Usage: node smart-logger.js ref <request_number>');
        process.exit(1);
      }
      logger.ref(refNum);
      break;
      
    case 'find':
      const query = args.join(' ');
      if (!query) {
        console.error('Usage: node smart-logger.js find <search_term>');
        process.exit(1);
      }
      logger.find(query);
      break;
      
    case 'complete':
      const completeNum = args[0];
      const solution = args.slice(1).join(' ');
      if (!completeNum || !solution) {
        console.error('Usage: node smart-logger.js complete <request_number> "solution"');
        process.exit(1);
      }
      logger.complete(completeNum, solution);
      break;
      
    case 'status':
      logger.status();
      break;
      
    default:
      console.log(`
🤖 Smart Chat Logger - Zero-Effort Logging
==========================================

Usage: node smart-logger.js <command> [args]

Commands:
  auto "request"              Auto-log new request (detects type, creates test case)
  sub <parent> "sub request"  Add sub-request to existing request
  ref <number>                Quick reference to specific request
  find <query>                Search requests by keyword
  complete <number> "solution" Mark request as completed
  status                      Show current logging status

Ultra-Quick Examples:
  node smart-logger.js auto "fix navigation bug"
  node smart-logger.js sub 15 "also fix highlighting"
  node smart-logger.js ref 15
  node smart-logger.js find navigation
  node smart-logger.js complete 15 "Fixed path normalization"

Features:
  ✅ Auto-categorizes requests (Bug Fix, Feature, UI/UX, etc.)
  ✅ Auto-generates test cases for complex requests
  ✅ Auto-commits with meaningful messages
  ✅ Auto-links to git commits
  ✅ Smart sub-request numbering (15.1, 15.2, etc.)
  ✅ Zero-effort reference system
      `);
  }
}

export default SmartLogger;
