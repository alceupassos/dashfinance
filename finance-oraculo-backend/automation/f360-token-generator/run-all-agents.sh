#!/bin/bash
# Roda os 5 agentes em paralelo, TODOS tentando o MESMO primeiro registro
# Objetivo: ENCONTRAR UMA SOLUÇÃO que funcione, não processar todos

cd /tmp/f360-token-generator || exit 1

echo "🎯 MODO ESTRITO: 5 agentes tentando o MESMO primeiro registro"
echo "📋 Objetivo: ENCONTRAR UMA SOLUÇÃO que funcione"
echo ""

# Todos os agentes processam o registro 0 até conseguir token
setsid node agents/agent-1-codex.js > output/automation-codex.log 2>&1 < /dev/null &
PID1=$!
echo "✅ CODEX iniciado (PID: $PID1) - Estratégia: XY + CSS"

setsid node agents/agent-2-deepseek.js > output/automation-deepseek.log 2>&1 < /dev/null &
PID2=$!
echo "✅ DEEPSEEK iniciado (PID: $PID2) - Estratégia: Busca recursiva"

setsid node agents/agent-3-gemini.js > output/automation-gemini.log 2>&1 < /dev/null &
PID3=$!
echo "✅ GEMINI iniciado (PID: $PID3) - Estratégia: 4 abordagens"

setsid node agents/agent-4-mistral.js > output/automation-mistral.log 2>&1 < /dev/null &
PID4=$!
echo "✅ MISTRAL iniciado (PID: $PID4) - Estratégia: Validação rigorosa"

setsid node agents/agent-5-qwen.js > output/automation-qwen.log 2>&1 < /dev/null &
PID5=$!
echo "✅ QWEN iniciado (PID: $PID5) - Estratégia: Busca agressiva"

echo ""
echo "📊 PIDs dos agentes:"
echo "   CODEX: $PID1"
echo "   DEEPSEEK: $PID2"
echo "   GEMINI: $PID3"
echo "   MISTRAL: $PID4"
echo "   QWEN: $PID5"
echo ""
echo "💡 Todos tentando o primeiro registro até conseguir token"
echo "💡 Para ver logs: tail -f output/automation-*.log"
echo "💡 Para verificar status: ./check-status.sh"

