# 📋 TAREFAS FRONTEND - Guia Completo de Implementação

**Status:** 🔴 Fases 1-4 completadas no Backend → Aguardando integração Frontend  
**Data:** 09 de Novembro de 2025  
**Prioridade:** 🔴 CRÍTICA

---

## 📊 Resumo Executivo

4 fases foram 100% implementadas no backend:
1. ✅ **Segurança & Criptografia** - Encryption AES-GCM, Dashboard NOC, Monitoring
2. ✅ **Billing & Cobrança** - Planos, Yampi, Markup 3.5x, LLM por cliente
3. ✅ **Tracking & Analytics** - Uso por usuário, Sentimento WhatsApp, RAG
4. ✅ **Automação WhatsApp** - Pipeline automático, Triggers, Cron jobs

**O Frontend precisa criar 18 novas telas e modificar 3 existentes.**

---

## 🔄 MODIFICAÇÕES EM ARQUIVOS EXISTENTES

### 1. `/lib/supabase.ts` - ✅ JÁ MODIFICADO
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```
**Status:** ✅ Feito

---

### 2. `/store/use-user-store.ts` - ✅ JÁ MODIFICADO
**Mudanças:**
- ✅ Usar `supabase.auth.signInWithPassword()` (nativo)
- ✅ Importar cliente centralizado em `/lib/supabase.ts`
- ✅ Remover chamadas para Edge Function `auth-login`

**Status:** ✅ Feito

---

### 3. `/.env.local` - ✅ JÁ CONFIGURADO
```
NEXT_PUBLIC_SUPABASE_URL=https://newczbjzzfkwwnpfmygm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_BASE=https://newczbjzzfkwwnpfmygm.supabase.co/functions/v1
NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL=https://newczbjzzfkwwnpfmygm.supabase.co/functions/v1
```
**Status:** ✅ Feito

---

### 4. `/app/(app)/layout.tsx` - ✅ JÁ MODIFICADO
**Mudanças:**
- ✅ Adicionar hook `useTrackUsage()` no layout principal
- Isso garante que toda atividade do usuário seja rastreada automaticamente

**Status:** ✅ Feito

---

### 5. `/hooks/use-track-usage.ts` - ✅ JÁ CRIADO
**Funcionalidade:**
- Rastreia: páginas visitadas, features usadas, API calls
- Rastreia: LLM interactions, WhatsApp messages
- Envia dados via `sendBeacon` ao descarregar

**Status:** ✅ Feito

---

### 6. `/lib/api-interceptor.ts` - ✅ JÁ CRIADO
**Funcionalidade:**
- Intercepta todos os `fetch()` calls
- Coleta: total_calls, successful, failed, duration
- Expõe: `getSummary()` para métricas em tempo real

**Status:** ✅ Feito

---

## 🆕 NOVAS TELAS A CRIAR

### SEÇÃO: SEGURANÇA & MONITORAMENTO

#### 1. `/admin/security/noc` - NOC Dashboard
**Descrição:** Dashboard estilo Grafana com métricas live, status sistema, alertas

**Componentes:**
- Tabs: Overview | Security | Access | LLM | Health
- Cards com KPIs: API Health, Database Health, Edge Functions status
- Gráficos: System metrics timeline, Request latency, Error rate
- Indicators: 🟢 Green/🔴 Red para cada serviço
- Tabelas: Recent access logs, Failed operations, System alerts

**Layout esperado:**
```
┌─────────────────────────────────────────────┐
│  NOC Dashboard                    🔴 1 Alert│
├─────────────────────────────────────────────┤
│ Tabs: Overview | Security | Access | LLM    │
├─────────────────────────────────────────────┤
│ ┌────────────┬────────────┬────────────────┐ │
│ │ API Health │ DB Health  │ Functions      │ │
│ │    🟢      │    🟢      │     🟢         │ │
│ │ 99.98%     │ 99.95%     │ 3/3 Active     │ │
│ └────────────┴────────────┴────────────────┘ │
│ ┌────────────────────────────────────────┐   │
│ │ System Metrics (24h)                   │   │
│ │ ┌──────────────────────────────────┐  │   │
│ │ │ [Gráfico de linha com 5 linhas] │  │   │
│ │ │ CPU | Memory | Requests | Errors│  │   │
│ │ └──────────────────────────────────┘  │   │
│ └────────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**API Endpoint:**
- `GET /functions/v1/get-live-metrics` → métricas do NOC
- `GET /functions/v1/get-security-dashboard` → dados de segurança

