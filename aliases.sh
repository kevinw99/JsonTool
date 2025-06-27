#!/bin/bash

# Ultra-Simple Chat Logging Aliases
# Source this file to get single-letter commands
# Usage: source aliases.sh

alias l="npm run log"      # Log new request
alias s="npm run sub"      # Add sub-request  
alias r="npm run ref"      # Quick reference
alias f="npm run find"     # Find requests
alias d="npm run done"     # Mark as done

# Auto-capture aliases
alias auto="npm run auto-bg"        # Start auto-capture service
alias logs="npm run auto-logs"      # View auto-capture logs
alias stop="npm run auto-stop"      # Stop auto-capture service

# Show current aliases
alias show-aliases="echo 'Chat Logging Aliases:'; echo 'l = log new request'; echo 's = add sub-request'; echo 'r = quick reference'; echo 'f = find requests'; echo 'd = mark done'; echo 'auto = start auto-capture'; echo 'logs = view logs'; echo 'stop = stop service'"

echo "🚀 Chat logging aliases loaded!"
echo "Use: l, s, r, f, d for manual logging"
echo "Use: auto, logs, stop for auto-capture"
echo "Type 'show-aliases' to see all commands"
