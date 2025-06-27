#!/bin/bash

# Auto-Chat Startup Script
# This script starts the auto-capture service in the background

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$PROJECT_DIR/.auto-capture.pid"

case "$1" in
  start)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "🤖 Auto-capture service is already running (PID: $(cat "$PID_FILE"))"
    else
      echo "🚀 Starting auto-capture service in background..."
      cd "$PROJECT_DIR"
      nohup node auto-capture.js start > auto-capture.log 2>&1 & 
      echo $! > "$PID_FILE"
      echo "✅ Auto-capture service started (PID: $!)"
      echo "📝 Logs: tail -f auto-capture.log"
      echo "🛑 Stop: npm run auto-stop"
    fi
    ;;
    
  stop)
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        rm "$PID_FILE"
        echo "🛑 Auto-capture service stopped"
      else
        echo "⚠️ Service not running, cleaning up PID file"
        rm "$PID_FILE"
      fi
    else
      echo "⚠️ Auto-capture service is not running"
    fi
    ;;
    
  restart)
    $0 stop
    sleep 2
    $0 start
    ;;
    
  status)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "🤖 Auto-capture service is running (PID: $(cat "$PID_FILE"))"
      echo "📊 Recent activity:"
      npm run auto-status
    else
      echo "❌ Auto-capture service is not running"
      if [ -f "$PID_FILE" ]; then
        rm "$PID_FILE"
      fi
    fi
    ;;
    
  logs)
    if [ -f "$PROJECT_DIR/auto-capture.log" ]; then
      tail -f "$PROJECT_DIR/auto-capture.log"
    else
      echo "❌ No log file found. Service may not be running."
    fi
    ;;
    
  *)
    echo "Usage: $0 {start|stop|restart|status|logs}"
    echo ""
    echo "🤖 Auto-Chat Background Service"
    echo "==============================="
    echo ""
    echo "Commands:"
    echo "  start    Start auto-capture service in background"
    echo "  stop     Stop the service"
    echo "  restart  Restart the service"
    echo "  status   Check if service is running"
    echo "  logs     View service logs (Ctrl+C to exit)"
    echo ""
    echo "Zero-Effort Workflow:"
    echo "  1. $0 start          # Run once, keeps monitoring"
    echo "  2. Work with Copilot  # Requests auto-captured"
    echo "  3. npm run ref 17     # Reference any request"
    echo ""
    exit 1
    ;;
esac
