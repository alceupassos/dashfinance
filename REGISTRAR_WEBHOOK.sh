#!/bin/bash

# Script para registrar webhook no WaSender API
# Uso: bash REGISTRAR_WEBHOOK.sh

echo "🔧 Registrando webhook no WaSender..."
echo ""

curl -X POST "https://wasenderapi.com/api/webhook" \
  -H "Authorization: Bearer 1717|hpl4aReHJSdBuP5Pg4Vlp4Yraer36ON3wUZz0KQm68316c94" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "url": "https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/wasender-webhook",
    "events": ["message.in", "message.out", "status"]
  }'

echo ""
echo ""
echo "✅ Comando executado!"
echo ""
echo "Se retornou sucesso, teste enviando mensagem no WhatsApp"