**Dependências:**
- `recharts` para gráficos
- `lucide-react` para ícones

**Arquivo:** `app/(app)/admin/security/noc/page.tsx`

---

#### 2. `/admin/config/integrations` - Gerenciador de Integrações
**Descrição:** Configurar todas as API keys centralizadas (Yampi, OpenAI, Anthropic, F360, WASender, etc)

**Componentes:**
- Grid de integrações: Cards com status de cada
- Form modal para editar cada integração
- Display de valores criptografados (●●●●●●●●)
- Botões: Edit, Test Connection, Delete, Activate/Deactivate
- Historico de mudanças (auditoria)

**Layout esperado:**
```
┌──────────────────────────────────────────────┐
│ Integrações Configuradas                     │
├──────────────────────────────────────────────┤
│ ┌──────────────┐  ┌──────────────┐          │
│ │ Yampi        │  │ OpenAI       │  ┌─────┐ │
│ │ 🟢 Active    │  │ 🔴 Inactive  │  │ +   │ │
│ │ Configurado  │  │ Não config.  │  │ Add │ │
│ │ [Test][Edit] │  │ [Test][Edit] │  │ New │ │
│ └──────────────┘  └──────────────┘  └─────┘ │
│ ┌──────────────┐  ┌──────────────┐          │
│ │ Anthropic    │  │ F360         │          │
│ │ 🟢 Active    │  │ 🟢 Active    │          │
│ │ sk-ant-●●●●  │  │ token-●●●●   │          │
│ │ [Test][Edit] │  │ [Test][Edit] │          │
│ └──────────────┘  └──────────────┘          │
│                                              │
│ Modal: Editar Yampi                         │
│ ├─ Integration: Yampi                       │
│ ├─ Category: Payment                        │
│ ├─ API Key: [●●●●●●●●●●●●●●] [Show]      │
│ ├─ Config Data:                             │
│ │  ├─ Store ID: 12345                      │
│ │  ├─ Environment: production               │
│ │  └─ Product ID: prod-llm-tokens          │
│ ├─ [Test] [Save] [Cancel]                  │
│ └─────────────────────────────────────────  │
└──────────────────────────────────────────────┘
```

**API Endpoints:**
- `GET /functions/v1/manage-integration-config` → lista todas
- `POST /functions/v1/manage-integration-config` → criar/atualizar
- `DELETE /functions/v1/manage-integration-config` → deletar

**Arquivo:** `app/(app)/admin/config/integrations/page.tsx`

---

### SEÇÃO: BILLING & COBRANÇA

#### 3. `/admin/billing/plans` - Gerenciar Planos
**Descrição:** CRUD de planos de serviço (Básico, Profissional, Oráculo Premium)

**Componentes:**
- Tabela com: plan_name, base_price, included_tokens, overage_cost
- Form para criar/editar planos
- Ativar/desativar plano
- Preview de cálculo de cobrança

**API Endpoint:**
- `GET /rest/v1/service_plans`
- `POST/PUT /rest/v1/service_plans`
- `DELETE /rest/v1/service_plans`

**Arquivo:** `app/(app)/admin/billing/plans/page.tsx`

---

#### 4. `/admin/billing/subscriptions` - Gerenciar Subscriptions
**Descrição:** Ver e gerenciar subscriptions de clientes

