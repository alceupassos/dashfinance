# 📚 API Reference Completa - DashFinance

**Data:** 15 de Janeiro de 2025
**Status:** DOCUMENTAÇÃO CONSOLIDADA
**Versão:** 1.0

---

## 📋 Índice

1. [Autenticação](#autenticação)
2. [WhatsApp APIs](#whatsapp-apis)
3. [Group Aliases APIs](#group-aliases-apis)
4. [Financial Alerts APIs](#financial-alerts-apis)
5. [Relatórios APIs](#relatórios-apis)
6. [Admin APIs](#admin-apis)
7. [Integração ERP APIs](#integração-erp-apis)
8. [LLM & Oracle APIs](#llm--oracle-apis)
9. [Monitoramento & Health](#monitoramento--health)

---

## 🔐 Autenticação

Todas as APIs requerem autenticação via JWT token do Supabase.

**Header obrigatório:**
```
Authorization: Bearer {JWT_TOKEN}
```

**Como obter o token:**
```typescript
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token
```

---

## 📱 WhatsApp APIs

### GET /functions/v1/whatsapp-conversations
Retorna lista de conversas WhatsApp.

**Query Params:**
- `empresa_cnpj` (opcional): Filtrar por empresa
- `status` (default: "ativo"): ativo | pausado | encerrado
- `limit` (default: 50): Limite de resultados
- `offset` (default: 0): Paginação

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "empresa_cnpj": "12.345.678/0001-90",
      "contato_phone": "5511999999999",
      "contato_nome": "João Silva",
      "contato_tipo": "cliente",
      "ultimaMensagem": "Oi João!",
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

**Errors:**
- 400: Parâmetros inválidos
- 401: Não autenticado
- 500: Erro interno

---

### POST /functions/v1/whatsapp-send
Envia mensagem WhatsApp imediata.

**Request Body:**
```json
{
  "empresa_cnpj": "12.345.678/0001-90",
  "contato_phone": "5511999999999",
  "mensagem": "Sua fatura vence amanhã",
  "templateId": "uuid (optional)",
  "variaveis": {"valor": "R$ 1.500"},
  "idempotencyKey": "unique-key (optional)"
}
```

**Response 200:**
```json
{
  "success": true,
  "messageId": "uuid",
  "status": "enviada",
  "timestamp": "2025-11-09T10:30:00Z"
}
```

**Errors:**
- 400: Dados inválidos (campos obrigatórios: empresa_cnpj, contato_phone, mensagem)
- 429: Rate limit excedido
- 500: Erro WASender ou interno

---

### POST /functions/v1/whatsapp-schedule
Agenda envio de mensagem.

**Request Body:**
```json
{
  "empresa_cnpj": "12.345.678/0001-90",
  "contato_phone": "5511999999999",
  "mensagem": "Aviso: fatura vence em 5 dias",
  "dataAgendada": "2025-11-10T14:30:00Z",
  "recorrencia": "unica",
  "templateId": "uuid (optional)",
  "variaveis": {}
}
```

**Response 200:**
```json
{
  "success": true,
  "scheduledId": "uuid",
  "status": "agendada",
  "dataAgendada": "2025-11-10T14:30:00Z",
  "proximaTentativa": "2025-11-10T14:30:00Z"
}
```

---

### DELETE /functions/v1/whatsapp-scheduled-cancel/{id}
Cancela agendamento de mensagem.

**Path Params:**
- `id`: UUID do agendamento

**Response 200:**
```json
{
  "success": true,
  "message": "Agendamento cancelado"
}
```

**Errors:**
- 404: Agendamento não encontrado
- 500: Erro ao cancelar

---

### GET /functions/v1/whatsapp-templates
Retorna templates de mensagens disponíveis.

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "cobranca_basica",
      "category": "cobranca",
      "content": "Olá {{nome}}, sua fatura de {{valor}} vence em {{dias}} dias.",
      "variables": ["nome", "valor", "dias"],
      "active": true
    }
  ]
}
```

---

## 👥 Group Aliases APIs

### POST /functions/v1/group-aliases-create
Cria novo grupo de empresas.

**Request Body:**
```json
{
  "label": "Grupo VIP",
  "description": "Clientes Premium",
  "color": "#FF5733",
  "icon": "star",
  "members": [
    {"company_cnpj": "12.345.678/0001-90", "position": 1},
    {"company_cnpj": "98.765.432/0001-10", "position": 2}
  ]
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "label": "Grupo VIP",
    "description": "Clientes Premium",
    "color": "#FF5733",
    "icon": "star",
    "members": [
      {
        "id": "uuid",
        "alias_id": "uuid",
        "company_cnpj": "12.345.678/0001-90",
        "company_name": "Empresa A LTDA",
        "position": 1,
        "integracao_f360": true,
        "integracao_omie": false,
        "whatsapp_ativo": true
      }
    ],
    "totalMembers": 2,
    "created_at": "2025-11-09T10:30:00Z",
    "updated_at": "2025-11-09T10:30:00Z"
  }
}
```

**Errors:**
- 400: label e members são obrigatórios
- 500: Erro ao criar grupo

---

## ⚠️ Financial Alerts APIs

### PATCH /functions/v1/financial-alerts-update/{id}
Atualiza status e resolução de alerta financeiro.

**Request Body:**
```json
{
  "status": "resolvido",
  "resolucao_tipo": "corrigido",
  "resolucao_observacoes": "Taxa corrigida no banco",
  "resolvido_por": "user_id"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "company_cnpj": "12.345.678/0001-90",
    "tipo": "taxa_divergencia",
    "prioridade": "alta",
    "titulo": "Taxa de boleto divergente",
    "descricao": "Taxa cobrada 0.50% acima",
    "status": "resolvido",
    "dados": {},
    "resolucao_tipo": "corrigido",
    "resolucao_observacoes": "Taxa corrigida no banco",
    "resolvido_por": "user_id",
    "created_at": "2025-11-09T08:00:00Z",
    "resolved_at": "2025-11-09T11:00:00Z"
  }
}
```

**Validações:**
- Transições válidas de status:
  - `pendente` → `resolvido` | `ignorado`
  - `resolvido` → `pendente` | `ignorado`
  - `ignorado` → `pendente` | `resolvido`

---

## 📊 Relatórios APIs

### GET /functions/v1/relatorios-dre
Demonstração de Resultado do Exercício.

**Query Params:**
- `cnpj` (obrigatório): CNPJ da empresa
- `mes` (obrigatório): Mês (1-12)
- `ano` (obrigatório): Ano (ex: 2025)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "periodo": "11/2025",
    "receitas": {
      "total": 150000,
      "detalhes": [
        {"categoria": "Vendas", "valor": 120000},
        {"categoria": "Serviços", "valor": 30000}
      ]
    },
    "custos": {
      "total": 80000,
      "detalhes": [
        {"categoria": "CMV", "valor": 50000},
        {"categoria": "Operacionais", "valor": 30000}
      ]
    },
    "lucro_bruto": 70000,
    "despesas": {
      "total": 20000
    },
    "lucro_liquido": 50000,
    "margem": 33.33
  }
}
```

---

### GET /functions/v1/relatorios-cashflow
Fluxo de Caixa projetado.

**Query Params:**
- `cnpj` (obrigatório)
- `periodo` (default: "30days"): 7days | 30days | 90days

**Response 200:**
```json
{
  "success": true,
  "data": {
    "periodo": "30days",
    "saldo_inicial": 100000,
    "entradas": {
      "total": 200000,
      "por_dia": [
        {"data": "2025-11-10", "valor": 5000}
      ]
    },
    "saidas": {
      "total": 150000,
      "por_dia": [
        {"data": "2025-11-10", "valor": 4000}
      ]
    },
    "saldo_final": 150000,
    "projecao": [
      {"data": "2025-11-10", "saldo": 101000}
    ]
  }
}
```

---

### GET /functions/v1/relatorios-kpis
Indicadores-chave de performance.

**Query Params:**
- `cnpj` (obrigatório)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "faturamento_mes": 150000,
    "faturamento_mes_anterior": 120000,
    "variacao_faturamento": 25,
    "lucro_mes": 50000,
    "margem_lucro": 33.33,
    "inadimplencia": 5.2,
    "ticket_medio": 1500,
    "quantidade_vendas": 100
  }
}
```

---

### GET /functions/v1/relatorios-payables
Contas a pagar.

**Query Params:**
- `cnpj` (obrigatório)
- `status` (opcional): pendente | pago | vencido

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "descricao": "Fornecedor ABC",
      "valor": 5000,
      "vencimento": "2025-11-15",
      "status": "pendente",
      "categoria": "fornecedores"
    }
  ],
  "totais": {
    "pendente": 50000,
    "pago": 100000,
    "vencido": 5000
  }
}
```

---

### GET /functions/v1/relatorios-receivables
Contas a receber.

**Query Params:**
- `cnpj` (obrigatório)
- `status` (opcional): pendente | recebido | vencido

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "cliente": "Cliente XYZ",
      "valor": 10000,
      "vencimento": "2025-11-20",
      "status": "pendente",
      "dias_atraso": 0
    }
  ],
  "totais": {
    "pendente": 80000,
    "recebido": 200000,
    "vencido": 10000
  }
}
```

---

## 🔄 Integração ERP APIs

### POST /functions/v1/sync-f360
Sincroniza dados do Fintera 360.

**Request Body:**
```json
{
  "company_cnpj": "12.345.678/0001-90",
  "data_inicio": "2025-11-01",
  "data_fim": "2025-11-30"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "dre_entries": 150,
    "bank_statements": 300,
    "payables": 50,
    "receivables": 80
  },
  "sync_duration_ms": 2500
}
```

---

### POST /functions/v1/sync-omie
Sincroniza dados do Omie.

**Request Body:**
```json
{
  "company_cnpj": "12.345.678/0001-90"
}
```

---

## 🤖 LLM & Oracle APIs

### POST /functions/v1/llm-chat
Chat com Oracle IA.

**Request Body:**
```json
{
  "message": "Qual o faturamento do mês?",
  "company_cnpj": "12.345.678/0001-90",
  "conversation_id": "uuid (optional)"
}
```

**Response 200:**
```json
{
  "success": true,
  "response": "O faturamento do mês foi de R$ 150.000,00",
  "tokens_used": 250,
  "model": "gpt-4",
  "conversation_id": "uuid"
}
```

---

### GET /functions/v1/llm-metrics
Métricas de uso de LLM.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "total_tokens_mes": 50000,
    "custo_total_usd": 15.50,
    "por_modelo": {
      "gpt-4": {"tokens": 30000, "custo": 9.00},
      "claude": {"tokens": 20000, "custo": 6.50}
    }
  }
}
```

