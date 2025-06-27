#!/usr/bin/env node

/**
 * Chat Request Workflow Manager
 * 
 * Comprehensive tool for managing chat requests, including logging,
 * screenshots, and regression tracking.
 */

import ChatLogger from './chat-logger.js';
import ScreenshotCapture from './screenshot.js';
import readline from 'readline';

class ChatWorkflow {
  constructor() {
    this.logger = new ChatLogger();
    this.screenshot = new ScreenshotCapture();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async startRequest() {
    console.log('🚀 Starting new chat request workflow...\n');
    
    const request = await this.ask('Enter your request: ');
    const context = await this.ask('Enter context (optional): ');
    
    // Take before screenshot
    console.log('\n📸 Taking "before" screenshot...');
    const beforeScreenshot = await this.screenshot.captureBefore(this.logger.requestCounter);
    
    // Log the request
    const requestNumber = this.logger.logRequest({
      request,
      context,
      screenshots: [beforeScreenshot],
      status: '🚧 In Progress'
    });
    
    console.log(`\n✅ Request #${requestNumber} logged successfully!`);
    console.log(`📸 Before screenshot: ${beforeScreenshot}`);
    console.log('\n--- Work on your request now ---');
    console.log('When done, run: node workflow.js complete ' + requestNumber);
    
    await this.close();
    return requestNumber;
  }

  async completeRequest(requestNumber) {
    console.log(`🏁 Completing request #${requestNumber}...\n`);
    
    const solution = await this.ask('Enter solution description: ');
    const hasIssues = await this.askYesNo('Were there any issues encountered? (y/n): ');
    
    let issues = [];
    if (hasIssues) {
      console.log('Enter issues (press Enter twice to finish):');
      let issue;
      while ((issue = await this.ask('Issue: ')) !== '') {
        issues.push(issue);
      }
    }
    
    const needsScreenshot = await this.askYesNo('Take "after" screenshot? (y/n): ');
    let afterScreenshot = '';
    
    if (needsScreenshot) {
      console.log('\n📸 Taking "after" screenshot...');
      afterScreenshot = await this.screenshot.captureAfter(requestNumber);
    }
    
    // Update the log
    const status = '✅ Completed';
    this.logger.updateStatus(requestNumber, status, solution);
    
    // Add screenshots and issues if any
    // Note: This would require enhancing the logger to update existing entries
    
    console.log(`\n✅ Request #${requestNumber} marked as completed!`);
    if (afterScreenshot) {
      console.log(`📸 After screenshot: ${afterScreenshot}`);
    }
    
    await this.close();
  }

  async issueRequest(requestNumber) {
    console.log(`🐛 Logging issue for request #${requestNumber}...\n`);
    
    const issueDescription = await this.ask('Describe the issue: ');
    const needsScreenshot = await this.askYesNo('Take issue screenshot? (y/n): ');
    
    let issueScreenshot = '';
    if (needsScreenshot) {
      console.log('\n📸 Taking issue screenshot...');
      issueScreenshot = await this.screenshot.captureIssue(requestNumber, 'regression');
    }
    
    // Log as a new related request
    const newRequestNumber = this.logger.logRequest({
      request: `Issue with Request #${requestNumber}: ${issueDescription}`,
      context: `Regression from previous request #${requestNumber}`,
      screenshots: issueScreenshot ? [issueScreenshot] : [],
      status: '🚧 In Progress - Regression Fix'
    });
    
    console.log(`\n🐛 Issue logged as request #${newRequestNumber}`);
    if (issueScreenshot) {
      console.log(`📸 Issue screenshot: ${issueScreenshot}`);
    }
    
    await this.close();
    return newRequestNumber;
  }

  async searchAndReference() {
    console.log('🔍 Search chat request history...\n');
    
    const keyword = await this.ask('Enter search keyword: ');
    const results = this.logger.searchRequests(keyword);
    
    if (results.length === 0) {
      console.log(`No requests found matching "${keyword}"`);
    } else {
      console.log(`\n📋 Found ${results.length} requests matching "${keyword}":\n`);
      results.forEach((result, index) => {
        console.log(`${index + 1}. Request #${result.number}: ${result.title}`);
      });
      
      const showDetails = await this.askYesNo('\nShow details for any request? (y/n): ');
      if (showDetails) {
        const selection = await this.ask('Enter request number: ');
        const selected = results.find(r => r.number === selection);
        if (selected) {
          console.log('\n--- Request Details ---');
          console.log(selected.content.substring(0, 500) + '...');
        }
      }
    }
    
    await this.close();
  }

  async generateReport() {
    const report = this.logger.generateReport();
    
    console.log('\n📊 Chat Request Summary Report');
    console.log('================================');
    console.log(`Total Requests: ${report.total}`);
    console.log(`✅ Completed: ${report.completed} (${report.completionRate}%)`);
    console.log(`🚧 In Progress: ${report.inProgress}`);
    console.log(`❌ Failed: ${report.failed}`);
    console.log('================================\n');
    
    // Common patterns analysis
    const commonIssues = await this.analyzeCommonIssues();
    if (commonIssues.length > 0) {
      console.log('🔍 Common Issue Patterns:');
      commonIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
      console.log();
    }
    
    await this.close();
  }

  async analyzeCommonIssues() {
    // This could be enhanced with actual text analysis
    return [
      'Path format mismatches (root. prefix)',
      'CSS alignment and text wrapping',
      'Navigation timing and DOM readiness',
      'State synchronization between components'
    ];
  }

  ask(question) {
    return new Promise(resolve => {
      this.rl.question(question, resolve);
    });
  }

  askYesNo(question) {
    return new Promise(resolve => {
      this.rl.question(question, answer => {
        resolve(answer.toLowerCase().startsWith('y'));
      });
    });
  }

  async close() {
    this.rl.close();
    await this.screenshot.close();
  }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const workflow = new ChatWorkflow();

  (async () => {
    try {
      switch (args[0]) {
        case 'start':
          await workflow.startRequest();
          break;

        case 'complete':
          const requestNum = parseInt(args[1]);
          if (!requestNum) {
            console.error('Usage: node workflow.js complete <request_number>');
            process.exit(1);
          }
          await workflow.completeRequest(requestNum);
          break;

        case 'issue':
          const issueReqNum = parseInt(args[1]);
          if (!issueReqNum) {
            console.error('Usage: node workflow.js issue <request_number>');
            process.exit(1);
          }
          await workflow.issueRequest(issueReqNum);
          break;

        case 'search':
          await workflow.searchAndReference();
          break;

        case 'report':
          await workflow.generateReport();
          break;

        default:
          console.log(`
🤖 Chat Request Workflow Manager
================================

Usage: node workflow.js <command> [args]

Commands:
  start                    Start a new chat request (with before screenshot)
  complete <req_num>       Complete a request (with after screenshot)
  issue <req_num>          Log an issue/regression for existing request
  search                   Search and reference previous requests
  report                   Generate summary report

Workflow:
  1. node workflow.js start
  2. Work on your request with Copilot
  3. node workflow.js complete <number>

For issues/regressions:
  node workflow.js issue <original_request_number>

Examples:
  node workflow.js start
  node workflow.js complete 15
  node workflow.js issue 12
  node workflow.js search
          `);
      }
    } catch (error) {
      console.error('Workflow error:', error.message);
    }
  })();
}

export default ChatWorkflow;
