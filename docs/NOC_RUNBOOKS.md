# NOC Runbooks - Guia de Resposta a Alertas

Este documento descreve os passos que o NOC deve seguir quando alertas de edge functions são disparados.

---

## 🔴 TIER 1 CRÍTICO: Alerta Imediato

**Severidade**: CRITICAL  
**Destinatário**: PagerDuty + Slack #critical  
**Ação**: Page dev on-call imediatamente  
**SLA**: Response em < 5 minutos

### Funções Críticas

1. `whatsapp-send` - Envio de mensagens
2. `track-user-usage` - Rastreamento de uso/billing
3. `empresas-list` - Base de dados (dependency)
4. `relatorios-dre` - Relatório financeiro
5. `relatorios-cashflow` - Fluxo de caixa
6. `reconcile-bank` - Conciliação bancária
7. `whatsapp-conversations` - Histórico de chats
8. `financial-alerts-update` - Resolução de alertas
9. `onboarding-tokens` - Controle de acesso

---

## Runbook: TIER 1 - Função Down (HTTP 50x ou timeout)

### Sintomas

```
Alert: whatsapp-send returned 503 (Service Unavailable)
Status: RED
Tier: 1 (CRITICAL)
```

### Resposta Imediata (1-2 min)

```
☐ 1. Reconhecer alerta em PagerDuty (click "Acknowledge")
☐ 2. Abrir Slack #incident e mencionar @on-call
☐ 3. Rodar diagnóstico rápido:

   ./test-all-edge-functions.sh --tier 1 --output json | \
     jq '.results[] | select(.name=="whatsapp-send")'

☐ 4. Verificar status da função no Supabase:

   # Login ao painel Supabase
   # Edge Functions → whatsapp-send → Logs
   # Procurar erros nos últimos 5 minutos

☐ 5. Se erro for "Deployment error":
   → Ir para "Deploy Issue" abaixo

☐ 6. Se erro for "Database connection":
   → Ir para "Database Issue" abaixo

☐ 7. Se erro for "External API timeout":
   → Ir para "External Integration Issue" abaixo
```

### Deploy Issue

```
Se log mostrar "Failed to load dependency" ou similar:

☐ 1. SSH para o servidor (ou acesse via Supabase CLI):
   supabase functions deploy whatsapp-send

☐ 2. Verificar compilação:
   supabase functions list | grep whatsapp-send

☐ 3. Se ainda falhar, reverter versão anterior:
   git log --oneline supabase/functions/whatsapp-send
   # Anotar o commit da última versão estável
   
   git checkout <commit-hash> -- \
     supabase/functions/whatsapp-send
   
   supabase functions deploy whatsapp-send

☐ 4. Re-testar:
   ./test-all-edge-functions.sh --tier 1
   
☐ 5. Se OK → Fecha alerta em PagerDuty
   Se não → Escala para developer (vá para Developer Escalation)
```

### Database Issue

```
Se log mostrar "Connection timeout" ou "Database refused connection":

☐ 1. Verificar status do Supabase:
   https://status.supabase.io/

☐ 2. Se status é GREEN, problema é local:
   
   # Verificar RLS policies
   SELECT COUNT(*) FROM pg_policies WHERE tablename = 'whatsapp_messages';
   
   # Se 0 rows → RLS policies podem estar quebradas
   → Vá para "RLS Policy Issue"

☐ 3. Se status mostra incident:
   → Postear em Slack com link
   → Aguardar resolução (status page)
   → Teste novamente em 5 min

☐ 4. Se problema persiste > 10 min:
   → Escala para Supabase support (vá para External Escalation)
```

### External Integration Issue

```
Se log mostrar "Failed to call wasender API" ou similar:

☐ 1. Verificar status do serviço externo:
   https://status.wasender.com/ (ou seu provider)

☐ 2. Testar conectividade:
   curl -I https://api.wasender.com/health

☐ 3. Se falha com timeout:
   → Aumentar timeout na função (vá para Developer Escalation)
   → Documentar no Slack que será melhorado

☐ 4. Se falha com 401/403:
   → Verificar credenciais (API key expirada?)
   → Rotacionar credenciais se necessário
   → Redeploy com novas credenciais

☐ 5. Se problema persiste:
   → Postear no Slack que webhook/integração está down
   → Aguardar fix do provider
```

---

## Runbook: TIER 1 - Latência Alta (P95 > 10s)

### Sintomas

```
Alert: whatsapp-send P95 latency = 12.5s (threshold: 10s)
Status: YELLOW
Tier: 1 (CRITICAL - latência crítica)
```

