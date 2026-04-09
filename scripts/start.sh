#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/hammer.log"
PID_FILE="$PROJECT_DIR/hammer.pid"
PORT="${PORT:-5175}"

cd "$PROJECT_DIR"

if ! command -v forever &>/dev/null; then
  echo "Error: forever is not installed. Run: npm install -g forever"
  exit 1
fi

if [ ! -d "$PROJECT_DIR/build" ]; then
  echo "No build directory found. Running build first..."
  npm run build
fi

echo "Starting Hammer UI on port $PORT..."
PORT="$PORT" forever start \
  --id hammer \
  --pidFile "$PID_FILE" \
  -a -l "$LOG_FILE" \
  ./node_modules/.bin/react-router-serve \
  ./build/server/index.js

echo "Hammer UI running (forever id: hammer)"
echo "Log: $LOG_FILE"
echo "Stop: forever stop hammer"
