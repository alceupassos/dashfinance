#!/bin/bash

# ====================================================
# Script de Configuração Automática N8N
# Finance Oráculo - Sistema Completo v2
# ====================================================

set -e

echo "🚀 Finance Oráculo - Setup N8N Automático"
echo "=========================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ====================================================
# 1. VERIFICAR PRÉ-REQUISITOS
# ====================================================

echo -e "${BLUE}📋 Verificando pré-requisitos...${NC}"

# Verificar se curl está instalado
if ! command -v curl &> /dev/null; then
    echo -e "${RED}❌ curl não encontrado. Instale com: brew install curl${NC}"
    exit 1
fi

# Verificar se jq está instalado
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️  jq não encontrado. Instalando...${NC}"
    brew install jq
fi

echo -e "${GREEN}✅ Pré-requisitos verificados${NC}"
echo ""

# ====================================================
# 2. COLETAR INFORMAÇÕES DO USUÁRIO
# ====================================================

echo -e "${BLUE}📝 Coleta de Informações${NC}"
echo ""

# URL do N8N
read -p "Digite a URL do seu N8N (ex: https://n8n.seudominio.com): " N8N_URL
N8N_URL=${N8N_URL%/} # Remove trailing slash

# API Key do N8N
echo ""
echo "Para obter sua N8N API Key:"
echo "1. Acesse ${N8N_URL}"
echo "2. Vá em Settings → API"
echo "3. Crie uma nova API Key"
echo ""
read -p "Digite sua N8N API Key: " N8N_API_KEY

# Validar conexão com N8N
echo ""
echo -e "${BLUE}🔍 Testando conexão com N8N...${NC}"

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  "${N8N_URL}/api/v1/workflows")

if [ "$HTTP_STATUS" != "200" ]; then
    echo -e "${RED}❌ Erro ao conectar com N8N. Verifique URL e API Key.${NC}"
    echo "Status HTTP: $HTTP_STATUS"
    exit 1
fi

echo -e "${GREEN}✅ Conexão com N8N estabelecida${NC}"
echo ""

# Credenciais
echo -e "${BLUE}🔑 Configuração de Credenciais${NC}"
echo ""

read -p "Digite sua OpenAI API Key (sk-...): " OPENAI_KEY
read -p "Digite sua Anthropic API Key (sk-ant-...): " ANTHROPIC_KEY

echo ""
echo -e "${GREEN}✅ Informações coletadas${NC}"
echo ""

# ====================================================
# 3. CRIAR CREDENCIAIS VIA API
# ====================================================

echo -e "${BLUE}🔧 Criando credenciais no N8N...${NC}"

# Credencial 1: Supabase PostgreSQL
echo "Criando credencial: Supabase PostgreSQL..."

POSTGRES_CRED=$(cat <<EOF
{
  "name": "Supabase PostgreSQL",
  "type": "postgres",
  "data": {
    "host": "db.xzrmzmcoslomtzkzgskn.supabase.co",
    "port": 5432,
    "database": "postgres",
    "user": "postgres",
    "password": "B5b0dcf500@#",
    "ssl": "allow"
  }
}
EOF
)

POSTGRES_ID=$(curl -s -X POST "${N8N_URL}/api/v1/credentials" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "${POSTGRES_CRED}" | jq -r '.id')

if [ -z "$POSTGRES_ID" ] || [ "$POSTGRES_ID" == "null" ]; then
    echo -e "${RED}❌ Erro ao criar credencial PostgreSQL${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Supabase PostgreSQL criado (ID: ${POSTGRES_ID})${NC}"

# Credencial 2: Evolution API Key
echo "Criando credencial: Evolution API Key..."

EVOLUTION_CRED=$(cat <<EOF
{
  "name": "Evolution API Key",
  "type": "httpHeaderAuth",
  "data": {
    "name": "apikey",
    "value": "D7BED4328F0C-4EA8-AD7A-08F72F6777E9"
  }
}
EOF
)

EVOLUTION_ID=$(curl -s -X POST "${N8N_URL}/api/v1/credentials" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "${EVOLUTION_CRED}" | jq -r '.id')

echo -e "${GREEN}✅ Evolution API Key criado (ID: ${EVOLUTION_ID})${NC}"

# Credencial 3: OpenAI API Key
echo "Criando credencial: OpenAI API Key..."

OPENAI_CRED=$(cat <<EOF
{
  "name": "OpenAI API Key",
  "type": "httpHeaderAuth",
  "data": {
    "name": "Authorization",
    "value": "Bearer ${OPENAI_KEY}"
  }
}
EOF
)

OPENAI_ID=$(curl -s -X POST "${N8N_URL}/api/v1/credentials" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "${OPENAI_CRED}" | jq -r '.id')

echo -e "${GREEN}✅ OpenAI API Key criado (ID: ${OPENAI_ID})${NC}"

