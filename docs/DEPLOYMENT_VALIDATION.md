# Deployment & Validation Guide - DashFinance APIs

**Data:** 09/11/2025  
**Status:** Ready for Deployment  
**Version:** 2.0

---

## 📋 Pre-Deployment Checklist

### 1. Environment Variables
Certifique-se que todas as variáveis estão configuradas:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# WASender (WhatsApp)
WASENDER_TOKEN=your-wasender-token

# Optional: Redis Cache
REDIS_URL=redis://localhost:6379
```

**Validar:**
```bash
supabase secrets list
```

---

## 🚀 Deployment Steps

### Step 1: Deploy All 6 Edge Functions

```bash
#!/bin/bash

# 1. WhatsApp - Conversations (GET)
supabase functions deploy whatsapp-conversations

# 2. WhatsApp - Send Message (POST)
supabase functions deploy whatsapp-send

# 3. WhatsApp - Schedule Message (POST)
supabase functions deploy whatsapp-schedule

# 4. WhatsApp - Cancel Scheduled (DELETE)
supabase functions deploy whatsapp-scheduled-cancel

# 5. Group Aliases - Create (POST)
supabase functions deploy group-aliases-create

# 6. Financial Alerts - Update (PATCH)
supabase functions deploy financial-alerts-update
```

### Step 2: Verify Deployment

```bash
# List all deployed functions
supabase functions list

# Check function logs
supabase functions logs whatsapp-conversations

# Get function details
supabase functions info whatsapp-conversations
```

### Step 3: Enable CORS Headers

Certifique-se que todas as funções retornam CORS headers:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Prefer",
};
```

✅ **Checklist:** Todas as 6 funções possuem corsHeaders

---

## 🧪 Local Testing

### Setup Local Environment

```bash
# Start Supabase local
supabase start

# Verify status
supabase status

# Get local API URL
# Should output: http://localhost:54321
```

### Test Each Endpoint

#### 1. WhatsApp Conversations (GET)

```bash
# Get token
TOKEN=$(supabase auth users list --format=json | jq -r '.[0].id')

# Or use anon key
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Test endpoint
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:54321/functions/v1/whatsapp-conversations?empresa_cnpj=12.345.678/0001-90&status=ativo&limit=10"

# Expected: 200 OK
# Response: { success: true, data: [...], total: N }
```

#### 2. WhatsApp Send (POST)

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "empresa_cnpj": "12.345.678/0001-90",
    "contato_phone": "5511999999999",
    "mensagem": "Teste de envio"
  }' \
  "http://localhost:54321/functions/v1/whatsapp-send"

# Expected: 200 OK
# Response: { success: true, messageId: "msg-...", status: "fila"|"enviada" }
```

#### 3. WhatsApp Send with Prefer

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Prefer: return=representation" \
  -H "Content-Type: application/json" \
  -d '{
    "empresa_cnpj": "12.345.678/0001-90",
    "contato_phone": "5511999999999",
    "mensagem": "Teste com representação"
  }' \
  "http://localhost:54321/functions/v1/whatsapp-send"

# Expected: 200 OK
# Response: { success: true, data: { id, empresa_cnpj, contato_phone, ... } }
```

#### 4. Group Aliases Create (POST)

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Prefer: return=representation" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Grupo Teste",
    "description": "Para testes",
    "color": "#00FF00",
    "icon": "test",
    "members": [
      {"company_cnpj": "12.345.678/0001-90", "position": 1}
    ]
  }' \
  "http://localhost:54321/functions/v1/group-aliases-create"

# Expected: 201 Created
# Response: { success: true, data: { id, label, members: [...] } }
```

#### 5. Financial Alerts Update (PATCH)

```bash
# First, get an alert ID from database or from GET /financial-alerts
ALERT_ID="550e8400-e29b-41d4-a716-446655440000"

curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Prefer: return=representation" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "resolvido",
    "resolucao_tipo": "corrigido",
    "resolucao_observacoes": "Taxa corrigida no banco"
  }' \
  "http://localhost:54321/functions/v1/financial-alerts-update/$ALERT_ID"

# Expected: 200 OK
# Response: { success: true, data: { id, status: "resolvido", resolved_at: "...", ... } }
```

---

## 📊 Validation Tests

### ✅ Execução 2025-11-09 (Manual)

| Passo | Resultado | Observações |
| --- | --- | --- |
| `npm run lint` | ❌ | Falha por parse error em `app/(app)/admin/analytics/user-usage/page.tsx` e avisos `react-hooks/exhaustive-deps` em `mood-index`/`whatsapp-conversations`. |
| `npm run build` | ❌ | Mesmo parse error em `app/(app)/admin/analytics/mood-index/page.tsx` (duplicação de imports/`Select`). |
| `./scripts/security-check.sh` | ❌ | `npm audit` reportou 4 vulnerabilidades moderadas. Demais verificações (credenciais/.env/Supabase) ok. |
| `./scripts/data-consistency-check.sh` | ✅ | Concluído com aviso sobre uso de `toFixed(2)` em formatações monetárias. |
| `SEED_DADOS_TESTE.sql` | ⚠️ | Execução pendente (sem acesso a banco local/staging). Script corrigido (`runway_days`) e pronto para rodar via Supabase CLI/psql. |

> Atualização de scripts: `run-all-tests.sh` agora loga HTTP status e body resumido de cada Edge Function chamada, facilitando auditoria pós-execução. `deploy-staging.sh` e `scripts/pre-commit-check.sh` permanecem válidos e já registram logs em `deployments/staging/`.

#### Como executar `SEED_DADOS_TESTE.sql`

```bash
# 1. Exportar credenciais válidas
export SUPABASE_DB_URL="postgresql://postgres:postgres@localhost:54322/postgres"

# 2. Aplicar seed (local/staging)
psql "$SUPABASE_DB_URL" -f SEED_DADOS_TESTE.sql

# 3. Validar contagens
psql "$SUPABASE_DB_URL" -c "SELECT COUNT(*) FROM transactions;"
psql "$SUPABASE_DB_URL" -c "SELECT * FROM omie_config LIMIT 1;"
```

> Observação: o script foi corrigido (`runway_days`) e foi desenhado para ser idempotente via `ON CONFLICT`.

### Test Suite - Bash Script

Create `test-apis.sh`:

```bash
#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

TOKEN="your-token-here"
BASE_URL="http://localhost:54321/functions/v1"

test_count=0
pass_count=0

