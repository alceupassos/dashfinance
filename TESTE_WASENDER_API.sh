#!/bin/bash

# =====================================================
# TESTES COMPLETOS DA API WASENDER
# =====================================================

echo "🧪 INICIANDO TESTES WASENDER API"
echo "=================================="
echo ""

# Credenciais
API_KEY_1="09cfee8bccee1f9319b3eae0cfec5b07a41b0819eb5fddffd73df2ff599df979"
PERSONAL_TOKEN="1734|pXn5vpbtdoOWzUeBv9FJSVnp0V4eZfszAgGu0Haz375f3b86"
API_SECRET="a28f76b28012e51b75f2c72d0f8b4a2a"

# Número de teste (seu próprio número para testar)
TEST_NUMBER="5511967377373"

# =====================================================
# TESTE 1: API Key com Authorization Bearer
# =====================================================
echo "📱 TESTE 1: API Key com Authorization Bearer"
echo "---------------------------------------------"
RESPONSE_1=$(curl -k -s -w "\nHTTP_CODE:%{http_code}" -X POST "https://wasenderapi.com/api/send-message" \
  -H "Authorization: Bearer ${API_KEY_1}" \
  -H "Content-Type: application/json" \
  -d "{\"to\": \"${TEST_NUMBER}\", \"text\": \"🧪 Teste 1: API Key Bearer\"}")

echo "Response:"
echo "$RESPONSE_1"
echo ""
echo ""

# =====================================================
# TESTE 2: Personal Token com Authorization Bearer
# =====================================================
echo "📱 TESTE 2: Personal Token com Authorization Bearer"
echo "---------------------------------------------"
RESPONSE_2=$(curl -k -s -w "\nHTTP_CODE:%{http_code}" -X POST "https://wasenderapi.com/api/send-message" \
  -H "Authorization: Bearer ${PERSONAL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"to\": \"${TEST_NUMBER}\", \"text\": \"🧪 Teste 2: Personal Token Bearer\"}")

echo "Response:"
echo "$RESPONSE_2"
echo ""
echo ""

# =====================================================
# TESTE 3: API Secret com Authorization Bearer
# =====================================================
echo "📱 TESTE 3: API Secret com Authorization Bearer"
echo "---------------------------------------------"
RESPONSE_3=$(curl -k -s -w "\nHTTP_CODE:%{http_code}" -X POST "https://wasenderapi.com/api/send-message" \
  -H "Authorization: Bearer ${API_SECRET}" \
  -H "Content-Type: application/json" \
  -d "{\"to\": \"${TEST_NUMBER}\", \"text\": \"🧪 Teste 3: API Secret Bearer\"}")

echo "Response:"
echo "$RESPONSE_3"
echo ""
echo ""

# =====================================================
# TESTE 4: API Key com header 'apikey'
# =====================================================
echo "📱 TESTE 4: API Key com header 'apikey'"
echo "---------------------------------------------"
RESPONSE_4=$(curl -k -s -w "\nHTTP_CODE:%{http_code}" -X POST "https://wasenderapi.com/api/send-message" \
  -H "apikey: ${API_KEY_1}" \
  -H "Content-Type: application/json" \
  -d "{\"to\": \"${TEST_NUMBER}\", \"text\": \"🧪 Teste 4: API Key header\"}")

echo "Response:"
echo "$RESPONSE_4"
echo ""
echo ""

# =====================================================
# TESTE 5: Personal Token com header 'apikey'
# =====================================================
echo "📱 TESTE 5: Personal Token com header 'apikey'"
echo "---------------------------------------------"
RESPONSE_5=$(curl -k -s -w "\nHTTP_CODE:%{http_code}" -X POST "https://wasenderapi.com/api/send-message" \
  -H "apikey: ${PERSONAL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"to\": \"${TEST_NUMBER}\", \"text\": \"🧪 Teste 5: Personal Token header\"}")

echo "Response:"
echo "$RESPONSE_5"
echo ""
echo ""

# =====================================================
# TESTE 6: API Key com header 'X-API-Key'
# =====================================================
echo "📱 TESTE 6: API Key com header 'X-API-Key'"
echo "---------------------------------------------"
RESPONSE_6=$(curl -k -s -w "\nHTTP_CODE:%{http_code}" -X POST "https://wasenderapi.com/api/send-message" \
  -H "X-API-Key: ${API_KEY_1}" \
  -H "Content-Type: application/json" \
  -d "{\"to\": \"${TEST_NUMBER}\", \"text\": \"🧪 Teste 6: X-API-Key header\"}")

echo "Response:"
echo "$RESPONSE_6"
echo ""
echo ""

# =====================================================
# TESTE 7: Número com formato +55
# =====================================================
echo "📱 TESTE 7: Número com formato +55"
echo "---------------------------------------------"
RESPONSE_7=$(curl -k -s -w "\nHTTP_CODE:%{http_code}" -X POST "https://wasenderapi.com/api/send-message" \
  -H "Authorization: Bearer ${API_KEY_1}" \
  -H "Content-Type: application/json" \
  -d "{\"to\": \"+${TEST_NUMBER}\", \"text\": \"🧪 Teste 7: Número com +\"}")

echo "Response:"
echo "$RESPONSE_7"
echo ""
echo ""

# =====================================================
# TESTE 8: Campo 'message' ao invés de 'text'
# =====================================================
echo "📱 TESTE 8: Campo 'message' ao invés de 'text'"
echo "---------------------------------------------"
RESPONSE_8=$(curl -k -s -w "\nHTTP_CODE:%{http_code}" -X POST "https://wasenderapi.com/api/send-message" \
  -H "Authorization: Bearer ${API_KEY_1}" \
  -H "Content-Type: application/json" \
  -d "{\"to\": \"${TEST_NUMBER}\", \"message\": \"🧪 Teste 8: Campo message\"}")

echo "Response:"
echo "$RESPONSE_8"
echo ""
echo ""

# =====================================================
# RESUMO DOS TESTES
# =====================================================
echo ""
echo "=================================="
echo "✅ TESTES CONCLUÍDOS!"
echo "=================================="
echo ""
echo "Analise os resultados acima para identificar qual configuração funcionou."
echo ""
echo "Procure por respostas com:"
echo "  - HTTP_CODE:200 ou HTTP_CODE:201"
echo "  - \"success\":true"
echo "  - \"msgId\" ou \"messageId\""
echo ""

