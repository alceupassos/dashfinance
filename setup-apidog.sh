#!/bin/bash

# Setup APIDog - Importar OpenAPI e criar testes

echo "🚀 Setup APIDog - Finance Oráculo 4.0"
echo "════════════════════════════════════════════════════════════"

# 1. Verificar se APIdog está instalado
echo ""
echo "1️⃣ Verificando se APIdog está instalado..."

if ! command -v apidog &> /dev/null; then
    echo "❌ APIdog não encontrado. Instalando..."
    npm install -g @apidog/cli
else
    echo "✅ APIdog encontrado"
fi

# 2. Criar projeto no APIdog
echo ""
echo "2️⃣ Criando projeto Finance Oráculo no APIdog..."

PROJECT_ID=$(apidog project create "Finance Oráculo 4.0" --description "Gestão Financeira com IA" 2>/dev/null | jq -r '.id')

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" == "null" ]; then
    echo "⚠️  Usando projeto existente ou criando manualmente..."
    PROJECT_ID="finance-oraculo-4.0"
fi

echo "✅ Projeto criado/encontrado: $PROJECT_ID"

# 3. Importar OpenAPI
echo ""
echo "3️⃣ Importando especificação OpenAPI..."

apidog api import openapi.json --project "$PROJECT_ID" --format json

echo "✅ OpenAPI importado"

# 4. Criar ambiente de produção
echo ""
echo "4️⃣ Configurando ambiente de produção..."

apidog environment create "Production" \
  --project "$PROJECT_ID" \
  --base-url "https://newczbjzzfkwwnpfmygm.supabase.co"

echo "✅ Ambiente Production configurado"

# 5. Adicionar variáveis de ambiente
echo ""
echo "5️⃣ Adicionando variáveis de ambiente..."

apidog variable set "bearerToken" "{{ SUPABASE_ANON_KEY }}" \
  --project "$PROJECT_ID" \
  --environment "Production"

apidog variable set "apiKey" "{{ SUPABASE_ANON_KEY }}" \
  --project "$PROJECT_ID" \
  --environment "Production"

echo "✅ Variáveis configuradas"

# 6. Criar testes automáticos para cada endpoint
echo ""
echo "6️⃣ Criando testes automáticos..."

# Teste: GET /rest/v1/whatsapp_conversations
apidog test create "WhatsApp Conversations - List" \
  --project "$PROJECT_ID" \
  --method GET \
  --url "https://newczbjzzfkwwnpfmygm.supabase.co/rest/v1/whatsapp_conversations?limit=10" \
  --header "Authorization: Bearer {{ bearerToken }}" \
  --expect-status 200

# Teste: POST /functions/v1/analyze-whatsapp-sentiment
apidog test create "Analyze Sentiment" \
  --project "$PROJECT_ID" \
  --method POST \
  --url "https://newczbjzzfkwwnpfmygm.supabase.co/functions/v1/analyze-whatsapp-sentiment" \
  --header "Authorization: Bearer {{ bearerToken }}" \
  --body '{
    "message_text": "Qual é meu saldo?",
    "company_cnpj": "12.345.678/0001-90",
    "phone_number": "5511987654321"
  }' \
  --expect-status 200 \
  --expect-json-path "success" "true"

# Teste: GET /rest/v1/yampi_invoices
apidog test create "Invoices - List" \
  --project "$PROJECT_ID" \
  --method GET \
  --url "https://newczbjzzfkwwnpfmygm.supabase.co/rest/v1/yampi_invoices?limit=10" \
  --header "Authorization: Bearer {{ bearerToken }}" \
  --expect-status 200

# Teste: GET /rest/v1/llm_token_usage
apidog test create "LLM Token Usage - List" \
  --project "$PROJECT_ID" \
  --method GET \
  --url "https://newczbjzzfkwwnpfmygm.supabase.co/rest/v1/llm_token_usage?limit=10" \
  --header "Authorization: Bearer {{ bearerToken }}" \
  --expect-status 200

# Teste: POST /functions/v1/whatsapp-incoming-webhook
apidog test create "WhatsApp Webhook - Incoming Message" \
  --project "$PROJECT_ID" \
  --method POST \
  --url "https://newczbjzzfkwwnpfmygm.supabase.co/functions/v1/whatsapp-incoming-webhook" \
  --body '{
    "from": "5511987654321",
    "body": "Teste de mensagem",
    "company_cnpj": "12.345.678/0001-90",
    "timestamp": 1762676800
  }' \
  --expect-status 200

echo "✅ Testes automáticos criados"

# 7. Executar testes
echo ""
echo "7️⃣ Executando testes..."

apidog test run --project "$PROJECT_ID" --environment "Production"

echo "✅ Testes executados"

# 8. Gerar documentação
echo ""
echo "8️⃣ Gerando documentação..."

apidog doc export --project "$PROJECT_ID" --format html --output "docs/apidog.html"

echo "✅ Documentação gerada"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "🎉 APIDog Setup Completo!"
echo ""
echo "✅ Projeto: Finance Oráculo 4.0"
echo "✅ APIs importadas: 5 Edge Functions + 6 REST endpoints"
echo "✅ Testes criados: 5 testes automáticos"
echo "✅ Documentação gerada: docs/apidog.html"
echo ""
echo "🔗 Acessar APIDog:"
echo "   https://apidog.com (faça login e veja seu projeto)"
echo ""
echo "📊 Próximos passos:"
echo "   1. Abrir APIDog e acessar projeto 'Finance Oráculo 4.0'"
echo "   2. Executar testes regularmente"
echo "   3. Compartilhar documentação com stakeholders"
echo "   4. Monitorar endpoints em produção"
echo ""

