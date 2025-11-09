# ✅ Guia de Ativação Manual - Workflows N8N

**Data:** 2025-11-06
**Status:** Pronto para ativação manual

---

## 📊 Resumo dos Workflows Importados

Todos os 4 workflows da Phase 1 foram **importados com sucesso** via API:

| # | Workflow | ID N8N | Status Import | Nodes | Economia/Mês |
|---|----------|--------|---------------|-------|--------------|
| 1 | WhatsApp Bot v3 - Ultra Otimizado | `im1AEcSXG6tqPJtj` | ✅ Importado | 19 | $43.50 |
| 2 | Dashboard Cards Pre-Processor | `pr1gms7avsjcmqd1` | ✅ Importado | 7 | $15.00 |
| 3 | ERP Sync - OMIE Intelligent | `OZODoO73LbcKJKHU` | ✅ Importado | 13 | $5.00 |
| 4 | ERP Sync - F360 Intelligent | `08O0Cx6ixhdN7JXD` | ✅ Importado | 13 | $5.00 |

**Total Economia Esperada:** $68.50/mês (98% de redução)

---

## ⚠️ Por que Ativação Manual?

A N8N API pública **não permite ativar workflows programaticamente**:
- Endpoint `PATCH /workflows/{id}/activate` → Retorna: "PATCH method not allowed"
- Endpoint `PUT /workflows/{id}` com `active: true` → Retorna: "active is read-only"

**Solução:** Ativação deve ser feita manualmente via interface web (leva ~2 minutos).

---

## 🚀 Passo a Passo para Ativação

### 1. Acessar N8N

```
URL: https://n8n.angrax.com.br
Login: [suas credenciais]
```

### 2. Ativar os 4 Workflows

**Para cada workflow abaixo:**

#### Workflow 1: WhatsApp Bot v3 - Ultra Otimizado (80% sem LLM)
1. Procurar por: **"WhatsApp Bot v3 - Ultra Otimizado (80% sem LLM)"**
2. Clicar no workflow para abrir
3. No topo da tela, clicar no toggle **"Active"** (deve ficar **verde**)
4. Confirmar ativação (se solicitado)
5. **Verificar:** O toggle deve estar verde e exibir "Active"

**Webhook gerado:**
```
POST https://n8n.angrax.com.br/webhook/whatsapp-bot-v3
```

---

#### Workflow 2: Dashboard Cards Pre-Processor
1. Procurar por: **"Dashboard Cards Pre-Processor"**
2. Clicar no workflow para abrir
3. No topo da tela, clicar no toggle **"Active"** (deve ficar **verde**)
4. Confirmar ativação (se solicitado)
5. **Verificar:** O toggle deve estar verde e exibir "Active"

**Execução:**
- Cron: A cada 5 minutos (`*/5 * * * *`)
- Primeira execução: Aguardar até 5 minutos OU executar manualmente

---

#### Workflow 3: ERP Sync - OMIE Intelligent
1. Procurar por: **"ERP Sync - OMIE Intelligent"**
2. Clicar no workflow para abrir
3. No topo da tela, clicar no toggle **"Active"** (deve ficar **verde**)
4. Confirmar ativação (se solicitado)
5. **Verificar:** O toggle deve estar verde e exibir "Active"

**Execução:**
- Cron: A cada 15 minutos (`*/15 * * * *`)
- Primeira execução: Aguardar até 15 minutos OU executar manualmente

---

#### Workflow 4: ERP Sync - F360 Intelligent
1. Procurar por: **"ERP Sync - F360 Intelligent"**
2. Clicar no workflow para abrir
3. No topo da tela, clicar no toggle **"Active"** (deve ficar **verde**)
4. Confirmar ativação (se solicitado)
5. **Verificar:** O toggle deve estar verde e exibir "Active"

**Execução:**
- Cron: A cada 15 minutos (`*/15 * * * *`)
- Primeira execução: Aguardar até 15 minutos OU executar manualmente

---

## 🧪 Testes Após Ativação

### Teste 1: Dashboard Cards (Execução Manual)

**No N8N:**
1. Abrir workflow: **"Dashboard Cards Pre-Processor"**
2. Clicar no botão **"Execute Workflow"** (ícone de play no topo)
3. Aguardar 1-2 minutos
4. Verificar logs: deve aparecer **verde** se sucesso

**No PostgreSQL:**
```bash
PGPASSWORD='B5b0dcf500@#' /opt/homebrew/opt/postgresql@15/bin/psql \
  -h db.xzrmzmcoslomtzkzgskn.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -c "SELECT card_type, calculated_at, expires_at, card_data->>'label' as label, card_data->>'formatted' as valor FROM dashboard_cards WHERE company_cnpj = '[seu_cnpj]' ORDER BY card_type;"
```

**Esperado:** 12 cards criados:
- burn_rate, despesas_mes, disponivel, dpo, dso
- faturas_vencidas, grafico_tendencia, margem
- receitas_mes, runway, top_despesas, total_caixa

---

### Teste 2: ERP Sync OMIE (Execução Manual)

**No N8N:**
1. Abrir workflow: **"ERP Sync - OMIE Intelligent"**
2. Clicar no botão **"Execute Workflow"**
3. Aguardar 1-2 minutos (pode demorar se houver muitas faturas)
4. Verificar logs

**No PostgreSQL:**
```bash
PGPASSWORD='B5b0dcf500@#' /opt/homebrew/opt/postgresql@15/bin/psql \
  -h db.xzrmzmcoslomtzkzgskn.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -c "SELECT provider, company_cnpj, records_synced, status, message, synced_at FROM sync_logs WHERE provider = 'OMIE' ORDER BY synced_at DESC LIMIT 10;"
```