**Componentes:**
- Tabela: company_cnpj | plan_name | status | start_date | end_date
- Filtros: Status (active/paused/cancelled), Data range
- Ações: Renew, Pause, Cancel, Upgrade plan
- Modal para editar subscription

**API Endpoint:**
- `GET /rest/v1/client_subscriptions`
- `PUT /rest/v1/client_subscriptions`

**Arquivo:** `app/(app)/admin/billing/subscriptions/page.tsx`

---

#### 5. `/admin/billing/pricing` - Configurar Preços LLM
**Descrição:** Configurar markup e preços dos LLMs

**Componentes:**
- Tabela: LLM Provider | Base Cost | Markup | Final Price
- Input fields para ajustar markup
- Preview de cálculo final
- Histórico de mudanças

**Exemplo:**
```
Provider       Base Cost    Markup    Final Price    Actions
OpenAI GPT-4   $0.03/1k    3.5x      $0.105/1k      [Edit]
Claude 3       $0.015/1k   3.5x      $0.0525/1k     [Edit]
Gemini         $0.005/1k   3.5x      $0.0175/1k     [Edit]
```

**API Endpoint:**
- `GET /rest/v1/llm_pricing_config`
- `PUT /rest/v1/llm_pricing_config`

**Arquivo:** `app/(app)/admin/billing/pricing/page.tsx`

---

#### 6. `/admin/billing/yampi-config` - Configurar Yampi
**Descrição:** Configurar integração Yampi (já em integrations, mas acesso rápido)

**Componentes:**
- Form com: Store ID, API Key, Environment, Product IDs
- Botão: Test Connection
- Status: 🟢 Connected / 🔴 Disconnected
- Histórico de invoices criadas

**Arquivo:** `app/(app)/admin/billing/yampi-config/page.tsx`

---

#### 7. `/admin/billing/invoices` - Ver Invoices
**Descrição:** Histórico de invoices geradas (Yampi)

**Componentes:**
- Tabela filtrada: company_cnpj | period | total | status | date
- Botões: Download PDF, Resend, Details
- Status badges: pending/paid/cancelled
- Filtros: Data, Status, Cliente

**Arquivo:** `app/(app)/admin/billing/invoices/page.tsx`

---

#### 8. `/billing/my-usage` - Dashboard de Uso (Cliente)
**Descrição:** Cliente vê seu uso, costs e próxima fatura

**Componentes:**
- Resumo: Tokens usados, Mensagens, Custo atual
- Gráfico: Uso 30 dias
- Comparação com limite do plano
- Invoices recentes (últimas 3)
- Estimativa próxima fatura

**Arquivo:** `app/(app)/billing/my-usage/page.tsx`

---

### SEÇÃO: TRACKING & ANALYTICS

#### 9. `/admin/analytics/user-usage` - Uso por Usuário
**Descrição:** Analytics de uso por usuário (sessões, páginas, features, API calls)

**Componentes:**
- Tabela: user_email | sessions | total_time | api_calls | features_used
- Filtros: Data range, Company
- Gráficos: Usage trend, Top features, Top pages
- Ações: Ver detalhes de sessão

**Colunas esperadas:**
```
Email              Sessions  Total Time  API Calls  Features Used    Last Activity
alceu@angrax...    45        12h 30m    1,234     [Dashboard]      5 min ago
user2@comp...      12        2h 15m     89        [Reports, Chat]  2 hours ago
```

**API Endpoint:**
- `GET /rest/v1/user_usage_tracking`
- `GET /functions/v1/get-usage-analytics`

**Arquivo:** `app/(app)/admin/analytics/user-usage/page.tsx`

---

#### 10. `/admin/analytics/usage-detail/:userId` - Detalhe de Sessão
**Descrição:** Ver detalhes completos de uma sessão específica

**Componentes:**
- Infos: session_start, session_end, duration
- Array: pages_visited (ex: [/dashboard, /reports, /admin])
- Array: features_used (ex: [DRE, CashFlow, WhatsApp])
- API calls: total, successful, failed, avg_duration
- Timeline visual: o que o usuário fez quando

