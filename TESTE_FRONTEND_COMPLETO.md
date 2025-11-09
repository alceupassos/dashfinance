# 🚀 TESTE COMPLETO DO FRONTEND - 26 TELAS

## ✅ Status: 26 TELAS PRONTAS PARA TESTE

### 📋 Telas por Categoria

#### 🔒 SEGURANÇA (6 telas)
- `/admin/security/overview` - Dashboard de segurança
- `/admin/security/noc` - NOC com health check
- `/admin/security/traffic` - Tráfego de API
- `/admin/security/sessions` - Gerenciador de sessões
- `/admin/security/database` - Segurança DB
- `/admin/security/backups` - Backups

#### 💳 BILLING (5 telas)
- `/admin/billing/invoices` - Faturas Yampi
- `/admin/billing/plans` - Planos de serviço
- `/admin/billing/subscriptions` - Subscrições
- `/admin/billing/pricing` - Configurar preços
- `/admin/billing/yampi-config` - Config Yampi

#### 📊 ANALYTICS (5 telas)
- `/admin/analytics/user-usage` - Uso por usuário
- `/admin/analytics/usage-detail` - Detalhes 30d
- `/admin/analytics/mood-index` - Índice de humor
- `/admin/analytics/mood-index-timeline/[phone]` - Timeline
- `/admin/rag/search` - Busca RAG

#### 🤖 N8N WORKFLOWS (2 telas)
- `/admin/n8n/workflows` - Gerenciar workflows
- `/admin/n8n/monitor` - Monitor de execução

#### 🧠 RAG (2 telas)
- `/admin/rag/search` - Busca semântica
- `/admin/rag/context/[cnpj]` - Contexto por cliente

#### ⚙️ CONFIGURAÇÃO (6+ telas)
- `/admin/config/integrations` - Integrações centralizadas
- `/admin/tokens` - Gerenciador de tokens
- `/admin/llm/optimizer` - Otimizador LLM
- `/admin/llm/keys-per-client` - Chaves LLM
- `/admin/llm-costs-per-client` - Custos LLM
- `/admin/clientes-whatsapp` - Clientes WhatsApp
- `/admin/users` - Gerenciar usuários
- `/admin/franchises` - Gerenciar franquias
- `/admin/api-keys` - API Keys

---

## 🎯 PASSO 1: Instalar Dependências

```bash
cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-frontend

# Limpar node_modules (se existir)
rm -rf node_modules package-lock.json

# Instalar dependências
npm install

# Verificar build
npm run build
```

**Tempo esperado:** ~5-10 min

---

## 🎯 PASSO 2: Configurar Variáveis de Ambiente

Verificar `/Users/alceualvespasssosmac/dashfinance/finance-oraculo-frontend/.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://newczbjzzfkwwnpfmygm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ld2N6Ymp6emZrd3ducGZteWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NDE1NTAsImV4cCI6MjA3NzUxNzU1MH0.BvV6F8jlYZ3M9X4kL2pQ7R9sT1uW5vZ8aB3cD6eF7gH

# API Base
NEXT_PUBLIC_API_BASE=https://newczbjzzfkwwnpfmygm.supabase.co/functions/v1
NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL=https://newczbjzzfkwwnpfmygm.supabase.co/functions/v1
```

✅ **CRÍTICO:** NÃO incluir `SUPABASE_SERVICE_ROLE_KEY` (segurança!)

---

## 🎯 PASSO 3: Rodar Servidor de Desenvolvimento

```bash
cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-frontend

# Iniciar servidor
npm run dev

# Saída esperada:
# ▲ Next.js 14.2.33
# - Local:        http://localhost:3000
# - Environments: .env.local
```

**Tempo esperado:** ~30 segundos

---

## 🎯 PASSO 4: Fazer Login

1. Abrir: `http://localhost:3000`
2. Ir para: `/login`
3. Credenciais:
   - Email: `alceu@angrax.com.br`
   - Senha: `DashFinance2024`

**Status esperado:** ✅ Login com sucesso → Dashboard

---

## 🎯 PASSO 5: Testar Telas com Dados REAIS

### 5.1 SECURITY - NOC Dashboard
**URL:** `http://localhost:3000/admin/security/noc`

**Dados esperados:**
- 🟢 Green status geral (ou 🟡 se alguma métrica > 5%)
- API Health: true/false
- Database Health: true/false
- Functions Health: { "decrypt-api-key": true, ... }
- Requests 24h: número real
- Error Rate: percentual
- LLM Tokens: número real
- LLM Cost USD: valor real

**Teste:**
```bash
curl -s "http://localhost:3000/api/health-check" | jq .
```

---

### 5.2 BILLING - Invoices
**URL:** `http://localhost:3000/admin/billing/invoices`

**Dados esperados:**
- Tabela com faturas do Yampi
- Status: Pago/Pendente/Falhou (com cores)
- Valor total USD
- CNPJ da empresa
- Período

**Conexão:** `/functions/v1/yampi-create-invoice`

