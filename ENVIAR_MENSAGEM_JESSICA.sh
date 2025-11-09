#!/bin/bash

# Script para enviar mensagem de boas-vindas para Jessica via WASender

# CONFIGURAÇÃO DO WASENDER
WASENDER_API_URL="https://api.wasender.com.br/v1/send-message"  # Ajustar URL
WASENDER_TOKEN="SEU_TOKEN_WASENDER_AQUI"  # Colocar token real
PHONE_NUMBER="5511967377373"  # Número da Jessica

# MENSAGEM
MESSAGE="🎉 *BEM-VINDA AO DASHFINANCE, JESSICA!*

Olá, Jessica Kenupp! 👔

Seu acesso ao *Grupo Volpe* foi ativado com sucesso!

━━━━━━━━━━━━━━━━━━━━
📊 *SEU ACESSO*

🏢 5 empresas vinculadas
🔑 Token: *VOLPE1*
👤 Perfil: *Master* (Acesso Completo)

🏭 *Suas Empresas:*
1. VOLPE DIADEMA
2. VOLPE GRAJAU
3. VOLPE POA
4. VOLPE SANTO ANDRÉ
5. VOLPE SÃO MATEUS

━━━━━━━━━━━━━━━━━━━━
📱 *MENU RÁPIDO*

Digite o número para consultar:

1️⃣ *Alertas* - Ver pendências
2️⃣ *Saldo* - Consultar disponível  
3️⃣ *DRE* - Relatório consolidado
4️⃣ *Config* - Preferências

━━━━━━━━━━━━━━━━━━━━
💬 *CONVERSE COMIGO!*

🤖 Powered by *Claude Haiku 3.5*

Você pode me fazer perguntas como:

• \"Qual o saldo de todas empresas?\"
• \"Mostre alertas críticos\"
• \"Como está o faturamento?\"
• \"Preciso do DRE de novembro\"

Ou use os números 1-4 do menu acima.

━━━━━━━━━━━━━━━━━━━━
💡 *SEUS ALERTAS AUTOMÁTICOS*

Você receberá notificações sobre:

💰 *Saldo baixo* - Quando < R\$ 10.000
📊 *Inadimplência alta* - Quando > 8%
📉 *Faturamento baixo* - Quando > 20% abaixo da média

*Horários:* 08:00, 12:00 e 17:00

━━━━━━━━━━━━━━━━━━━━

Estamos felizes em ter você conosco! 🚀

Para começar, digite *1* para ver alertas ou me faça qualquer pergunta.

_Assistente inteligente DashFinance_ ✨"

# ENVIAR VIA WASENDER
curl -X POST "$WASENDER_API_URL" \
  -H "Authorization: Bearer $WASENDER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"phone\": \"$PHONE_NUMBER\",
    \"message\": $(echo "$MESSAGE" | jq -Rs .)
  }"

echo ""
echo "✅ Mensagem enviada para Jessica Kenupp (+55 11 96737-7373)"

