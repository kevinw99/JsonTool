# 📋 How to View Your Logged Chat Requests

## 🎯 Quick Access

### View All Logged Requests
```bash
# Open in VS Code or your editor
code CHAT_LOG.md

# View in terminal (full file)
cat CHAT_LOG.md

# View recent entries
tail -50 CHAT_LOG.md
```

### Check Current Status
```bash
# See statistics and recent activity
npm run auto-status

# Get filtering insights
npm run auto-insights
```

## 📍 Where Everything Is Stored

### 1. **Main Log**: `CHAT_LOG.md`
- **Location**: `/Users/kweng/AI/JsonTool/CHAT_LOG.md`
- **Contains**: All auto-captured requests with full details
- **Format**: Markdown with numbered requests, categories, commits, files

### 2. **Test Cases**: `test-cases/` directory
- **Location**: `/Users/kweng/AI/JsonTool/test-cases/`
- **Contains**: Auto-generated test cases for important requests
- **Format**: JSON files with test steps, sample data, verification commands

### 3. **State Files**: 
- `.auto-chat-state.json` - Session state and statistics
- `.chat-state.json` - SmartLogger state
- `auto-capture.log` - Background service logs

## 🔍 Search & Filter Requests

### By Request Number
```bash
grep "Request #25" CHAT_LOG.md
```

### By Category
```bash
# Find all bug fixes
grep "🐛 Bug Fix" CHAT_LOG.md

# Find all features
grep "✨ Feature" CHAT_LOG.md

# Find all UI/UX requests
grep "🎨 UI/UX" CHAT_LOG.md
```

### By Date
```bash
grep "2025-06-27" CHAT_LOG.md
```

### By Priority
```bash
grep "Priority: high" CHAT_LOG.md
grep "Priority: critical" CHAT_LOG.md
```

### By Keyword
```bash
# Search for navigation-related requests
grep -i "navigation" CHAT_LOG.md

# Search for specific components
grep -i "JsonTreeView" CHAT_LOG.md

# Search for specific issues
grep -i "highlight" CHAT_LOG.md
```

## 📊 View Statistics

### Current Session Stats
```bash
npm run auto-status
```
Shows:
- Total commits processed
- Requests logged vs filtered
- Category breakdown
- Filter reasons
- Log efficiency rate

### Detailed Insights
```bash
npm run auto-insights
```
Shows:
- Filtering rules explanation
- Scoring system details
- Priority levels
- Test case generation rules
- Current session analysis

## 🧪 View Test Cases

### List All Test Cases
```bash
ls test-cases/
```

### View Specific Test Case
```bash
cat test-cases/test-27.json
```

### View All Test Cases
```bash
cat test-cases/*.json
```

## 📱 Quick Reference Commands

### View Recent Logged Requests
```bash
# Last 10 requests
grep -A 6 "### Request #" CHAT_LOG.md | tail -70

# All requests from today
grep -A 6 "$(date +%Y-%m-%d)" CHAT_LOG.md
```

### Find Specific Request
```bash
# By commit hash
grep "45fbdb5" CHAT_LOG.md

# By file changed
grep "JsonTreeView" CHAT_LOG.md

# By status
grep "✅ Completed" CHAT_LOG.md
```

### Export Filtered Results
```bash
# All bug fixes to separate file
grep -A 10 "🐛 Bug Fix" CHAT_LOG.md > bug_fixes.md

# All high priority requests
grep -A 10 "Priority: high" CHAT_LOG.md > high_priority.md
```

## 🔗 Integration with Git

Each logged request includes:
- **Commit hash**: Click to view changes in GitHub
- **Files changed**: See what was modified
- **Date**: When the work was done
- **Auto-detection**: Confirmation it was captured automatically

## 💡 Pro Tips

### 1. **Use VS Code Search**
Open `CHAT_LOG.md` in VS Code and use Ctrl+F for advanced search with regex support.

### 2. **Bookmark Important Requests**
Add your own tags in the log file:
```markdown
### Request #25 - 🐛 Bug Fix [IMPORTANT]
```

### 3. **Create Custom Views**
```bash
# Create a summary of all critical issues
grep -A 3 "Priority: critical" CHAT_LOG.md > critical_issues.md
```

### 4. **Monitor in Real-Time**
```bash
# Watch for new requests (if service is running)
tail -f CHAT_LOG.md
```

## 🚀 Next Steps

1. **Open CHAT_LOG.md** to see all your logged requests
2. **Run `npm run auto-status`** to see current statistics  
3. **Search for specific patterns** you're interested in
4. **Review test cases** in the `test-cases/` directory
5. **Use the insights** to understand what's being filtered

Your chat requests are automatically logged and organized - no manual work required!
