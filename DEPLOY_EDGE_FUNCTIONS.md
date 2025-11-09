# Deploy de Edge Functions e Configuração de MCPs

## 📋 Status Atual

### Edge Functions Implementadas
- ✅ 69 Edge Functions criadas no repositório
- ❌ 0 Edge Functions deployadas no Supabase (todas retornam 404)

### MCPs Implementados no Dashboard

O `/admin/mcp-dashboard` consome 3 MCPs principais:

1. **Federated MCP (N8N)** - Monitora workflows de automação
2. **Supabase Infra MCP** - Monitora infraestrutura do Supabase
3. **Automation Runs MCP** - Logs de execuções de automações

---

## 🚀 Como Fazer Deploy das Edge Functions

### 1. Pré-requisitos

```bash
# Instalar Supabase CLI (se ainda não tiver)
brew install supabase/tap/supabase

# Login no Supabase
supabase login

# Link com o projeto
cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-backend
supabase link --project-ref xzrmzmcoslomtzkzgskn
```

### 2. Configurar Secrets

Antes de fazer deploy, configure os secrets necessários:

```bash
# Secrets para N8N (Federated MCP)
supabase secrets set N8N_URL=https://seu-n8n.com
supabase secrets set N8N_API_KEY=sua-api-key-n8n

# Secrets para OpenAI (LLM)
supabase secrets set OPENAI_API_KEY=sua-openai-key

# Secrets para integrações
supabase secrets set F360_API_KEY=sua-f360-key
supabase secrets set YAMPI_API_KEY=sua-yampi-key

# Service Role Key (já deve estar configurado)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
```

### 3. Deploy de Todas as Funções

#### Opção A: Deploy Individual (recomendado para teste)

```bash
cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-backend

# Deploy das 5 funções prioritárias (TIER 3 - Testes)
supabase functions deploy seed-realistic-data
supabase functions deploy whatsapp-simulator
supabase functions deploy full-test-suite

# Deploy das funções TIER 1 (Críticas)
supabase functions deploy track-user-usage
supabase functions deploy empresas-list
supabase functions deploy llm-chat
supabase functions deploy onboarding-tokens
supabase functions deploy relatorios-dre
supabase functions deploy relatorios-cashflow
supabase functions deploy whatsapp-conversations
supabase functions deploy whatsapp-send
supabase functions deploy reconcile-bank
supabase functions deploy financial-alerts-update

# Deploy das funções TIER 2 (Média Prioridade)
supabase functions deploy mood-index-timeline
supabase functions deploy usage-details
supabase functions deploy n8n-status
supabase functions deploy llm-metrics
supabase functions deploy rag-search
supabase functions deploy rag-conversation
supabase functions deploy import-bank-statement
supabase functions deploy sync-bank-metadata
supabase functions deploy group-aliases-create

# Deploy das funções TIER 3 (Admin/Testes)
supabase functions deploy integrations-test
```

#### Opção B: Deploy em Lote (script automatizado)

```bash
# Criar script de deploy
cat > deploy-all-functions.sh << 'EOF'
#!/bin/bash

cd finance-oraculo-backend/supabase/functions

# Lista de funções prioritárias (ajuste conforme necessário)
FUNCTIONS=(
  "track-user-usage"
  "empresas-list"
  "llm-chat"
  "onboarding-tokens"
  "relatorios-dre"
  "relatorios-cashflow"
  "whatsapp-conversations"
  "whatsapp-send"
  "n8n-status"
  "mood-index-timeline"
  "usage-details"
  "seed-realistic-data"
  "whatsapp-simulator"
  "full-test-suite"
)

for func in "${FUNCTIONS[@]}"; do
  echo "Deploying $func..."
  supabase functions deploy "$func" --project-ref xzrmzmcoslomtzkzgskn
  if [ $? -eq 0 ]; then
    echo "✅ $func deployed successfully"
  else
    echo "❌ $func failed to deploy"
  fi
  echo ""
done
EOF

chmod +x deploy-all-functions.sh
./deploy-all-functions.sh
```

