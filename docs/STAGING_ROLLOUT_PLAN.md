# Staging Rollout Plan - DashFinance APIs

**Date:** 09/11/2025  
**Status:** Ready to Execute  
**Estimated Duration:** 3-4 hours

---

## 🎯 Objective

Deploy 14 endpoints to staging environment with full testing and validation before production release.

---

## 📋 Phase 1: Pre-Deployment (15 minutes)

### 1.1 Verify Prerequisites

```bash
# Check Supabase CLI
supabase --version
# Output: supabase-cli/1.X.X

# Check project list
supabase projects list
# Identify: staging-project-id

# Set environment variables
export STAGING_PROJECT_ID="staging-project-id"
export STAGING_URL="https://staging-project.supabase.co"
```

### 1.2 Create Deployment Backup

```bash
mkdir -p ./deployments/staging
timestamp=$(date +"%Y%m%d_%H%M%S")
echo "Deployment started at $(date)" > "./deployments/staging/deployment_${timestamp}.log"
```

### 1.3 Verify Database Tables

```bash
# Connect to staging database
# Verify these tables exist:
# - whatsapp_conversations
# - whatsapp_messages
# - whatsapp_templates
# - whatsapp_scheduled
# - group_aliases
# - group_alias_members
# - financial_alerts
# - clientes (for JOINs)
```

---

## 🚀 Phase 2: Deployment (30-45 minutes)

### 2.1 Deploy Edge Functions (Sequential)

```bash
#!/bin/bash

FUNCTIONS=(
  "whatsapp-conversations"
  "whatsapp-send"
  "whatsapp-schedule"
  "whatsapp-scheduled-cancel"
  "group-aliases-create"
  "financial-alerts-update"
)

for FUNC in "${FUNCTIONS[@]}"; do
  echo "Deploying: $FUNC"
  supabase functions deploy "$FUNC" --project-id $STAGING_PROJECT_ID
  sleep 2
done
```

### 2.2 Monitor Deployment

```bash
# Watch logs during deployment
supabase functions logs whatsapp-conversations \
  --project-id $STAGING_PROJECT_ID \
  --follow

# Verify each function
supabase functions list --project-id $STAGING_PROJECT_ID
```

### 2.3 Verify Deployment Success

```bash
# All 6 functions should appear
supabase functions list --project-id $STAGING_PROJECT_ID | grep -E "whatsapp|group-aliases|financial-alerts"

# Expected output:
# whatsapp-conversations         https://..../whatsapp-conversations
# whatsapp-send                  https://..../whatsapp-send
# whatsapp-schedule              https://..../whatsapp-schedule
# whatsapp-scheduled-cancel      https://..../whatsapp-scheduled-cancel
# group-aliases-create           https://..../group-aliases-create
# financial-alerts-update        https://..../financial-alerts-update
```

---

## 🧪 Phase 3: Staging Validation (1 hour)

### 3.1 Test All 14 Endpoints

**Script:** `scripts/test-staging-endpoints.sh`

```bash
# Set environment
export STAGING_URL="https://staging-project.supabase.co"
export TOKEN="your-staging-anon-key"

# Run test suite
./scripts/test-staging-endpoints.sh

# Expected: All 14 tests PASS ✅
```

### 3.2 Manual Testing (Important)

#### Test WhatsApp Endpoints

```bash
# 1. List conversations
curl -H "Authorization: Bearer $TOKEN" \
  "https://staging-project.supabase.co/functions/v1/whatsapp-conversations?status=ativo"

# Expected: 200 OK
# Response: { success: true, data: [...], total: N }

# 2. Send message with Prefer header
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Prefer: return=representation" \
  -H "Content-Type: application/json" \
  -d '{
    "empresa_cnpj": "12.345.678/0001-90",
    "contato_phone": "5511999999999",
    "mensagem": "Teste de staging"
  }' \
  "https://staging-project.supabase.co/functions/v1/whatsapp-send"

# Expected: 200 OK
# Response: { success: true, data: { id, messageId, ... } }
```

#### Test Group Aliases Endpoints

```bash
# 3. Create group with company_name
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Prefer: return=representation" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Staging Test Group",
    "color": "#00FF00",
    "members": [
      {"company_cnpj": "12.345.678/0001-90", "position": 1}
    ]
  }' \
  "https://staging-project.supabase.co/functions/v1/group-aliases-create"

# Expected: 201 Created
# Response: { success: true, data: { id, members: [{ company_name, integracao_f360, ... }] } }

# IMPORTANT: Verify company_name is included!
```

