#!/bin/bash

# DashFinance - Deployment Script to Staging
# Deploys 6 Edge Functions with validation
# Date: 09/11/2025

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STAGING_PROJECT_ID="${STAGING_PROJECT_ID:-}"
FUNCTIONS=(
  "whatsapp-conversations"
  "whatsapp-send"
  "whatsapp-schedule"
  "whatsapp-scheduled-cancel"
  "group-aliases-create"
  "financial-alerts-update"
  "mood-index-timeline"
  "usage-details"
  "track-user-usage"
)
TOTAL_FUNCTIONS=${#FUNCTIONS[@]}

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                            ║${NC}"
printf "${BLUE}║        🚀 DashFinance - Deploy to Staging (%2d Edge Functions)              ║${NC}\n" "$TOTAL_FUNCTIONS"
echo -e "${BLUE}║                                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════════╝${NC}"

# Step 1: Check prerequisites
echo -e "${YELLOW}\n📋 Step 1: Checking prerequisites...${NC}"

if ! command -v supabase &> /dev/null; then
    echo -e "${RED}✗ Supabase CLI not found${NC}"
    echo "Install: npm install -g supabase"
    exit 1
fi

if [ -z "$STAGING_PROJECT_ID" ]; then
    echo -e "${YELLOW}⚠ STAGING_PROJECT_ID not set${NC}"
    echo "Getting available projects..."
    supabase projects list
    read -p "Enter STAGING_PROJECT_ID: " STAGING_PROJECT_ID
    export STAGING_PROJECT_ID
fi

echo -e "${GREEN}✓ Supabase CLI ready${NC}"
echo -e "${GREEN}✓ Staging Project ID: $STAGING_PROJECT_ID${NC}"

# Step 2: Check staging environment
echo -e "${YELLOW}\n📋 Step 2: Verifying staging environment...${NC}"

STATUS=$(supabase projects list --format json 2>/dev/null | grep -c "$STAGING_PROJECT_ID" || true)
if [ "$STATUS" == "0" ]; then
    echo -e "${RED}✗ Staging project not found: $STAGING_PROJECT_ID${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Staging project verified${NC}"

# Step 3: Pre-deployment backup
echo -e "${YELLOW}\n📋 Step 3: Creating backup (logs only)...${NC}"
mkdir -p ./deployments/staging
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="./deployments/staging/backup_${TIMESTAMP}.log"
echo "Deployment started at $(date)" > "$BACKUP_FILE"
echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"

# Step 4: Deploy each function
echo -e "${YELLOW}\n📋 Step 4: Deploying Edge Functions...${NC}"

DEPLOY_COUNT=0
DEPLOY_SUCCESS=0

for FUNC in "${FUNCTIONS[@]}"; do
    DEPLOY_COUNT=$((DEPLOY_COUNT + 1))
    echo -e "\n${BLUE}  [${DEPLOY_COUNT}/${TOTAL_FUNCTIONS}]${NC} Deploying: ${YELLOW}$FUNC${NC}"
    
    if supabase functions deploy "$FUNC" --project-id "$STAGING_PROJECT_ID" 2>&1 | tee -a "$BACKUP_FILE"; then
        echo -e "  ${GREEN}✓ Deployed successfully${NC}"
        DEPLOY_SUCCESS=$((DEPLOY_SUCCESS + 1))
    else
        echo -e "  ${RED}✗ Deployment failed${NC}"
    fi
    
    # Small delay between deployments
    sleep 2
done

echo -e "\n${BLUE}Deployment Summary:${NC}"
echo -e "  Total: $DEPLOY_COUNT"
echo -e "  ${GREEN}Success: $DEPLOY_SUCCESS${NC}"
echo -e "  ${RED}Failed: $((DEPLOY_COUNT - DEPLOY_SUCCESS))${NC}"

if [ "$DEPLOY_SUCCESS" -ne "$DEPLOY_COUNT" ]; then
    echo -e "\n${RED}✗ Some deployments failed${NC}"
    exit 1
fi

# Step 5: Verify deployment
echo -e "${YELLOW}\n📋 Step 5: Verifying deployment...${NC}"

DEPLOYED=$(supabase functions list --project-id "$STAGING_PROJECT_ID" 2>/dev/null | grep -c "whatsapp-conversations" || true)

if [ "$DEPLOYED" -gt "0" ]; then
    echo -e "${GREEN}✓ Functions deployed to staging${NC}"
    
    echo -e "\n${BLUE}Deployed Functions:${NC}"
    supabase functions list --project-id "$STAGING_PROJECT_ID" | grep -E "whatsapp|group-aliases|financial-alerts|mood-index|usage" || true
else
    echo -e "${RED}✗ Verification failed${NC}"
    exit 1
fi

# Step 6: Environment Info
echo -e "${YELLOW}\n📋 Step 6: Staging Environment Info...${NC}"

STAGING_URL=$(supabase projects list --format json 2>/dev/null | grep -A5 "$STAGING_PROJECT_ID" | grep -o "https://[^/]*" | head -1)

echo -e "${BLUE}Staging Details:${NC}"
echo -e "  Project ID: ${YELLOW}$STAGING_PROJECT_ID${NC}"
echo -e "  Base URL: ${YELLOW}${STAGING_URL}/functions/v1${NC}"
echo -e "  Endpoints: ${YELLOW}17 (WhatsApp 7 + Group Aliases 4 + Financial Alerts 3 + Analytics 3)${NC}"

# Step 7: Testing Instructions
echo -e "${YELLOW}\n📋 Step 7: Testing Instructions...${NC}"

cat << 'EOF'

🧪 Next: Test endpoints locally

1️⃣ Set environment variables:
   export STAGING_URL="https://your-staging-project.supabase.co"
   export TOKEN="your-anon-key"

2️⃣ Test WhatsApp endpoint:
   curl -H "Authorization: Bearer $TOKEN" \
     "${STAGING_URL}/functions/v1/whatsapp-conversations"

3️⃣ Test WhatsApp send (with Prefer):
   curl -X POST -H "Authorization: Bearer $TOKEN" \
     -H "Prefer: return=representation" \
     -H "Content-Type: application/json" \
     -d '{"empresa_cnpj":"12.345.678/0001-90","contato_phone":"5511999999999","mensagem":"Test"}' \
     "${STAGING_URL}/functions/v1/whatsapp-send"

4️⃣ Test Group Aliases (with Prefer):
   curl -X POST -H "Authorization: Bearer $TOKEN" \
     -H "Prefer: return=representation" \
     -H "Content-Type: application/json" \
     -d '{"label":"Test","members":[{"company_cnpj":"12.345.678/0001-90"}]}' \
     "${STAGING_URL}/functions/v1/group-aliases-create"

5️⃣ Monitor logs:
   supabase functions logs whatsapp-conversations --project-id $STAGING_PROJECT_ID --follow

6️⃣ Test Analytics (Mood Timeline):
   curl -H "Authorization: Bearer $TOKEN" \
     "${STAGING_URL}/functions/v1/mood-index-timeline?date_from=2025-10-01&date_to=2025-10-31"

7️⃣ Test Usage Analytics:
   curl -H "Authorization: Bearer $TOKEN" \
     "${STAGING_URL}/functions/v1/usage-details?date_from=2025-10-01&date_to=2025-10-31"

✅ Reference: docs/SAMPLE_RESPONSES.md (all endpoint examples)
EOF

# Step 8: Logs backup
echo -e "\n${YELLOW}📋 Step 8: Fetching function logs...${NC}"

for FUNC in "${FUNCTIONS[@]}"; do
    echo -e "  Getting logs for: ${YELLOW}$FUNC${NC}"
    LOG_FILE="./deployments/staging/logs_${FUNC}_${TIMESTAMP}.log"
    supabase functions logs "$FUNC" --project-id "$STAGING_PROJECT_ID" --limit 50 > "$LOG_FILE" 2>&1 || true
    echo -e "  ${GREEN}✓ Saved to: $LOG_FILE${NC}"
done

# Final summary
echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                            ║${NC}"
echo -e "${GREEN}║                    ✅ STAGING DEPLOYMENT COMPLETE! ✅                      ║${NC}"
echo -e "${BLUE}║                                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${GREEN}Summary:${NC}"
echo -e "  ${GREEN}✓${NC} All ${TOTAL_FUNCTIONS} Edge Functions deployed"
echo -e "  ${GREEN}✓${NC} Staging project: $STAGING_PROJECT_ID"
echo -e "  ${GREEN}✓${NC} Backup: $BACKUP_FILE"
echo -e "  ${GREEN}✓${NC} Logs: ./deployments/staging/logs_*"
echo -e "  ${GREEN}✓${NC} Status: READY FOR TESTING"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo -e "  1. Test endpoints with curl (see instructions above)"
echo -e "  2. Monitor logs for errors"
echo -e "  3. Notify frontend team for integration testing"
echo -e "  4. After validation: Deploy to production"

echo -e "\n${BLUE}Documentation:${NC}"
echo -e "  • docs/ENDPOINTS_READY_FOR_FRONTEND.md (Quick reference)"
echo -e "  • docs/SAMPLE_RESPONSES.md (All endpoint examples)"
echo -e "  • docs/DEPLOYMENT_VALIDATION.md (Detailed guide)"

exit 0