### 4. Verificar Deploy

Após o deploy, execute o script de teste:

```bash
cd /Users/alceualvespasssosmac/dashfinance

# Testar todas as funções
./test-all-edge-functions.sh

# Testar apenas funções TIER 1 (críticas)
./test-all-edge-functions.sh --tier 1

# Output JSON para integração
./test-all-edge-functions.sh --output json
```

---

## 🔧 Configuração dos MCPs

### 1. Federated MCP (N8N)

**Função:** `n8n-status`

**O que faz:**
- Consulta API do N8N para listar workflows
- Retorna status ativo/inativo
- Calcula taxa de sucesso
- Monitora "health" geral da federação

**Como rodar:**

```bash
# 1. Deploy da função
supabase functions deploy n8n-status

# 2. Configurar secrets
supabase secrets set N8N_URL=https://seu-n8n.com
supabase secrets set N8N_API_KEY=sua-api-key

# 3. Testar manualmente
curl -X GET \
  "https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/n8n-status" \
  -H "Authorization: Bearer eyJhbG..." \
  -H "apikey: eyJhbG..."

# 4. (Opcional) Configurar cron job para histórico
# Acesse: Supabase Dashboard > Database > Cron Jobs
# Adicione:
# Schedule: */15 * * * * (a cada 15 minutos)
# Function: n8n-status
# Payload: {}
```

**Frontend:** Já implementado em `/admin/mcp-dashboard` via `getN8nStatus()`.

---

### 2. Supabase Infra MCP

**Funções:** 
- `admin-security-database` (CPU/memória/disco)
- `admin-security-traffic` (requisições/erros)
- `admin-security-overview` (visão geral)

**O que faz:**
- Monitora métricas de infraestrutura do Supabase
- Exibe gauges de CPU, memória e disco
- Rastreia requisições e erros das Edge Functions
- Sinaliza status de saúde da infra

**Como rodar:**

```bash
# 1. Deploy das funções
supabase functions deploy admin-security-database
supabase functions deploy admin-security-traffic
supabase functions deploy admin-security-overview

# 2. Verificar permissões
# Certifique-se que SERVICE_ROLE_KEY tem acesso às tabelas:
# - pg_stat_database
# - pg_stat_activity
# - http_request_queue (se existir)

# 3. Testar
curl -X GET \
  "https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/admin-security-database" \
  -H "Authorization: Bearer eyJhbG..." \
  -H "apikey: eyJhbG..."

# 4. (Opcional) Cron job para histórico
# Schedule: */30 * * * * (a cada 30 minutos)
# Function: admin-security-overview
# Payload: {}
# Salva em: metrics_history (criar tabela se necessário)
```

**Frontend:** Já implementado em `/admin/mcp-dashboard` via:
- `getAdminSecurityDatabase()`
- `getAdminSecurityTraffic()`

---

### 3. Automation Runs MCP

**Origem:** Tabela `automation_runs`

**O que faz:**
- Armazena logs de execuções de automações
- Registra status (success/error/pending)
- Captura duração e mensagens de erro
- Alimenta feed de logs no dashboard

**Como configurar:**

```bash
# 1. Verificar se a migration existe
cd finance-oraculo-backend
ls supabase/migrations/*automation_runs*

# 2. Se não existir, criar migration
cat > supabase/migrations/$(date +%Y%m%d%H%M%S)_create_automation_runs.sql << 'EOF'
CREATE TABLE IF NOT EXISTS automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'pending', 'running')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_automation_runs_status ON automation_runs(status);
CREATE INDEX idx_automation_runs_started_at ON automation_runs(started_at DESC);

-- RLS
ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated users"
ON automation_runs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow service role to insert/update"
ON automation_runs FOR ALL
TO service_role
USING (true);
EOF

# 3. Aplicar migration
supabase db push

# 4. Configurar N8N para preencher a tabela
# Em cada workflow N8N, adicione um nó Supabase no final:
# - Ação: Insert
# - Tabela: automation_runs
# - Campos:
#   - automation_name: nome do workflow
#   - status: 'success' ou 'error'
#   - duration_ms: tempo de execução
#   - error_message: mensagem de erro (se houver)
```

