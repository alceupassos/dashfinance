# Guia de Importação Manual - Workflows N8N

Data: 2025-11-06
Status: **API key retornando "unauthorized" - importação manual necessária**

## 🚨 Problema Identificado

A API key do N8N está retornando erro `unauthorized` para todas as requisições:
- Endpoint testado: `https://n8n.angrax.com.br/api/v1/workflows`
- API Key expira em: 5 de dezembro de 2025 (ainda válida)
- Possível causa: API desabilitada ou permissões insuficientes

## 📋 Solução: Importação Manual via Interface

### Passo 1: Acessar N8N
```
URL: https://n8n.angrax.com.br
Login: [suas credenciais]
```

### Passo 2: Verificar/Recriar API Key (Opcional)
1. Ir em **Settings** → **API**
2. Verificar se a API está habilitada
3. Se necessário, gerar nova API key
4. Testar novamente com: `curl -X GET "https://n8n.angrax.com.br/api/v1/workflows" -H "X-N8N-API-KEY: [sua_key]"`

### Passo 3: Importar Workflows Manualmente

#### Workflow 1: WhatsApp Bot v3 Ultra-Optimized
**Arquivo:** `/Users/alceualvespasssosmac/dashfinance/finance-oraculo-backend/n8n-workflows/whatsapp-bot-v3-ultra-optimized.json`

**Importação:**
1. No N8N, clique em **"+ Add Workflow"**
2. Clique nos 3 pontos (**...**) → **Import from File**
3. Selecione: `whatsapp-bot-v3-ultra-optimized.json`
4. **IMPORTANTE:** Verificar credenciais necessárias:
   - ✅ PostgreSQL: "Supabase PostgreSQL Finance" (ID: `eWdwRJii0F6jKHdU`)
   - ✅ Evolution API: "Evolution API Key" (ID: `OeWaimPjLFpTWr64`)
5. Configurar variável de ambiente: `EVO_API_URL` (URL da Evolution API)
6. Ativar o workflow (toggle no topo)

**Webhook gerado:**
```
POST https://n8n.angrax.com.br/webhook/whatsapp-bot-v3
```

---

#### Workflow 2: Dashboard Cards Pre-Processor
**Arquivo:** `/Users/alceualvespasssosmac/dashfinance/finance-oraculo-backend/n8n-workflows/dashboard-cards-processor.json`

**Importação:**
1. **Import from File** → Selecione: `dashboard-cards-processor.json`
2. **IMPORTANTE:** Verificar credenciais:
   - ✅ PostgreSQL: "Supabase PostgreSQL Finance" (ID: `eWdwRJii0F6jKHdU`)
3. **Importante:** A tabela `dashboard_cards` precisa existir no banco
   - ✅ Migration 007 já foi executada (criou a tabela)
4. **IMPORTANTE:** Verificar query no nó "PostgreSQL - Buscar Empresas Ativas"
   - Query usa tabela `clients` - precisa confirmar se existe ou se é `clientes`
   - Se necessário, editar query: `SELECT cnpj, name, status FROM clientes WHERE status = 'active' ORDER BY name;`
5. Ativar o workflow

**Execução:**
- Cron: A cada 5 minutos (`*/5 * * * *`)
- Primeira execução: Aguardar 5 minutos OU clicar em "Execute Workflow" para teste manual

---

#### Workflow 3: ERP Sync - OMIE Intelligent
**Arquivo:** `/Users/alceualvespasssosmac/dashfinance/finance-oraculo-backend/n8n-workflows/erp-sync-omie-intelligent.json`

**Importação:**
1. **Import from File** → Selecione: `erp-sync-omie-intelligent.json`
2. **IMPORTANTE:** Verificar credenciais:
   - ✅ PostgreSQL: "Supabase PostgreSQL Finance" (ID: `eWdwRJii0F6jKHdU`)
3. **Importante:** Verificar query no nó "PostgreSQL - Empresas com OMIE Ativo"
   - Query usa tabelas: `clients`, `omie_config`
   - Se `clients` não existe, trocar por `clientes`
4. **Pré-requisito:** Tabelas necessárias:
   - ✅ `omie_invoices` (deve existir)
   - ✅ `omie_config` (deve existir com campos `api_key`, `app_key`, `is_active`)
   - ✅ `sync_logs` (deve existir)
5. Ativar o workflow

**Execução:**
- Cron: A cada 15 minutos (`*/15 * * * *`)
- Retry: 3 tentativas com 5 segundos de intervalo

---

#### Workflow 4: ERP Sync - F360 Intelligent
**Arquivo:** `/Users/alceualvespasssosmac/dashfinance/finance-oraculo-backend/n8n-workflows/erp-sync-f360-intelligent.json`

**Importação:**
1. **Import from File** → Selecione: `erp-sync-f360-intelligent.json`
2. **IMPORTANTE:** Verificar credenciais:
   - ✅ PostgreSQL: "Supabase PostgreSQL Finance" (ID: `eWdwRJii0F6jKHdU`)
3. **Importante:** Verificar query no nó "PostgreSQL - Empresas com F360 Ativo"
   - Query usa tabelas: `clients`, `f360_config`
   - Se `clients` não existe, trocar por `clientes`
4. **Pré-requisito:** Tabelas necessárias:
   - ✅ `f360_accounts` (deve existir)
   - ✅ `f360_config` (deve existir com campos `api_key`, `is_active`)
   - ✅ `sync_logs` (deve existir)
5. Ativar o workflow

**Execução:**
- Cron: A cada 15 minutos (`*/15 * * * *`)
- Retry: 3 tentativas com 5 segundos de intervalo