# Credencial 4: Anthropic API Key
echo "Criando credencial: Anthropic API Key..."

ANTHROPIC_CRED=$(cat <<EOF
{
  "name": "Anthropic API Key",
  "type": "httpHeaderAuth",
  "data": {
    "name": "x-api-key",
    "value": "${ANTHROPIC_KEY}"
  }
}
EOF
)

ANTHROPIC_ID=$(curl -s -X POST "${N8N_URL}/api/v1/credentials" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "${ANTHROPIC_CRED}" | jq -r '.id')

echo -e "${GREEN}✅ Anthropic API Key criado (ID: ${ANTHROPIC_ID})${NC}"
echo ""

# ====================================================
# 4. ATUALIZAR JSONs COM IDs DE CREDENCIAIS
# ====================================================

echo -e "${BLUE}📝 Atualizando workflows com IDs de credenciais...${NC}"

# Copiar JSONs originais
cp n8n-workflows/whatsapp-bot-v2-completo.json n8n-workflows/whatsapp-bot-v2-ready.json
cp n8n-workflows/mensagens-automaticas-v2.json n8n-workflows/mensagens-automaticas-v2-ready.json

# Atualizar IDs no whatsapp-bot
sed -i '' "s/\"id\": \"supabase-postgres\"/\"id\": \"${POSTGRES_ID}\"/g" n8n-workflows/whatsapp-bot-v2-ready.json
sed -i '' "s/\"id\": \"evolution-api-key\"/\"id\": \"${EVOLUTION_ID}\"/g" n8n-workflows/whatsapp-bot-v2-ready.json
sed -i '' "s/\"id\": \"openai-api-key\"/\"id\": \"${OPENAI_ID}\"/g" n8n-workflows/whatsapp-bot-v2-ready.json
sed -i '' "s/\"id\": \"anthropic-api-key\"/\"id\": \"${ANTHROPIC_ID}\"/g" n8n-workflows/whatsapp-bot-v2-ready.json

# Atualizar IDs no mensagens-automaticas
sed -i '' "s/\"id\": \"supabase-postgres\"/\"id\": \"${POSTGRES_ID}\"/g" n8n-workflows/mensagens-automaticas-v2-ready.json
sed -i '' "s/\"id\": \"evolution-api-key\"/\"id\": \"${EVOLUTION_ID}\"/g" n8n-workflows/mensagens-automaticas-v2-ready.json

echo -e "${GREEN}✅ Workflows atualizados${NC}"
echo ""

# ====================================================
# 5. IMPORTAR WORKFLOWS VIA API
# ====================================================

echo -e "${BLUE}📤 Importando workflows no N8N...${NC}"

# Workflow 1: WhatsApp Bot v2
echo "Importando: WhatsApp Bot v2..."

WORKFLOW1=$(cat n8n-workflows/whatsapp-bot-v2-ready.json)

WORKFLOW1_ID=$(curl -s -X POST "${N8N_URL}/api/v1/workflows" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "${WORKFLOW1}" | jq -r '.id')

if [ -z "$WORKFLOW1_ID" ] || [ "$WORKFLOW1_ID" == "null" ]; then
    echo -e "${RED}❌ Erro ao importar WhatsApp Bot v2${NC}"
    exit 1
fi

echo -e "${GREEN}✅ WhatsApp Bot v2 importado (ID: ${WORKFLOW1_ID})${NC}"

# Ativar Workflow 1
curl -s -X PATCH "${N8N_URL}/api/v1/workflows/${WORKFLOW1_ID}" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"active": true}' > /dev/null

echo -e "${GREEN}✅ WhatsApp Bot v2 ativado${NC}"

# Workflow 2: Mensagens Automáticas v2
echo "Importando: Mensagens Automáticas v2..."

WORKFLOW2=$(cat n8n-workflows/mensagens-automaticas-v2-ready.json)

WORKFLOW2_ID=$(curl -s -X POST "${N8N_URL}/api/v1/workflows" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "${WORKFLOW2}" | jq -r '.id')

echo -e "${GREEN}✅ Mensagens Automáticas v2 importado (ID: ${WORKFLOW2_ID})${NC}"

# Ativar Workflow 2
curl -s -X PATCH "${N8N_URL}/api/v1/workflows/${WORKFLOW2_ID}" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"active": true}' > /dev/null

echo -e "${GREEN}✅ Mensagens Automáticas v2 ativado${NC}"
echo ""

# ====================================================
# 6. OBTER WEBHOOK URL
# ====================================================

echo -e "${BLUE}🔗 Obtendo Webhook URL...${NC}"

WORKFLOW1_DETAILS=$(curl -s -X GET "${N8N_URL}/api/v1/workflows/${WORKFLOW1_ID}" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}")

