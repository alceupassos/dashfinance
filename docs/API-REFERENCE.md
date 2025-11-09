# API Reference - DashFinance

**Versão:** 2.0  
**Data:** 09/11/2025  
**Status:** Production Ready

---

## 🔐 Autenticação

Todos os endpoints requerem header:
```
Authorization: Bearer {token}
```

---

## 📋 Response Format

Suporte a `Prefer: return=representation` para POST/PATCH:
```
Prefer: return=representation
```

---

## 🟢 WhatsApp Endpoints

### GET /whatsapp-conversations
Retorna lista de conversas WhatsApp ativas.

**Query Params:**
- `empresa_cnpj` (optional) - Filtrar por empresa
- `status` (optional) - `ativo` | `pausado` | `encerrado` (default: `ativo`)
- `limit` (optional) - Limite de resultados (default: 50)
- `offset` (optional) - Paginação (default: 0)

**Request:**
```bash
GET /whatsapp-conversations?empresa_cnpj=12.345.678/0001-90&status=ativo&limit=50
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "empresa_cnpj": "12.345.678/0001-90",
      "contato_phone": "5511999999999",
      "contato_nome": "João Silva",
      "contato_tipo": "cliente",
      "ultimaMensagem": "Oi, tudo bem?",
      "ultimaMensagemEm": "2025-11-09T10:30:00Z",
      "ativo": true,
      "status": "ativo",
      "totalMensagens": 15,
      "naoLidas": 2,
      "criadoEm": "2025-11-01T08:00:00Z",
      "ultimaAtualizacao": "2025-11-09T10:30:00Z"
    }
  ],
  "total": 1
}
```

**Status HTTP:**
- `200` - Sucesso
- `400` - Parâmetros inválidos
- `401` - Não autenticado
- `500` - Erro interno

---

### GET /whatsapp-conversations/{id}
Retorna conversação completa com histórico de mensagens.

**Request:**
```bash
GET /whatsapp-conversations/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "empresa_cnpj": "12.345.678/0001-90",
    "contato_phone": "5511999999999",
    "contato_nome": "João Silva",
    "contato_tipo": "cliente",
    "ativo": true,
    "status": "ativo",
    "mensagens": [
      {
        "id": "uuid1",
        "textoEnviado": "Olá João, como vai?",
        "textoRecebido": null,
        "timestamp": "2025-11-09T10:00:00Z",
        "tipo": "enviada",
        "status": "entregue",
        "templateUsada": null,
        "variaveisUsadas": null
      },
      {
        "id": "uuid2",
        "textoEnviado": null,
        "textoRecebido": "Oi, tudo certo!",
        "timestamp": "2025-11-09T10:05:00Z",
        "tipo": "recebida",
        "status": "lida",
        "templateUsada": null,
        "variaveisUsadas": null
      }
    ],
    "criadoEm": "2025-11-01T08:00:00Z",
    "ultimaAtualizacao": "2025-11-09T10:30:00Z"
  }
}
```

---

### GET /whatsapp-templates
Retorna templates de mensagens disponíveis.

**Query Params:**
- `empresa_cnpj` (optional)
- `categoria` (optional) - `financeiro` | `comercial` | `operacional`
- `status` (optional) - `ativa` | `inativa` | `aguardando_aprovacao`

**Request:**
```bash
GET /whatsapp-templates?empresa_cnpj=12.345.678/0001-90&categoria=financeiro
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "template-001",
      "nome": "Recebimento de Pagamento",
      "descricao": "Confirma recebimento de pagamento",
      "categoria": "financeiro",
      "corpo": "Olá {{nome}}, seu pagamento de {{valor}} foi recebido em {{data}}",
      "variaveisObrigatorias": ["nome", "valor", "data"],
      "variaveisOpcionais": ["referencia"],
      "status": "ativa",
      "horaEnvioRecomendada": "09:00",
      "empresaCnpj": "12.345.678/0001-90",
      "criadoEm": "2025-11-01T08:00:00Z",
      "ultimaAtualizacao": "2025-11-09T08:00:00Z"
    }
  ],
  "total": 1
}
```

---

### GET /whatsapp-scheduled
Retorna mensagens agendadas.

**Query Params:**
- `empresa_cnpj` (optional)
- `status` (optional) - `agendada` | `enviada` | `falha` | `cancelada`
- `dataAte` (optional) - Filtrar até data (format: YYYY-MM-DD)

**Request:**
```bash
GET /whatsapp-scheduled?empresa_cnpj=12.345.678/0001-90&status=agendada
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "scheduled-001",
      "empresa_cnpj": "12.345.678/0001-90",
      "contato_phone": "5511999999999",
      "contato_nome": "João Silva",
      "mensagem": "Aviso: sua fatura vence em 5 dias",
      "templateId": "template-001",
      "variaveisPreenChidas": {"valor": "R$ 1.500"},
      "dataAgendada": "2025-11-10T14:30:00Z",
      "recorrencia": "unica",
      "status": "agendada",
      "tentativas": 0,
      "ultimaTentativa": null,
      "proximaTentativa": "2025-11-10T14:30:00Z",
      "criadoEm": "2025-11-09T10:00:00Z",
      "criadoPor": "user-123"
    }
  ],
  "total": 1
}
```