---

### 5.3 ANALYTICS - Usage Detail
**URL:** `http://localhost:3000/admin/analytics/usage-detail`

**Dados esperados:**
- Gráfico de linha: Tokens por dia (30d)
- Gráfico de linha: Custo USD por dia
- Gráfico de barras: Requisições por dia
- KPIs: Total tokens, Total cost, Cost per token

**Conexão:** `/functions/v1/get-monitoring-metrics`

---

### 5.4 RAG - Search
**URL:** `http://localhost:3000/admin/rag/search`

**Dados esperados:**
- Input de busca
- Resultados com:
  - Texto da mensagem
  - % de similaridade (0-100%)
  - Tópicos (tags)
  - Timestamp

**Teste:**
1. Digitar: "saldo"
2. Clicar "Buscar"
3. Esperar resultados

**Conexão:** `/rest/v1/rag_conversations`

---

### 5.5 N8N - Workflows
**URL:** `http://localhost:3000/admin/n8n/workflows`

**Dados esperados:**
- Lista de workflows:
  1. WhatsApp → Sentiment → RAG
  2. Cobrança Automática (18:00 UTC)
  3. Relatório Diário (09:00 UTC)
- Status: Active/Inactive
- Última execução
- Próxima execução programada

**Conexão:** N8N API (`http://n8n:5678/api/v1/workflows`)

---

### 5.6 BILLING - Plans
**URL:** `http://localhost:3000/admin/billing/plans`

**Dados esperados:**
- Tabela com planos:
  - Starter: 100k tokens/mês
  - Pro: 500k tokens/mês
  - Enterprise: 2M tokens/mês
- Preço USD
- Inclusões

**Conexão:** `/rest/v1/service_plans`

---

## 📊 Checklist de Validação

```
SEGURANÇA:
  ☐ /admin/security/overview carrega
  ☐ /admin/security/noc mostra health check
  ☐ /admin/security/traffic mostra tráfego
  ☐ /admin/security/sessions mostra sessões
  ☐ /admin/security/database mostra info DB
  ☐ /admin/security/backups mostra backups

BILLING:
  ☐ /admin/billing/invoices carrega faturas
  ☐ /admin/billing/plans mostra planos
  ☐ /admin/billing/subscriptions carrega
  ☐ /admin/billing/pricing configura preços
  ☐ /admin/billing/yampi-config configura

ANALYTICS:
  ☐ /admin/analytics/user-usage carrega
  ☐ /admin/analytics/usage-detail mostra gráficos
  ☐ /admin/analytics/mood-index carrega
  ☐ /admin/analytics/mood-index-timeline/[id] carrega
  ☐ /admin/rag/search funciona

N8N:
  ☐ /admin/n8n/workflows lista workflows
  ☐ /admin/n8n/monitor mostra execuções

INTEGRAÇÕES:
  ☐ /admin/config/integrations carrega
  ☐ /admin/tokens mostra tokens
  ☐ /admin/llm/* carregam
  ☐ /admin/clientes-whatsapp carrega
```

---

## 🔧 Troubleshooting

### Erro: `Module not found`
```bash
# Solução
rm -rf .next node_modules
npm install
npm run dev
```

### Erro: `Credenciais inválidas`
1. Verificar `.env.local`
2. Verificar SUPABASE_URL e ANON_KEY
3. Fazer login novamente

### Erro: `404 Not Found` em /admin/*
```bash
# Verificar se telas existem
ls -la finance-oraculo-frontend/app/\(app\)/admin/
```

### Erro: Dados não carregam
1. Verificar console (F12)
2. Verificar se Supabase está acessível
3. Verificar RLS policies
4. Verificar Edge Functions (curl)

---

## 📈 Performance

### Esperado:
- Home page: < 1s
- Admin pages: < 2s
- Gráficos: < 3s
- Busca RAG: < 2s

### Monitorar:
```bash
# Network tab (F12 → Network)
# Performance tab (F12 → Performance)
# Console (F12 → Console) - sem erros
```

---

## 🎉 Sucesso!

Quando todas as 26 telas estiverem carregando com dados reais:

```
✅ Frontend 100% Operacional
✅ Integração Supabase OK
✅ Edge Functions Conectadas
✅ N8N Workflows Prontos
✅ Sistema Pronto para Produção
```

---

## 📝 Próximos Passos

1. **N8N Setup** (2-3 horas)
   - Importar workflows
   - Configurar triggers
   - Testar execuções

2. **Testes de Carga** (1-2 horas)
   - Simular 100 usuários
   - Verificar performance
   - Otimizar se necessário

3. **Security Hardening** (1-2 horas)
   - Validar RLS policies
   - Audit logs
   - Rate limiting

4. **Deploy em Produção** (2-3 horas)
   - Configure SSL
   - Setup CDN
   - Configure backups automáticos

---

**Desenvolvido por:** Angra.io by Alceu Passos  
**Data:** 09/11/2025  
**Versão:** 4.0

