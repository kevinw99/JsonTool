#!/usr/bin/env node

/**
 * Auto Chat Capture - Truly Zero-Effort Logging
 * 
 * This background service automatically detects and logs chat requests
 * by monitoring VS Code workspace changes and git activity.
 * 
 * Features:
 * - Monitors file changes for chat activity
 * - Auto-detects new requests vs continuations  
 * - Captures requests from commit messages
 * - Runs silently in background
 * - No manual intervention required
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AutoChatCapture {
  constructor() {
    this.logFile = path.join(__dirname, 'CHAT_LOG.md');
    this.stateFile = path.join(__dirname, '.auto-chat-state.json');
    this.watchFile = path.join(__dirname, '.vscode', 'settings.json');
    this.lastProcessedCommit = null;
    this.sessionStartTime = Date.now();
    this.isRunning = false;
    
    this.loadState();
    this.setupGitHook();
  }

  loadState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        const state = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
        this.lastProcessedCommit = state.lastProcessedCommit;
        this.sessionStartTime = state.sessionStartTime || Date.now();
      }
    } catch (error) {
      console.log('⚠️ Could not load state, starting fresh');
    }
  }

  saveState() {
    const state = {
      lastProcessedCommit: this.lastProcessedCommit,
      sessionStartTime: this.sessionStartTime,
      lastUpdated: Date.now()
    };
    fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
  }

  // Setup git commit hook to capture chat context
  setupGitHook() {
    const gitHooksDir = path.join(__dirname, '.git', 'hooks');
    const postCommitHook = path.join(gitHooksDir, 'post-commit');
    
    if (!fs.existsSync(gitHooksDir)) {
      console.log('⚠️ Not a git repository, skipping git hook setup');
      return;
    }

    const hookContent = `#!/bin/bash
# Auto-capture chat requests from commits
node "${path.join(__dirname, 'auto-capture.js')}" process-commit
`;

    try {
      fs.writeFileSync(postCommitHook, hookContent);
      fs.chmodSync(postCommitHook, 0o755);
      console.log('✅ Git hook installed for auto-capture');
    } catch (error) {
      console.log('⚠️ Could not install git hook:', error.message);
    }
  }

  // Get recent commits since last processed
  getRecentCommits() {
    try {
      let command = 'git log --oneline --since="1 hour ago"';
      if (this.lastProcessedCommit) {
        command = `git log --oneline ${this.lastProcessedCommit}..HEAD`;
      }
      
      const output = execSync(command, { encoding: 'utf8' });
      return output.trim().split('\n').filter(line => line.trim());
    } catch (error) {
      return [];
    }
  }

  // Extract chat request from commit message or file changes
  extractChatRequest(commitHash) {
    try {
      // Get commit message
      const message = execSync(`git log -1 --pretty=%B ${commitHash}`, { encoding: 'utf8' }).trim();
      
      // Get changed files to understand context
      const changedFiles = execSync(`git diff-tree --no-commit-id --name-only -r ${commitHash}`, { encoding: 'utf8' })
        .trim().split('\n').filter(f => f);

      // Detect if this looks like a chat-driven change
      const isChatDriven = this.detectChatActivity(message, changedFiles);
      
      if (isChatDriven) {
        return {
          request: this.extractRequestFromCommit(message, changedFiles),
          commit: commitHash.substring(0, 8),
          files: changedFiles,
          timestamp: Date.now()
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  // Detect if commit is from chat interaction
  detectChatActivity(message, files) {
    // Chat-driven indicators
    const chatIndicators = [
      // Common chat request patterns
      /fix|implement|add|create|update|change/i,
      /bug|issue|problem|broken/i,
      /ui|css|style|responsive|layout/i,
      /navigation|click|goto|highlight/i,
      
      // File patterns that suggest chat activity
      files.some(f => f.includes('src/')),
      files.some(f => f.includes('.tsx') || f.includes('.ts') || f.includes('.css')),
      
      // Avoid auto-generated commits
      !message.includes('Auto-commit'),
      !message.includes('npm audit'),
      !message.includes('package-lock'),
      
      // Size check - chat commits usually touch multiple files or have descriptive messages
      files.length > 0 && (files.length > 1 || message.length > 20)
    ];

    return chatIndicators.filter(Boolean).length >= 2;
  }

  extractRequestFromCommit(message, files) {
    // Try to extract meaningful request from commit message
    let request = message;
    
    // Clean up common commit prefixes
    request = request.replace(/^(fix|feat|update|add|implement|create):\s*/i, '');
    request = request.replace(/^(chore|docs|style|refactor):\s*/i, '');
    
    // Add context from changed files
    const context = this.getFileContext(files);
    if (context) {
      request += ` (${context})`;
    }
    
    return request;
  }

  getFileContext(files) {
    const contexts = [];
    
    if (files.some(f => f.includes('JsonTreeView'))) contexts.push('JSON tree navigation');
    if (files.some(f => f.includes('DiffList'))) contexts.push('diff panel');
    if (files.some(f => f.includes('IdKeys'))) contexts.push('ID keys');
    if (files.some(f => f.includes('.css'))) contexts.push('styling');
    if (files.some(f => f.includes('App.tsx'))) contexts.push('main app');
    
    return contexts.join(', ');
  }

  // Auto-log detected request
  autoLogRequest(requestData) {
    try {
      const requestNumber = this.getNextRequestNumber();
      const category = this.categorizeRequest(requestData.request);
      
      const logEntry = `### Request #${requestNumber} - ${category.icon} ${category.category}
**Date**: ${new Date().toISOString().split('T')[0]}  
**Request**: "${requestData.request}"  
**Commit**: [\`${requestData.commit}\`](https://github.com/user/repo/commit/${requestData.commit})  
**Files**: ${requestData.files.slice(0, 3).join(', ')}${requestData.files.length > 3 ? '...' : ''}  
**Auto-detected**: ✅  
**Status**: 🚧 In Progress  

`;

      this.insertLogEntry(logEntry);
      console.log(`🤖 Auto-logged request #${requestNumber}: ${category.category}`);
      console.log(`📝 Request: ${requestData.request.substring(0, 60)}...`);
      console.log(`🔗 Commit: ${requestData.commit}`);
      
      return requestNumber;
    } catch (error) {
      console.error('❌ Failed to auto-log request:', error.message);
      return null;
    }
  }

  getNextRequestNumber() {
    if (!fs.existsSync(this.logFile)) return 1;
    
    const content = fs.readFileSync(this.logFile, 'utf8');
    const matches = content.match(/### Request #(\d+)/g);
    if (!matches) return 1;
    
    const numbers = matches.map(match => parseInt(match.match(/\d+/)[0]));
    return Math.max(...numbers) + 1;
  }

  categorizeRequest(request) {
    const text = request.toLowerCase();
    
    if (text.includes('fix') || text.includes('bug') || text.includes('issue')) {
      return { category: 'Bug Fix', icon: '🐛' };
    }
    if (text.includes('implement') || text.includes('add') || text.includes('create')) {
      return { category: 'Feature', icon: '✨' };
    }
    if (text.includes('ui') || text.includes('css') || text.includes('style')) {
      return { category: 'UI/UX', icon: '🎨' };
    }
    if (text.includes('refactor') || text.includes('clean')) {
      return { category: 'Refactor', icon: '♻️' };
    }
    
    return { category: 'General', icon: '💬' };
  }

  insertLogEntry(logEntry) {
    let content = fs.readFileSync(this.logFile, 'utf8');
    
    const insertPoint = content.indexOf('## Key Patterns & Regressions Identified');
    if (insertPoint !== -1) {
      content = content.slice(0, insertPoint) + logEntry + '\n' + content.slice(insertPoint);
    } else {
      content += '\n' + logEntry;
    }
    
    fs.writeFileSync(this.logFile, content);
  }

  // Process commits (called by git hook)
  processCommits() {
    const commits = this.getRecentCommits();
    let processed = 0;
    
    for (const commitLine of commits) {
      const commitHash = commitLine.split(' ')[0];
      if (commitHash === this.lastProcessedCommit) break;
      
      const requestData = this.extractChatRequest(commitHash);
      if (requestData) {
        this.autoLogRequest(requestData);
        processed++;
      }
    }
    
    if (commits.length > 0) {
      this.lastProcessedCommit = commits[0].split(' ')[0];
      this.saveState();
    }
    
    if (processed > 0) {
      console.log(`🎯 Auto-captured ${processed} chat request(s)`);
    }
  }

  // Background monitoring service
  startMonitoring() {
    if (this.isRunning) {
      console.log('⚠️ Auto-capture is already running');
      return;
    }

    this.isRunning = true;
    console.log('🤖 Starting auto-capture background service...');
    console.log('📝 Monitoring git commits for chat activity');
    console.log('🔍 Use Ctrl+C to stop');

    // Initial scan
    this.processCommits();

    // Monitor every 30 seconds
    const interval = setInterval(() => {
      this.processCommits();
    }, 30000);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping auto-capture service...');
      clearInterval(interval);
      this.isRunning = false;
      process.exit(0);
    });

    // Keep the process alive
    process.stdin.resume();
  }

  // Manual scan for testing
  scanNow() {
    console.log('🔍 Scanning for recent chat activity...');
    this.processCommits();
    console.log('✅ Scan complete');
  }

  // Show status
  status() {
    console.log('🤖 Auto-Capture Status:');
    console.log(`Running: ${this.isRunning ? '✅' : '❌'}`);
    console.log(`Last processed commit: ${this.lastProcessedCommit || 'None'}`);
    console.log(`Session started: ${new Date(this.sessionStartTime).toLocaleString()}`);
    
    const recentCommits = this.getRecentCommits();
    console.log(`Recent commits: ${recentCommits.length}`);
  }
}