#### Test Financial Alerts Endpoints

```bash
# 4. Update alert with resolution
curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Prefer: return=representation" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "resolvido",
    "resolucao_tipo": "corrigido",
    "resolucao_observacoes": "Fixed in staging testing"
  }' \
  "https://staging-project.supabase.co/functions/v1/financial-alerts-update/alert-id"

# Expected: 200 OK
# Response: { success: true, data: { status: resolvido, resolucao_tipo, resolved_at, ... } }

# IMPORTANT: Verify resolution fields are included!
```

### 3.3 Check Response Fields

**Validation Checklist:**

```
✅ WhatsApp:
  [ ] ID field present and valid UUID
  [ ] empresa_cnpj correct format
  [ ] contato_phone in response
  [ ] Timestamps ISO 8601 format
  [ ] totalMensagens is number
  [ ] Prefer header works (returns data object)

✅ Group Aliases:
  [ ] company_name included (JOINed from clientes)
  [ ] integracao_f360 boolean
  [ ] integracao_omie boolean
  [ ] whatsapp_ativo boolean
  [ ] members array properly formatted
  [ ] Prefer header works

✅ Financial Alerts:
  [ ] resolucao_tipo included
  [ ] resolucao_observacoes included
  [ ] resolvido_por included
  [ ] resolved_at timestamp included
  [ ] Status transitions validated
  [ ] Prefer header works
```

### 3.4 Monitor Logs

```bash
# Check function logs for errors
for func in whatsapp-conversations whatsapp-send whatsapp-schedule \
            whatsapp-scheduled-cancel group-aliases-create financial-alerts-update; do
  echo "=== Logs for $func ==="
  supabase functions logs "$func" --project-id $STAGING_PROJECT_ID --limit 20
done

# Look for:
# ✅ No "ERROR" messages
# ✅ Successful "SUCCESS" logs
# ✅ Proper CORS headers
# ✅ Correct database queries
```

---

## ✅ Phase 4: Frontend Integration Testing (1-2 hours)

### 4.1 Notify Codex Team

```markdown
🎉 Staging deployment complete!

✅ 14 endpoints ready for testing:
  - WhatsApp: 7 endpoints
  - Group Aliases: 4 endpoints (with company_name + integrations)
  - Financial Alerts: 3 endpoints (with resolution fields)

📍 Staging URL: https://staging-project.supabase.co/functions/v1
📚 Documentation: docs/ENDPOINTS_READY_FOR_FRONTEND.md
📊 Sample responses: docs/SAMPLE_RESPONSES.md

🧪 Frontend integration can begin now
```

### 4.2 Frontend Testing Checklist

```
✅ Component Tests:
  [ ] WhatsApp conversations list displays correctly
  [ ] Group aliases panel shows company_name
  [ ] Integration flags (F360, OMIE, WhatsApp) display
  [ ] Alert resolution fields appear in detail panel
  [ ] Prefer: return=representation works in forms

✅ API Tests:
  [ ] All 14 endpoints respond correctly
  [ ] Error handling (400, 401, 404, 429, 500)
  [ ] Pagination works (limit/offset)
  [ ] Timestamps parse correctly
  [ ] CORS headers present

✅ Data Tests:
  [ ] Sample data loads from endpoints
  [ ] No hardcoded mocks in components
  [ ] Proper error messages shown
  [ ] Loading states work
```

### 4.3 Integration Validation

```bash
# Frontend should call these (no more mocks):
const { data } = await supabase.functions.invoke('whatsapp-conversations', {
  headers: { Authorization: `Bearer ${token}` }
});

const { data: message } = await supabase.functions.invoke('whatsapp-send', {
  body: { empresa_cnpj, contato_phone, mensagem },
  headers: {
    Authorization: `Bearer ${token}`,
    'Prefer': 'return=representation'
  }
});

// etc for all 14 endpoints
```

---

## 📊 Phase 5: Validation & Sign-off (30 minutes)

### 5.1 Deployment Checklist

```
✅ Backend:
  [ ] All 6 functions deployed
  [ ] Logs show no errors
  [ ] Database tables verified
  [ ] CORS headers present
  [ ] Authorization working

✅ Tests:
  [ ] All 14 endpoints tested
  [ ] Response fields validated
  [ ] New fields (company_name, resolution) working
  [ ] Prefer header functional
  [ ] Error codes correct

✅ Documentation:
  [ ] API-REFERENCE.md complete
  [ ] SAMPLE_RESPONSES.md all endpoints
  [ ] ENDPOINTS_READY_FOR_FRONTEND.md provided
  [ ] Curl examples working

✅ Frontend:
  [ ] Integration tests passing
  [ ] No component errors
  [ ] Data displays correctly
  [ ] No manual adjustments needed
```

