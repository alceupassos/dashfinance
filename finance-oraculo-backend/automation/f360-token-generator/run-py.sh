#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p output
LOG="output/automation-py.log"
touch "$LOG"
LIMIT="${LIMIT:-106}"
OFFSET="${OFFSET:-106}"
export CSV_PATH="/tmp/F360_Lista_Acessos_COMPLETA.csv"
export LIMIT OFFSET
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 não encontrado"; exit 1
fi
# preparar venv local para evitar PEP 668
# Preferir venv, mas se não existir, usar sistema (fallback)
if [ -d ".venv" ]; then
  . .venv/bin/activate || true
fi
PY_BIN="${PY_BIN:-python3}"
setsid "$PY_BIN" agents/agent-playwright.py >> "$LOG" 2>&1 < /dev/null &
echo "PY started (PID $!), OFFSET=$OFFSET LIMIT=$LIMIT, LOG=$LOG"