---

## ⚠️ IMPORTANTE: Verificar Nome da Tabela de Clientes

Os workflows usam a tabela `clients`, mas o nome real pode ser `clientes`. Antes de ativar os workflows, verifique:

```sql
-- No PostgreSQL, executar:
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('clients', 'clientes');
```

**Se retornar `clientes`:** Editar as queries nos workflows:
- Dashboard Cards: linha 24 do JSON
- ERP Sync OMIE: linha 24 do JSON
- ERP Sync F360: linha 24 do JSON

Trocar `FROM clients c` por `FROM clientes c`.

---

## 🧪 Testes Após Importação

### 1. Dashboard Cards (Teste Imediato)
```sql
-- Executar o workflow manualmente (botão "Execute Workflow")
-- Aguardar 1-2 minutos
-- Verificar se os cards foram criados:
SELECT card_type, calculated_at, expires_at
FROM dashboard_cards
WHERE company_cnpj = '[seu_cnpj]'
ORDER BY card_type;

-- Deve retornar 12 cards:
-- burn_rate, despesas_mes, disponivel, dpo, dso,
-- faturas_vencidas, grafico_tendencia, margem,
-- receitas_mes, runway, top_despesas, total_caixa
```

### 2. WhatsApp Bot v3 (Teste com Webhook)
```bash
# Testar webhook diretamente:
curl -X POST "https://n8n.angrax.com.br/webhook/whatsapp-bot-v3" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "message": {
        "conversation": "qual meu saldo?"
      },
      "key": {
        "remoteJid": "5511999999999@s.whatsapp.net"
      }
    },
    "cnpj": "[seu_cnpj]"
  }'
```

**Esperado:**
- Resposta em < 1 segundo
- Custo: $0 (sem uso de LLM)
- Verificar no PostgreSQL: `SELECT * FROM conversation_context ORDER BY created_at DESC LIMIT 5;`

### 3. ERP Sync OMIE (Aguardar 15 minutos)
```sql
-- Após 15 minutos da ativação:
SELECT
  provider,
  company_cnpj,
  records_synced,
  status,
  message,
  synced_at
FROM sync_logs
WHERE provider = 'OMIE'
ORDER BY synced_at DESC
LIMIT 10;
```

### 4. ERP Sync F360 (Aguardar 15 minutos)
```sql
-- Após 15 minutos da ativação:
SELECT
  provider,
  company_cnpj,
  records_synced,
  status,
  message,
  synced_at
FROM sync_logs
WHERE provider = 'F360'
ORDER BY synced_at DESC
LIMIT 10;
```

---

## 📊 Monitoramento de Custos

Após 24 horas de execução, validar economia:

```sql
-- Custo do WhatsApp Bot (deve ser ~$0)
SELECT
  COUNT(*) as total_mensagens,
  SUM(CASE WHEN model_used = 'direct_sql' THEN 1 ELSE 0 END) as sem_llm,
  SUM(CASE WHEN model_used != 'direct_sql' THEN 1 ELSE 0 END) as com_llm,
  AVG(CASE WHEN model_used = 'direct_sql' THEN llm_cost_usd ELSE NULL END) as custo_medio_sem_llm,
  SUM(llm_cost_usd) as custo_total
FROM conversation_context
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Deve mostrar:
-- total_mensagens: 100-200
-- sem_llm: 80-160 (80%)
-- com_llm: 20-40 (20%)
-- custo_medio_sem_llm: 0.00
-- custo_total: < $1.00
```

**Economia esperada (Phase 1):**
- WhatsApp Bot: $43.50/mês (97% de redução)
- Dashboard Cards: $15/mês (100% de redução)
- ERP Sync OMIE: $5/mês (100% de redução)
- ERP Sync F360: $5/mês (100% de redução)
- **Total:** $68.50/mês economizados

---

## 🔧 Troubleshooting

### Erro: "Table 'clients' does not exist"
**Solução:** Trocar `clients` por `clientes` nas queries dos workflows.

### Erro: "Column does not exist in omie_config"
**Solução:** Verificar estrutura da tabela:
```sql
\d omie_config
```
Ajustar query para os nomes de colunas corretos.

### Workflow não executa automaticamente
**Solução:**
1. Verificar se o workflow está **ativo** (toggle verde no topo)
2. Verificar logs de execução: **Executions** → Filtrar por workflow
3. Se houver erros, clicar no erro para ver detalhes

### Dashboard Cards não aparecem no frontend
**Solução:**
1. Verificar se os cards foram criados: `SELECT COUNT(*) FROM dashboard_cards;`
2. Verificar se não expiraram: `SELECT * FROM v_dashboard_cards_valid;`
3. Se vazio, executar workflow manualmente: botão "Execute Workflow"

---

## 📝 Próximos Passos (Após Importação)

1. ✅ Importar os 4 workflows via UI do N8N
2. ✅ Ativar todos os workflows
3. ⏳ Aguardar primeira execução (0-15 minutos dependendo do workflow)
4. ✅ Executar testes SQL acima
5. ✅ Validar economia de custos após 24h
6. 📊 Criar dashboard de monitoramento (opcional)
7. 🚀 Iniciar Phase 2 (Admin Dashboard API, Reports Generator, Excel Generator)

---

## 🆘 Precisa de Ajuda?

Se encontrar problemas:
1. Verificar logs de execução no N8N (**Executions**)
2. Verificar logs do PostgreSQL (se houver erros de query)
3. Verificar se todas as credenciais estão configuradas
4. Me avisar qual workflow/erro específico para que eu possa ajudar a debugar