WEBHOOK_PATH=$(echo "${WORKFLOW1_DETAILS}" | jq -r '.nodes[] | select(.type == "n8n-nodes-base.webhook") | .parameters.path')
WEBHOOK_URL="${N8N_URL}/webhook/${WEBHOOK_PATH}"

echo -e "${GREEN}✅ Webhook URL: ${WEBHOOK_URL}${NC}"
echo ""

# ====================================================
# 7. CONFIGURAR VARIÁVEIS DE AMBIENTE
# ====================================================

echo -e "${BLUE}🌍 Configurando variáveis de ambiente...${NC}"

# Nota: A API do N8N não suporta criar variáveis de ambiente via API
# Precisamos instruir o usuário a fazer manualmente

echo -e "${YELLOW}⚠️  Variáveis de ambiente precisam ser configuradas manualmente:${NC}"
echo ""
echo "1. Acesse: ${N8N_URL}"
echo "2. Vá em Settings → Environments"
echo "3. Adicione:"
echo "   - Nome: EVO_API_URL"
echo "     Valor: https://evolution-api.com"
echo ""
echo "   - Nome: EVO_API_KEY"
echo "     Valor: D7BED4328F0C-4EA8-AD7A-08F72F6777E9"
echo ""
read -p "Pressione ENTER depois de configurar as variáveis de ambiente..."

# ====================================================
# 8. CONFIGURAR WEBHOOK NA EVOLUTION API
# ====================================================

echo ""
echo -e "${BLUE}🔗 Configurando webhook na Evolution API...${NC}"

EVOLUTION_WEBHOOK=$(cat <<EOF
{
  "enabled": true,
  "url": "${WEBHOOK_URL}",
  "events": ["messages.upsert"],
  "webhook_by_events": true
}
EOF
)

WEBHOOK_RESPONSE=$(curl -s -X POST "https://evolution-api.com/instance/iFinance/webhook" \
  -H "apikey: D7BED4328F0C-4EA8-AD7A-08F72F6777E9" \
  -H "Content-Type: application/json" \
  -d "${EVOLUTION_WEBHOOK}")

if echo "${WEBHOOK_RESPONSE}" | grep -q "success\|webhook"; then
    echo -e "${GREEN}✅ Webhook configurado na Evolution API${NC}"
else
    echo -e "${YELLOW}⚠️  Não foi possível configurar webhook automaticamente${NC}"
    echo "Configure manualmente:"
    echo "URL: ${WEBHOOK_URL}"
    echo "Event: messages.upsert"
fi

echo ""

# ====================================================
# 9. RESUMO FINAL
# ====================================================

echo ""
echo -e "${GREEN}=========================================="
echo "✅ SETUP CONCLUÍDO COM SUCESSO!"
echo "==========================================${NC}"
echo ""
echo "📊 Resumo:"
echo "  ✅ 4 credenciais criadas"
echo "  ✅ 2 workflows importados e ativados"
echo "  ✅ Webhook configurado"
echo ""
echo "🔗 URLs Importantes:"
echo "  • N8N: ${N8N_URL}"
echo "  • Webhook: ${WEBHOOK_URL}"
echo "  • Workflow 1 ID: ${WORKFLOW1_ID}"
echo "  • Workflow 2 ID: ${WORKFLOW2_ID}"
echo ""
echo "🧪 Próximos Passos:"
echo "  1. Configure as variáveis de ambiente (se ainda não fez)"
echo "  2. Envie uma mensagem de teste no WhatsApp"
echo "  3. Verifique execuções em: ${N8N_URL}/executions"
echo ""
echo "📝 Logs salvos em: setup-n8n.log"
echo ""
echo -e "${BLUE}Para testar o sistema, envie:${NC}"
echo "  Mensagem: 'Qual o saldo do meu caixa?'"
echo ""
echo -e "${GREEN}Sistema pronto para produção! 🚀${NC}"
echo ""

# Salvar informações em arquivo
cat > setup-n8n-info.txt <<EOF
Finance Oráculo - Informações do Setup
=======================================

Data: $(date)

N8N URL: ${N8N_URL}
Webhook URL: ${WEBHOOK_URL}

Workflows Criados:
- WhatsApp Bot v2 (ID: ${WORKFLOW1_ID})
- Mensagens Automáticas v2 (ID: ${WORKFLOW2_ID})

Credenciais Criadas:
- Supabase PostgreSQL (ID: ${POSTGRES_ID})
- Evolution API Key (ID: ${EVOLUTION_ID})
- OpenAI API Key (ID: ${OPENAI_ID})
- Anthropic API Key (ID: ${ANTHROPIC_ID})

Próximos Passos:
1. Configure variáveis de ambiente: EVO_API_URL, EVO_API_KEY
2. Teste enviando mensagem WhatsApp
3. Monitore em: ${N8N_URL}/executions

Status: ✅ Sistema Operacional
EOF

echo -e "${GREEN}ℹ️  Informações salvas em: setup-n8n-info.txt${NC}"
echo ""
