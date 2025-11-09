# ✅ Status da Importação N8N - Phase 1

**Data:** 2025-11-06
**Status:** CONCLUÍDO

---

## 🎉 Workflows Importados com Sucesso

| # | Workflow | ID N8N | Status | Nodes |
|---|----------|--------|--------|-------|
| 1 | WhatsApp Bot v3 - Ultra Otimizado (80% sem LLM) | `im1AEcSXG6tqPJtj` | ✅ Importado | 19 |
| 2 | Dashboard Cards Pre-Processor | `pr1gms7avsjcmqd1` | ✅ Importado | 7 |
| 3 | ERP Sync - OMIE Intelligent | `OZODoO73LbcKJKHU` | ✅ Importado | 13 |
| 4 | ERP Sync - F360 Intelligent | `08O0Cx6ixhdN7JXD` | ✅ Importado | 13 |

**Total:** 4 workflows | 52 nodes

---

## ⚠️ IMPORTANTE: Verificações Necessárias Antes de Ativar

### 1. Verificar Nome da Tabela `clients` vs `clientes`

Os workflows referenciam a tabela `clients`, mas ela pode se chamar `clientes`. Execute este comando no PostgreSQL:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('clients', 'clientes');
```

**Se retornar `clientes`:** Editar os seguintes workflows no N8N:

#### Workflow: Dashboard Cards Pre-Processor (ID: pr1gms7avsjcmqd1)
- Nó: "PostgreSQL - Buscar Empresas Ativas"
- Trocar: `SELECT cnpj, name, status FROM clients WHERE ...`
- Para: `SELECT cnpj, name, status FROM clientes WHERE ...`

#### Workflow: ERP Sync - OMIE Intelligent (ID: OZODoO73LbcKJKHU)
- Nó: "PostgreSQL - Empresas com OMIE Ativo"
- Trocar: `SELECT c.cnpj, c.name, oc.api_key, oc.app_key FROM clients c JOIN ...`
- Para: `SELECT c.cnpj, c.name, oc.api_key, oc.app_key FROM clientes c JOIN ...`

#### Workflow: ERP Sync - F360 Intelligent (ID: 08O0Cx6ixhdN7JXD)
- Nó: "PostgreSQL - Empresas com F360 Ativo"
- Trocar: `SELECT c.cnpj, c.name, fc.api_key FROM clients c JOIN ...`
- Para: `SELECT c.cnpj, c.name, fc.api_key FROM clientes c JOIN ...`

---

### 2. Verificar Tabelas Necessárias

Execute no PostgreSQL para confirmar que todas as tabelas existem:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'dashboard_cards',     -- ✅ Migration 007 (já executada)
  'omie_invoices',       -- ⚠️ Verificar
  'omie_config',         -- ⚠️ Verificar
  'f360_accounts',       -- ⚠️ Verificar
  'f360_config',         -- ⚠️ Verificar
  'sync_logs',           -- ⚠️ Verificar
  'daily_snapshots',     -- ⚠️ Verificar
  'v_kpi_monthly_enriched', -- ⚠️ Verificar (view)
  'transactions',        -- ⚠️ Verificar
  'conversations',       -- ⚠️ Verificar (WhatsApp Bot)
  'conversation_context' -- ⚠️ Verificar (WhatsApp Bot)
)
ORDER BY table_name;
```

**Se alguma tabela não existir:** Será necessário criar as migrations correspondentes antes de ativar os workflows.

---

### 3. Verificar Credenciais no N8N

Todos os workflows referenciam estas credenciais. Confirme que existem:

1. **PostgreSQL:**
   - Nome: "Supabase PostgreSQL Finance"
   - ID: `eWdwRJii0F6jKHdU`
   - Status: ✅ Configurado (verificado anteriormente)

2. **Evolution API (WhatsApp):**
   - Nome: "Evolution API Key"
   - ID: `OeWaimPjLFpTWr64`
   - Status: ✅ Configurado (verificado anteriormente)

