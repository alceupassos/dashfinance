# Plano de Melhorias N8N - Detalhado

## Objetivo
Otimizar workflows existentes, criar novos fluxos automáticos e implementar testes abrangentes.

---

## FASE 1: Auditoria e Diagnóstico

### 1.1 Workflows Atuais Identificados

| # | Workflow | Trigger | Ações Principais | Status | Issues |
|---|----------|---------|-----------------|--------|--------|
| 1 | Daily 8AM Trigger | Schedule (daily 8am) | Calcula snapshot, envia msg | ✅ | - |
| 2 | Weekly Monday 8AM | Schedule (weekly Mon) | Gera relatório semanal | ✅ | - |
| 3 | Monthly D+2 8AM | Schedule (monthly d+2) | Relatório mensal | ✅ | - |
| 4 | Hourly Snapshot | Schedule (hourly) | Atualiza snapshot | ✅ | - |
| 5 | WhatsApp Incoming Webhook | Webhook POST | Processa msg, llm, salva | ✅ | **N/A** retry logic |
| 6 | Send Scheduled Messages | Trigger (manual ou cron) | Envia fila de msgs | ✅ | **N/A** rate limit |

### 1.2 Limitações Identificadas
- [ ] Sem retry automático em falhas
- [ ] Sem rate limiting (risco de throttle)
- [ ] Sem logging estruturado
- [ ] Sem alertas de falha
- [ ] Sem tratamento de edge cases (timeout, API down)
- [ ] Bot WhatsApp não chama análise de sentimento automaticamente
- [ ] Sem indexação automática no RAG

### 1.3 Dependências de Dados
- WhatsApp bot depende de: `integration_configs` (Anthropic key)
- Billing depende de: `yampi_config`, `llm_token_usage`
- Análise de sentimento depende de: mensagens do WhatsApp indexadas
- RAG depende de: embeddings gerados

---

## FASE 2: Otimizações dos Workflows Existentes

### 2.1 Workflow: WhatsApp Incoming Messages
**Arquivo:** `whatsapp-finance-bot.json` (nó webhook-incoming)
**Melhorias:**

```json
ANTES:
{
  "name": "WhatsApp Incoming Webhook",
  "type": "webhook",
  "method": "POST",
  "responseMode": "responseNode"
}

DEPOIS:
{
  "name": "WhatsApp Incoming Webhook",
  "type": "webhook",
  "method": "POST",
  "responseMode": "responseNode",
  "retries": {
    "maxAttempts": 3,
    "delayMs": 1000,
    "exponentialBackoff": true
  },
  "rateLimit": {
    "maxPerMinute": 100,
    "queue": true
  },
  "logging": {
    "level": "info",
    "includePayload": true
  }
}
```

**Ações:**
- [ ] Adicionar nó de error handling (retry com exponential backoff)
- [ ] Adicionar nó de rate limiting (redis ou memory)
- [ ] Adicionar nó de logging (salva em tabela `n8n_execution_logs`)
- [ ] Adicionar validação de payload (schema validation)

### 2.2 Workflow: Send Scheduled Messages
**Melhorias:**

- [ ] Adicionar circuit breaker (se Evolution API falhar 3x, pausar por 5m)
- [ ] Adicionar monitoring (Slack alert se mais de 10% de falhas)
- [ ] Adicionar deduplicação (não enviar msg duplicada em < 1 min)
- [ ] Adicionar timeout (60s default)

### 2.3 Workflow: Daily/Weekly/Monthly Triggers
**Melhorias:**

- [ ] Adicionar validação de dados antes de gerar snapshot
- [ ] Adicionar fallback se ERP não responde (usar dados em cache)
- [ ] Adicionar alertas se snapshot fails

---

## FASE 3: Novos Workflows Críticos

### 3.1 Workflow: WhatsApp Message → Sentiment Analysis → RAG Indexing
**Nome:** `whatsapp-sentiment-analysis-rag`
**Trigger:** Webhook (quando mensagem WhatsApp é salva)
**Fluxo:**

```
1. Webhook: mensagem recebida
   ↓
2. Log: registra entrada
   ↓
3. Validate: verifica se msg válida (não vazia, etc)
   ↓
4. Call: Edge Function analyze-whatsapp-sentiment
   └─ Descriptografa API key Anthropic
   └─ Chama Claude para análise
   └─ Salva resultado em whatsapp_sentiment_analysis
   ↓
5. Call: Edge Function index-whatsapp-to-rag
   └─ Busca embeddings (OpenAI ou Anthropic)
   └─ Indexa em rag_conversations
   └─ Atualiza mood_index
   ↓
6. Conditions:
   ├─ IF sentiment = very_negative
   │  └─ Alert: Slack + email admin
   ├─ IF urgency = critical
   │  └─ Trigger: notify customer service
   └─ ELSE
      └─ Success log
```

**Nós:**
- [ ] Webhook (input)
- [ ] Validate (check payload)
- [ ] Call analyze-whatsapp-sentiment (Edge Function)
- [ ] Call index-whatsapp-to-rag (Edge Function)
- [ ] Switch (IF sentiment/urgency)
- [ ] HTTP (Slack alert)
- [ ] Email (notify admin)
- [ ] Log (success)