### Resposta Investigativa (2-5 min)

```
☐ 1. Rodar teste de latência isolado:
   time curl -X POST \
     https://your-supabase.url/functions/v1/whatsapp-send \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"phone":"test","message":"test","company_cnpj":"test"}'

☐ 2. Coletar dados de latência (últimas 20 chamadas):
   SELECT
     response_time_ms,
     PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95
   FROM health_checks
   WHERE function_name = 'whatsapp-send'
   AND timestamp > NOW() - INTERVAL '30 minutes'

☐ 3. Identificar padrão:
   - Se latência é consistente > 10s → problema de resource
   - Se latência é spike occasional → problema de load/throttling
   - Se latência está crescendo → problema de query/database

☐ 4. Ação baseada em padrão:

   SE consistente (sempre > 10s):
     → Ir para "Resource Issue"

   SE spike (occasional peaks):
     → Ir para "Load/Throttling Issue"

   SE crescendo (trend up):
     → Ir para "Database Query Issue"
```

### Resource Issue

```
Se função sempre é lenta:

☐ 1. Verificar recursos na função Supabase:
   Edge Functions → whatsapp-send → Monitoring
   Procurar CPU high, memory high

☐ 2. Se CPU/Memory OK:
   → Problema é externo (wasender, database, network)
   → Ir para "External Integration Issue"

☐ 3. Se CPU/Memory high:
   → Revisar função por loops desnecessários
   → Verificar se há múltiplas iterações (for loop sem break)
   
☐ 4. Se código está OK:
   → Aumentar memory allocation (Supabase settings)
   → Redeploy
   → Retest

☐ 5. Se problema persiste:
   → Escala para dev (vá para Developer Escalation)
```

### Load/Throttling Issue

```
Se latência é ocasional (spike):

☐ 1. Verificar volume de requisições:
   SELECT
     DATE_TRUNC('minute', timestamp) as minute,
     COUNT(*) as count
   FROM health_checks
   WHERE function_name = 'whatsapp-send'
   AND timestamp > NOW() - INTERVAL '1 hour'
   GROUP BY minute
   ORDER BY minute DESC

☐ 2. Correlacionar com SLA:
   - Se spike coincide com latência alta → throttling
   - Supabase pode estar rate-limiting

☐ 3. Ação:
   → Documentar spike em Slack
   → Implementar backoff/retry logic
   → Considerar pre-warming de função (chamada periódica)

☐ 4. Longo prazo:
   → Escala com dev para otimizar função
   → Considerar caching se possível
```

### Database Query Issue

```
Se latência está crescendo (trend):

☐ 1. Executar EXPLAIN ANALYZE na query lenta:
   SELECT * FROM whatsapp_messages
   WHERE company_cnpj = '...'
   ORDER BY created_at DESC
   LIMIT 100

   (Adicionar EXPLAIN ANALYZE na frente)

☐ 2. Verificar índices:
   SELECT * FROM pg_indexes
   WHERE tablename = 'whatsapp_messages'

☐ 3. Se faltam índices relevantes:
   CREATE INDEX idx_whatsapp_messages_company
   ON whatsapp_messages(company_cnpj, created_at DESC)

☐ 4. Se índices existem:
   → Problema pode ser vacuum/bloat da tabela
   → Executar VACUUM ANALYZE:
   
   VACUUM ANALYZE whatsapp_messages;

☐ 5. Se problema persiste:
   → Escala para DBA/dev
   → Considerar table partitioning
```

---

## 🟡 TIER 2 MÉDIO: Alerta Monitorado

**Severidade**: MEDIUM  
**Destinatário**: Slack #alerts  
**Ação**: Investigar, escalar se > 30 min down  
**SLA**: Investigar em < 15 min

### Funções Médias

1. `llm-chat` - IA conversacional
2. `mood-index-timeline` - Analytics
3. `rag-search` - Search
4. `n8n-status` - Automações
5. E mais 5 funções...

---

## Runbook: TIER 2 - Função Down

```
Alert: llm-chat returned 500
Status: RED
Tier: 2 (MEDIUM)

☐ 1. Verificar se é transiente:
   ./test-all-edge-functions.sh --tier 2 | grep llm-chat
   
   Se OK na retest → foi spike, close alert

☐ 2. Se persiste, seguir steps de TIER 1:
   - Deploy Issue
   - Database Issue
   - External Integration Issue

☐ 3. Timeline:
   - 0-5 min: Investigação
   - 5-15 min: Tentativa de fix local
   - 15-30 min: Escalar para dev
   - > 30 min: PagerDuty page (CRITICAL escalation)
```