**Arquivo:** `app/(app)/admin/analytics/usage-detail/[userId]/page.tsx`

---

#### 11. `/admin/analytics/mood-index` - Índice de Humor
**Descrição:** Sentimento agregado dos clientes via WhatsApp

**Componentes:**
- Gráfico: Mood index timeline (últimos 30 dias)
- Cards: Today mood, Average, Trend
- Tabela: client | today_mood | 7d_avg | trend
- Bandeiras: 🟢 Positivo | 🟡 Neutro | 🔴 Negativo

**Exemplo:**
```
╔════════════════════════════════════╗
║ Índice de Humor - Últimos 30 dias  ║
╠════════════════════════════════════╣
║ Hoje: 0.65 (Positivo) 📈           ║
║ Média 7 dias: 0.52                 ║
║ Trend: ↗ Melhorando                ║
╠════════════════════════════════════╣
║ Gráfico de linha (sentimento/dia)  ║
╠════════════════════════════════════╣
║ Top Positive: Cliente ABC (0.89)   ║
║ Top Negative: Cliente XYZ (-0.45)  ║
╚════════════════════════════════════╝
```

**API Endpoint:**
- `GET /rest/v1/whatsapp_mood_index_daily`

**Arquivo:** `app/(app)/admin/analytics/mood-index/page.tsx`

---

#### 12. `/admin/analytics/mood-index-timeline/:phone` - Timeline de Humor
**Descrição:** Timeline detalhada do sentimento de um cliente específico

**Componentes:**
- Gráfico: Sentimento ao longo do tempo (interativo)
- Tabela: data | sentiment_score | sentiment_label | message preview
- Filtros: Data range
- Export: CSV/PDF

**Arquivo:** `app/(app)/admin/analytics/mood-index-timeline/[phone]/page.tsx`

---

### SEÇÃO: LLM & OTIMIZAÇÃO

#### 13. `/admin/llm/costs-per-client` - Custos LLM por Cliente
**Descrição:** Visualizar quanto cada cliente está custando em LLM

**Componentes:**
- Tabela: company_cnpj | provider | tokens_used | cost_usd | last_usage
- Gráfico: Cost distribution (pizza)
- Filtros: Provider, Data range
- Total gasto no período

**Exemplo:**
```
Company          Provider    Tokens Used   Cost USD   % of Total
ABC Corp         OpenAI      1.2M          $36.00     35%
ABC Corp         Claude      800k          $12.00     12%
XYZ Inc          OpenAI      2.5M          $75.00     75%
────────────────────────────────────────────────
TOTAL                        4.5M          $123.00    100%
```

**API Endpoint:**
- `GET /rest/v1/v_llm_costs_per_client`

**Arquivo:** `app/(app)/admin/llm/costs-per-client/page.tsx`

---

#### 14. `/admin/llm/keys-per-client` - Gerenciar Chaves LLM por Cliente
**Descrição:** Configurar chaves LLM diferentes para cada cliente

**Componentes:**
- Tabela: company_cnpj | provider | priority | monthly_limit | is_active
- Form modal para adicionar/editar chave
- API key display: sk-ant-●●●●●●●●● [Copy] [Rotate]
- Histórico de rotações

**Layout esperado:**
```
Company         Provider   Priority  Monthly Limit  Active  Actions
ABC Corp        OpenAI     1         $500           ✓       [Edit][Delete]
ABC Corp        Claude     2         $300           ✓       [Edit][Delete]
XYZ Inc         OpenAI     1         $1000          ✓       [Edit][Delete]

Modal: Add LLM Key
├─ Company: [ABC Corp ▼]
├─ Provider: [OpenAI ▼]
├─ API Key: [sk-proj-●●●●●●●●]
├─ Priority: [1]
├─ Monthly Limit: [$500]
├─ [Test] [Save] [Cancel]
```

