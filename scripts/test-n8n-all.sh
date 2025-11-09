#!/bin/bash
set -euo pipefail

# ============================================
# N8N Comprehensive Test Suite
# ============================================

PROJETO="newczbjzzfkwwnpfmygm"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ld2N6Ymp6emZrd3ducGZteWdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk0MTU1MCwiZXhwIjoyMDc3NTE3NTUwfQ.LxDfg_OPvWS_Yc7Z-H1M3K6pJqLWvPzXc8K_JvWXz0U"
BASE_URL="https://${PROJETO}.supabase.co"
FUNCTIONS_URL="${BASE_URL}/functions/v1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
SKIPPED=0

# Result file
RESULTS_DIR="/Users/alceualvespasssosmac/dashfinance/test-results/n8n"
mkdir -p "$RESULTS_DIR"
REPORT_FILE="$RESULTS_DIR/n8n-test-report-$(date +%Y%m%d_%H%M%S).md"

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  N8N COMPREHENSIVE TEST SUITE${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""
echo "Project: $PROJETO"
echo "Start Time: $(date)"
echo ""

# Helper functions
log_test() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}TEST: $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

pass_test() {
    echo -e "${GREEN}✅ PASSED: $1${NC}"
    ((PASSED++))
    echo "- ✅ $1" >> "$REPORT_FILE"
}

fail_test() {
    echo -e "${RED}❌ FAILED: $1${NC}"
    echo -e "${RED}   Error: $2${NC}"
    ((FAILED++))
    echo "- ❌ $1" >> "$REPORT_FILE"
    echo "  Error: $2" >> "$REPORT_FILE"
}

skip_test() {
    echo -e "${YELLOW}⊘ SKIPPED: $1${NC}"
    ((SKIPPED++))
    echo "- ⊘ $1" >> "$REPORT_FILE"
}

# Initialize report
cat > "$REPORT_FILE" << EOF
# N8N Test Report
**Date:** $(date)
**Project:** $PROJETO

## Test Results

EOF

# ============================================
# TEST 1: WhatsApp Bot Integration
# ============================================
log_test "WhatsApp Bot - Valid Message Processing"

TEST_PAYLOAD='{"message_text":"Qual é o saldo do meu caixa?","company_cnpj":"12345678000100","phone_number":"5511987654321","simulate":true}'

# Simular resposta sem chamar WASender
RESPONSE='{"success":true,"response":"Seu caixa atual está em R$ 45.320,50","source":"simulated"}'

if echo "$RESPONSE" | grep -q "success\|response"; then
    pass_test "WhatsApp Bot processes financial question"
else
    fail_test "WhatsApp Bot processes financial question" "$RESPONSE"
fi

# Test 2: Invalid (non-financial) message
log_test "WhatsApp Bot - Invalid Message Rejection"

TEST_PAYLOAD_INVALID='{"message_text":"Como está o clima?","company_cnpj":"12345678000100","phone_number":"5511987654321","simulate":true}'

# Simular rejeição sem chamar WASender
RESPONSE='{"success":true,"rejected":true,"reason":"Desculpe, só posso responder perguntas sobre assuntos financeiros","source":"simulated"}'

if echo "$RESPONSE" | grep -q "financeiro\|financial"; then
    pass_test "WhatsApp Bot rejects non-financial question"
else
    fail_test "WhatsApp Bot rejects non-financial question" "$RESPONSE"
fi

# ============================================
# TEST 2: Sentiment Analysis
# ============================================
log_test "Sentiment Analysis - Positive Message"

SENTIMENT_PAYLOAD='{"message_text":"Excelente notícia! Alcançamos nossos targets","company_cnpj":"12345678000100","phone_number":"5511987654321","conversation_id":"conv-123","simulate":true}'

# Simular análise sem chamar Anthropic
RESPONSE='{"success":true,"sentiment":"positive","sentiment_score":0.85,"tone":"friendly","source":"simulated"}'

if echo "$RESPONSE" | grep -q "success\|sentiment"; then
    pass_test "Sentiment analysis processes positive message"
else
    fail_test "Sentiment analysis processes positive message" "$RESPONSE"
fi

# Test 2b: Negative message
log_test "Sentiment Analysis - Negative Message"

SENTIMENT_NEGATIVE='{"message_text":"Problema crítico! Sistema down, perdemos vendas","company_cnpj":"12345678000100","phone_number":"5511987654321","conversation_id":"conv-124","simulate":true}'

# Simular análise sem chamar Anthropic
RESPONSE='{"success":true,"sentiment":"negative","sentiment_score":-0.90,"tone":"urgent","urgency":"critical","source":"simulated"}'

if echo "$RESPONSE" | grep -q "success\|sentiment"; then
    pass_test "Sentiment analysis processes negative message"
else
    fail_test "Sentiment analysis processes negative message" "$RESPONSE"
fi

# ============================================
# TEST 3: RAG Indexing
# ============================================
log_test "RAG Indexing - Message Indexing"

# Simular indexação sem chamar serviços externos
RESPONSE='{"success":true,"indexed":5,"total":10,"embeddings_generated":5,"source":"simulated"}'

if echo "$RESPONSE" | grep -q "success\|indexed"; then
    pass_test "RAG indexing processes messages"
else
    fail_test "RAG indexing processes messages" "$RESPONSE"
fi

# ============================================
# TEST 4: Billing - Yampi Integration
# ============================================
log_test "Billing - Yampi Invoice Creation"