### 5.2 Sign-off Template

```
Deploy Status Report - 09/11/2025
=================================

✅ Backend: COMPLETE
  - 6 Edge Functions deployed to staging
  - All 14 endpoints functional
  - Logs clean, no errors
  - CORS headers verified

✅ Frontend: READY FOR INTEGRATION
  - Codex team: Begin component integration
  - No mocks needed, all real endpoints
  - Sample responses available
  - Documentation complete

✅ Status: APPROVED FOR STAGING
  - Ready for frontend testing
  - Monitoring in place
  - Rollback plan in place (see below)

Signed: Backend Team
Date: 09/11/2025
```

---

## 🔄 Phase 6: Monitoring & Troubleshooting

### 6.1 Real-time Monitoring

```bash
# Watch function logs
for func in whatsapp-conversations whatsapp-send group-aliases-create; do
  supabase functions logs "$func" --project-id $STAGING_PROJECT_ID --follow &
done

# Monitor database
# Check: Edge Function execution time
# Check: Database query performance
# Check: Error rates
```

### 6.2 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Verify token is valid and has expiry > now |
| 404 Not Found | Check endpoint URL spelling and project ID |
| company_name is null | Verify clientes table has matching company_cnpj |
| Prefer header not working | Check response headers for 'data' wrapper |
| CORS errors | Verify corsHeaders in Edge Function response |
| Database errors | Check migrations applied, tables exist |

### 6.3 Rollback Plan

If critical issues found:

```bash
# Option 1: Undeploy specific function
supabase functions delete whatsapp-send --project-id $STAGING_PROJECT_ID

# Option 2: Rollback to previous version
# (requires Git tags on previous working version)
git checkout v1.x.x
supabase functions deploy --project-id $STAGING_PROJECT_ID

# Option 3: Full staging reset
supabase projects reset --project-id $STAGING_PROJECT_ID
```

---

## ✅ Phase 7: Production Promotion Decision

### 7.1 Promotion Criteria

**All of the following must be true:**

- [ ] All 14 endpoints tested successfully in staging
- [ ] Frontend integration testing complete (Codex approval)
- [ ] No critical errors in logs
- [ ] Database JOINs working (company_name, integrations)
- [ ] New fields verified (resolucao_tipo, resolved_at)
- [ ] Prefer header functional
- [ ] CORS headers present
- [ ] Performance acceptable
- [ ] Security review passed

### 7.2 Promotion Timeline

If approved:

```
Day 1 (Today):    Deploy to Staging ✅ (You are here)
Day 2 (Tomorrow): Frontend Integration Testing (Codex)
Day 3 (Next):     Production Promotion
```

### 7.3 Production Deployment

```bash
# After sign-off, deploy to production
export PRODUCTION_PROJECT_ID="production-project-id"

for FUNC in whatsapp-conversations whatsapp-send whatsapp-schedule \
            whatsapp-scheduled-cancel group-aliases-create financial-alerts-update; do
  supabase functions deploy "$FUNC" --project-id $PRODUCTION_PROJECT_ID
done

# Verify
supabase functions list --project-id $PRODUCTION_PROJECT_ID
```

---

## 📚 Reference Documents

| Document | Purpose | Status |
|----------|---------|--------|
| docs/API-REFERENCE.md | Full API reference | ✅ Complete |
| docs/ENDPOINTS_READY_FOR_FRONTEND.md | Quick reference | ✅ Complete |
| docs/SAMPLE_RESPONSES.md | Example responses | ✅ Complete |
| docs/PAYLOAD_VALIDATION.md | Validation rules | ✅ Complete |
| docs/DEPLOYMENT_VALIDATION.md | Deployment guide | ✅ Complete |

---

## 🚀 Next Steps

1. **NOW:** Execute Phase 1-2 (Deploy to Staging)
2. **TODAY:** Execute Phase 3-4 (Validation & Testing)
3. **TOMORROW:** Frontend integration with Codex
4. **NEXT DAY:** Production promotion

---

**Status:** Ready for Staging Deployment  
**Estimated Time:** 3-4 hours total  
**Success Criteria:** All tests pass + Frontend approval  
**Go/No-Go Decision:** After Phase 4

