# Sample API Responses - DashFinance

**Versão:** 1.0  
**Data:** 09/11/2025  
**Status:** Validation Ready

---

## 🟢 WhatsApp Endpoints - Sample Responses

### 1. GET /whatsapp-conversations
**Status:** 200 OK

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
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "empresa_cnpj": "98.765.432/0001-10",
      "contato_phone": "5521987654321",
      "contato_nome": "Maria Santos",
      "contato_tipo": "fornecedor",
      "ultimaMensagem": "Entrega confirmada",
      "ultimaMensagemEm": "2025-11-09T09:15:00Z",
      "ativo": true,
      "status": "ativo",
      "totalMensagens": 8,
      "naoLidas": 0,
      "criadoEm": "2025-10-15T14:20:00Z",
      "ultimaAtualizacao": "2025-11-09T09:15:00Z"
    }
  ],
  "total": 2,
  "limit": 50,
  "offset": 0
}
```

---

### 2. GET /whatsapp-conversations/{id}
**Status:** 200 OK
**Path:** /whatsapp-conversations/550e8400-e29b-41d4-a716-446655440000

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
    "ultimaMensagem": "Oi, tudo bem?",
    "ultimaMensagemEm": "2025-11-09T10:30:00Z",
    "totalMensagens": 15,
    "naoLidas": 2,
    "criadoEm": "2025-11-01T08:00:00Z",
    "ultimaAtualizacao": "2025-11-09T10:30:00Z",
    "mensagens": [
      {
        "id": "msg-uuid-1",
        "textoEnviado": "Olá João, como vai?",
        "textoRecebido": null,
        "timestamp": "2025-11-09T10:00:00Z",
        "tipo": "enviada",
        "status": "entregue",
        "templateUsada": null,
        "variaveisUsadas": null
      },
      {
        "id": "msg-uuid-2",
        "textoEnviado": null,
        "textoRecebido": "Oi, tudo certo!",
        "timestamp": "2025-11-09T10:05:00Z",
        "tipo": "recebida",
        "status": "lida",
        "templateUsada": null,
        "variaveisUsadas": null
      },
      {
        "id": "msg-uuid-3",
        "textoEnviado": "Sua fatura de R$ 1.500 vence amanhã",
        "textoRecebido": null,
        "timestamp": "2025-11-09T10:30:00Z",
        "tipo": "enviada",
        "status": "entregue",
        "templateUsada": "template-fatura",
        "variaveisUsadas": {
          "valor": "R$ 1.500",
          "vencimento": "2025-11-10"
        }
      }
    ]
  }
}
```

---

