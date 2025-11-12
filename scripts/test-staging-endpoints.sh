#!/bin/bash

# DashFinance - Staging Endpoint Testing
# Tests all 14 endpoints after deployment
# Date: 09/11/2025

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STAGING_URL="${STAGING_URL:-https://staging-project.supabase.co}"
TOKEN="${TOKEN:-}"
BASE_URL="${STAGING_URL}/functions/v1"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper functions
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_status=$5
    local prefer_header=${6:-false}
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -e "\n${BLUE}Test ${TOTAL_TESTS}:${NC} ${name}"
    echo -e "  Method: ${YELLOW}${method}${NC}"
    echo -e "  Endpoint: ${YELLOW}${endpoint}${NC}"
    
    # Prepare curl command
    local CURL_CMD="curl -s -w '\n%{http_code}' -X ${method}"
    CURL_CMD="${CURL_CMD} -H 'Authorization: Bearer ${TOKEN}'"
    CURL_CMD="${CURL_CMD} -H 'Content-Type: application/json'"
    
    if [ "$prefer_header" == "true" ]; then
        CURL_CMD="${CURL_CMD} -H 'Prefer: return=representation'"
    fi
    
    if [ ! -z "$data" ]; then
        CURL_CMD="${CURL_CMD} -d '$data'"
    fi
    
    CURL_CMD="${CURL_CMD} '${BASE_URL}${endpoint}'"
    
    # Execute and capture response
    RESPONSE=$(eval $CURL_CMD)
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)
    
    # Check status code
    if [ "$HTTP_CODE" == "$expected_status" ]; then
        echo -e "  ${GREEN}✓ PASS${NC} (HTTP ${HTTP_CODE})"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        
        # Show response preview (first 100 chars)
        if [ ! -z "$BODY" ]; then
            PREVIEW=$(echo "$BODY" | head -c 100)
            echo -e "  Response: ${PREVIEW}..."
        fi
    else
        echo -e "  ${RED}✗ FAIL${NC} (Expected ${expected_status}, got ${HTTP_CODE})"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        
        # Show error
        if [ ! -z "$BODY" ]; then
            echo -e "  Error: ${RED}${BODY}${NC}"
        fi
    fi
}

# Main execution
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                            ║${NC}"
echo -e "${BLUE}║           🧪 DashFinance - Staging Endpoint Testing Suite 🧪              ║${NC}"
echo -e "${BLUE}║                                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════════╝${NC}"

# Validate prerequisites
echo -e "${YELLOW}\n📋 Pre-Flight Checks:${NC}"

if [ -z "$TOKEN" ]; then
    echo -e "${RED}✗ TOKEN not set${NC}"
    echo "Set: export TOKEN='your-anon-key'"
    exit 1
fi

if [ -z "$STAGING_URL" ] || [ "$STAGING_URL" == "https://staging-project.supabase.co" ]; then
    echo -e "${YELLOW}⚠ Using default STAGING_URL${NC}"
    echo "Set: export STAGING_URL='https://your-project.supabase.co'"
fi

echo -e "${GREEN}✓ TOKEN: ${TOKEN:0:20}...${NC}"
echo -e "${GREEN}✓ STAGING_URL: ${STAGING_URL}${NC}"
echo -e "${GREEN}✓ BASE_URL: ${BASE_URL}${NC}"

# Test connectivity
echo -e "\n${YELLOW}📋 Testing connectivity to staging...${NC}"
PING=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "${BASE_URL}/whatsapp-conversations")

if [ "$PING" == "200" ] || [ "$PING" == "401" ]; then
    echo -e "${GREEN}✓ Staging is reachable${NC}"
else
    echo -e "${RED}✗ Cannot reach staging (HTTP $PING)${NC}"
    exit 1
fi

# ============================================================================
# WHATSAPP ENDPOINTS TESTS
# ============================================================================
echo -e "\n${BLUE}╔═══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ 🟢 WhatsApp Endpoints (7 tests)                                           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════════════════╝${NC}"

test_endpoint \
    "GET /whatsapp-conversations (list)" \
    "GET" \
    "/whatsapp-conversations?status=ativo&limit=10" \
    "" \
    "200"

test_endpoint \
    "GET /whatsapp-conversations/{id}" \
    "GET" \
    "/whatsapp-conversations/550e8400-e29b-41d4-a716-446655440000" \
    "" \
    "200"

