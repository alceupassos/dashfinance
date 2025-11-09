# ✅ Endpoints Ready for Frontend - Complete Reference

**Status:** Production Ready ✅  
**Date:** 09/11/2025  
**Last Updated:** 09/11/2025  
**Maintainer:** Backend Team

---

## 📌 Quick Reference - Copy & Paste

### Environment Variables Needed
```env
SUPABASE_URL=your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
WASENDER_TOKEN=your-wasender-token
```

### Base URLs
```
Local:      http://localhost:54321/functions/v1
Staging:    https://staging-project.supabase.co/functions/v1
Production: https://production-project.supabase.co/functions/v1
```

---

## 🟢 WhatsApp APIs (7 endpoints)

### ✅ 1. GET /whatsapp-conversations
**Description:** List WhatsApp conversations  
**Authentication:** Bearer token  
**Response:** 200 OK

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:54321/functions/v1/whatsapp-conversations?status=ativo&limit=50"
```

**Frontend Import:**
```typescript
interface WhatsappConversation {
  id: string;
  empresa_cnpj: string;
  contato_phone: string;
  contato_nome: string;
  status: "ativo" | "pausado" | "encerrado";
  ultimaMensagem?: string;
  ultimaMensagemEm: string;
  totalMensagens: number;
  naoLidas: number;
  criadoEm: string;
  ultimaAtualizacao: string;
}
```

---

### ✅ 2. GET /whatsapp-conversations/{id}
**Description:** Get conversation details with message history  
**Response:** 200 OK with messages array

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:54321/functions/v1/whatsapp-conversations/550e8400-e29b-41d4-a716-446655440000"
```

---

### ✅ 3. GET /whatsapp-templates
**Description:** List WhatsApp message templates  
**Response:** 200 OK

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:54321/functions/v1/whatsapp-templates?categoria=financeiro"
```

---

### ✅ 4. GET /whatsapp-scheduled
**Description:** List scheduled messages  
**Response:** 200 OK

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:54321/functions/v1/whatsapp-scheduled?status=agendada"
```

---

### ✅ 5. POST /whatsapp-send
**Description:** Send WhatsApp message immediately  
**Headers:** 
- `Authorization: Bearer {token}`
- `Prefer: return=representation` (to get full message object)

```bash
# Simple response
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "empresa_cnpj": "12.345.678/0001-90",
    "contato_phone": "5511999999999",
    "mensagem": "Teste"
  }' \
  "http://localhost:54321/functions/v1/whatsapp-send"

# Response with Prefer header (full object)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Prefer: return=representation" \
  -H "Content-Type: application/json" \
  -d '{
    "empresa_cnpj": "12.345.678/0001-90",
    "contato_phone": "5511999999999",
    "mensagem": "Teste"
  }' \
  "http://localhost:54321/functions/v1/whatsapp-send"
```

**Response without Prefer:**
```json
{
  "success": true,
  "messageId": "msg-123",
  "status": "enviada",
  "timestamp": "2025-11-09T10:35:00Z"
}
```

**Response with Prefer:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "empresa_cnpj": "12.345.678/0001-90",
    "contato_phone": "5511999999999",
    "textoEnviado": "Teste",
    "messageId": "msg-123",
    "timestamp": "2025-11-09T10:35:00Z"
  }
}
```

---

### ✅ 6. POST /whatsapp-schedule
**Description:** Schedule WhatsApp message  
**Headers:** `Prefer: return=representation`

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Prefer: return=representation" \
  -H "Content-Type: application/json" \
  -d '{
    "empresa_cnpj": "12.345.678/0001-90",
    "contato_phone": "5511999999999",
    "mensagem": "Lembrete",
    "dataAgendada": "2025-11-10T14:30:00Z",
    "recorrencia": "semanal"
  }' \
  "http://localhost:54321/functions/v1/whatsapp-schedule"
```

---

### ✅ 7. DELETE /whatsapp-scheduled/{id}
**Description:** Cancel scheduled message

```bash
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  "http://localhost:54321/functions/v1/whatsapp-scheduled/scheduled-001"
```

---

## 👥 Group Aliases APIs (4 endpoints)

### ✅ 1. POST /group-aliases
**Description:** Create group with members  
**Headers:** `Prefer: return=representation` (returns full group with company_name)

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Prefer: return=representation" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Clientes VIP",
    "description": "Alto valor",
    "color": "#FFD700",
    "icon": "star",
    "members": [
      {"company_cnpj": "12.345.678/0001-90", "position": 1}
    ]
  }' \
  "http://localhost:54321/functions/v1/group-aliases-create"
```

**Response includes:**
```json
{
  "data": {
    "id": "group-001",
    "label": "Clientes VIP",
    "members": [{
      "company_cnpj": "12.345.678/0001-90",
      "company_name": "Empresa A LTDA",     // ✅ FROM clientes
      "integracao_f360": true,              // ✅ FROM clientes
      "integracao_omie": false,             // ✅ FROM clientes
      "whatsapp_ativo": true                // ✅ FROM clientes
    }]
  }
}
```

---

### ✅ 2. PATCH /group-aliases/{id}
**Description:** Update group and/or members  
**Headers:** `Prefer: return=representation`

```bash
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  -H "Prefer: return=representation" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Clientes Premium",
    "members": [
      {"company_cnpj": "12.345.678/0001-90", "position": 1}
    ]
  }' \
  "http://localhost:54321/functions/v1/group-aliases/group-001"
```

---

### ✅ 3. GET /group-aliases
**Description:** List all groups with members

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:54321/functions/v1/group-aliases?limit=50"
```

---