### 3. GET /whatsapp-templates
**Status:** 200 OK

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
    },
    {
      "id": "template-002",
      "nome": "Aviso de Fatura",
      "descricao": "Lembrete de fatura a vencer",
      "categoria": "financeiro",
      "corpo": "Olá {{nome}}, sua fatura de {{valor}} vence em {{diasRestantes}} dias",
      "variaveisObrigatorias": ["nome", "valor", "diasRestantes"],
      "variaveisOpcionais": [],
      "status": "ativa",
      "horaEnvioRecomendada": "10:00",
      "empresaCnpj": "12.345.678/0001-90",
      "criadoEm": "2025-11-01T10:00:00Z",
      "ultimaAtualizacao": "2025-11-09T08:00:00Z"
    }
  ],
  "total": 2
}
```

---

### 4. GET /whatsapp-scheduled
**Status:** 200 OK

```json
{
  "success": true,
  "data": [
    {
      "id": "scheduled-001",
      "empresa_cnpj": "12.345.678/0001-90",
      "contato_phone": "5511999999999",
      "contato_nome": "João Silva",
      "mensagem": "Lembrete: sua fatura vence em 5 dias",
      "templateId": "template-002",
      "variaveisPreenChidas": {
        "nome": "João",
        "valor": "R$ 1.500",
        "diasRestantes": "5"
      },
      "dataAgendada": "2025-11-10T14:30:00Z",
      "recorrencia": "unica",
      "status": "agendada",
      "tentativas": 0,
      "ultimaTentativa": null,
      "proximaTentativa": "2025-11-10T14:30:00Z",
      "criadoEm": "2025-11-09T10:00:00Z",
      "criadoPor": "user-123"
    },
    {
      "id": "scheduled-002",
      "empresa_cnpj": "12.345.678/0001-90",
      "contato_phone": "5521987654321",
      "contato_nome": "Maria Santos",
      "mensagem": "Recebimento confirmado em nossos sistemas",
      "templateId": null,
      "variaveisPreenChidas": null,
      "dataAgendada": "2025-11-11T09:00:00Z",
      "recorrencia": "semanal",
      "status": "agendada",
      "tentativas": 0,
      "ultimaTentativa": null,
      "proximaTentativa": "2025-11-11T09:00:00Z",
      "criadoEm": "2025-11-08T15:30:00Z",
      "criadoPor": "user-456"
    }
  ],
  "total": 2,
  "limit": 50,
  "offset": 0
}
```

---

### 5. POST /whatsapp-send
**Status:** 200 OK
**Header:** `Prefer: return=representation`

#### Request:
```json
{
  "empresa_cnpj": "12.345.678/0001-90",
  "contato_phone": "5511999999999",
  "mensagem": "Sua fatura de {{valor}} foi gerada com sucesso!",
  "templateId": "template-001",
  "variaveis": {
    "valor": "R$ 1.500",
    "vencimento": "2025-11-15"
  },
  "idempotencyKey": "msg-20251109-001"
}
```

#### Response (com Prefer: return=representation):
```json
{
  "success": true,
  "data": {
    "id": "msg-uuid-new",
    "empresa_cnpj": "12.345.678/0001-90",
    "contato_phone": "5511999999999",
    "textoEnviado": "Sua fatura de R$ 1.500 foi gerada com sucesso!",
    "textoRecebido": null,
    "tipo": "enviada",
    "status": "entregue",
    "messageId": "msg-wasender-12345",
    "templateUsada": "template-001",
    "variaveisUsadas": {
      "valor": "R$ 1.500",
      "vencimento": "2025-11-15"
    },
    "timestamp": "2025-11-09T10:35:00Z",
    "criadoEm": "2025-11-09T10:35:00Z"
  }
}
```

#### Response (sem Prefer):
```json
{
  "success": true,
  "messageId": "msg-wasender-12345",
  "status": "entregue",
  "timestamp": "2025-11-09T10:35:00Z"
}
```

---

### 6. POST /whatsapp-schedule
**Status:** 201 Created
**Header:** `Prefer: return=representation`

#### Request:
```json
{
  "empresa_cnpj": "12.345.678/0001-90",
  "contato_phone": "5511999999999",
  "mensagem": "Lembrete: sua fatura vence em 2 dias",
  "dataAgendada": "2025-11-11T09:00:00Z",
  "recorrencia": "semanal",
  "templateId": "template-002",
  "variaveis": {
    "nome": "João",
    "valor": "R$ 2.000",
    "diasRestantes": "2"
  }
}
```

#### Response (com Prefer: return=representation):
```json
{
  "success": true,
  "data": {
    "id": "scheduled-003",
    "empresa_cnpj": "12.345.678/0001-90",
    "contato_phone": "5511999999999",
    "contato_nome": "João Silva",
    "mensagem": "Lembrete: sua fatura vence em 2 dias",
    "templateId": "template-002",
    "variaveisPreenChidas": {
      "nome": "João",
      "valor": "R$ 2.000",
      "diasRestantes": "2"
    },
    "dataAgendada": "2025-11-11T09:00:00Z",
    "recorrencia": "semanal",
    "status": "agendada",
    "tentativas": 0,
    "proximaTentativa": "2025-11-11T09:00:00Z",
    "criadoEm": "2025-11-09T10:40:00Z",
    "criadoPor": "user-123"
  }
}
```

#### Response (sem Prefer):
```json
{
  "success": true,
  "scheduledId": "scheduled-003",
  "status": "agendada",
  "dataAgendada": "2025-11-11T09:00:00Z",
  "proximaTentativa": "2025-11-11T09:00:00Z",
  "timestamp": "2025-11-09T10:40:00Z"
}
```

---

### 7. DELETE /whatsapp-scheduled/{id}
**Status:** 200 OK
**Path:** /whatsapp-scheduled/scheduled-001

```json
{
  "success": true,
  "message": "Agendamento cancelado",
  "timestamp": "2025-11-09T10:50:00Z"
}
```

---

## 👥 Group Aliases Endpoints - Sample Responses

### 1. POST /group-aliases
**Status:** 201 Created
**Header:** `Prefer: return=representation`

#### Request:
```json
{
  "label": "Clientes VIP",
  "description": "Clientes com alto valor de receita",
  "color": "#FFD700",
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

#### Response:
```json
{
  "success": true,
  "data": {
    "id": "group-001",
    "label": "Clientes VIP",
    "description": "Clientes com alto valor de receita",
    "color": "#FFD700",
    "icon": "star",
    "created_by": "user-123",
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
    "criadoEm": "2025-11-09T11:00:00Z",
    "atualizadoEm": "2025-11-09T11:00:00Z"
  }
}
```

---

### 2. PATCH /group-aliases/{id}
**Status:** 200 OK
**Header:** `Prefer: return=representation`
**Path:** /group-aliases/group-001

#### Request:
```json
{
  "label": "Clientes Premium",
  "color": "#DAA520",
  "members": [
    {
      "company_cnpj": "12.345.678/0001-90",
      "position": 1
    },
    {
      "company_cnpj": "11.223.344/0001-55",
      "position": 2
    }
  ]
}
```

#### Response:
```json
{
  "success": true,
  "data": {
    "id": "group-001",
    "label": "Clientes Premium",
    "description": "Clientes com alto valor de receita",
    "color": "#DAA520",
    "icon": "star",
    "created_by": "user-123",
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
        "id": "member-003",
        "alias_id": "group-001",
        "company_cnpj": "11.223.344/0001-55",
        "company_name": "Empresa C LTDA",
        "position": 2,
        "integracao_f360": true,
        "integracao_omie": true,
        "whatsapp_ativo": true
      }
    ],
    "totalMembers": 2,
    "criadoEm": "2025-11-09T11:00:00Z",
    "atualizadoEm": "2025-11-09T11:30:00Z"
  }
}
```

---

### 3. GET /group-aliases
**Status:** 200 OK

```json
{
  "success": true,
  "data": [
    {
      "id": "group-001",
      "label": "Clientes Premium",
      "description": "Clientes com alto valor de receita",
      "color": "#DAA520",
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
          "id": "member-003",
          "alias_id": "group-001",
          "company_cnpj": "11.223.344/0001-55",
          "company_name": "Empresa C LTDA",
          "position": 2,
          "integracao_f360": true,
          "integracao_omie": true,
          "whatsapp_ativo": true
        }
      ],
      "totalMembers": 2,
      "criadoEm": "2025-11-09T11:00:00Z"
    },
    {
      "id": "group-002",
      "label": "Fornecedores Críticos",
      "description": "Fornecedores principais",
      "color": "#FF6347",
      "icon": "alert",
      "members": [
        {
          "id": "member-004",
          "alias_id": "group-002",
          "company_cnpj": "55.667.788/0001-22",
          "company_name": "Fornecedor X LTDA",
          "position": 1,
          "integracao_f360": false,
          "integracao_omie": true,
          "whatsapp_ativo": true
        }
      ],
      "totalMembers": 1,
      "criadoEm": "2025-11-08T14:00:00Z"
    }
  ],
  "total": 2,
  "limit": 50,
  "offset": 0
}
```

---

### 4. GET /group-aliases/{id}
**Status:** 200 OK
**Path:** /group-aliases/group-001

```json
{
  "success": true,
  "data": {
    "id": "group-001",
    "label": "Clientes Premium",
    "description": "Clientes com alto valor de receita",
    "color": "#DAA520",
    "icon": "star",
    "created_by": "user-123",
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
        "id": "member-003",
        "alias_id": "group-001",
        "company_cnpj": "11.223.344/0001-55",
        "company_name": "Empresa C LTDA",
        "position": 2,
        "integracao_f360": true,
        "integracao_omie": true,
        "whatsapp_ativo": true
      }
    ],
    "totalMembers": 2,
    "criadoEm": "2025-11-09T11:00:00Z",
    "atualizadoEm": "2025-11-09T11:30:00Z"
  }
}
```

---

## ⚠️ Financial Alerts Endpoints - Sample Responses

### 1. PATCH /financial-alerts/{id}
**Status:** 200 OK
**Header:** `Prefer: return=representation`
**Path:** /financial-alerts/alert-001

#### Request:
```json
{
  "status": "resolvido",
  "resolucao_tipo": "corrigido",
  "resolucao_observacoes": "Taxa corrigida no banco após contato com gerente",
  "resolvido_por": "user-admin-123"
}
```

#### Response:
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
      "diferenca": 0.5,
      "banco": "Banco do Brasil",
      "data_divergencia": "2025-11-08"
    },
    "resolucao_tipo": "corrigido",
    "resolucao_observacoes": "Taxa corrigida no banco após contato com gerente",
    "resolvido_por": "user-admin-123",
    "created_at": "2025-11-08T09:00:00Z",
    "resolved_at": "2025-11-09T11:45:00Z"
  }
}
```

---

### 2. GET /financial-alerts
**Status:** 200 OK

```json
{
  "success": true,
  "data": [
    {
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
      "resolucao_observacoes": "Taxa corrigida no banco após contato com gerente",
      "resolvido_por": "user-admin-123",
      "created_at": "2025-11-08T09:00:00Z",
      "resolved_at": "2025-11-09T11:45:00Z"
    },
    {
      "id": "alert-002",
      "company_cnpj": "98.765.432/0001-10",
      "tipo": "fatura_inconsistencia",
      "prioridade": "media",
      "titulo": "Inconsistência em fatura de cartão",
      "descricao": "Dois lançamentos para mesma transação",
      "status": "pendente",
      "dados": {
        "transacao_id": "TRX-2025-11-001",
        "valor_duplicado": 1500.00,
        "data_transacao": "2025-11-07"
      },
      "resolucao_tipo": null,
      "resolucao_observacoes": null,
      "resolvido_por": null,
      "created_at": "2025-11-09T08:30:00Z",
      "resolved_at": null
    }
  ],
  "total": 2,
  "limit": 50,
  "offset": 0
}
```

---

### 3. GET /financial-alerts/{id}
**Status:** 200 OK
**Path:** /financial-alerts/alert-002

```json
{
  "success": true,
  "data": {
    "id": "alert-002",
    "company_cnpj": "98.765.432/0001-10",
    "tipo": "fatura_inconsistencia",
    "prioridade": "media",
    "titulo": "Inconsistência em fatura de cartão",
    "descricao": "Dois lançamentos para mesma transação",
    "status": "pendente",
    "dados": {
      "transacao_id": "TRX-2025-11-001",
      "valor_duplicado": 1500.00,
      "data_transacao": "2025-11-07",
      "cartao_ultimos_digitos": "1234",
      "bandeira": "Visa"
    },
    "resolucao_tipo": null,
    "resolucao_observacoes": null,
    "resolvido_por": null,
    "created_at": "2025-11-09T08:30:00Z",
    "resolved_at": null
  }
}
```

---

## 📝 Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required fields",
  "details": {
    "empresa_cnpj": "Required",
    "contato_phone": "Invalid format (expected 10-15 digits)"
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

### 404 Not Found
```json
{
  "error": "Not found",
  "message": "Resource with id alert-999 not found"
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

## 🧪 Testing Commands - Curl

### WhatsApp - List Conversations
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:54321/functions/v1/whatsapp-conversations?empresa_cnpj=12.345.678/0001-90&status=ativo"
```

### WhatsApp - Send Message (with Prefer)
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Prefer: return=representation" \
  -H "Content-Type: application/json" \
  -d '{
    "empresa_cnpj": "12.345.678/0001-90",
    "contato_phone": "5511999999999",
    "mensagem": "Teste",
    "templateId": "template-001",
    "variaveis": {"valor": "R$ 1.500"}
  }' \
  "http://localhost:54321/functions/v1/whatsapp-send"
```

### Group Aliases - Create (with Prefer)
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
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

### Financial Alerts - Update (with Prefer)
```bash
curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
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

---

## ✅ Validation Checklist

### WhatsApp Endpoints
- [ ] GET /whatsapp-conversations retorna array com paginação
- [ ] GET /whatsapp-conversations/{id} inclui array de mensagens
- [ ] GET /whatsapp-templates retorna variaveisObrigatorias e variaveisOpcionais
- [ ] GET /whatsapp-scheduled retorna array com status agendada/enviada/falha
- [ ] POST /whatsapp-send com Prefer: return=representation retorna dados completos
- [ ] POST /whatsapp-schedule retorna scheduledId e dataAgendada
- [ ] DELETE /whatsapp-scheduled/{id} retorna success: true

### Group Aliases Endpoints
- [ ] POST /group-aliases com Prefer: return=representation retorna members com company_name
- [ ] PATCH /group-aliases/{id} atualiza members corretamente (DELETE old + INSERT new)
- [ ] GET /group-aliases retorna array com members inline
- [ ] GET /group-aliases/{id} retorna grupo com members expandidos
- [ ] members contêm integracao_f360, integracao_omie, whatsapp_ativo

### Financial Alerts Endpoints
- [ ] PATCH /financial-alerts/{id} com Prefer: return=representation retorna dados completos
- [ ] PATCH aceita transições válidas (pendente → resolvido/ignorado)
- [ ] GET /financial-alerts inclui resolucao_tipo, resolucao_observacoes, resolved_at
- [ ] resolved_at é atualizado ao resolver
- [ ] Rejeita transições inválidas com erro 400

---

**Status:** Pronto para validação local  
**Próximo:** Deploy em staging após validação ✅

