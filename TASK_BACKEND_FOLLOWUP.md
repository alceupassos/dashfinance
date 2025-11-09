# 🔧 TASK_BACKEND_FOLLOWUP.md - Guia Imediato para o Backend

**Data:** 09/11/2025  
**Status:** PLANEJADO E PRIORIZADO  
**Para:** Time Backend  
**Sequência:** Passo-a-passo (execute nesta ordem)

---

## 🎯 OBJETIVO GERAL

Finalizar as **4 áreas críticas** que o frontend precisa para funcionar 100% sem mocks:

1. ✅ **Documentação API** (0.5h)
2. ✅ **WhatsApp Endpoints** (2h)
3. ✅ **Group Aliases + Financial Alerts** (2.5h)
4. ✅ **Observabilidade + Deploy** (1h)

**Total:** 6 horas

---

## 📋 FASE 1: DOCUMENTAÇÃO API (0.5h)

### PASSO 1.1: Criar docs/API-REFERENCE.md

**O que fazer:**
```bash
mkdir -p docs/
touch docs/API-REFERENCE.md
```

**Conteúdo mínimo:**

```markdown
# API Reference - DashFinance

## Authentication
All endpoints require `Authorization: Bearer {token}` header.

## Response Format
All responses support `Prefer: return=representation` for POST/PATCH.

### WhatsApp Endpoints

#### GET /whatsapp-conversations
Retorna lista de conversas WhatsApp.

**Query Params:**
- empresa_cnpj (optional)
- status (ativo | pausado | encerrado)
- limit (default: 50)
- offset (default: 0)

**Response:**
```json
[
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
]
```

**Status HTTP:**
- 200: Sucesso
- 400: Parâmetros inválidos
- 401: Não autenticado

---

#### GET /whatsapp-conversations/{id}
Retorna conversação completa com histórico.

**Response:**
```json
{
  "id": "uuid",
  "empresa_cnpj": "12.345.678/0001-90",
  "contato_phone": "5511999999999",
  "contato_nome": "João Silva",
  "contato_tipo": "cliente",
  "ativo": true,
  "status": "ativo",
  "mensagens": [
    {
      "id": "uuid",
      "textoEnviado": "Olá, tudo bem?",
      "textoRecebido": null,
      "timestamp": "2025-11-09T10:00:00Z",
      "tipo": "enviada",
      "status": "entregue",
      "templateUsada": null,
      "variaveisUsadas": null
    }
  ],
  "criadoEm": "2025-11-01T08:00:00Z",
  "ultimaAtualizacao": "2025-11-09T10:30:00Z"
}
```

---

#### POST /whatsapp-send
Envia mensagem WhatsApp imediata.

**Request:**
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

**Response:**
```json
{
  "success": true,
  "messageId": "uuid",
  "status": "enviada",
  "timestamp": "2025-11-09T10:30:00Z"
}
```

**Status HTTP:**
- 200: Sucesso
- 400: Dados inválidos
- 429: Rate limit
- 500: Erro WASender

---

#### POST /whatsapp-schedule
Agenda envio de mensagem.

**Request:**
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

**Response:**
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

#### DELETE /whatsapp-scheduled/{id}
Cancela agendamento.

**Response:**
```json
{
  "success": true,
  "message": "Agendamento cancelado"
}
```

---

### Group Aliases

#### POST /group-aliases
Cria novo grupo.

**Request:**
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

**Response (Prefer: return=representation):**
```json
{
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
  "criadoEm": "2025-11-09T10:30:00Z",
  "atualizadoEm": "2025-11-09T10:30:00Z"
}
```

---

#### PATCH /group-aliases/{id}
Atualiza grupo.

**Request:**
```json
{
  "label": "Grupo VIP Premium",
  "members": [
    {"company_cnpj": "12.345.678/0001-90", "position": 1}
  ]
}
```

**Response (Prefer: return=representation):**
```json
{
  "id": "uuid",
  "label": "Grupo VIP Premium",
  "members": [...],
  "totalMembers": 1,
  "atualizadoEm": "2025-11-09T11:00:00Z"
}
```

---

### Financial Alerts

#### PATCH /financial-alerts/{id}
Atualiza status e resolução.

**Request:**
```json
{
  "status": "resolvido",
  "resolucao_tipo": "corrigido",
  "resolucao_observacoes": "Taxa corrigida no banco",
  "resolvido_por": "user_id"
}
```

**Response (Prefer: return=representation):**
```json
{
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
```

---

**Commit:**
```bash
git add docs/API-REFERENCE.md
git commit -m "docs: Criar API Reference completa"
```

---

## 🔌 FASE 2: WHATSAPP ENDPOINTS (2h)

### PASSO 2.1: Criar GET /whatsapp-conversations

**Arquivo:**
```
finance-oraculo-backend/supabase/functions/whatsapp-conversations/index.ts
```

**Implementação:**

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse query params
    const url = new URL(req.url);
    const empresaCnpj = url.searchParams.get("empresa_cnpj");
    const status = url.searchParams.get("status") || "ativo";
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Build query
    let query = supabase
      .from("whatsapp_conversations")
      .select("*")
      .eq("status", status)
      .order("ultimaMensagemEm", { ascending: false })
      .range(offset, offset + limit - 1);

    if (empresaCnpj) {
      query = query.eq("empresa_cnpj", empresaCnpj);
    }

    const { data: conversations, error } = await query;

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        data: conversations,
        total: conversations?.length || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};
```

**Deploy:**
```bash
supabase functions deploy whatsapp-conversations
```

**Teste:**
```bash
curl "http://localhost:54321/functions/v1/whatsapp-conversations?empresa_cnpj=12.345.678/0001-90&limit=10"
```

---

### PASSO 2.2: Criar POST /whatsapp-send

**Arquivo:**
```
finance-oraculo-backend/supabase/functions/whatsapp-send/index.ts
```

**Implementação:**

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const wasenderToken = Deno.env.get("WASENDER_TOKEN") || "";

    if (!supabaseUrl || !supabaseKey || !wasenderToken) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    const body = await req.json();
    const { empresa_cnpj, contato_phone, mensagem, templateId, variaveis, idempotencyKey } = body;

    // Validate
    if (!empresa_cnpj || !contato_phone || !mensagem) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Preparar mensagem (substituir variáveis se houver)
    let textoFinal = mensagem;
    if (variaveis) {
      for (const [key, value] of Object.entries(variaveis)) {
        textoFinal = textoFinal.replace(`{{${key}}}`, String(value));
      }
    }

    // Chamar WASender API
    const wasenderResponse = await fetch("https://api.wasender.com.br/api/send-message", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${wasenderToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: contato_phone,
        message: textoFinal,
        idempotency_key: idempotencyKey,
      }),
    });

    const wasenderResult = await wasenderResponse.json();

    if (!wasenderResponse.ok) {
      throw new Error(`WASender error: ${wasenderResult.message}`);
    }

    // Armazenar em whatsapp_messages
    const { error: storeError } = await supabase.from("whatsapp_messages").insert({
      empresa_cnpj,
      contato_phone,
      textoEnviado: textoFinal,
      tipo: "enviada",
      status: "enviada",
      messageId: wasenderResult.id,
      templateUsada: templateId,
      variaveisUsadas: variaveis,
    });

    if (storeError) console.warn("Warning: Could not store message", storeError);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: wasenderResult.id,
        status: "enviada",
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};
```

**Deploy:**
```bash
supabase functions deploy whatsapp-send
```

---

### PASSO 2.3: Criar POST /whatsapp-schedule

**Arquivo:**
```
finance-oraculo-backend/supabase/functions/whatsapp-schedule/index.ts
```

**Implementação:** (Similar ao whatsapp-send, mas armazenar em whatsapp_scheduled com dataAgendada e status="agendada")

**Deploy:**
```bash
supabase functions deploy whatsapp-schedule
```

---

### PASSO 2.4: Criar DELETE /whatsapp-scheduled/{id}

**Arquivo:**
```
finance-oraculo-backend/supabase/functions/whatsapp-scheduled-cancel/index.ts
```

**Deploy:**
```bash
supabase functions deploy whatsapp-scheduled-cancel
```

---

## 👥 FASE 3: GROUP ALIASES + FINANCIAL ALERTS (2.5h)

### PASSO 3.1: Criar POST /group-aliases

**Arquivo:**
```
finance-oraculo-backend/supabase/functions/group-aliases-create/index.ts
```

**Implementação:**

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Prefer",
};

export default async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { label, description, color, icon, members } = body;

    if (!label || !members || members.length === 0) {
      return new Response(
        JSON.stringify({ error: "label e members são obrigatórios" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // 1. Criar grupo
    const { data: grupo, error: grupError } = await supabase
      .from("group_aliases")
      .insert({ label, description, color, icon })
      .select()
      .single();

    if (grupError) throw grupError;

    // 2. Inserir membros
    const memberRecords = members.map((m: any, idx: number) => ({
      alias_id: grupo.id,
      company_cnpj: m.company_cnpj,
      position: m.position || idx + 1,
    }));

    const { error: membersError } = await supabase
      .from("group_alias_members")
      .insert(memberRecords);

    if (membersError) throw membersError;

    // 3. Buscar dados completos com JOINs
    const { data: membersWithDetails, error: detailsError } = await supabase
      .from("group_alias_members")
      .select(`
        id,
        company_cnpj,
        position,
        clientes(nome_interno_cliente, integracao_f360, integracao_omie, whatsapp_ativo)
      `)
      .eq("alias_id", grupo.id)
      .order("position");

    if (detailsError) throw detailsError;

    // 4. Formatar resposta
    const membersFormatted = membersWithDetails.map((m: any) => ({
      id: m.id,
      alias_id: grupo.id,
      company_cnpj: m.company_cnpj,
      company_name: m.clientes?.nome_interno_cliente || "Unknown",
      position: m.position,
      integracao_f360: m.clientes?.integracao_f360 || false,
      integracao_omie: m.clientes?.integracao_omie || false,
      whatsapp_ativo: m.clientes?.whatsapp_ativo || false,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...grupo,
          members: membersFormatted,
          totalMembers: membersFormatted.length,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 201,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};
```