**API Endpoint:**
- `GET /functions/v1/manage-client-llm-keys`
- `POST /functions/v1/manage-client-llm-keys`

**Arquivo:** `app/(app)/admin/llm/keys-per-client/page.tsx`

---

#### 15. `/admin/llm/optimizer` - Otimizador de Tokens
**Descrição:** Sugestões de otimização para reduzir uso de tokens

**Componentes:**
- Análise automática de uso
- Recomendações: "Use gpt-3.5 ao invés de gpt-4 para tarefas simples"
- Projeção de economia
- Toggle para aplicar sugestões

**Arquivo:** `app/(app)/admin/llm/optimizer/page.tsx`

---

### SEÇÃO: RAG & BUSCA SEMÂNTICA

#### 16. `/admin/rag/search` - Busca Semântica no RAG
**Descrição:** Buscar em todas as conversas WhatsApp por cliente com semântica

**Componentes:**
- Input: Search query
- Select: Cliente (CNPJ)
- Resultados: Lista de mensagens relevantes (ordenadas por similaridade)
- Cada resultado: Message snippet | Sentiment | Date | Phone

**Exemplo:**
```
Search: "problemas com fluxo de caixa"
Client: ABC Corp

┌─ 92% similar ──────────────────────┐
│ "Temos preocupações com o caixa"   │
│ Sentiment: NEGATIVE               │
│ Phone: 5511987654321              │
│ Date: 09/11/2025 14:30            │
└────────────────────────────────────┘

┌─ 87% similar ──────────────────────┐
│ "Fluxo de caixa negativo em Nov"   │
│ Sentiment: NEGATIVE               │
│ Phone: 5511987654321              │
│ Date: 09/11/2025 13:15            │
└────────────────────────────────────┘
```

**API Endpoint:**
- `POST /functions/v1/search-rag` → query semantica

**Arquivo:** `app/(app)/admin/rag/search/page.tsx`

---

#### 17. `/admin/rag/context/:clientCnpj` - Contexto RAG do Cliente
**Descrição:** Ver todo o histórico e contexto armazenado de um cliente no RAG

**Componentes:**
- Summary text (resumo automático gerado)
- Key points extraídos
- Trending topics
- Timeline visual de conversas indexadas
- Gráfico: Sentimento ao longo do tempo

**Arquivo:** `app/(app)/admin/rag/context/[clientCnpj]/page.tsx`

---

### SEÇÃO: N8N & AUTOMAÇÃO (Futuro)

#### 18. `/admin/n8n/workflows` - Gerenciador N8N
**Descrição:** Ver e gerenciar workflows N8N (criar, editar, ativar, desativar)

**Componentes:**
- Tabela: workflow_name | status | last_run | runs_count | errors
- Ações: Edit, Test, Activate, Deactivate, View logs
- Modal: Criar novo workflow com templates

**Arquivo:** `app/(app)/admin/n8n/workflows/page.tsx`

---

#### 19. `/admin/n8n/monitor` - Monitor N8N
**Descrição:** Monitoramento de workflows N8N em tempo real

**Componentes:**
- Live feed de execuções
- Status por workflow
- Gráfico: Success rate, Avg execution time
- Alertas de erros

**Arquivo:** `app/(app)/admin/n8n/monitor/page.tsx`

---

## 🔧 COMPONENTES NECESSÁRIOS

Além das telas, criar/atualizar componentes:

1. **`components/metrics-card.tsx`** - Card genérico para KPIs
2. **`components/status-badge.tsx`** - 🟢 Green/🔴 Red badges
3. **`components/integration-form.tsx`** - Form genérico para integrações
4. **`components/encryption-display.tsx`** - Display de valores criptografados (●●●●●)
5. **`components/rag-search-box.tsx`** - Search box com autocomplete
6. **`components/timeline-chart.tsx`** - Gráfico de timeline
7. **`components/mood-indicator.tsx`** - Indicador de sentimento com cores

---

## 📊 DADOS NECESSÁRIOS (Estruturas)