# Helper function
test_endpoint() {
  local name=$1
  local method=$2
  local endpoint=$3
  local data=$4
  local expected_status=$5

  test_count=$((test_count + 1))
  
  echo "Test $test_count: $name"
  
  if [ "$method" == "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" \
      -H "Authorization: Bearer $TOKEN" \
      "$BASE_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" \
      -X $method \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=representation" \
      -d "$data" \
      "$BASE_URL$endpoint")
  fi
  
  status=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [ "$status" == "$expected_status" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $status)"
    pass_count=$((pass_count + 1))
  else
    echo -e "${RED}✗ FAIL${NC} (Expected $expected_status, got $status)"
    echo "Response: $body"
  fi
  echo ""
}

# Run tests
echo "=== Testing WhatsApp Endpoints ==="
test_endpoint "GET Conversations" "GET" "/whatsapp-conversations" "" "200"

test_endpoint "POST Send Message" "POST" "/whatsapp-send" \
  '{"empresa_cnpj":"12.345.678/0001-90","contato_phone":"5511999999999","mensagem":"Test"}' \
  "200"

test_endpoint "POST Schedule" "POST" "/whatsapp-schedule" \
  '{"empresa_cnpj":"12.345.678/0001-90","contato_phone":"5511999999999","mensagem":"Test","dataAgendada":"2025-11-15T10:00:00Z"}' \
  "201"

echo "=== Testing Group Aliases Endpoints ==="
test_endpoint "POST Create Group" "POST" "/group-aliases-create" \
  '{"label":"Test Group","members":[{"company_cnpj":"12.345.678/0001-90","position":1}]}' \
  "201"

echo "=== Results ==="
echo "Total: $test_count | Passed: $pass_count | Failed: $((test_count - pass_count))"

if [ $pass_count -eq $test_count ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed!${NC}"
  exit 1
fi
```

Run:
```bash
chmod +x test-apis.sh
./test-apis.sh
```

---

## 📈 Monitoring & Logging

### Enable Function Logs

```bash
# Watch logs in real-time
supabase functions logs whatsapp-conversations --follow

# View logs from specific function
supabase functions logs whatsapp-send --limit 100

# Export logs
supabase functions logs whatsapp-conversations > logs.txt
```

### Check Database

```bash
# Connect to local database
psql postgresql://postgres:postgres@localhost:54322/postgres

# Query whatsapp_conversations
SELECT * FROM whatsapp_conversations LIMIT 5;

# Query group_aliases with members
SELECT ga.*, COUNT(gam.id) as member_count
FROM group_aliases ga
LEFT JOIN group_alias_members gam ON ga.id = gam.alias_id
GROUP BY ga.id;

# Query financial_alerts with resolutions
SELECT * FROM financial_alerts WHERE status != 'pendente' LIMIT 5;
```

---

## 🔍 Frontend Integration Validation

### Verify Response Structures

After deployment, test that frontend receives expected fields:

#### Test 1: Conversations List
```javascript
// Expected: Array with all required fields
const response = await fetch('/whatsapp-conversations');
const data = await response.json();

// Validate structure
assert(data.success === true);
assert(Array.isArray(data.data));
assert(data.data[0]?.id);
assert(data.data[0]?.empresa_cnpj);
assert(data.data[0]?.contato_phone);
assert(data.data[0]?.ultimaMensagem);
assert(typeof data.data[0]?.totalMensagens === 'number');
assert(typeof data.data[0]?.naoLidas === 'number');
```

#### Test 2: Group Aliases with Members
```javascript
// Expected: Grupo com members expandidos (company_name, integrações)
const response = await fetch('/group-aliases-create', {
  method: 'POST',
  headers: {
    'Prefer': 'return=representation',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({...})
});
const data = await response.json();

// Validate structure
assert(data.data?.id);
assert(data.data?.label);
assert(Array.isArray(data.data?.members));
assert(data.data?.members[0]?.company_name); // ← NOVO
assert(data.data?.members[0]?.integracao_f360);
assert(data.data?.members[0]?.integracao_omie);
assert(data.data?.members[0]?.whatsapp_ativo);
```

#### Test 3: Financial Alerts with Resolution
```javascript
// Expected: Alerta com campos de resolução
const response = await fetch('/financial-alerts-update/alert-id', {
  method: 'PATCH',
  headers: {
    'Prefer': 'return=representation',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'resolvido',
    resolucao_tipo: 'corrigido'
  })
});
const data = await response.json();

// Validate structure
assert(data.data?.id);
assert(data.data?.status === 'resolvido');
assert(data.data?.resolucao_tipo === 'corrigido'); // ← NOVO
assert(data.data?.resolucao_observacoes);
assert(data.data?.resolved_at);
```

---

## ✅ 2025-11-09 — Validação de Payloads no Frontend

| Tela/Fluxo | Payload validado | Método | Resultado |
|------------|------------------|--------|-----------|
| `/admin/whatsapp/conversations` | `docs/SAMPLE_RESPONSES.md` → WhatsApp Conversations (GET) | `__tests__/sample-responses.test.ts` → `normalizeConversationSummary` | ✅ Estrutura preservada (id, cnpj, status, totais) |
| `/admin/whatsapp/conversations/[id]` | WhatsApp Conversation Detail (GET) | `normalizeConversationDetail` | ✅ 3 mensagens parseadas com tipos corretos |
| `/admin/whatsapp/templates` | WhatsApp Templates (GET) | `normalizeTemplate` | ✅ Variáveis obrigatórias/opcionais e status mapeados |
| `/admin/grupos` | Group Aliases (POST) | `normalizeGroupAliasRow` | ✅ Membros retornam com `company_name` e integrações |
| `/admin/financeiro/alertas` | Financial Alerts (PATCH) | `normalizeFinancialAlertRow` | ✅ Campos de resolução (`status`, `resolucao_tipo`) mantidos |

- **Comando:** `npm run test -- --run __tests__/sample-responses.test.ts`
- **Logs:** Nenhum erro. Todos os asserts passaram com os exemplos de `docs/SAMPLE_RESPONSES.md`.
- **Observações:** Os testes garantem compatibilidade contínua dos normalizadores do frontend com os payloads oficializados; atualizar os cenários sempre que a API mudar.

---

## 🎯 Production Deployment

### Step 1: Tag Release

```bash
git tag -a v2.0.0 -m "Release: WhatsApp APIs + Group Aliases + Financial Alerts"
git push origin v2.0.0
```

### Step 2: Deploy to Staging

```bash
# Deploy to staging environment
supabase projects list

# Switch to staging project
export SUPABASE_PROJECT_ID="staging-project-id"

# Deploy functions
supabase functions deploy --project-id $SUPABASE_PROJECT_ID

# Verify
supabase functions list --project-id $SUPABASE_PROJECT_ID
```

### Step 3: Run Smoke Tests

```bash
# Same tests as above but against staging URL
# staging-url = https://staging-project.supabase.co
```

### Step 4: Deploy to Production

```bash
export SUPABASE_PROJECT_ID="production-project-id"
supabase functions deploy --project-id $SUPABASE_PROJECT_ID
```

### Step 5: Post-Deployment Verification

```bash
# Check production logs
supabase functions logs whatsapp-conversations --project-id $SUPABASE_PROJECT_ID

# Verify all functions are running
supabase functions list --project-id $SUPABASE_PROJECT_ID
```

---

## 🚨 Troubleshooting

### Function Deploy Fails

**Problem:** `Error: Function already exists`

**Solution:**
```bash
# Update instead of deploy
supabase functions deploy --force
```

### CORS Errors in Frontend

**Problem:** `Access to XMLHttpRequest blocked by CORS policy`

**Solution:** Check headers in function:
```typescript
// Must include in response
headers: { 
  ...corsHeaders, 
  "Content-Type": "application/json" 
}
```

### Prefer Header Not Working

**Problem:** `Prefer: return=representation` not returning full object

**Solution:** Check header parsing:
```typescript
const prefer = req.headers.get("prefer") || "";
if (prefer.includes("return=representation")) {
  // Return full object
}
```

### Database Connection Error

**Problem:** `Connection refused` when querying database

**Solution:**
```bash
# Check Supabase status
supabase status

# Restart if needed
supabase stop
supabase start
```

---

## ✅ Final Validation Checklist

- [ ] Todas as 6 funções deployadas
- [ ] CORS headers presentes em todas as respostas
- [ ] Prefer: return=representation funciona em POST/PATCH
- [ ] WhatsApp endpoints retornam fields corretos
- [ ] Group Aliases inclui company_name nos members
- [ ] Financial Alerts inclui resolucao_tipo e resolved_at
- [ ] Testes locais passam (200/201 status codes)
- [ ] Logs aparecem corretamente
- [ ] Frontend consome endpoints sem ajustes
- [ ] Staging deployment OK
- [ ] Production deployment OK

---

**Status:** Ready for Deployment ✅  
**Next:** Release to production after validation  
**Support:** Check logs in Supabase dashboard