3. **Variável de Ambiente:**
   - Nome: `EVO_API_URL`
   - Valor esperado: URL da Evolution API (ex: https://evolution-api.seu-dominio.com)
   - Onde configurar: N8N → Settings → Environment Variables

---

## ⚠️ Importante: N8N API Limitações

**Descoberta:** A N8N API pública não permite ativar workflows programaticamente via API. Os seguintes endpoints foram testados:
- `PATCH /workflows/{id}/activate` - Retorna: "PATCH method not allowed"
- `PUT /workflows/{id}` com `active: true` - Retorna: "active is read-only"

**Conclusão:** Ativação deve ser feita manualmente via interface do N8N.

## 🚀 Próximos Passos (Em Ordem)

### Passo 1: ✅ Verificar Tabelas - CONCLUÍDO
```bash
# Verificado: Ambas as tabelas existem (clients e clientes)
# Nenhuma modificação nos workflows necessária
```

### Passo 2: ✅ Credencial PostgreSQL Configurada - CONCLUÍDO
```bash
# Configuração aplicada:
Host: db.xzrmzmcoslomtzkzgskn.supabase.co
SSL: Allow
Ignore SSL Issues: ON ✅ (necessário para Supabase)
```

### Passo 3: ⚠️ Ajustar Queries nos Workflows (OBRIGATÓRIO)

**Problema:** Workflows usam tabela/view `clients` mas o correto é `clientes`, e status deve ser `'Ativo'` (com A maiúsculo).

**Solução:** Trocar tabela para `clientes` e status para `'Ativo'` nos 3 workflows abaixo:

**Valores de status disponíveis:** 'Ativo', 'Inativo', 'Stand By', 'Onboarding', 'Transição', 'Aviso', 'Não Implantado'

---

#### Workflow 1: Dashboard Cards Pre-Processor (ID: pr1gms7avsjcmqd1)

**Nó a editar:** "PostgreSQL - Buscar Empresas Ativas"

**Query ATUAL (ERRO):**
```sql
SELECT cnpj, name, status FROM clients WHERE status = 'active' ORDER BY name;
```

**Query CORRIGIDA:**
```sql
SELECT cnpj, razao_social as name, status FROM clientes WHERE status = 'Ativo' ORDER BY razao_social LIMIT 10;
```

---

#### Workflow 2: ERP Sync - OMIE Intelligent (ID: OZODoO73LbcKJKHU)

**Nó a editar:** "PostgreSQL - Empresas com OMIE Ativo"

**Query ATUAL (ERRO):**
```sql
SELECT c.cnpj, c.name, oc.api_key, oc.app_key FROM clients c JOIN omie_config oc ON oc.company_cnpj = c.cnpj WHERE c.status = 'active' AND oc.is_active = true ORDER BY c.name;
```

**Query CORRIGIDA:**
```sql
SELECT c.cnpj, c.razao_social as name, oc.api_key, oc.app_key FROM clientes c JOIN omie_config oc ON oc.company_cnpj = c.cnpj WHERE c.status = 'Ativo' AND oc.is_active = true ORDER BY c.razao_social;
```

---

#### Workflow 3: ERP Sync - F360 Intelligent (ID: 08O0Cx6ixhdN7JXD)

**Nó a editar:** "PostgreSQL - Empresas com F360 Ativo"

**Query ATUAL (ERRO):**
```sql
SELECT c.cnpj, c.name, fc.api_key FROM clientes c JOIN f360_config fc ON fc.company_cnpj = c.cnpj WHERE c.status = 'active' AND fc.is_active = true ORDER BY c.name;
```

**Query CORRIGIDA:**
```sql
SELECT c.cnpj, c.razao_social as name, fc.api_key FROM clientes c JOIN f360_config fc ON fc.company_cnpj = c.cnpj WHERE c.status = 'Ativo' AND fc.is_active = true ORDER BY c.razao_social;
```

---

**Como Editar no N8N:**
1. Abrir o workflow
2. Clicar no nó PostgreSQL mencionado
3. Editar a query no campo "Query"
4. Clicar em "Save" (botão laranja)
5. Ativar o workflow (toggle verde)

---

### Passo 4: Acessar N8N e Ativar Workflows Manualmente
```
URL: https://n8n.angrax.com.br
Login: [suas credenciais]
4. Salvar cada workflow após edição
```

### Passo 3: Ativar Workflows no N8N
```
Para cada workflow:
1. Abrir workflow no N8N
2. Clicar no toggle "Active" no topo (deve ficar verde)
3. Confirmar ativação
```

**Ordem recomendada de ativação:**
1. ✅ Dashboard Cards Pre-Processor (executará a cada 5 min)
2. ✅ ERP Sync - OMIE Intelligent (executará a cada 15 min)
3. ✅ ERP Sync - F360 Intelligent (executará a cada 15 min)
4. ✅ WhatsApp Bot v3 (webhook - ativo imediatamente)

### Passo 4: Testar Execução Manual
```
Dashboard Cards:
1. Abrir workflow no N8N
2. Clicar em "Execute Workflow" (botão de play)
3. Aguardar execução completar
4. Verificar logs: deve aparecer verde se sucesso

ERP Sync OMIE:
1. Abrir workflow no N8N
2. Clicar em "Execute Workflow"
3. Aguardar execução (pode levar 1-2 minutos)
4. Verificar logs

ERP Sync F360:
1. Abrir workflow no N8N
2. Clicar em "Execute Workflow"
3. Aguardar execução (pode levar 1-2 minutos)
4. Verificar logs

WhatsApp Bot v3:
1. Testar via curl (ver comando abaixo)
```

### Passo 5: Validar no PostgreSQL

#### Validar Dashboard Cards:
```sql
-- Verificar se cards foram criados
SELECT
  card_type,
  calculated_at,
  expires_at,
  card_data->>'label' as label,
  card_data->>'formatted' as valor
FROM dashboard_cards
WHERE company_cnpj = '[seu_cnpj]'
ORDER BY card_type;

-- Deve retornar 12 cards:
-- burn_rate, despesas_mes, disponivel, dpo, dso,
-- faturas_vencidas, grafico_tendencia, margem,
-- receitas_mes, runway, top_despesas, total_caixa
```

#### Validar ERP Sync:
```sql
-- Verificar logs de sincronização
SELECT
  sync_type,
  provider,
  company_cnpj,
  records_synced,
  status,
  message,
  synced_at
FROM sync_logs
WHERE synced_at > NOW() - INTERVAL '1 hour'
ORDER BY synced_at DESC
LIMIT 20;
```

#### Validar WhatsApp Bot:
```bash
# Testar webhook
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

---

## 📊 Economia Esperada (Phase 1)

| Workflow | Custo Antes | Custo Depois | Economia/Mês |
|----------|-------------|--------------|--------------|
| WhatsApp Bot v3 | $45/mês | $1.50/mês | $43.50 |
| Dashboard Cards | $15/mês | $0/mês | $15.00 |
| ERP Sync OMIE | $5/mês | $0/mês | $5.00 |
| ERP Sync F360 | $5/mês | $0/mês | $5.00 |
| **TOTAL** | **$70/mês** | **$1.50/mês** | **$68.50/mês** |

**Redução:** 98% dos custos da Phase 1

---

## 🔧 Troubleshooting

### Erro: "Table 'clients' does not exist"
**Solução:** Editar workflows conforme Passo 2 acima (trocar `clients` por `clientes`)

### Erro: "Column does not exist in omie_config"
**Solução:** Verificar estrutura da tabela:
```sql
\d omie_config
\d f360_config
```
Ajustar queries nos workflows para os nomes corretos das colunas.

### Workflow não executa automaticamente
**Solução:**
1. Verificar se está **ativo** (toggle verde)
2. Ver logs: N8N → Executions → Filtrar por workflow
3. Se houver erros, clicar no erro para detalhes

### Dashboard Cards não aparecem no frontend
**Solução:**
1. Verificar: `SELECT COUNT(*) FROM dashboard_cards;`
2. Verificar: `SELECT * FROM v_dashboard_cards_valid;`
3. Se vazio, executar workflow manualmente

---

## 📝 Checklist de Validação

Marque conforme concluir:

- [ ] Verificar se tabela se chama `clients` ou `clientes`
- [ ] Editar workflows (se necessário)
- [ ] Ativar workflow: Dashboard Cards Pre-Processor
- [ ] Ativar workflow: ERP Sync OMIE
- [ ] Ativar workflow: ERP Sync F360
- [ ] Ativar workflow: WhatsApp Bot v3
- [ ] Testar Dashboard Cards (execução manual)
- [ ] Testar ERP Sync OMIE (execução manual)
- [ ] Testar ERP Sync F360 (execução manual)
- [ ] Testar WhatsApp Bot (webhook curl)
- [ ] Validar cards no PostgreSQL
- [ ] Validar sync logs no PostgreSQL
- [ ] Aguardar 24h e validar economia de custos
- [ ] Monitorar logs de erro (primeiras 48h)

---

## 🎯 Após Validação (Próximas Fases)

Quando Phase 1 estiver estável (24-48h sem erros):

**Phase 2:**
- Admin Dashboard API
- Reports Generator
- Excel Generator
- MCP Hub (opcional, se custo >$5/mês)

**Economia Phase 2:** $27-34.50/mês

**Phase 3:**
- Cron jobs otimizados
- Cache multi-layer
- Query optimization
- SSE real-time

**Economia Phase 3:** $20/mês

**Total Economia Completa:** $115.50-123/mês (85% de redução)

---

**Status:** ✅ Importação Concluída
**Próximo:** Validar tabelas e ativar workflows
**Documentação:** [IMPORTAR_WORKFLOWS_N8N.md](IMPORTAR_WORKFLOWS_N8N.md)
