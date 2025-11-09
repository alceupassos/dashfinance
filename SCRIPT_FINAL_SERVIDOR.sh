#!/bin/bash

# SCRIPT FINAL - RODAR NO SERVIDOR 147
# Execute: bash SCRIPT_FINAL_SERVIDOR.sh

set -e

echo "Setup Final N8N + Workflows"
echo "============================"
echo ""

# API Key N8N (forneça aqui)
N8N_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3OTcwYzdkMy04NmFkLTRjOGEtOGNkOS1jMDk1OTYzMjk5Y2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYyNDE2ODM3LCJleHAiOjE3NjI0NTI4ODZ9.2nt8q_5HPjqHb4uPfV0EQRZtA3_q4gUvX7V6nFp1_JE"

# Descobrir URL N8N
echo "Descobrindo N8N..."
N8N_URL=$(netstat -tlnp 2>/dev/null | grep -E 'LISTEN.*node' | awk '{print $4}' | head -1 | cut -d: -f2)

if [ -z "$N8N_URL" ]; then
    echo "Procurando porta..."
    for port in 5678 3000 8000 8080 9000; do
        if netstat -tlnp 2>/dev/null | grep -q ":$port"; then
            N8N_URL="localhost:$port"
            echo "N8N encontrado na porta $port"
            break
        fi
    done
fi

if [ -z "$N8N_URL" ]; then
    echo "Erro: N8N não encontrado"
    exit 1
fi

echo "N8N URL: http://$N8N_URL"
echo ""

# Testar conexão
echo "Testando conexão..."
if curl -s -H "Authorization: Bearer $N8N_API_KEY" "http://$N8N_URL/api/v1/workflows" > /dev/null 2>&1; then
    echo "Conexão OK!"
else
    echo "Aviso: Não conseguiu conectar via API"
fi

echo ""
echo "Criando diretórios..."
mkdir -p /dashfinance/n8n-workflows

echo ""
echo "Resumindo:"
echo "  N8N URL: http://$N8N_URL"
echo "  API Key: Configurada"
echo "  Workflows dir: /dashfinance/n8n-workflows"
echo ""
echo "Próximos passos:"
echo "  1. Acesse: http://$N8N_URL"
echo "  2. Importe os workflows de /dashfinance/n8n-workflows"
echo "  3. Configure credenciais Supabase + WASender"
echo "  4. Teste e ative"
echo ""