**Deploy:**
```bash
supabase functions deploy group-aliases-create
```

---

### PASSO 3.2: Criar PATCH /group-aliases/{id}

**Arquivo:**
```
finance-oraculo-backend/supabase/functions/group-aliases-update/index.ts
```

**Similar ao POST, mas:**
- DELETE old members
- INSERT new members
- UPDATE grupo fields

---

### PASSO 3.3: Criar PATCH /financial-alerts/{id}

**Arquivo:**
```
finance-oraculo-backend/supabase/functions/financial-alerts-update/index.ts
```

**Implementação:**

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse ID from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const alertId = pathParts[pathParts.length - 1];

    const body = await req.json();
    const {
      status,
      resolucao_tipo,
      resolucao_observacoes,
      resolvido_por,
    } = body;

    if (!status) {
      return new Response(
        JSON.stringify({ error: "status é obrigatório" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validar transição de status
    const validTransitions: Record<string, string[]> = {
      pendente: ["resolvido", "ignorado"],
      resolvido: ["pendente", "ignorado"],
      ignorado: ["pendente", "resolvido"],
    };

    const { data: currentAlert, error: fetchError } = await supabase
      .from("financial_alerts")
      .select("status")
      .eq("id", alertId)
      .single();

    if (fetchError) throw fetchError;

    if (!validTransitions[currentAlert.status]?.includes(status)) {
      return new Response(
        JSON.stringify({
          error: `Transição inválida: ${currentAlert.status} → ${status}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Atualizar alerta
    const updateData: any = {
      status,
      resolucao_tipo,
      resolucao_observacoes,
      resolvido_por,
    };

    if (status !== "pendente") {
      updateData.resolved_at = new Date().toISOString();
    }

    const { data: updated, error: updateError } = await supabase
      .from("financial_alerts")
      .update(updateData)
      .eq("id", alertId)
      .select()
      .single();

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        data: updated,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};
```

**Deploy:**
```bash
supabase functions deploy financial-alerts-update
```

---

## 📊 FASE 4: OBSERVABILIDADE + DEPLOY (1h)

### PASSO 4.1: Configurar Logging

**Adicionar em todas as Edge Functions:**

```typescript
// No início de cada função
const startTime = Date.now();
const requestId = crypto.randomUUID();

console.log(`[${requestId}] START: ${req.method} ${req.url}`);

// No final (sucesso)
console.log(`[${requestId}] SUCCESS: ${Date.now() - startTime}ms`);

// No catch (erro)
console.error(`[${requestId}] ERROR: ${error.message}`);
```

---

### PASSO 4.2: Criar Monitoramento Básico

**Arquivo:**
```
docs/MONITORING.md
```

**Conteúdo:**

```markdown
# Monitoramento - DashFinance Backend

## Logs

Ver logs em tempo real:
```bash
supabase functions logs whatsapp-send --follow
supabase functions logs group-aliases-create --follow
supabase functions logs financial-alerts-update --follow
```

## Métricas

Monitorar:
- Latência de endpoints (esperado < 500ms)
- Taxa de erro (target < 1%)
- Taxa de limite (429 errors)
- Uso de WASender API

## Alertas

Configurar alertas para:
- Tempo de resposta > 2s
- Taxa de erro > 5%
- WASender API indisponível

---

## Health Check

Endpoint: GET /health
Response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-09T12:00:00Z",
  "uptime": 1234567,
  "dependencies": {
    "supabase": "ok",
    "wasender": "ok"
  }
}
```

---
```

---

### PASSO 4.3: Deploy em Staging

```bash
# 1. Deploy todas as funções
supabase functions deploy --project-ref staging

# 2. Validar
curl https://staging-project.supabase.co/functions/v1/health

# 3. Testar endpoints
./scripts/test-apis-staging.sh

# 4. Se OK → Deploy em produção
supabase functions deploy --project-ref production
```

---

### PASSO 4.4: Criar DEPLOYMENT_CHECKLIST.md

```markdown
# Deployment Checklist

## Pré-Deploy

- [ ] Todos os testes passando
- [ ] Linter sem erros
- [ ] Type checking OK
- [ ] Documentação atualizada
- [ ] Environment variables configuradas

## Deploy Staging

- [ ] `supabase functions deploy --project-ref staging`
- [ ] Validar health check
- [ ] Testar 3 endpoints principais
- [ ] Verificar logs

## Validação

- [ ] Todos endpoints 200 OK
- [ ] Respostas com formato correto
- [ ] Errors tratados
- [ ] Performance < 500ms

## Deploy Produção

- [ ] Aguardar aprovação
- [ ] `supabase functions deploy --project-ref production`
- [ ] Monitorar logs (30min)
- [ ] Alertar time frontend

## Rollback (se necessário)

```bash
supabase functions deploy --project-ref production --version previous
```

---
```

---

## ✅ FASE 5: CHECKLIST DE INTEGRAÇÃO FRONTEND (0.5h)

### PASSO 5.1: Criar FRONTEND_INTEGRATION_CHECKLIST.md

```markdown
# Frontend Integration Checklist

## Endpoints Disponíveis

Confirmado que backend implementou:

### WhatsApp
- [ ] GET /whatsapp-conversations
- [ ] GET /whatsapp-conversations/{id}
- [ ] GET /whatsapp-templates
- [ ] GET /whatsapp-scheduled
- [ ] POST /whatsapp-send
- [ ] POST /whatsapp-schedule
- [ ] DELETE /whatsapp-scheduled/{id}

### Group Aliases
- [ ] POST /group-aliases
- [ ] PATCH /group-aliases/{id}
- [ ] GET /group-aliases
- [ ] GET /group-aliases/{id}

### Financial Alerts
- [ ] PATCH /financial-alerts/{id}

## Tipos Retornados

Verificar que responses retornam:

### Conversação
- [ ] id, empresa_cnpj, contato_phone
- [ ] ultimaMensagem, ultimaMensagemEm
- [ ] totalMensagens, naoLidas
- [ ] status, ativo

### Grupo
- [ ] members array com company_name
- [ ] integracao_f360, integracao_omie
- [ ] whatsapp_ativo

### Alerta
- [ ] status atualizado
- [ ] resolucao_tipo, resolucao_observacoes
- [ ] resolved_at preenchido

## APIs em lib/api.ts

Frontend deve implementar:
- [ ] getWhatsappConversations()
- [ ] sendWhatsappMessage()
- [ ] scheduleWhatsappMessage()
- [ ] createGroupAlias()
- [ ] updateGroupAlias()
- [ ] updateFinancialAlertStatus()

## Testes

- [ ] Enviar mensagem WhatsApp
- [ ] Agendar mensagem
- [ ] Criar grupo com members
- [ ] Editar grupo
- [ ] Resolver alerta

---
```

---

## 📋 CHECKLIST FINAL BACKEND

### Antes de Passar para Frontend:

```
Documentação:
  ✅ docs/API-REFERENCE.md
  ✅ docs/MONITORING.md
  ✅ DEPLOYMENT_CHECKLIST.md
  ✅ FRONTEND_INTEGRATION_CHECKLIST.md

Endpoints:
  ✅ 7 WhatsApp (GET, POST, DELETE)
  ✅ 4 Group Aliases (GET, POST, PATCH)
  ✅ 1 Financial Alerts (PATCH)

Deployment:
  ✅ Todos endpoints em staging OK
  ✅ Todos endpoints em produção OK
  ✅ Logging funcional
  ✅ Monitoring configurado

Integração Frontend:
  ✅ APIs documentadas
  ✅ Tipos retornados corretos
  ✅ Exemplos de request/response
  ✅ Checklist de validação pronto
```

---

## ⏱️ TIMELINE TOTAL

```
Fase 1 (Docs):              30 min  ← Fazer PRIMEIRO
Fase 2 (WhatsApp):          2 horas
Fase 3 (Group + Alerts):    2.5 horas
Fase 4 (Observ + Deploy):   1 hora
Fase 5 (Integration Check): 30 min

TOTAL:                       6 horas + testes
```

---

## 🚀 COMO COMEÇAR AGORA

```bash
# 1. Começar pela Fase 1 (Documentação)
touch docs/API-REFERENCE.md

# 2. Implementar Fase 2 (WhatsApp)
mkdir -p supabase/functions/whatsapp-conversations
# ... copiar código

# 3. Deploy cada função conforme pronto
supabase functions deploy whatsapp-conversations

# 4. Testar
curl http://localhost:54321/functions/v1/whatsapp-conversations

# 5. Passar para Fase 3+4
# 6. Avisar Frontend quando tudo OK
```

---

## 📞 SUPORTE

**Dúvidas:**
- Ver TASK_APIS_CRITICAS_FINAIS.md para especificações completas
- Ver docs/API-REFERENCE.md para exemplos
- Rodar `supabase functions logs` para debugar

**Problemas:**
- WASender falha → Validar token e rate limit
- JOINs retornam null → Verificar foreign keys
- Validações → Ver fase 3

---

**Status:** 🟢 **PRONTO PARA COMEÇAR**  
**Sequência:** Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5  
**Próximo:** Implementar Fase 1 agora!

