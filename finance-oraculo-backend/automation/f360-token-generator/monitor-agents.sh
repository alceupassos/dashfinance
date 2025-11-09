#!/bin/bash
# Monitora os 5 agentes em tempo real

cd /tmp/f360-token-generator || exit 1

echo "🔍 Monitorando os 5 agentes..."
echo "Pressione Ctrl+C para sair"
echo ""

while true; do
  clear
  echo "═══════════════════════════════════════════════════════════════"
  echo "📊 STATUS DOS AGENTES - $(date '+%H:%M:%S')"
  echo "═══════════════════════════════════════════════════════════════"
  echo ""
  
  for agent in codex deepseek gemini mistral qwen; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 $agent (últimas 5 linhas):"
    tail -5 output/automation-$agent.log 2>/dev/null | sed 's/^/  /' || echo "  (sem log ainda)"
    echo ""
  done
  
  echo "═══════════════════════════════════════════════════════════════"
  echo "💡 PIDs ativos:"
  ps aux | grep -E '[n]ode agents/agent-[1-5]' | awk '{print "  " $2 ": " $11 " " $12 " " $13}' || echo "  (nenhum processo)"
  echo ""
  
  sleep 5
done