### Types para TypeScript

```typescript
// Integração
interface IntegrationConfig {
  id: string
  integration_name: string
  category: 'Payment' | 'LLM' | 'ERP' | 'WhatsApp' | 'Storage' | 'Email' | 'Analytics'
  display_name: string
  api_key_encrypted: string
  is_active: boolean
  is_configured: boolean
}

// Plano
interface ServicePlan {
  id: string
  plan_name: string
  base_price_usd: number
  included_tokens: number
  overage_cost_per_1k_tokens: number
}

// Subscription
interface ClientSubscription {
  id: string
  company_cnpj: string
  plan_id: string
  status: 'active' | 'paused' | 'cancelled'
  subscription_start_date: string
}

// Uso
interface UserUsageTracking {
  id: string
  user_id: string
  session_duration_seconds: number
  pages_visited: string[]
  features_used: string[]
  api_calls_count: number
  created_at: string
}

// Sentimento
interface WhatsAppSentimentAnalysis {
  id: string
  conversation_id: string
  sentiment_score: number // -1 a 1
  sentiment_label: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive'
  tone: string
  emotion: string
  response_urgency: string
}

// RAG
interface RagConversation {
  id: string
  company_cnpj: string
  phone_number: string
  message_text: string
  sentiment_score: number
  topics: string[]
}
```

---

## 🗂️ ESTRUTURA DE DIRETÓRIOS

```
finance-oraculo-frontend/
├── app/(app)/
│   ├── admin/
│   │   ├── security/
│   │   │   └── noc/page.tsx                    [CRIAR]
│   │   ├── config/
│   │   │   └── integrations/page.tsx           [CRIAR]
│   │   ├── billing/
│   │   │   ├── plans/page.tsx                  [CRIAR]
│   │   │   ├── subscriptions/page.tsx          [CRIAR]
│   │   │   ├── pricing/page.tsx                [CRIAR]
│   │   │   ├── yampi-config/page.tsx           [CRIAR]
│   │   │   └── invoices/page.tsx               [CRIAR]
│   │   ├── analytics/
│   │   │   ├── user-usage/page.tsx             [CRIAR]
│   │   │   ├── usage-detail/[userId]/page.tsx [CRIAR]
│   │   │   ├── mood-index/page.tsx             [CRIAR]
│   │   │   └── mood-index-timeline/[phone]     [CRIAR]
│   │   ├── llm/
│   │   │   ├── costs-per-client/page.tsx       [CRIAR]
│   │   │   ├── keys-per-client/page.tsx        [CRIAR]
│   │   │   └── optimizer/page.tsx              [CRIAR]
│   │   ├── rag/
│   │   │   ├── search/page.tsx                 [CRIAR]
│   │   │   └── context/[clientCnpj]/page.tsx   [CRIAR]
│   │   └── n8n/
│   │       ├── workflows/page.tsx              [CRIAR - Futuro]
│   │       └── monitor/page.tsx                [CRIAR - Futuro]
│   └── billing/
│       └── my-usage/page.tsx                   [CRIAR]
├── components/
│   ├── metrics-card.tsx                        [CRIAR]
│   ├── status-badge.tsx                        [CRIAR]
│   ├── integration-form.tsx                    [CRIAR]
│   ├── encryption-display.tsx                  [CRIAR]
│   ├── rag-search-box.tsx                      [CRIAR]
│   ├── timeline-chart.tsx                      [CRIAR]
│   └── mood-indicator.tsx                      [CRIAR]
├── hooks/
│   └── use-track-usage.ts                      [✅ JÁ FEITO]
├── lib/
│   ├── supabase.ts                             [✅ JÁ FEITO]
│   └── api-interceptor.ts                      [✅ JÁ FEITO]
├── store/
│   └── use-user-store.ts                       [✅ JÁ FEITO]
└── .env.local                                  [✅ JÁ CONFIGURADO]
```

---