**Configurações:**
- Retries: 3 com exponential backoff
- Rate limit: 1000/hora (por cliente)
- Timeout: 30s

---

### 3.2 Workflow: Usage Metrics Collection & Reporting
**Nome:** `usage-metrics-collection`
**Trigger:** Schedule (a cada 30 minutos)
**Fluxo:**

```
1. Schedule: 30min interval
   ↓
2. SQL: Busca user_system_usage (last 30min)
   ├─ SELECT COUNT(*) api_calls
   ├─ SELECT COUNT(*) llm_interactions
   ├─ SELECT SUM(cost) llm_cost
   └─ GROUP BY company_cnpj
   ↓
3. Conditions:
   ├─ IF llm_cost > daily_limit
   │  └─ Alert: customer + Slack
   ├─ IF api_calls > threshold
   │  └─ Log: potencial abuse
   └─ ELSE
      └─ Store in metrics table
   ↓
4. Aggregation: Daily summary
   └─ Salva em whatsapp_mood_index_timeline
   ↓
5. Export: Dashboard data
```

**Nós:**
- [ ] Schedule trigger (30min)
- [ ] Query DB (user_system_usage)
- [ ] Transform (aggretgate)
- [ ] Conditions (thresholds)
- [ ] HTTP alerts (Slack)
- [ ] Update DB (metrics)

**Configurações:**
- Timeout: 60s
- Concurrency: 1 (serial)

---

### 3.3 Workflow: Security Monitoring & Alerts
**Nome:** `security-monitoring-daily`
**Trigger:** Schedule (daily 6AM)
**Fluxo:**

```
1. Schedule: daily 6AM
   ↓
2. Run npm audit (via Edge Function)
   ├─ Check vulnerabilities
   ├─ Generate report
   ↓
3. Check integration_configs
   ├─ Valida que nenhuma chave está exposta
   ├─ Verifica expiração de tokens (OAuth)
   ↓
4. Analyze access logs
   ├─ Check failed login attempts
   ├─ Check unusual IP access
   ↓
5. Conditions:
   ├─ IF critical vulnerability
   │  └─ Alert: email admin + Slack + SMS
   ├─ IF token expiring in 7 days
   │  └─ Remind: email admin
   └─ IF failed logins > 5
      └─ Alert: potential attack
   ↓
6. Report: Dashboard data
```

**Nós:**
- [ ] Schedule trigger (6AM)
- [ ] Call npm-audit Edge Function
- [ ] Query security_monitoring table
- [ ] HTTP alerts (Slack, email)
- [ ] Update dashboard

---

### 3.4 Workflow: Billing Automation - LLM Usage → Yampi Invoice
**Nome:** `billing-llm-to-yampi`
**Trigger:** Schedule (daily 11PM) ou Manual
**Fluxo:**

```
1. Schedule: daily 11PM
   ↓
2. SQL: Busca LLM usage por cliente (últimas 24h)
   ├─ SELECT company_cnpj, SUM(cost_usd), COUNT(*)
   ├─ FROM llm_token_usage
   └─ GROUP BY company_cnpj
   ↓
3. Loop por cliente:
   ├─ IF cost > monthly_limit
   │  ├─ Calculate excess
   │  ├─ Apply billing plan (markup 3.5x)
   │  └─ Create invoice item
   ↓
4. Call: Edge Function yampi-create-invoice
   ├─ Descriptografa Yampi key
   ├─ Cria order no Yampi
   ├─ Salva em yampi_invoices table
   ↓
5. Notify:
   ├─ Email customer
   ├─ Alert: admin se invoice > $1000
   ↓
6. Log: success
```

**Nós:**
- [ ] Schedule (11PM)
- [ ] Query DB (llm_token_usage)
- [ ] Loop (foreach client)
- [ ] Call yampi-create-invoice
- [ ] Email notification
- [ ] HTTP alerts
- [ ] Update DB

---

### 3.5 Workflow: N8N Health Check
**Nome:** `n8n-health-check`
**Trigger:** Schedule (every 5 minutes)
**Fluxo:**

```
1. Schedule: 5min interval
   ↓
2. Check n8n status
   ├─ GET /api/health
   ├─ Check database connection
   ├─ Check disk space
   ↓
3. List recent executions
   ├─ Count failures (last hour)
   ├─ Calc success rate
   ↓
4. Conditions:
   ├─ IF success_rate < 90%
   │  └─ Alert: Slack + email
   ├─ IF disk space < 10%
   │  └─ Alert: critical
   └─ ELSE
      └─ Log: all green
   ↓
5. Update dashboard
```

---

## FASE 4: Implementação de Testes

### 4.1 Test Suite Structure

```bash
scripts/
├── test-n8n-workflows.sh          # Script master de testes
├── test-n8n-whatsapp-bot.sh       # Testa bot específico
├── test-n8n-sentiment.sh          # Testa sentiment + RAG
├── test-n8n-billing.sh            # Testa faturamento
├── test-n8n-usage.sh              # Testa coleta de uso
├── test-n8n-security.sh           # Testa security monitoring
├── n8n-test-data/
│   ├── whatsapp-messages.json     # Dados de teste
│   ├── users.json
│   └── companies.json
└── n8n-test-results/              # Resultados de testes
    └── report-YYYY-MM-DD.json
```