test_endpoint \
    "GET /whatsapp-templates" \
    "GET" \
    "/whatsapp-templates?categoria=financeiro" \
    "" \
    "200"

test_endpoint \
    "GET /whatsapp-scheduled" \
    "GET" \
    "/whatsapp-scheduled?status=agendada" \
    "" \
    "200"

test_endpoint \
    "POST /whatsapp-send" \
    "POST" \
    "/whatsapp-send" \
    '{"empresa_cnpj":"12.345.678/0001-90","contato_phone":"5511999999999","mensagem":"Test"}' \
    "200"

test_endpoint \
    "POST /whatsapp-send (with Prefer)" \
    "POST" \
    "/whatsapp-send" \
    '{"empresa_cnpj":"12.345.678/0001-90","contato_phone":"5511999999999","mensagem":"Test"}' \
    "200" \
    "true"

test_endpoint \
    "POST /whatsapp-schedule" \
    "POST" \
    "/whatsapp-schedule" \
    '{"empresa_cnpj":"12.345.678/0001-90","contato_phone":"5511999999999","mensagem":"Test","dataAgendada":"2025-11-15T10:00:00Z"}' \
    "201"

# ============================================================================
# GROUP ALIASES ENDPOINTS TESTS
# ============================================================================
echo -e "\n${BLUE}╔═══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ 👥 Group Aliases Endpoints (4 tests)                                     ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════════════════╝${NC}"

test_endpoint \
    "POST /group-aliases-create (with Prefer)" \
    "POST" \
    "/group-aliases-create" \
    '{"label":"Test Group","description":"For testing","members":[{"company_cnpj":"12.345.678/0001-90","position":1}]}' \
    "201" \
    "true"

test_endpoint \
    "GET /group-aliases" \
    "GET" \
    "/group-aliases?limit=10" \
    "" \
    "200"

test_endpoint \
    "GET /group-aliases/{id}" \
    "GET" \
    "/group-aliases/group-001" \
    "" \
    "200"

test_endpoint \
    "PATCH /group-aliases/{id} (with Prefer)" \
    "PATCH" \
    "/group-aliases/group-001" \
    '{"label":"Updated Group","members":[{"company_cnpj":"12.345.678/0001-90","position":1}]}' \
    "200" \
    "true"

# ============================================================================
# FINANCIAL ALERTS ENDPOINTS TESTS
# ============================================================================
echo -e "\n${BLUE}╔═══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ ⚠️  Financial Alerts Endpoints (3 tests)                                  ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════════════════╝${NC}"

test_endpoint \
    "GET /financial-alerts" \
    "GET" \
    "/financial-alerts?status=pendente&limit=10" \
    "" \
    "200"

test_endpoint \
    "GET /financial-alerts/{id}" \
    "GET" \
    "/financial-alerts/alert-001" \
    "" \
    "200"

test_endpoint \
    "PATCH /financial-alerts-update (with Prefer)" \
    "PATCH" \
    "/financial-alerts-update/alert-001" \
    '{"status":"resolvido","resolucao_tipo":"corrigido","resolucao_observacoes":"Fixed"}' \
    "200" \
    "true"

# ============================================================================
# RESULTS
# ============================================================================
echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                         TEST RESULTS                                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${BLUE}Summary:${NC}"
echo -e "  Total Tests: ${YELLOW}${TOTAL_TESTS}${NC}"
echo -e "  ${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "  ${RED}Failed: ${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✅ ALL TESTS PASSED! ✅${NC}"
    echo -e "${GREEN}Staging is ready for frontend integration testing!${NC}"
    
    echo -e "\n${YELLOW}Next Steps:${NC}"
    echo -e "  1. Notify frontend team (Codex) to start integration"
    echo -e "  2. Frontend tests the 14 endpoints"
    echo -e "  3. If all green: promote to production"
    
    exit 0
else
    echo -e "\n${RED}❌ SOME TESTS FAILED ❌${NC}"
    echo -e "${RED}Check logs and fix issues before promoting to production${NC}"
    
    echo -e "\n${YELLOW}Troubleshooting:${NC}"
    echo -e "  1. Check Edge Function logs: supabase functions logs [function-name]"
    echo -e "  2. Verify database tables exist"
    echo -e "  3. Check authentication (TOKEN validity)"
    echo -e "  4. Review docs/DEPLOYMENT_VALIDATION.md"
    
    exit 1
fi