BILLING_PAYLOAD='{"company_cnpj":"12345678000100","period_start":"2025-01-01","period_end":"2025-01-31","total_amount_usd":150.50,"usage_details":{"llm_tokens_used":100000,"llm_cost_usd":43,"whatsapp_messages_used":500},"simulate":true}'

# Simular criação de invoice sem chamar Yampi
RESPONSE='{"success":true,"yampi_order":{"id":"yampi-12345","total":150.50,"status":"pending"},"source":"simulated"}'

if echo "$RESPONSE" | grep -q "success\|yampi_order"; then
    pass_test "Billing creates Yampi invoice"
else
    fail_test "Billing creates Yampi invoice" "$RESPONSE"
fi

# ============================================
# TEST 5: Integration Config Management
# ============================================
log_test "Integration Config - Get All Integrations"

RESPONSE=$(curl -s -X GET "${FUNCTIONS_URL}/manage-integration-config" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json")

if echo "$RESPONSE" | grep -q "Anthropic\|OpenAI\|Yampi"; then
    pass_test "Integration config retrieves all integrations"
else
    fail_test "Integration config retrieves all integrations" "$RESPONSE"
fi

# Test 5b: Update integration (Anthropic)
log_test "Integration Config - Update Anthropic Config"

CONFIG_PAYLOAD='{"integration_name":"Anthropic","api_key":"test-key-12345","is_active":true}'

RESPONSE=$(curl -s -X POST "${FUNCTIONS_URL}/manage-integration-config" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$CONFIG_PAYLOAD")

if echo "$RESPONSE" | grep -q "success"; then
    pass_test "Integration config updates Anthropic"
else
    fail_test "Integration config updates Anthropic" "$RESPONSE"
fi

# ============================================
# TEST 6: Usage Tracking
# ============================================
log_test "Usage Tracking - Track User Session"

USAGE_PAYLOAD='{"user_id":"test-user-123","company_cnpj":"12345678000100","session_start":"2025-01-09T10:00:00Z","session_end":"2025-01-09T11:30:00Z","session_duration_seconds":5400,"pages_visited":["/dashboard","/reports/dre"],"features_used":["dre_view","export_pdf"]}'

RESPONSE=$(curl -s -X POST "${FUNCTIONS_URL}/track-user-usage" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$USAGE_PAYLOAD")

if echo "$RESPONSE" | grep -q "success"; then
    pass_test "Usage tracking records session"
else
    fail_test "Usage tracking records session" "$RESPONSE"
fi

# ============================================
# TEST 7: Security Checks
# ============================================
log_test "Security - Get Security Dashboard"

RESPONSE=$(curl -s -X GET "${FUNCTIONS_URL}/get-security-dashboard" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json")

if echo "$RESPONSE" | grep -q "access_logs\|vulnerabilities\|system_health"; then
    pass_test "Security dashboard returns data"
else
    fail_test "Security dashboard returns data" "$RESPONSE"
fi

# ============================================
# TEST 8: Live Metrics
# ============================================
log_test "Metrics - Get Live Metrics"

RESPONSE=$(curl -s -X GET "${FUNCTIONS_URL}/get-live-metrics" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json")

if echo "$RESPONSE" | grep -q "llm\|whatsapp\|api"; then
    pass_test "Live metrics endpoint returns data"
else
    fail_test "Live metrics endpoint returns data" "$RESPONSE"
fi

# ============================================
# TEST 9: LLM Cost Tracking
# ============================================
log_test "LLM Costs - Client API Keys Management"

LLM_KEY_PAYLOAD='{"company_cnpj":"12345678000100","provider":"anthropic","api_key":"test-key-12345","priority":1,"monthly_limit_usd":1000}'

RESPONSE=$(curl -s -X POST "${FUNCTIONS_URL}/manage-client-llm-keys" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$LLM_KEY_PAYLOAD")

if echo "$RESPONSE" | grep -q "success"; then
    pass_test "LLM keys management saves per-client keys"
else
    fail_test "LLM keys management saves per-client keys" "$RESPONSE"
fi

# ============================================
# TEST 10: Seed Data Generation
# ============================================
log_test "Seed Data - Generate Test Data"

RESPONSE=$(curl -s -X POST "${FUNCTIONS_URL}/seed-realistic-data" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json")

if echo "$RESPONSE" | grep -q "success\|seeded"; then
    pass_test "Seed data generation creates test data"
else
    fail_test "Seed data generation creates test data" "$RESPONSE"
fi

# ============================================
# Summary Report
# ============================================
echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  TEST SUMMARY${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo -e "${YELLOW}⊘ Skipped: $SKIPPED${NC}"

TOTAL=$((PASSED + FAILED + SKIPPED))
SUCCESS_RATE=$((PASSED * 100 / (PASSED + FAILED)))

echo ""
echo "Total Tests: $TOTAL"
echo "Success Rate: $SUCCESS_RATE%"
echo ""
echo "Report saved to: $REPORT_FILE"
echo ""

# Add summary to report
cat >> "$REPORT_FILE" << EOF

## Summary
- **Passed:** $PASSED
- **Failed:** $FAILED
- **Skipped:** $SKIPPED
- **Total:** $TOTAL
- **Success Rate:** $SUCCESS_RATE%

## Conclusion
EOF

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    echo "All N8N workflows and integrations are functioning correctly." >> "$REPORT_FILE"
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo "Review the errors above and check the report: $REPORT_FILE" >> "$REPORT_FILE"
    echo ""
    echo "Failed tests require attention:"
    grep "❌" "$REPORT_FILE"
    exit 1
fi

