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
    
    // Statistics tracking
    this.sessionStats = {
      totalCommits: 0,
      requestsLogged: 0,
      requestsFiltered: 0,
      filterReasons: {},
      categories: {},
      startTime: Date.now()
    };
    
    this.loadState();
    this.setupGitHook();
  }

  loadState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        const state = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
        this.lastProcessedCommit = state.lastProcessedCommit;
        this.sessionStartTime = state.sessionStartTime || Date.now();
        this.sessionStats = state.sessionStats || this.sessionStats;
      }
    } catch (error) {
      console.log('⚠️ Could not load state, starting fresh');
    }
  }

  saveState() {
    const state = {
      lastProcessedCommit: this.lastProcessedCommit,
      sessionStartTime: this.sessionStartTime,
      sessionStats: this.sessionStats,
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

  // Smart detection: Development requests vs one-time questions
  detectChatActivity(message, files) {
    // Enhanced filtering for one-time questions that don't need logging
    const oneTimeQuestions = [
      // Basic how-to questions
      /^how do i\s/i,
      /^what command\s/i,
      /^how to\s/i,
      /^where is\s/i,
      /^can you explain\s/i,
      /^what is\s/i,
      /^what does\s/i,
      /^so how do\s/i,
      /^should i\s/i,
      /^do i need to\s/i,
      /^when should\s/i,
      /^why does\s/i,
      /^which\s/i,
      
      // Process/service questions
      /status\b/i,
      /\bhelp\b/i,
      /\bstart\b.*service/i,
      /\brestart\b.*service/i,
      /\bstop\b.*service/i,
      /check if.*running/i,
      /command.*server/i,
      /is.*running/i,
      
      // Clarification questions (no file changes = just asking)
      /^can you\s/i,
      /^could you\s/i,
      /^would you\s/i,
      /^will you\s/i,
      /clarify|clarification/i,
      
      // Project navigation questions
      /^where.*(file|folder|directory)/i,
      /^which.*(file|folder|directory)/i,
      /^show me.*(file|folder|directory)/i,
      
      // Understanding questions
      /^i don't understand/i,
      /^what's the difference/i,
      /^what's happening/i,
      /^what happened/i,
      /^why is/i,
      /^why isn't/i,
      /^what went wrong/i
    ];

    // Skip logging if this looks like a one-time question AND no meaningful file changes
    const isOneTimeQuestionPattern = oneTimeQuestions.some(pattern => pattern.test(message));
    const hasMinimalChanges = files.length === 0 || (files.length === 1 && files[0].includes('CHAT_LOG'));
    
    if (isOneTimeQuestionPattern && hasMinimalChanges) {
      console.log(`🤔 Detected one-time question (no dev work), skipping: "${message.substring(0, 60)}..."`);
      return false;
    }

    // Enhanced development request detection
    const developmentIndicators = [
      // Direct action words (strong indicators)
      /\b(fix|implement|add|create|update|change|refactor|build|make)\b/i,
      /\b(bug|issue|problem|broken|error|crash|fail)\b/i,
      /\b(ui|css|style|responsive|layout|design|theme)\b/i,
      /\b(navigation|click|goto|highlight|scroll|expand)\b/i,
      /\b(feature|component|function|method|class)\b/i,
      /\b(test|testing|spec|e2e|unit)\b/i,
      
      // Technical improvement words
      /\b(optimize|improve|enhance|polish|cleanup|clean up)\b/i,
      /\b(performance|speed|faster|slower|memory|load)\b/i,
      /\b(security|vulnerability|safe|unsafe)\b/i,
      
      // Request/problem language with substance
      /please.*(fix|add|change|update|implement|create|make)/i,
      /can you.*(fix|add|change|update|implement|create|make)/i,
      /need to.*(fix|add|change|update|implement|create)/i,
      /should.*(fix|add|change|update|implement|create)/i,
      
      // File patterns that suggest real development work
      files.some(f => f.includes('src/') && !f.includes('CHAT_LOG')),
      files.some(f => /\.(tsx?|jsx?|css|scss|less|html|vue|svelte)$/.test(f)),
      files.some(f => f.toLowerCase().includes('component')),
      files.some(f => f.toLowerCase().includes('hook')),
      files.some(f => f.toLowerCase().includes('util')),
      files.some(f => f.toLowerCase().includes('service')),
      files.some(f => f.toLowerCase().includes('api')),
      
      // Avoid noise commits
      !message.includes('Auto-commit'),
      !message.includes('Auto-capture'),
      !message.includes('npm audit'),
      !message.includes('package-lock'),
      !message.includes('node_modules'),
      !message.includes('yarn.lock'),
      !message.includes('.gitignore'),
      
      // Size/complexity checks - real development usually has substance
      files.length > 0 && (
        files.length > 2 || 
        message.length > 40 ||
        files.some(f => f.includes('src/') && !f.includes('CHAT_LOG'))
      ),
      
      // Context indicators - mentions specific parts of the app
      /json|tree|diff|compare|navigation|panel|viewer/i.test(message),
      
      // Multiple sentences usually indicate complex requests
      message.split(/[.!?]/).filter(s => s.trim().length > 10).length > 1
    ];

    const developmentScore = developmentIndicators.filter(Boolean).length;
    
    // More nuanced scoring:
    // - 4+ indicators = definitely log (high confidence)
    // - 3 indicators = likely log (medium confidence) 
    // - 2 indicators = maybe log (if has code files)
    // - 1 indicators = probably skip (low confidence)
    let shouldLog = false;
    let confidence = 'low';
    
    if (developmentScore >= 4) {
      shouldLog = true;
      confidence = 'high';
    } else if (developmentScore >= 3) {
      shouldLog = true;
      confidence = 'medium';
    } else if (developmentScore >= 2 && files.some(f => f.includes('src/') && !f.includes('CHAT_LOG'))) {
      shouldLog = true;
      confidence = 'medium';
    } else if (developmentScore >= 1 && files.length > 2 && files.some(f => /\.(tsx?|jsx?)$/.test(f))) {
      shouldLog = true;  
      confidence = 'low';
    }
    
    if (!shouldLog) {
      console.log(`📋 Development score too low (${developmentScore}), skipping: "${message.substring(0, 60)}..."`);
    } else {
      console.log(`✅ Development request detected (score: ${developmentScore}, confidence: ${confidence})`);
    }
    
    return shouldLog;
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

  // Auto-log detected request (only if it should be logged)
  autoLogRequest(requestData) {
    try {
      const category = this.categorizeRequest(requestData.request);
      
      // Update statistics
      this.sessionStats.categories[category.category] = (this.sessionStats.categories[category.category] || 0) + 1;
      
      // Skip logging if this shouldn't be logged
      if (!category.shouldLog) {
        const reason = category.reason || 'Category filtered out';
        this.sessionStats.requestsFiltered++;
        this.sessionStats.filterReasons[reason] = (this.sessionStats.filterReasons[reason] || 0) + 1;
        
        console.log(`⏭️  Filtering out ${category.category}: "${requestData.request.substring(0, 50)}..."`);
        console.log(`   Reason: ${reason}`);
        this.saveState(); // Save stats
        return null;
      }
      
      this.sessionStats.requestsLogged++;
      const requestNumber = this.getNextRequestNumber();
      
      const logEntry = `### Request #${requestNumber} - ${category.icon} ${category.category}
**Date**: ${new Date().toISOString().split('T')[0]}  
**Request**: "${requestData.request}"  
**Commit**: [\`${requestData.commit}\`](https://github.com/user/repo/commit/${requestData.commit})  
**Files**: ${requestData.files.slice(0, 3).join(', ')}${requestData.files.length > 3 ? '...' : ''}  
**Priority**: ${category.priority}  
**Auto-detected**: ✅  
**Status**: 🚧 In Progress  

`;

      this.insertLogEntry(logEntry);
      
      // Create test case if needed
      if (category.needsTestCase) {
        this.createTestCase(requestNumber, requestData.request, category);
        console.log(`📋 Created test case for ${category.category} request`);
      }
      
      console.log(`🤖 Auto-logged request #${requestNumber}: ${category.category} (${category.priority} priority)`);
      console.log(`📝 Request: ${requestData.request.substring(0, 60)}...`);
      console.log(`🔗 Commit: ${requestData.commit}`);
      console.log(`📁 Files: ${requestData.files.length} changed`);
      
      this.saveState(); // Save stats
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
    
    // Enhanced one-time question detection (these should be filtered out earlier, but double-check)
    if (this.isOneTimeQuestion(text)) {
      return { 
        category: 'Question', 
        icon: '❓', 
        shouldLog: false,
        priority: 'info',
        reason: 'One-time question'
      };
    }
    
    // Critical bugs - always log with high priority
    if (text.includes('crash') || text.includes('broken') || text.includes('not working') || text.includes('error')) {
      return { 
        category: 'Critical Bug', 
        icon: '🚨', 
        shouldLog: true,
        priority: 'critical',
        needsTestCase: true
      };
    }
    
    // Bug fixes - high priority
    if (text.includes('fix') || text.includes('bug') || text.includes('issue') || text.includes('problem')) {
      return { 
        category: 'Bug Fix', 
        icon: '🐛', 
        shouldLog: true,
        priority: 'high',
        needsTestCase: true
      };
    }
    
    // New features - high priority
    if (text.includes('implement') || text.includes('add') || text.includes('create') || text.includes('build')) {
      return { 
        category: 'Feature', 
        icon: '✨', 
        shouldLog: true,
        priority: 'high',
        needsTestCase: true
      };
    }
    
    // UI/UX improvements - medium priority (visual changes)
    if (text.includes('ui') || text.includes('css') || text.includes('style') || 
        text.includes('responsive') || text.includes('design') || text.includes('layout') ||
        text.includes('color') || text.includes('theme') || text.includes('visual')) {
      return { 
        category: 'UI/UX', 
        icon: '🎨', 
        shouldLog: true,
        priority: 'medium',
        needsTestCase: false
      };
    }
    
    // Navigation/interaction improvements - medium priority
    if (text.includes('navigation') || text.includes('click') || text.includes('goto') || 
        text.includes('highlight') || text.includes('scroll') || text.includes('expand') ||
        text.includes('collapse') || text.includes('select')) {
      return { 
        category: 'Navigation', 
        icon: '🧭', 
        shouldLog: true,
        priority: 'medium',
        needsTestCase: true
      };
    }
    
    // Performance improvements - medium priority
    if (text.includes('performance') || text.includes('optimize') || text.includes('faster') || 
        text.includes('speed') || text.includes('memory') || text.includes('load')) {
      return { 
        category: 'Performance', 
        icon: '⚡', 
        shouldLog: true,
        priority: 'medium',
        needsTestCase: true
      };
    }
    
    // Code refactoring - medium priority
    if (text.includes('refactor') || text.includes('clean') || text.includes('reorganize') || 
        text.includes('improve') || text.includes('cleanup') || text.includes('restructure')) {
      return { 
        category: 'Refactor', 
        icon: '♻️', 
        shouldLog: true,
        priority: 'medium',
        needsTestCase: false
      };
    }
    
    // Testing improvements - medium priority
    if (text.includes('test') || text.includes('testing') || text.includes('spec') || 
        text.includes('e2e') || text.includes('unit') || text.includes('coverage')) {
      return { 
        category: 'Testing', 
        icon: '🧪', 
        shouldLog: true,
        priority: 'medium',
        needsTestCase: false
      };
    }
    
    // Configuration/setup - medium priority
    if (text.includes('config') || text.includes('setup') || text.includes('install') || 
        text.includes('deploy') || text.includes('build') || text.includes('package')) {
      return { 
        category: 'Setup', 
        icon: '⚙️', 
        shouldLog: true,
        priority: 'medium',
        needsTestCase: false
      };
    }
    
    // Documentation - low priority but still worth logging
    if (text.includes('document') || text.includes('readme') || text.includes('comment') || 
        text.includes('explain') || text.includes('clarify')) {
      return { 
        category: 'Documentation', 
        icon: '📝', 
        shouldLog: true,
        priority: 'low',
        needsTestCase: false
      };
    }
    
    // Security improvements - high priority
    if (text.includes('security') || text.includes('vulnerability') || text.includes('safe') || 
        text.includes('sanitize') || text.includes('validate') || text.includes('xss')) {
      return { 
        category: 'Security', 
        icon: '🔒', 
        shouldLog: true,
        priority: 'high',
        needsTestCase: true
      };
    }
    
    // Accessibility improvements - medium priority
    if (text.includes('accessibility') || text.includes('a11y') || text.includes('screen reader') || 
        text.includes('keyboard') || text.includes('focus') || text.includes('aria')) {
      return { 
        category: 'Accessibility', 
        icon: '♿', 
        shouldLog: true,
        priority: 'medium',
        needsTestCase: true
      };
    }
    
    // Default for unclear requests - be conservative and don't log
    return { 
      category: 'General', 
      icon: '💬', 
      shouldLog: false,
      priority: 'low',
      reason: 'Request too vague or unclear'
    };
  }

  // Enhanced helper to identify one-time questions
  isOneTimeQuestion(text) {
    const questionPatterns = [
      // Basic how-to questions
      /^how do i\s/,
      /^what command\s/,
      /^how to\s/,
      /^where is\s/,
      /^can you explain\s/,
      /^what is\s/,
      /^what does\s/,
      /^so how do\s/,
      /^should i\s/,
      /^do i need to\s/,
      /^when should\s/,
      /^why does\s/,
      /^which\s/,
      /^who\s/,
      
      // Status/service questions
      /\bstatus\b/,
      /\bhelp\b/,
      /\bstart\b.*service/,
      /\brestart\b.*service/,
      /\bstop\b.*service/,
      /check.*running/,
      /command.*server/,
      /is.*running/,
      /are.*running/,
      
      // Clarification questions
      /^can you\s/,
      /^could you\s/,
      /^would you\s/,
      /^will you\s/,
      /clarify|clarification/,
      /understand|understanding/,
      /confused|confusion/,
      
      // Project navigation questions
      /^where.*(file|folder|directory)/,
      /^which.*(file|folder|directory)/,
      /^show me.*(file|folder|directory)/,
      /^find.*(file|folder|directory)/,
      
      // Understanding/explanation questions
      /^i don't understand/,
      /^what's the difference/,
      /^what's happening/,
      /^what happened/,
      /^why is/,
      /^why isn't/,
      /^what went wrong/,
      /^how does.*work/,
      /^what's the purpose/,
      /^what's the point/,
      
      // Quick status checks
      /^is it\s/,
      /^are they\s/,
      /^does it\s/,
      /^do they\s/,
      /^has it\s/,
      /^have they\s/,
      
      // Informational questions
      /^what are\s/,
      /^what were\s/,
      /^what will\s/,
      /^what would\s/,
      /^what should\s/,
      /^what can\s/,
      /^what could\s/,
      /^what might\s/,
      
      // Learning/educational questions  
      /^teach me\s/,
      /^show me how\s/,
      /^explain how\s/,
      /^tell me about\s/,
      /^i want to learn\s/,
      /^i need to know\s/,
      
      // Short queries that are usually questions
      /^ok$/,
      /^okay$/,
      /^thanks$/,
      /^thank you$/,
      /^got it$/,
      /^i see$/,
      /^right$/,
      /^cool$/,
      /^nice$/,
      /^good$/,
      
      // Uncertainty expressions
      /^i'm not sure/,
      /^i don't know/,
      /^i'm confused/,
      /^i'm lost/,
      /^i can't figure out/,
      /^i'm having trouble/,
      
      // Verification questions
      /^is this right/,
      /^is this correct/,
      /^does this look right/,
      /^am i doing this right/,
      
      // Questions about the tools/process itself
      /copilot|ai assistant|chat/,
      /^how does this work/,
      /^what's the process/,
      /^what should i do/
    ];
    
    // Also check for question marks at the end (often indicates a question)
    const endsWithQuestion = text.trim().endsWith('?');
    
    // Short messages that are likely questions
    const isShortQuestion = text.length < 20 && endsWithQuestion;
    
    return questionPatterns.some(pattern => pattern.test(text)) || isShortQuestion;
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

  // Create test case for important requests
  createTestCase(requestNumber, request, category) {
    const testCasesDir = path.join(__dirname, 'test-cases');
    if (!fs.existsSync(testCasesDir)) {
      fs.mkdirSync(testCasesDir, { recursive: true });
    }

    const testCase = {
      id: requestNumber,
      request: request,
      category: category.category,
      priority: category.priority,
      created: new Date().toISOString(),
      testSteps: this.generateTestSteps(request, category),
      expectedResult: this.generateExpectedResult(request, category),
      sampleData: this.generateSampleData(request, category),
      verificationCommand: this.generateVerificationCommand(request, category)
    };
    
    const testFile = path.join(testCasesDir, `test-${requestNumber}.json`);
    fs.writeFileSync(testFile, JSON.stringify(testCase, null, 2));
  }

  generateTestSteps(request, category) {
    const text = request.toLowerCase();
    
    if (text.includes('navigation') || text.includes('click') || text.includes('goto')) {
      return [
        "1. Load sample JSON files (sample1.json, sample2.json)",
        "2. Wait for differences to be calculated",
        "3. Open differences panel",
        "4. Click on a difference item",
        "5. Verify navigation to correct JSON node",
        "6. Verify node is expanded and highlighted"
      ];
    }
    
    if (text.includes('responsive') || text.includes('ui') || text.includes('css') || text.includes('layout')) {
      return [
        "1. Load JSON comparison view",
        "2. Resize browser window to various sizes (mobile: 375px, tablet: 768px, desktop: 1200px)",
        "3. Verify layout remains functional at all sizes",
        "4. Check text alignment and overflow handling",
        "5. Verify no horizontal scrolling on mobile",
        "6. Test with long JSON property names"
      ];
    }

    if (text.includes('fix') || text.includes('bug')) {
      return [
        "1. Reproduce the bug using the provided steps",
        "2. Verify the issue exists before the fix",
        "3. Apply the fix",
        "4. Test the specific scenario that was broken",
        "5. Test related functionality to ensure no regressions",
        "6. Verify edge cases work correctly"
      ];
    }
    
    return [
      "1. Load the application",
      "2. Navigate to the relevant feature area",
      "3. Perform the requested action/change",
      "4. Verify expected behavior",
      "5. Test edge cases and error conditions",
      "6. Verify no existing functionality is broken"
    ];
  }

  generateExpectedResult(request, category) {
    switch (category.category) {
      case 'Bug Fix':
        return "The reported issue should be completely resolved without introducing new bugs or breaking existing functionality.";
      case 'Feature':
        return "The new feature should work as specified, integrate seamlessly with existing features, and handle edge cases gracefully.";
      case 'UI/UX':
        return "The UI should be visually improved, maintain usability across different screen sizes, and provide better user experience.";
      case 'Refactor':
        return "Code should be cleaner and more maintainable while preserving all existing functionality exactly as before.";
      default:
        return "The requested change should be implemented correctly and not break existing functionality.";
    }
  }

  generateSampleData(request, category) {
    const text = request.toLowerCase();
    
    if (text.includes('json') || text.includes('compare') || text.includes('navigation')) {
      return {
        primaryFiles: ["sample1.json", "sample2.json"],
        alternativeFiles: ["Test1RG_request_BM.json", "Test1RG_request_SUT.json"],
        description: "Use sample files to test JSON comparison and navigation features"
      };
    }
    
    if (text.includes('responsive') || text.includes('mobile')) {
      return {
        testViewports: [
          { name: "Mobile", width: 375, height: 667 },
          { name: "Tablet", width: 768, height: 1024 },
          { name: "Desktop", width: 1200, height: 800 }
        ],
        description: "Test across multiple viewport sizes"
      };
    }
    
    return {
      description: "Use existing application state and sample data for testing"
    };
  }

  generateVerificationCommand(request, category) {
    const text = request.toLowerCase();
    
    if (text.includes('test') || category.category === 'Bug Fix') {
      return "npm run test && npm run test:e2e";
    }
    
    if (text.includes('ui') || text.includes('responsive')) {
      return "npm run dev # Then manually test across different screen sizes";
    }
    
    return "npm run dev # Then manually verify the changes work as expected";
  }

  // Process commits (called by git hook)
  processCommits() {
    const commits = this.getRecentCommits();
    let processed = 0;
    
    this.sessionStats.totalCommits += commits.length;
    
    for (const commitLine of commits) {
      const commitHash = commitLine.split(' ')[0];
      if (commitHash === this.lastProcessedCommit) break;
      
      const requestData = this.extractChatRequest(commitHash);
      if (requestData) {
        const result = this.autoLogRequest(requestData);
        if (result) {
          processed++;
        }
      }
    }
    
    if (commits.length > 0) {
      this.lastProcessedCommit = commits[0].split(' ')[0];
      this.saveState();
    }
    
    if (processed > 0) {
      console.log(`🎯 Auto-captured ${processed} chat request(s) from ${commits.length} commit(s)`);
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

  // Show status and statistics
  status() {
    console.log('🤖 Auto-Capture Status:');
    console.log(`Running: ${this.isRunning ? '✅' : '❌'}`);
    console.log(`Last processed commit: ${this.lastProcessedCommit || 'None'}`);
    console.log(`Session started: ${new Date(this.sessionStartTime).toLocaleString()}`);
    
    const recentCommits = this.getRecentCommits();
    console.log(`Recent commits: ${recentCommits.length}`);
    
    // Show session statistics
    console.log('\n📊 Session Statistics:');
    console.log(`Total commits processed: ${this.sessionStats.totalCommits}`);
    console.log(`Requests logged: ${this.sessionStats.requestsLogged}`);
    console.log(`Requests filtered out: ${this.sessionStats.requestsFiltered}`);
    
    const totalRequests = this.sessionStats.requestsLogged + this.sessionStats.requestsFiltered;
    if (totalRequests > 0) {
      const logRate = ((this.sessionStats.requestsLogged / totalRequests) * 100).toFixed(1);
      console.log(`Log rate: ${logRate}% (${this.sessionStats.requestsLogged}/${totalRequests})`);
    }
    
    // Show category breakdown
    if (Object.keys(this.sessionStats.categories).length > 0) {
      console.log('\n📋 Categories detected:');
      Object.entries(this.sessionStats.categories)
        .sort(([,a], [,b]) => b - a)
        .forEach(([category, count]) => {
          console.log(`  ${category}: ${count}`);
        });
    }
    
    // Show filter reasons
    if (Object.keys(this.sessionStats.filterReasons).length > 0) {
      console.log('\n🚫 Filter reasons:');
      Object.entries(this.sessionStats.filterReasons)
        .sort(([,a], [,b]) => b - a)
        .forEach(([reason, count]) => {
          console.log(`  ${reason}: ${count}`);
        });
    }
    
      // Runtime info
    const runtimeMinutes = Math.round((Date.now() - this.sessionStats.startTime) / (1000 * 60));
    console.log(`\n⏱️ Runtime: ${runtimeMinutes} minutes`);
  }

  // Reset statistics
  resetStats() {
    this.sessionStats = {
      totalCommits: 0,
      requestsLogged: 0,
      requestsFiltered: 0,
      filterReasons: {},
      categories: {},
      startTime: Date.now()
    };
    this.saveState();
    console.log('📊 Statistics reset');
  }

  // Show detailed filtering insights
  insights() {
    console.log('🔍 Auto-Capture Filtering Insights:');
    console.log('==================================');
    
    // Smart filtering rules
    console.log('\n🧠 Smart Filtering Rules:');
    console.log('1. One-time questions (filtered out):');
    console.log('   - "How do I...", "What command...", "Where is..."');
    console.log('   - Status checks, service commands');
    console.log('   - Short clarification questions');
    console.log('   - Questions ending with "?" under 20 chars');
    
    console.log('\n2. Development requests (logged):');
    console.log('   - Action words: fix, implement, add, create, update');
    console.log('   - Problem indicators: bug, issue, broken, error');
    console.log('   - UI/UX: styling, responsive, design changes');
    console.log('   - Navigation: click, goto, highlight, scroll');
    console.log('   - Code files changed in src/ directory');
    
    console.log('\n3. Scoring system:');
    console.log('   - 4+ indicators = definitely log (high confidence)');
    console.log('   - 3+ indicators = likely log (medium confidence)');
    console.log('   - 2+ indicators + code files = maybe log');
    console.log('   - 1 indicator + multiple TypeScript files = maybe log');
    
    console.log('\n4. Priority levels:');
    console.log('   - Critical: crashes, broken functionality');
    console.log('   - High: bugs, new features, security');
    console.log('   - Medium: UI/UX, navigation, performance, refactoring');
    console.log('   - Low: documentation, minor improvements');
    
    console.log('\n5. Test case generation:');
    console.log('   - Auto-generated for: bugs, features, navigation, security');
    console.log('   - Skipped for: documentation, setup, refactoring');
    
    // Current session analysis
    if (this.sessionStats.totalCommits > 0) {
      console.log('\n📈 Current Session Analysis:');
      const logRate = ((this.sessionStats.requestsLogged / (this.sessionStats.requestsLogged + this.sessionStats.requestsFiltered)) * 100).toFixed(1);
      console.log(`Log efficiency: ${logRate}% (${this.sessionStats.requestsLogged} logged, ${this.sessionStats.requestsFiltered} filtered)`);
      
      if (this.sessionStats.requestsFiltered > this.sessionStats.requestsLogged) {
        console.log('💡 Tip: Most requests are being filtered out. This is good!');
        console.log('   It means the system is successfully identifying one-time questions.');
      } else if (this.sessionStats.requestsLogged > this.sessionStats.requestsFiltered * 2) {
        console.log('⚠️  Warning: Many requests are being logged. Consider if filtering is too loose.');
      } else {
        console.log('✅ Good balance between logging and filtering.');
      }
    }
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
      
    case 'insights':
      capture.insights();
      break;
      
    case 'reset-stats':
      capture.resetStats();
      break;
      
    default:
      console.log(`
🤖 Auto Chat Capture - Enhanced Smart Filtering
==============================================

Usage: node auto-capture.js <command>

Commands:
  start           Start background monitoring service
  scan            Scan recent commits for chat activity
  status          Show current status and statistics
  insights        Show detailed filtering insights and rules
  reset-stats     Reset session statistics
  process-commit  Process recent commits (used by git hook)

Zero-Effort Workflow:
  1. node auto-capture.js start    (run once, keeps monitoring)
  2. Work normally with Copilot
  3. Requests are automatically captured from commits
  4. No manual logging required!

Enhanced Features:
  ✅ Intelligently filters one-time questions vs development requests
  ✅ Sophisticated scoring system with confidence levels
  ✅ Auto-categorizes by priority and type
  ✅ Links requests to commit history for regression tracking
  ✅ Auto-generates test cases for important requests
  ✅ Tracks filtering statistics and provides insights
  ✅ Runs silently in background with minimal false positives

Smart Filtering:
  🚫 Filters out: How-to questions, status checks, clarifications
  ✅ Logs: Bug fixes, features, UI changes, navigation improvements
  📊 Provides detailed statistics on what's being filtered and why

The system analyzes:
  - Commit message patterns and action words
  - Changed file types and locations
  - Request complexity and context
  - Development vs informational patterns
      `);
  }
}

export default AutoChatCapture;
