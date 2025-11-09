#!/bin/bash
# Script para verificar status do F360 Token Generator

cd /tmp/f360-token-generator || exit 1

echo "=========================================="
echo "F360 Token Generator - Status"
echo "=========================================="
echo ""

# Verificar se está rodando
if ps aux | grep -q '[n]ode generate-f360'; then
    echo "✅ Script RODANDO"
    PID=$(ps aux | grep '[n]ode generate-f360' | grep -v grep | awk '{print $2}')
    echo "   PID: $PID"
else
    echo "❌ Script NÃO está rodando"
fi

echo ""

# Verificar logs
if [ -f automation.log ]; then
    echo "📋 LOG (automation.log):"
    echo "   Últimas 15 linhas:"
    tail -15 automation.log 2>/dev/null | sed 's/^/   /' || echo "   (arquivo vazio ou erro ao ler)"
elif [ -f output/automation-log.txt ]; then
    echo "📋 LOG (output/automation-log.txt):"
    echo "   Últimas 15 linhas:"
    tail -15 output/automation-log.txt 2>/dev/null | sed 's/^/   /' || echo "   (arquivo vazio ou erro ao ler)"
else
    echo "⚠️  Log ainda não foi criado"
fi

echo ""

# Verificar progresso
if [ -f output/f360-tokens-progress.json ]; then
    echo "📊 PROGRESSO:"
    python3 << 'PYTHON'
import json
try:
    with open('output/f360-tokens-progress.json') as f:
        data = json.load(f)
    total = len(data)
    success = sum(1 for r in data if r.get('status') == 'success')
    errors = total - success
    print(f"   Processados: {total}")
    print(f"   Sucessos: {success}")
    print(f"   Erros: {errors}")
    if total > 0:
        print(f"   Taxa de sucesso: {success/total*100:.1f}%")
except Exception as e:
    print(f"   Erro ao ler progresso: {e}")
PYTHON
else
    echo "📊 PROGRESSO: Nenhum arquivo de progresso encontrado ainda"
fi

echo ""

# Verificar arquivos de saída
echo "📁 ARQUIVOS DE SAÍDA:"
if [ -f output/f360-tokens-extracted.json ]; then
    SIZE=$(ls -lh output/f360-tokens-extracted.json | awk '{print $5}')
    echo "   ✅ f360-tokens-extracted.json ($SIZE)"
else
    echo "   ⏳ f360-tokens-extracted.json (não criado ainda)"
fi

if [ -f output/insert-f360-config.sql ]; then
    SIZE=$(ls -lh output/insert-f360-config.sql | awk '{print $5}')
    echo "   ✅ insert-f360-config.sql ($SIZE)"
else
    echo "   ⏳ insert-f360-config.sql (não criado ainda)"
fi

SCREENSHOTS=$(ls output/screenshots/*.png 2>/dev/null | wc -l)
echo "   📸 Screenshots: $SCREENSHOTS"

echo ""
echo "=========================================="

