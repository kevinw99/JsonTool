#!/bin/bash

# Auto-commit helper script for JsonTool development
# Usage: ./auto-commit.sh "CHAT-01: Description of changes"

if [ $# -eq 0 ]; then
    echo "Error: Please provide a commit message"
    echo "Usage: ./auto-commit.sh \"CHAT-XX: Description of changes\""
    exit 1
fi

COMMIT_MSG="$1"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

echo "🔄 Auto-committing changes..."
echo "📝 Message: $COMMIT_MSG"
echo "⏰ Timestamp: $TIMESTAMP"

# Stage all changes
git add -A

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "ℹ️  No changes to commit"
    exit 0
fi

# Create commit with timestamp
git commit -m "$COMMIT_MSG

Timestamp: $TIMESTAMP
Auto-generated commit for incremental development"

echo "✅ Commit created successfully!"

# Show brief log
echo ""
echo "📋 Recent commits:"
git log --oneline -3
