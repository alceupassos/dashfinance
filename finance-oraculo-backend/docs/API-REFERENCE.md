# API Reference - Finance Oráculo

**Versão:** 1.0.0
**Base URL:** `https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1`
**Autenticação:** Bearer Token (Supabase Auth)

---

## 📑 Índice

1. [Autenticação](#autenticação)
2. [Perfil](#perfil)
3. [Dashboard Financeiro](#dashboard-financeiro)
4. [Admin - Security](#admin---security)
5. [Admin - Administração](#admin---administração)
6. [Empresas e Grupos](#empresas-e-grupos)
7. [WhatsApp](#whatsapp)
8. [Upload & Export](#upload--export)
9. [Códigos de Erro](#códigos-de-erro)

---

## 🔐 Autenticação

### POST /auth-login

Autentica usuário e retorna tokens de acesso.

**Request:**
```json
{
  "email": "alceu@ifin.app.br",
  "password": "senha123"
}
```

**Response 200:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "email": "alceu@ifin.app.br",
    "role": "admin",
    "name": "Alceu Passos",
    "avatar_url": "https://..."
  }
}
```

**Response 401:**
```json
{
  "error": "Credenciais inválidas"
}
```

---

## 👤 Perfil

### GET /profile

Retorna perfil do usuário autenticado.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response 200:**
```json
{
  "id": "uuid",
  "name": "Alceu Passos",
  "email": "alceu@ifin.app.br",
  "avatar_url": "https://...",
  "role": "admin",
  "two_factor_enabled": false,
  "default_company_cnpj": "12.345.678/0001-90",
  "available_companies": [
    "12.345.678/0001-90",
    "98.765.432/0001-10"
  ]
}
```

### PUT /profile

Atualiza perfil do usuário.

**Request:**
```json
{
  "name": "Novo Nome",
  "avatar_url": "https://...",
  "default_company_cnpj": "12.345.678/0001-90"
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "name": "Novo Nome",
  // ... outros campos atualizados
}
```

---

## 📊 Dashboard Financeiro

### GET /kpi-monthly

Retorna KPIs mensais agregados.

**Query Params:**
- `cnpj` (obrigatório se não tiver alias): CNPJ da empresa
- `alias` (opcional): ID do grupo de empresas
- `from` (opcional): Data inicial YYYY-MM-DD
- `to` (opcional): Data final YYYY-MM-DD

**Example:**
```
GET /kpi-monthly?cnpj=12.345.678/0001-90&from=2024-01-01&to=2025-01-31
```

**Response 200:**
```json
{
  "cards": [
    {
      "label": "Receita Total",
      "value": 150000.50,
      "delta": 5.3,
      "caption": "Últimos 12 meses"
    }
  ],
  "lineSeries": [
    {
      "month": "2025-01",
      "revenue": 10000,
      "expenses": 8000,
      "profit": 2000
    }
  ],
  "cashflow": [
    {
      "category": "Operacional",
      "in": 50000,
      "out": 30000
    }
  ],
  "bridge": [
    {
      "label": "Mês Anterior",
      "type": "total",
      "amount": 15000
    },
    {
      "label": "Receitas",
      "type": "increase",
      "amount": 5000
    }
  ],
  "table": [
    {
      "month": "2025-01",
      "revenue": 12000,
      "expenses": 9000,
      "profit": 3000,
      "margin_percent": 25.0
    }
  ]
}
```

### GET /dashboard-metrics

Retorna métricas gerais, alertas e cashflow diário.

**Query Params:**
- `cnpj` (obrigatório): CNPJ da empresa

**Response 200:**
```json
{
  "metrics": [
    {
      "label": "Total Entradas (30d)",
      "value": "50000.00",
      "trend": {
        "value": 5.2,
        "direction": "up"
      }
    }
  ],
  "alerts": [
    {
      "id": "uuid",
      "title": "Despesa acima do limite",
      "type": "warning",
      "description": "Despesas operacionais 15% acima da média",
      "created_at": "2025-11-06T10:00:00Z"
    }
  ],
  "cashflow": [
    {
      "date": "2025-11-01",
      "in": 5000,
      "out": 3000
    }
  ]
}
```

---

## 🔒 Admin - Security

**IMPORTANTE:** Todos os endpoints admin/* exigem `role = 'admin'`

### GET /admin-security-traffic

Métricas de tráfego de API.

**Query Params:**
- `range`: `past_24h` | `past_7d` (padrão: past_24h)

**Response 200:**
```json
{
  "hourly": [
    {
      "timestamp": "2025-11-06T10:00:00Z",
      "function_name": "sync-f360",
      "request_count": 120,
      "avg_latency_ms": 245.5,
      "error_count": 2,
      "request_bytes": 123456,
      "response_bytes": 234567
    }
  ],
  "totals": {
    "requests": 1234,
    "bandwidth_in_mb": "12.3",
    "bandwidth_out_mb": "45.6",
    "error_rate": "0.8"
  }
}
```

### GET /admin-security-database

Métricas do banco de dados.

**Query Params:**
- `range`: `past_24h` | `past_7d`

**Response 200:**
```json
{
  "time_series": [
    {
      "timestamp": "2025-11-06T10:00:00Z",
      "active_connections": 12,
      "db_size_mb": 2048,
      "avg_query_time_ms": 15.2,
      "cpu_percent": 42,
      "memory_percent": 68,
      "disk_percent": 70
    }
  ],
  "gauges": {
    "cpu": {
      "value": 42,
      "status": "ok"
    },
    "memory": {
      "value": 68,
      "status": "warning"
    },
    "disk": {
      "value": 70,
      "status": "warning"
    }
  }
}
```

### GET /admin-security-overview

Visão geral de segurança.

**Response 200:**
```json
{
  "cards": [
    {
      "label": "Incidentes críticos",
      "value": 2,
      "trend": -1
    }
  ],
  "vulnerabilities": {
    "distribution": [
      {
        "severity": "critical",
        "count": 1
      }
    ],
    "list": [
      {
        "id": "uuid",
        "title": "SQL Injection em filtro",
        "status": "open",
        "detected_at": "2025-11-06T10:00:00Z",
        "owner": "uuid"
      }
    ]
  },
  "recent_logins": [
    {
      "user": "alceu@ifin.app.br",
      "status": "success",
      "timestamp": "2025-11-06T10:00:00Z"
    }
  ]
}
```

### GET /admin-security-sessions

Sessões ativas e distribuições.

**Response 200:**
```json
{
  "sessions": [
    {
      "user": "alceu@ifin.app.br",
      "ip": "192.168.1.100",
      "device": "desktop - Chrome/macOS",
      "location": "São Paulo, BR",
      "status": "active",
      "last_activity": "2025-11-06T10:00:00Z"
    }
  ],
  "device_distribution": [
    {
      "type": "desktop",
      "count": 10
    }
  ],
  "country_distribution": [
    {
      "country": "BR",
      "count": 8
    }
  ]
}
```

### GET /admin-security-backups

Histórico de backups.

**Response 200:**
```json
{
  "backups": [
    {
      "date": "2025-11-06",
      "status": "success",
      "size_mb": 512,
      "duration_seconds": 120,
      "notes": "Nightly backup"
    }
  ],
  "stats": {
    "success_rate": 98,
    "avg_duration_min": 3.2
  }
}
```

---

## ⚙️ Admin - Administração

### GET /admin-users

Lista usuários com paginação.

**Query Params:**
- `page` (opcional): Página (padrão: 1)
- `limit` (opcional): Itens por página (padrão: 20)
- `role` (opcional): Filtrar por role
- `search` (opcional): Buscar por nome/email

**Response 200:**
```json
{
  "users": [
    {
      "id": "uuid",
      "name": "Alceu Passos",
      "email": "alceu@ifin.app.br",
      "role": "admin",
      "status": "active",
      "created_at": "2025-01-01T00:00:00Z",
      "last_login_at": "2025-11-06T10:00:00Z",
      "two_factor_enabled": false
    }
  ],
  "total": 120
}
```

### POST /admin-users

Cria novo usuário.

**Request:**
```json
{
  "email": "novo@ifin.app.br",
  "name": "Novo Usuário",
  "role": "viewer",
  "password": "senha123" // opcional, gera aleatória se omitido
}
```

**Response 201:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "novo@ifin.app.br",
    "name": "Novo Usuário",
    "role": "viewer"
  }
}
```

### PUT /admin-users/:id

Atualiza usuário.

**Request:**
```json
{
  "name": "Nome Atualizado",
  "role": "admin",
  "email": "novo_email@ifin.app.br"
}
```

**Response 200:**
```json
{
  "success": true
}
```

### DELETE /admin-users/:id

Deleta usuário.

**Response 200:**
```json
{
  "success": true
}
```

### GET /admin-api-keys

Lista API keys.

**Response 200:**
```json
{
  "keys": [
    {
      "id": "uuid",
      "label": "Production API",
      "key_prefix": "sk_prod_",
      "status": "active",
      "last_used_at": "2025-11-06T10:00:00Z",
      "expires_at": "2025-12-31T23:59:59Z",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### POST /admin-api-keys

Cria nova API key.

**Request:**
```json
{
  "label": "Production API",
  "scopes": ["read", "write"],
  "expires_in_days": 365
}
```

**Response 201:**
```json
{
  "success": true,
  "key": "sk_prod_AbCd1234...", // Retornado apenas uma vez!
  "key_id": "uuid",
  "key_prefix": "sk_prod_"
}
```

### PUT /admin-api-keys/:id

Atualiza API key.

**Request:**
```json
{
  "label": "Novo Label",
  "status": "inactive",
  "scopes": ["read"]
}
```

### DELETE /admin-api-keys/:id

Revoga API key (não deleta, marca como revoked).

**Response 200:**
```json
{
  "success": true
}
```

### GET /admin-llm-config

Configuração de LLM. Suporta múltiplos subendpoints via query param `endpoint`.

#### GET /admin-llm-config?endpoint=providers

Lista provedores LLM.

**Response 200:**
```json
{
  "providers": [
    {
      "id": "uuid",
      "provider_name": "openai",
      "display_name": "OpenAI",
      "api_endpoint": "https://api.openai.com/v1",
      "is_active": true,
      "priority": 1
    }
  ]
}
```

#### GET /admin-llm-config?endpoint=models

Lista modelos LLM.

**Response 200:**
```json
{
  "models": [
    {
      "id": "uuid",
      "provider_id": "uuid",
      "model_name": "gpt-4-turbo",
      "display_name": "GPT-4 Turbo",
      "context_window": 128000,
      "max_output_tokens": 4096,
      "cost_per_1k_input": 0.01,
      "cost_per_1k_output": 0.03,
      "capabilities": ["chat", "function_calling", "vision"],
      "is_active": true,
      "is_default": false
    }
  ]
}
```

#### GET /admin-llm-config?endpoint=contexts

Lista contextos disponíveis.

**Response 200:**
```json
{
  "contexts": [
    {
      "id": "whatsapp_bot",
      "label": "WhatsApp Bot",
      "description": "Respostas automáticas via WhatsApp"
    }
  ]
}
```

#### GET /admin-llm-config?endpoint=usage&month=YYYY-MM

Relatório de uso mensal.

**Response 200:**
```json
{
  "summary": {
    "total_cost_usd": "123.45",
    "total_tokens_in": 67890,
    "total_tokens_out": 54321
  },
  "by_model": [
    {
      "model": "openai/gpt-4o-mini",
      "cost_usd": "45.67",
      "tokens_in": 23456,
      "tokens_out": 12345
    }
  ],
  "by_team": [
    {
      "team": "Consultoria",
      "cost_usd": "12.30"
    }
  ]
}
```

#### PUT /admin-llm-config

Atualiza configurações.

**Request:**
```json
{
  "provider_id": "uuid",
  "updates": {
    "is_active": false,
    "priority": 2
  }
}
```

**Response 200:**
```json
{
  "success": true
}
```

---

## 🏢 Empresas e Grupos

### GET /targets

Lista aliases (grupos) e CNPJs disponíveis.

**Response 200:**
```json
{
  "aliases": [
    {
      "id": "holding-1",
      "label": "Holding XPTO",
      "members": [
        "12.345.678/0001-90",
        "98.765.432/0001-10"
      ]
    }
  ],
  "cnpjs": [
    {
      "value": "12.345.678/0001-90",
      "label": "Empresa A (12.345.678/0001-90)"
    }
  ]
}
```

### GET /empresas

Lista empresas com status de integrações.

**Query Params:**
- `status` (opcional): Filtrar por status
- `integration` (opcional): Filtrar por integração

**Response 200:**
```json
{
  "companies": [
    {
      "cnpj": "12.345.678/0001-90",
      "name": "Empresa A",
      "status": "Ativo",
      "integrations": {
        "f360": "connected",
        "omie": "pending"
      },
      "last_sync_at": "2025-11-06T10:00:00Z"
    }
  ],
  "total": 50
}
```

---

## 💬 WhatsApp

### GET /whatsapp-conversations

Lista conversas WhatsApp.

**Response 200:**
```json
{
  "conversations": [
    {
      "id": "uuid",
      "contact_name": "João Silva",
      "last_message": "Qual meu saldo?",
      "unread_count": 2,
      "updated_at": "2025-11-06T10:00:00Z",
      "status": "active"
    }
  ]
}
```

### GET /whatsapp-scheduled

Lista mensagens agendadas.

**Response 200:**
```json
{
  "scheduled": [
    {
      "id": "uuid",
      "template": "uuid",
      "scheduled_for": "2025-11-07T15:00:00Z",
      "status": "pending"
    }
  ]
}
```

### GET /whatsapp-templates

Lista templates de mensagens.

**Response 200:**
```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "relatorio_mensal",
      "category": "utility",
      "status": "active",
      "content": {
        "header": "Relatório Mensal",
        "body": "Seu relatório...",
        "footer": "Finance Oráculo"
      }
    }
  ]
}
```

---

## 📤 Upload & Export

### POST /upload-dre

Upload de arquivo DRE (Excel).

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: Arquivo Excel
- `cnpj`: CNPJ da empresa
- `alias` (opcional): ID do grupo

**Response 200:**
```json
{
  "ok": true,
  "message": "Arquivo processado com sucesso",
  "job_id": "uuid"
}
```

### GET /export-excel

Exporta dados para Excel.

**Query Params:**
- `cnpj` (obrigatório): CNPJ da empresa
- `from` (opcional): Data inicial
- `to` (opcional): Data final

**Response 200:**
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Body: Arquivo Excel binário

---

## ❌ Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Requisição inválida (parâmetros faltando ou inválidos) |
| 401 | Não autenticado (token ausente ou inválido) |
| 403 | Acesso negado (sem permissão) |
| 404 | Recurso não encontrado |
| 405 | Método não permitido |
| 500 | Erro interno do servidor |

**Formato de erro:**
```json
{
  "error": "Descrição do erro"
}
```

---

## 🔑 Autenticação

Todas as requisições (exceto `/auth-login`) requerem header:

```
Authorization: Bearer {access_token}
```

**Token expira em:** 1 hora (3600 segundos)

**Refresh token:** Use para obter novo access_token sem fazer login novamente.

---

## 🌐 CORS

Todos os endpoints suportam CORS com:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`

---

## 📊 Rate Limiting

**Limites atuais:**
- Endpoints públicos: 100 req/min
- Endpoints admin: 200 req/min
- Upload: 10 req/min

---

## 📝 Notas

- Datas em formato ISO 8601: `YYYY-MM-DDTHH:mm:ssZ`
- Valores monetários em decimal (15,2)
- CNPJs no formato: `XX.XXX.XXX/XXXX-XX`
- IDs em formato UUID v4

---

**Versão da API:** 1.0.0
**Última atualização:** 2025-11-06
**Contato:** suporte@ifinance.com.br