### 4.2 Test Cases por Workflow

#### Test: WhatsApp Bot
```bash
1. Enviar mensagem financial válida
   ├─ Verify: processa corretamente
   ├─ Verify: chama Claude
   └─ Verify: salva em whatsapp_conversations

2. Enviar mensagem não-financial
   ├─ Verify: rejeita com mensagem apropriada
   └─ Verify: não chama Claude

3. Timeout handling
   ├─ Enviar requisição para bot com timeout
   ├─ Verify: retorna erro gracefully

4. Rate limiting
   ├─ Enviar 1000 msgs em 1 segundo
   ├─ Verify: queue funciona
   └─ Verify: não crashes
```

#### Test: Sentiment Analysis
```bash
1. Análise de sentimento positivo
   ├─ Enviar msg positiva
   ├─ Verify: score > 0.5
   ├─ Verify: salva em whatsapp_sentiment_analysis

2. Análise de sentimento negativo
   ├─ Enviar msg negativa
   ├─ Verify: score < -0.5
   └─ Verify: cria alerta se crítico

3. RAG indexing
   ├─ Verify: message é indexada
   ├─ Verify: embedding é gerado
   └─ Verify: busca semântica funciona
```

#### Test: Billing
```bash
1. Invoice creation
   ├─ Busca LLM cost por cliente
   ├─ Verify: calcula excess corretamente
   ├─ Verify: aplica markup 3.5x
   └─ Verify: cria order em Yampi

2. Edge case: zero cost
   ├─ Cliente com 0 usage
   ├─ Verify: não cria invoice vazia

3. Edge case: over limit
   ├─ Cliente com uso massivo
   ├─ Verify: calcula corretamente
   └─ Verify: gera alerta
```

### 4.3 Test Automation

```bash
#!/bin/bash
# scripts/test-n8n-workflows.sh

set -euo pipefail

RESULTS_DIR="scripts/n8n-test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT="$RESULTS_DIR/report-$TIMESTAMP.json"

echo "🧪 Iniciando testes N8N..."

# Test 1: WhatsApp Bot
echo "1. Testando WhatsApp Bot..."
./scripts/test-n8n-whatsapp-bot.sh >> "$REPORT"

# Test 2: Sentiment
echo "2. Testando Sentiment Analysis + RAG..."
./scripts/test-n8n-sentiment.sh >> "$REPORT"

# Test 3: Billing
echo "3. Testando Billing to Yampi..."
./scripts/test-n8n-billing.sh >> "$REPORT"

# Test 4: Usage Metrics
echo "4. Testando Usage Metrics..."
./scripts/test-n8n-usage.sh >> "$REPORT"

# Test 5: Security
echo "5. Testando Security Monitoring..."
./scripts/test-n8n-security.sh >> "$REPORT"

echo "✅ Testes concluídos!"
echo "📊 Relatório: $REPORT"
```

---

## FASE 5: Monitoramento e Observabilidade

### 5.1 Dashboard N8N (no Frontend)
- Status de todos workflows (verde/amarelo/vermelho)
- Últimas 10 execuções
- Taxa de sucesso
- Tempo médio de execução
- Alertas ativos

### 5.2 Alertas
- Slack: workflow falhou
- Slack: execução atrasada
- Email: sentimento crítico detectado
- SMS: security alert

### 5.3 Logs Estruturados
- Tabela: `n8n_execution_logs`
- Campos: timestamp, workflow_id, status, duration, error_msg, payload
- Índices: workflow_id, status, timestamp

---

## FASE 6: Documentação

### 6.1 Arquivos a Criar
- [ ] `docs/n8n/workflows-overview.md` - Resumo de todos workflows
- [ ] `docs/n8n/whatsapp-bot-guide.md` - Guia do bot
- [ ] `docs/n8n/billing-automation.md` - Guia de faturamento
- [ ] `docs/n8n/security-monitoring.md` - Guia de segurança
- [ ] `docs/n8n/testing-guide.md` - Como executar testes
- [ ] `docs/n8n/troubleshooting.md` - Resolução de problemas

---

## CRONOGRAMA

| Fase | Tarefas | Tempo | Data Início |
|------|---------|-------|------------|
| 1 | Auditoria | 4h | Hoje |
| 2 | Otimizações | 6h | +1 dia |
| 3 | Novos workflows | 12h | +2 dias |
| 4 | Testes | 8h | +3 dias |
| 5 | Monitoramento | 6h | +4 dias |
| 6 | Documentação | 4h | +5 dias |

**Total: 40h (5 dias de trabalho)**

---

## Checklist de Conclusão

- [ ] Todos workflows testados
- [ ] Taxa de sucesso > 99%
- [ ] Alertas funcionando
- [ ] Dashboard no frontend pronto
- [ ] Documentação completa
- [ ] Team alinhado e treinado
- [ ] Rollback plan pronto