---

### POST /whatsapp-send
Envia mensagem WhatsApp imediata via WASender.

**Request:**
```bash
POST /whatsapp-send
Authorization: Bearer {token}
Content-Type: application/json

{
  "empresa_cnpj": "12.345.678/0001-90",
  "contato_phone": "5511999999999",
  "mensagem": "Sua fatura de R$ 1.500 vence amanhã",
  "templateId": "template-001",
  "variaveis": {
    "valor": "R$ 1.500",
    "data": "2025-11-10"
  },
  "idempotencyKey": "msg-20251109-001"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "messageId": "msg-wasender-12345",
  "status": "enviada",
  "timestamp": "2025-11-09T10:30:00Z"
}
```

**Validações:**
- `empresa_cnpj` - Obrigatório, formato válido
- `contato_phone` - Obrigatório, formato: 55 + DDD + número
- `mensagem` - Obrigatório, máx 4096 caracteres
- `variaveis` - Devem estar no template se `templateId` fornecido

**Status HTTP:**
- `200` - Sucesso
- `400` - Dados inválidos
- `429` - Rate limit (WASender)
- `500` - Erro WASender ou interno

---

### POST /whatsapp-schedule
Agenda envio de mensagem WhatsApp.

**Request:**
```bash
POST /whatsapp-schedule
Authorization: Bearer {token}
Content-Type: application/json

{
  "empresa_cnpj": "12.345.678/0001-90",
  "contato_phone": "5511999999999",
  "mensagem": "Lembrete: sua fatura vence em 5 dias",
  "dataAgendada": "2025-11-10T14:30:00Z",
  "recorrencia": "unica",
  "templateId": "template-001",
  "variaveis": {
    "valor": "R$ 1.500"
  },
  "idempotencyKey": "scheduled-20251109-001"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "scheduledId": "scheduled-001",
  "status": "agendada",
  "dataAgendada": "2025-11-10T14:30:00Z",
  "proximaTentativa": "2025-11-10T14:30:00Z",
  "timestamp": "2025-11-09T10:30:00Z"
}
```

**Validações:**
- `dataAgendada` - Deve ser no futuro
- `recorrencia` - `unica` | `diaria` | `semanal` | `mensal`

---

### DELETE /whatsapp-scheduled/{id}
Cancela agendamento de mensagem.

**Request:**
```bash
DELETE /whatsapp-scheduled/scheduled-001
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Agendamento cancelado",
  "timestamp": "2025-11-09T10:30:00Z"
}
```

---

## 👥 Group Aliases Endpoints

### POST /group-aliases
Cria novo grupo de empresas.

**Request:**
```bash
POST /group-aliases
Authorization: Bearer {token}
Prefer: return=representation
Content-Type: application/json

{
  "label": "Grupo VIP",
  "description": "Clientes Premium",
  "color": "#FF5733",
  "icon": "star",
  "members": [
    {
      "company_cnpj": "12.345.678/0001-90",
      "position": 1
    },
    {
      "company_cnpj": "98.765.432/0001-10",
      "position": 2
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "group-001",
    "label": "Grupo VIP",
    "description": "Clientes Premium",
    "color": "#FF5733",
    "icon": "star",
    "members": [
      {
        "id": "member-001",
        "alias_id": "group-001",
        "company_cnpj": "12.345.678/0001-90",
        "company_name": "Empresa A LTDA",
        "position": 1,
        "integracao_f360": true,
        "integracao_omie": false,
        "whatsapp_ativo": true
      },
      {
        "id": "member-002",
        "alias_id": "group-001",
        "company_cnpj": "98.765.432/0001-10",
        "company_name": "Empresa B LTDA",
        "position": 2,
        "integracao_f360": false,
        "integracao_omie": true,
        "whatsapp_ativo": false
      }
    ],
    "totalMembers": 2,
    "criadoEm": "2025-11-09T10:30:00Z",
    "atualizadoEm": "2025-11-09T10:30:00Z"
  }
}
```

**Validações:**
- `label` - Obrigatório, unique por usuário
- `members` - Mínimo 1 membro

---

### PATCH /group-aliases/{id}
Atualiza grupo e/ou membros.

**Request:**
```bash
PATCH /group-aliases/group-001
Authorization: Bearer {token}
Prefer: return=representation
Content-Type: application/json

{
  "label": "Grupo VIP Premium",
  "description": "Clientes Premium Ouro",
  "color": "#FFD700",
  "members": [
    {
      "company_cnpj": "12.345.678/0001-90",
      "position": 1
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "group-001",
    "label": "Grupo VIP Premium",
    "description": "Clientes Premium Ouro",
    "color": "#FFD700",
    "members": [...],
    "totalMembers": 1,
    "atualizadoEm": "2025-11-09T11:00:00Z"
  }
}
```