### ✅ 4. GET /group-aliases/{id}
**Description:** Get specific group with all members

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:54321/functions/v1/group-aliases/group-001"
```

---

## ⚠️ Financial Alerts APIs (3 endpoints)

### ✅ 1. PATCH /financial-alerts/{id}
**Description:** Update alert status and add resolution  
**Headers:** `Prefer: return=representation`

```bash
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  -H "Prefer: return=representation" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "resolvido",
    "resolucao_tipo": "corrigido",
    "resolucao_observacoes": "Taxa corrigida",
    "resolvido_por": "user-123"
  }' \
  "http://localhost:54321/functions/v1/financial-alerts-update/alert-001"
```

**Response includes:**
```json
{
  "data": {
    "id": "alert-001",
    "status": "resolvido",
    "resolucao_tipo": "corrigido",        // ✅ NEW
    "resolucao_observacoes": "Corrigido", // ✅ NEW
    "resolvido_por": "user-123",          // ✅ NEW
    "resolved_at": "2025-11-09T11:45:00Z" // ✅ NEW
  }
}
```

---

### ✅ 2. GET /financial-alerts
**Description:** List all alerts with resolution data

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:54321/functions/v1/financial-alerts?status=pendente"
```

---

### ✅ 3. GET /financial-alerts/{id}
**Description:** Get specific alert with resolution

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:54321/functions/v1/financial-alerts/alert-001"
```

---

## 🔑 Authentication

All endpoints require Bearer token:
```
Authorization: Bearer {anon_key_or_user_token}
```

To get token in frontend:
```typescript
import { supabase } from '@/lib/supabase'

const { data, error } = await supabase.auth.getSession()
const token = data.session?.access_token
```

---

## 📊 Key Features Implemented

### ✅ Prefer: return=representation
Supported on:
- POST /whatsapp-send
- POST /whatsapp-schedule
- POST /group-aliases-create
- PATCH /group-aliases/{id}
- PATCH /financial-alerts-update

**Usage:**
```bash
curl -H "Prefer: return=representation" ...
```

---

### ✅ CORS Headers
All responses include:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, Prefer
```

---

### ✅ New Fields from Database JOINs

**Group Aliases Members:**
- `company_name` - Joined from `clientes` table
- `integracao_f360` - From `clientes`
- `integracao_omie` - From `clientes`
- `whatsapp_ativo` - From `clientes`

**Financial Alerts Resolution:**
- `resolucao_tipo` - Type of resolution (corrigido, falso_positivo, ignorar)
- `resolucao_observacoes` - Notes/comments
- `resolvido_por` - User who resolved
- `resolved_at` - Timestamp when resolved

---

## 🧪 Testing

### Local Testing
```bash
# Start Supabase
supabase start

# Get local URL
supabase status

# Run curl commands with http://localhost:54321
```

### Staging Testing
```bash
# After merge to main
# Deploy to staging environment
supabase functions deploy --project-id staging-project-id

# Test with staging URL
# https://staging-project.supabase.co/functions/v1
```

### Production
```bash
# After verification
# Deploy to production
supabase functions deploy --project-id production-project-id
```

---

## 📚 Documentation Files

| File | Purpose | Lines |
|------|---------|-------|
| `docs/API-REFERENCE.md` | Full API reference | 662 |
| `docs/SAMPLE_RESPONSES.md` | Sample JSON responses | 650+ |
| `docs/DEPLOYMENT_VALIDATION.md` | Deployment guide | 400+ |
| `docs/PAYLOAD_VALIDATION.md` | Payload validation rules | 500+ |
| `TASK_APIS_CRITICAS_FINAIS.md` | Specifications | 712 |

---

## 🚀 Frontend Integration Checklist

- [ ] Import APIs from backend (no more mocks)
- [ ] Add Bearer token to all requests
- [ ] Support Prefer: return=representation for POST/PATCH
- [ ] Parse company_name and integration flags from group members
- [ ] Display resolution fields in alert cards
- [ ] Handle pagination (limit/offset)
- [ ] Show proper error messages (400, 401, 404, 429, 500)
- [ ] Add loading states while fetching
- [ ] Implement caching with React Query or SWR
- [ ] Test with sample data in SAMPLE_RESPONSES.md

---

## ⚠️ Common Issues & Solutions

### CORS Error
**Problem:** `Access to XMLHttpRequest blocked by CORS policy`

**Solution:** Check that:
1. Function has corsHeaders defined
2. Response includes CORS headers
3. Frontend sends request with credentials if needed

---

### Prefer Header Not Working
**Problem:** Response doesn't include full object

**Solution:** Check that:
1. Header is exactly: `Prefer: return=representation`
2. Function checks: `req.headers.get("prefer")`
3. Database query returns object correctly

---

### 401 Unauthorized
**Problem:** Token invalid or expired

**Solution:**
1. Verify token is in Authorization header
2. Check token hasn't expired
3. Use `supabase.auth.refreshSession()` if needed

---

### Database Errors
**Problem:** Company not found or members query fails

**Solution:**
1. Verify CNPJ exists in `clientes` table
2. Check `group_alias_members` entries
3. View database logs in Supabase dashboard

---

## 📞 Support

For issues or questions:
1. Check sample responses in `SAMPLE_RESPONSES.md`
2. Review validation rules in `PAYLOAD_VALIDATION.md`
3. Check deployment guide in `DEPLOYMENT_VALIDATION.md`
4. View full API reference in `API-REFERENCE.md`

---

**Status:** ✅ Ready for Frontend Integration  
**Last Tested:** 09/11/2025  
**Maintenance:** Backend Team