---

## 👤 Admin APIs

### GET /functions/v1/admin-users
Lista todos os usuários (admin only).

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "role": "user",
      "companies": ["12.345.678/0001-90"],
      "active": true,
      "created_at": "2025-11-01T00:00:00Z"
    }
  ]
}
```

---

### GET /functions/v1/admin-security-dashboard
Dashboard de segurança (admin only).

**Response 200:**
```json
{
  "success": true,
  "data": {
    "failed_logins_24h": 5,
    "active_sessions": 50,
    "api_calls_24h": 10000,
    "error_rate": 1.2,
    "security_alerts": []
  }
}
```

---

## 📊 Monitoramento & Health

### GET /functions/v1/health-check
Health check do sistema.

**Response 200:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-12T10:00:00Z",
  "uptime_seconds": 123456,
  "services": {
    "database": "healthy",
    "wasender": "healthy",
    "f360": "healthy",
    "omie": "healthy"
  }
}
```

---

### GET /functions/v1/get-live-metrics
Métricas em tempo real.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "api_health": {
      "status": "healthy",
      "uptime_pct": 99.98,
      "avg_response_time_ms": 250
    },
    "database_health": {
      "status": "healthy",
      "connections_active": 10,
      "connections_idle": 5
    },
    "requests_last_hour": 5000,
    "errors_last_hour": 10,
    "error_rate_pct": 0.2
  }
}
```

---

## 📋 Resumo de Endpoints Disponíveis

### ✅ WhatsApp (7 endpoints)
- GET /whatsapp-conversations
- POST /whatsapp-send
- POST /whatsapp-schedule
- DELETE /whatsapp-scheduled-cancel/{id}
- GET /whatsapp-templates
- POST /whatsapp-incoming-webhook
- POST /whatsapp-webhook

### ✅ Group Aliases (1+ endpoint)
- POST /group-aliases-create
- *(PATCH /group-aliases-update - implementar se necessário)*

### ✅ Financial Alerts (1 endpoint)
- PATCH /financial-alerts-update/{id}

### ✅ Relatórios (5 endpoints)
- GET /relatorios-dre
- GET /relatorios-cashflow
- GET /relatorios-kpis
- GET /relatorios-payables
- GET /relatorios-receivables

### ✅ Integração ERP (2 endpoints)
- POST /sync-f360
- POST /sync-omie

### ✅ LLM & Oracle (2 endpoints)
- POST /llm-chat
- GET /llm-metrics

### ✅ Admin (3+ endpoints)
- GET /admin-users
- GET /admin-security-dashboard
- GET /admin-llm-config

### ✅ Monitoring (2 endpoints)
- GET /health-check
- GET /get-live-metrics

---

## 🔧 Configuração de Ambiente

**Variáveis necessárias:**
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
WASENDER_TOKEN=xxx
F360_API_KEY=xxx (criptografada)
OMIE_API_KEY=xxx (criptografada)
OPENAI_API_KEY=xxx
ANTHROPIC_API_KEY=xxx
ENCRYPTION_KEY=xxx (32 bytes hex)
```

---

## 📝 Convenções

### Headers padrão
```
Authorization: Bearer {JWT}
Content-Type: application/json
```

### Response padrão de sucesso
```json
{
  "success": true,
  "data": {...}
}
```

### Response padrão de erro
```json
{
  "error": "Mensagem de erro descritiva",
  "code": "ERROR_CODE"
}
```

### Status HTTP
- 200: Sucesso
- 201: Criado com sucesso
- 400: Bad request (erro de validação)
- 401: Não autenticado
- 403: Sem permissão
- 404: Não encontrado
- 429: Rate limit
- 500: Erro interno

---

## 🚀 Próximos Passos

### Endpoints a implementar (se necessário):
1. PATCH /group-aliases-update/{id}
2. GET /group-aliases (listar todos)
3. GET /group-aliases/{id} (buscar por ID)
4. DELETE /group-aliases/{id} (deletar grupo)

### Melhorias sugeridas:
1. Rate limiting por usuário
2. Cache de relatórios
3. Websockets para real-time
4. GraphQL endpoint
5. API versioning (v2)

---

**Desenvolvido por:** Angra.io by Alceu Passos
**Data última atualização:** 15/01/2025
**Versão:** 1.0