---

## 🟢 TIER 3 ADMIN: On-Demand

**Severidade**: LOW  
**Destinatário**: Debug log only  
**Ação**: Nenhuma (testes)  

```
Funções TIER 3 não geram alertas automáticos.
Se falha: investigar em CI/CD ou staging, sem impacto em produção.
```

---

## Developer Escalation

Use este procedimento quando NOC não consegue resolver:

```
Slack message:
───────────────
@on-call-dev

🚨 TIER 1 ALERT: whatsapp-send

Status: Down (HTTP 503)
Duration: 15 minutes
Last working: 2025-11-09 14:20 UTC

Diagnosticado:
- Deploy status: OK
- Database: Connected
- External API: Responding

Ação necessária:
1. Revisar logs em Supabase Edge Functions
2. Check for recent deploys or config changes
3. Rollback se needed

Logs anexados: [link]

───────────────
```

---

## External Escalation

Para integração com suporte externo:

### Wasender (WhatsApp Provider)

```
Email: support@wasender.com
Subject: URGENT: API down - Order #XXXXX

Body:
"WhatsApp send function returning 500.
Our service was working fine until 14:20 UTC.
External API health check shows timeout.
Need immediate status update."

Cc: on-call-dev
```

### Supabase

```
Dashboard: https://supabase.io/support
Ticket Type: Urgent
Subject: Edge Function / Database connectivity

Include:
- Function name
- Error message
- Timestamps
- Health check results (JSON)
```

---

## Post-Incident

Após resolver qualquer alerta TIER 1:

```
☐ 1. Postar resumo em Slack #incident:
   - Duração total
   - Root cause
   - Ação tomada
   - Status: RESOLVED

☐ 2. Criar ticket (se necessário):
   - Criar issue no GitHub para tracking
   - Assign para dev para follow-up
   - Label com "incident", "tier-1", etc.

☐ 3. Documentar em runbook:
   - Se foi novo cenário → adicionar à este doc
   - Se foi pattern conhecido → nota para melhoria

☐ 4. Verificar trends:
   - Se mesma função falhou antes:
     → Agendou fix permanente?
     → Por que ainda falha?
```

---

## Checklist Diário do NOC

```
Start of shift:
☐ Revisar health_checks_summary (últimas 24h)
☐ Verificar se há alertas pendentes
☐ Rodar ./test-all-edge-functions.sh --tier 1
☐ Documentar status inicial em Slack

During shift:
☐ Monitorar dashboard (health check status)
☐ Responder a alerts conforme SLA
☐ Atualizar Slack periodicamente
☐ Registrar issues no GitHub se necessário

End of shift:
☐ Preparar handoff para turno seguinte
☐ Listar issues abertas/pendentes
☐ Sumarizar health status (% uptime)
☐ Escaladas que ficaram abertas
```

---

## Contatos de Escalação

| Serviço | Contato | Horário | SLA |
|---------|---------|---------|-----|
| Dev On-Call | @on-call-dev (Slack) | 24/7 | 5 min |
| Wasender | support@wasender.com | Business hours | 2 hours |
| Supabase | Dashboard support | Business hours | 4 hours |
| AWS | Account manager | 24/7 | 1 hour |

---

## Métricas para Dashboard

Crie um dashboard que mostra:

```
┌─────────────────────────────────────────────────────┐
│ NOC METRICS - Semana 45 (2025-11-03 a 2025-11-09)  │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Uptime por Tier:                                   │
│ ├─ TIER 1: 99.85% (SLA: 99.5%) ✅                 │
│ ├─ TIER 2: 98.92% (SLA: 98%) ✅                   │
│ └─ TIER 3: 99.10% (SLA: N/A) ✅                   │
│                                                     │
│ Alertas:                                           │
│ ├─ Total: 12                                       │
│ ├─ Resolvidos: 11                                  │
│ ├─ MTTR (Mean Time To Resolve): 18 min            │
│ ├─ Escalações: 2                                   │
│ └─ False positives: 0                              │
│                                                     │
│ Top Issues:                                        │
│ 1. llm-chat latência alta (3 ocorrências)         │
│ 2. sync-bank-metadata timeout (2 ocorrências)     │
│ 3. reconcile-bank occasional 503 (1 ocorrência)   │
│                                                     │
│ Ação recomendada:                                  │
│ - Investigar llm-chat latência (dev meeting)      │
│ - Aumentar timeout sync-bank-metadata             │
│                                                     │
└─────────────────────────────────────────────────────┘
```