**Frontend:** Já implementado em `/admin/mcp-dashboard` via `getAutomationRuns()`.

---

## 📊 Monitoramento Contínuo

### Opção 1: Cron Jobs Supabase

Configure cron jobs no Supabase Dashboard:

1. Acesse: **Database > Cron Jobs**
2. Clique em "Create a new cron job"
3. Configure:

```sql
-- N8N Status (a cada 15 minutos)
SELECT cron.schedule(
  'n8n-health-check',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url:='https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/n8n-status',
    headers:='{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  );
  $$
);

-- Security Overview (a cada 30 minutos)
SELECT cron.schedule(
  'security-overview-check',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url:='https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/admin-security-overview',
    headers:='{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  );
  $$
);
```

### Opção 2: GitHub Actions (CI/CD)

Crie `.github/workflows/health-check.yml`:

```yaml
name: Health Check MCPs

on:
  schedule:
    - cron: '*/30 * * * *'  # A cada 30 minutos
  workflow_dispatch:

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - name: Check N8N Status
        run: |
          curl -X GET \
            "${{ secrets.SUPABASE_URL }}/functions/v1/n8n-status" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
      
      - name: Check Security
        run: |
          curl -X GET \
            "${{ secrets.SUPABASE_URL }}/functions/v1/admin-security-overview" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

---

## 🎯 Resumo de Ações

### Imediato (Deploy Inicial)

```bash
# 1. Configurar secrets
supabase secrets set OPENAI_API_KEY=...
supabase secrets set N8N_URL=...
supabase secrets set N8N_API_KEY=...

# 2. Deploy das funções críticas (TIER 1)
./deploy-all-functions.sh

# 3. Testar
./test-all-edge-functions.sh --tier 1

# 4. Verificar no dashboard
# Acesse: https://app.ifin.app.br/admin/mcp-dashboard
```

### Contínuo (Monitoramento)

- **Frontend:** React Query faz polling automático ao abrir `/admin/mcp-dashboard`
- **Cron Jobs:** Configure para gravar histórico (opcional)
- **N8N:** Configure workflows para preencher `automation_runs`

---

## 🐛 Troubleshooting

### Problema: Função retorna 404

**Causa:** Função não foi deployada.

**Solução:**
```bash
supabase functions deploy <nome-da-funcao>
```

### Problema: Erro "Missing environment variables"

**Causa:** Secrets não configurados.

**Solução:**
```bash
supabase secrets list  # Verificar secrets existentes
supabase secrets set NOME_DA_VAR=valor
```

### Problema: N8N não preenche automation_runs

**Causa:** Workflow N8N não está configurado para inserir na tabela.

**Solução:**
1. Abra o workflow no N8N
2. Adicione nó "Supabase"
3. Configure para INSERT na tabela `automation_runs`
4. Mapeie os campos: `automation_name`, `status`, `duration_ms`, `error_message`

### Problema: Dashboard mostra "Error loading data"

**Causa:** API retorna erro ou não tem permissão.

**Solução:**
1. Abra DevTools (F12) > Console
2. Verifique erro específico
3. Teste endpoint manualmente:
   ```bash
   curl -X GET "https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/n8n-status" \
     -H "Authorization: Bearer TOKEN"
   ```

---

## 📚 Referências

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [N8N API Docs](https://docs.n8n.io/api/)
- Script de teste: `/test-all-edge-functions.sh`
- Dashboard MCP: `/admin/mcp-dashboard`