## 📝 CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Segurança (1-2 dias)
- [ ] `/admin/security/noc` - NOC Dashboard
- [ ] `/admin/config/integrations` - Gerenciador Integrações
- [ ] Componente: `status-badge`
- [ ] Componente: `metrics-card`

### Fase 2: Billing (2-3 dias)
- [ ] `/admin/billing/plans`
- [ ] `/admin/billing/subscriptions`
- [ ] `/admin/billing/pricing`
- [ ] `/admin/billing/yampi-config`
- [ ] `/admin/billing/invoices`
- [ ] `/billing/my-usage` (Cliente)

### Fase 3: Analytics (2-3 dias)
- [ ] `/admin/analytics/user-usage`
- [ ] `/admin/analytics/usage-detail/[userId]`
- [ ] `/admin/analytics/mood-index`
- [ ] `/admin/analytics/mood-index-timeline/[phone]`
- [ ] Componente: `timeline-chart`
- [ ] Componente: `mood-indicator`

### Fase 4: LLM (1-2 dias)
- [ ] `/admin/llm/costs-per-client`
- [ ] `/admin/llm/keys-per-client`
- [ ] `/admin/llm/optimizer`
- [ ] Componente: `integration-form`

### Fase 5: RAG (1 dia)
- [ ] `/admin/rag/search`
- [ ] `/admin/rag/context/[clientCnpj]`
- [ ] Componente: `rag-search-box`
- [ ] Componente: `encryption-display`

### Fase 6: N8N (Futuro)
- [ ] `/admin/n8n/workflows`
- [ ] `/admin/n8n/monitor`

---

## 🚀 COMO COMEÇAR

1. **Clone/pull** o projeto
2. **Instale dependências:**
   ```bash
   cd finance-oraculo-frontend
   npm install
   ```

3. **Configure `.env.local`** (já feito, mas verifique)

4. **Crie as telas na ordem:** Segurança → Billing → Analytics → LLM → RAG

5. **Para cada tela:**
   - Criar arquivo `page.tsx`
   - Importar tipos e funções de API
   - Criar componentes específicos
   - Testar com dados reais do Supabase

6. **Teste localmente:**
   ```bash
   npm run dev
   # Acesse: http://localhost:3000/admin/security/noc
   ```

7. **Commit e push:**
   ```bash
   git add .
   git commit -m "feat: Implementar telas de [feature]"
   git push origin main
   ```

---

## 💡 DICAS IMPORTANTES

1. **Dados Encriptados:** Quando exibir API keys, mostrar como `●●●●●●●●`
2. **Timestamps:** Usar `date-fns` para formatação de datas
3. **Real-time:** Usar Supabase Realtime para dados live (NOC, mood index)
4. **Performance:** Implementar paginação para tabelas grandes
5. **Acessibilidade:** Todos os botões devem ter `title` e `aria-label`
6. **Responsividade:** Considerar mobile desde o início

---

## 🔗 REFERÊNCIAS

- [Supabase Docs](https://supabase.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Tailwind CSS](https://tailwindcss.com)
- [React Hooks](https://react.dev/reference/react/hooks)
- [Recharts](https://recharts.org/)

---

## 📞 DÚVIDAS?

Se encontrar problemas:
1. Verificar console do navegador (F12)
2. Verificar logs do backend em Supabase
3. Rodar testes: `npm run test:auth`
4. Ver exemplo em telas já existentes

---

**Status Final:** 🟢 **PRONTO PARA IMPLEMENTAR**

Todas as 19 telas estão documentadas com:
- ✅ Descrição completa
- ✅ Layout esperado
- ✅ Componentes necessários
- ✅ API endpoints
- ✅ Tipos TypeScript
- ✅ Estrutura de arquivos

**Tempo estimado:** 10-14 dias de desenvolvimento

---

*Desenvolvido por: Angra.io by Alceu Passos*
*Versão Histórica: Lançamento de SaaS 100% no ar em 1 semana*
*Atualizado: 09/11/2025*