**Esperado:** Logs de sincronização com status "success"

---

### Teste 3: ERP Sync F360 (Execução Manual)

**No N8N:**
1. Abrir workflow: **"ERP Sync - F360 Intelligent"**
2. Clicar no botão **"Execute Workflow"**
3. Aguardar 1-2 minutos
4. Verificar logs

**No PostgreSQL:**
```bash
PGPASSWORD='B5b0dcf500@#' /opt/homebrew/opt/postgresql@15/bin/psql \
  -h db.xzrmzmcoslomtzkzgskn.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -c "SELECT provider, company_cnpj, records_synced, status, message, synced_at FROM sync_logs WHERE provider = 'F360' ORDER BY synced_at DESC LIMIT 10;"
```

**Esperado:** Logs de sincronização com status "success"

---

### Teste 4: WhatsApp Bot v3 (Webhook)

**Teste via curl:**
```bash
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
- Custo: $0 (query simples, sem uso de LLM)

**No PostgreSQL:**
```bash
PGPASSWORD='B5b0dcf500@#' /opt/homebrew/opt/postgresql@15/bin/psql \
  -h db.xzrmzmcoslomtzkzgskn.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -c "SELECT * FROM conversation_context ORDER BY created_at DESC LIMIT 5;"
```

---

## ✅ Checklist de Ativação e Testes

Marcar conforme concluir:

### Ativação
- [ ] Acessar N8N: https://n8n.angrax.com.br
- [ ] Ativar: **WhatsApp Bot v3** (toggle verde)
- [ ] Ativar: **Dashboard Cards Pre-Processor** (toggle verde)
- [ ] Ativar: **ERP Sync - OMIE Intelligent** (toggle verde)
- [ ] Ativar: **ERP Sync - F360 Intelligent** (toggle verde)

### Testes Manuais
- [ ] Testar: Dashboard Cards (executar + validar SQL)
- [ ] Testar: ERP Sync OMIE (executar + validar SQL)
- [ ] Testar: ERP Sync F360 (executar + validar SQL)
- [ ] Testar: WhatsApp Bot v3 (curl + validar SQL)

### Validação
- [ ] Dashboard Cards: Verificar 12 cards criados no PostgreSQL
- [ ] ERP Sync OMIE: Verificar sync logs
- [ ] ERP Sync F360: Verificar sync logs
- [ ] WhatsApp Bot: Verificar conversation_context

### Monitoramento
- [ ] Aguardar 1 hora e verificar execuções automáticas
- [ ] Verificar logs de erro no N8N (Executions → Filter by failed)
- [ ] Após 24h: Validar economia de custos

---

## 📊 Validação de Economia (Após 24h)

Execute após 24 horas de workflows ativos:

```sql
-- Custo do WhatsApp Bot (deve ser ~$0 para 80% das queries)
SELECT
  COUNT(*) as total_mensagens,
  SUM(CASE WHEN model_used = 'direct_sql' THEN 1 ELSE 0 END) as sem_llm,
  SUM(CASE WHEN model_used != 'direct_sql' THEN 1 ELSE 0 END) as com_llm,
  ROUND(AVG(CASE WHEN model_used = 'direct_sql' THEN llm_cost_usd ELSE NULL END)::numeric, 4) as custo_medio_sem_llm,
  ROUND(SUM(llm_cost_usd)::numeric, 2) as custo_total
FROM conversation_context
WHERE created_at > NOW() - INTERVAL '24 hours';
```

**Esperado:**
- `total_mensagens`: 100-200
- `sem_llm`: 80-160 (80%)
- `com_llm`: 20-40 (20%)
- `custo_medio_sem_llm`: 0.00
- `custo_total`: < $1.00

---

## 🔧 Troubleshooting

### Workflow não executa automaticamente
1. Verificar se está **ativo** (toggle verde)
2. Ver logs: N8N → **Executions** → Filtrar por workflow
3. Se houver erros, clicar no erro para detalhes

### Dashboard Cards não aparecem
1. Verificar: `SELECT COUNT(*) FROM dashboard_cards;`
2. Verificar: `SELECT * FROM v_dashboard_cards_valid;`
3. Se vazio, executar workflow manualmente

### ERP Sync sem dados
1. Verificar credenciais: N8N → Credentials → "Supabase PostgreSQL Finance"
2. Verificar tabelas necessárias:
   - `omie_config`, `omie_invoices`, `sync_logs` (OMIE)
   - `f360_config`, `f360_accounts`, `sync_logs` (F360)
3. Executar workflow manualmente e verificar logs de erro

### WhatsApp Bot não responde
1. Verificar webhook: `POST https://n8n.angrax.com.br/webhook/whatsapp-bot-v3`
2. Verificar credenciais Evolution API
3. Verificar variável de ambiente: `EVO_API_URL`
4. Testar com curl (comando acima)

---

## 🎯 Após Validação (24-48h)

Quando Phase 1 estiver estável sem erros:

**Phase 2 (próximos workflows):**
- Admin Dashboard API
- Reports Generator
- Excel Generator

**Economia Phase 2:** $27-34.50/mês

**Phase 3:**
- Cron jobs otimizados
- Cache multi-layer
- Query optimization

**Economia Phase 3:** $20/mês

**Total Economia Completa:** $115.50-123/mês (85% de redução)

---

**Status:** ✅ Workflows importados e prontos para ativação manual
**Tempo estimado:** 2-5 minutos para ativar todos
**Documentação completa:** [STATUS_IMPORTACAO_N8N.md](STATUS_IMPORTACAO_N8N.md)