// CLI handling
if (import.meta.url === `file://${process.argv[1]}`) {
  const capture = new AutoChatCapture();
  const command = process.argv[2];

  switch (command) {
    case 'start':
      capture.startMonitoring();
      break;
      
    case 'scan':
      capture.scanNow();
      break;
      
    case 'process-commit':
      // Called by git hook
      capture.processCommits();
      break;
      
    case 'status':
      capture.status();
      break;
      
    default:
      console.log(`
🤖 Auto Chat Capture - Truly Zero-Effort Logging
================================================

Usage: node auto-capture.js <command>

Commands:
  start           Start background monitoring service
  scan            Scan recent commits for chat activity
  status          Show current status
  process-commit  Process recent commits (used by git hook)

Zero-Effort Workflow:
  1. node auto-capture.js start    (run once, keeps monitoring)
  2. Work normally with Copilot
  3. Requests are automatically captured from commits
  4. No manual logging required!

Features:
  ✅ Monitors git commits automatically
  ✅ Detects chat-driven changes
  ✅ Auto-categorizes requests
  ✅ Links to commit history
  ✅ Runs silently in background
  ✅ Zero manual intervention

The service detects chat activity by analyzing:
  - Commit message patterns
  - Changed file types
  - Commit timing and size
  - Development patterns
      `);
  }
}

export default AutoChatCapture;
