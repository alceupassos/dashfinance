#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p output
LOG="output/automation-alt.log"
touch "$LOG"
LIMIT="${LIMIT:-106}"
OFFSET="${OFFSET:-0}"
export LIMIT OFFSET
setsid node agents/agent-puppeteer-alt.js >> "$LOG" 2>&1 < /dev/null &
echo "ALT started (PID $!), OFFSET=$OFFSET LIMIT=$LIMIT, LOG=$LOG"