---

### GET /group-aliases
Retorna lista de grupos com members inline.

**Query Params:**
- `limit` (optional) - default 50
- `offset` (optional) - default 0

**Request:**
```bash
GET /group-aliases?limit=50
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "group-001",
      "label": "Grupo VIP",
      "description": "Clientes Premium",
      "color": "#FF5733",
      "icon": "star",
      "members": [...],
      "totalMembers": 2,
      "criadoEm": "2025-11-09T10:30:00Z"
    }
  ],
  "total": 1
}
```

---

### GET /group-aliases/{id}
Retorna grupo específico com todos os members.

**Request:**
```bash
GET /group-aliases/group-001
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "group-001",
    "label": "Grupo VIP",
    "description": "Clientes Premium",
    "color": "#FF5733",
    "icon": "star",
    "members": [...],
    "totalMembers": 2,
    "criadoEm": "2025-11-09T10:30:00Z"
  }
}
```

---

## ⚠️ Financial Alerts Endpoints

### PATCH /financial-alerts/{id}
Atualiza status e resolução de alerta.

**Request:**
```bash
PATCH /financial-alerts/alert-001
Authorization: Bearer {token}
Prefer: return=representation
Content-Type: application/json

{
  "status": "resolvido",
  "resolucao_tipo": "corrigido",
  "resolucao_observacoes": "Taxa corrigida no banco após contato",
  "resolvido_por": "user-admin-123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "alert-001",
    "company_cnpj": "12.345.678/0001-90",
    "tipo": "taxa_divergencia",
    "prioridade": "alta",
    "titulo": "Taxa de boleto divergente",
    "descricao": "Taxa cobrada 0.50% acima do contratado",
    "status": "resolvido",
    "dados": {
      "taxa_contratada": 1.5,
      "taxa_cobrada": 2.0,
      "diferenca": 0.5
    },
    "resolucao_tipo": "corrigido",
    "resolucao_observacoes": "Taxa corrigida no banco após contato",
    "resolvido_por": "user-admin-123",
    "created_at": "2025-11-09T08:00:00Z",
    "resolved_at": "2025-11-09T11:00:00Z"
  }
}
```

**Validações:**
- `status` - `pendente` | `resolvido` | `ignorado`
- `resolucao_tipo` (se status !== pendente) - `corrigido` | `falso_positivo` | `ignorar`
- Transições válidas:
  - `pendente` → `resolvido`, `ignorado`
  - `resolvido` → `pendente`, `ignorado`
  - `ignorado` → `pendente`, `resolvido`

---

## 📊 Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required fields",
  "details": {
    "empresa_cnpj": "Required",
    "contato_phone": "Invalid format"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authorization token"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## 🔍 Common Query Parameters

| Param | Type | Default | Example |
|-------|------|---------|---------|
| `limit` | integer | 50 | `?limit=100` |
| `offset` | integer | 0 | `?offset=50` |
| `status` | string | varies | `?status=ativo` |
| `empresa_cnpj` | string | - | `?empresa_cnpj=12.345.678/0001-90` |

---

## 📝 Headers

| Header | Required | Value |
|--------|----------|-------|
| `Authorization` | Yes | `Bearer {token}` |
| `Content-Type` | Yes (POST/PATCH) | `application/json` |
| `Prefer` | No | `return=representation` |

---

## 🟢 Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Sucesso |
| 201 | Created - Recurso criado |
| 204 | No Content - Sucesso sem retorno |
| 400 | Bad Request - Dados inválidos |
| 401 | Unauthorized - Não autenticado |
| 404 | Not Found - Recurso não existe |
| 429 | Too Many Requests - Rate limit |
| 500 | Internal Server Error - Erro interno |

---

## 🧪 Testing

### Testar com curl:

```bash
# Listar conversas
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:54321/functions/v1/whatsapp-conversations"

# Enviar mensagem
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"empresa_cnpj":"12.345.678/0001-90","contato_phone":"5511999999999","mensagem":"Teste"}' \
  "http://localhost:54321/functions/v1/whatsapp-send"

# Criar grupo
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Prefer: return=representation" \
  -H "Content-Type: application/json" \
  -d '{"label":"Grupo Teste","members":[{"company_cnpj":"12.345.678/0001-90","position":1}]}' \
  "http://localhost:54321/functions/v1/group-aliases"

# Atualizar alerta
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  -H "Prefer: return=representation" \
  -H "Content-Type: application/json" \
  -d '{"status":"resolvido","resolucao_tipo":"corrigido","resolucao_observacoes":"Resolvido"}' \
  "http://localhost:54321/functions/v1/financial-alerts/alert-001"
```

---

**Última atualização:** 09/11/2025  
**Status:** Production Ready ✅


