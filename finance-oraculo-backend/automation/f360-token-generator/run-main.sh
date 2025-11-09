#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p output
touch automation.log
pkill -f 'node generate-f360' 2>/dev/null || true
setsid node generate-f360-tokens.js >> automation.log 2>&1 < /dev/null &
echo "MAIN started (PID $!)"


