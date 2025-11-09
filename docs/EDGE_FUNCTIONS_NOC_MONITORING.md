# Avaliação de Edge Functions para Monitoramento no NOC

**Data**: 2025-11-09  
**Escopo**: Análise das 24 edge functions teste + rotina de testes para determinar quais devem estar em monitoria contínua no NOC.

---

## 1. Levantamento de Escopo

### 1.1 Distribuição das Edge Functions por Categoria

#### **NOVAS FUNCTIONS (Recém-criadas, 5 total)**

| # | Nome | Método | Endpoint | Objetivo Operacional |
|---|------|--------|----------|----------------------|
| 1 | seed-realistic-data | POST | seed-realistic-data | Popula dados realistas de teste; suporte a "minimal" ou "full" mode |
| 2 | whatsapp-simulator | POST | whatsapp-simulator | Gera usuários de teste do WhatsApp para cenários de teste |
| 3 | mood-index-timeline | GET | mood-index-timeline | Retorna timeline de humor/sentimento dos clientes (analytics) |
| 4 | usage-details | GET | usage-details | Retorna detalhes de uso do sistema (analytics/billing) |
| 5 | full-test-suite | POST | full-test-suite | Executa suite completa de testes automatizados |

#### **CRITICAL FUNCTIONS (Operação crítica, 10 total)**

| # | Nome | Método | Endpoint | Objetivo Operacional |
|---|------|--------|----------|----------------------|
| 6 | track-user-usage | POST | track-user-usage | Registra/rastreia uso do sistema (analytics, billing, comportamento) |
| 7 | llm-chat | POST | llm-chat | Chat com LLM; base para IA conversacional do sistema |
| 8 | empresas-list | GET | empresas-list | Lista empresas disponíveis; base para todas operações |
| 9 | onboarding-tokens | GET | onboarding-tokens | Tokens de onboarding; controla acesso iniciais de clientes |
| 10 | relatorios-dre | GET | relatorios-dre | Relatório DRE; financeiro crítico |
| 11 | relatorios-cashflow | GET | relatorios-cashflow | Relatório de fluxo de caixa; financeiro crítico |
| 12 | n8n-status | GET | n8n-status | Status das automações N8N; integrações |
| 13 | whatsapp-conversations | GET | whatsapp-conversations | Lista conversas do WhatsApp; operação core |
| 14 | whatsapp-send | POST | whatsapp-send | Envia mensagem WhatsApp; operação crítica |
| 15 | mood-index-detail | GET | mood-index-timeline?phone=... | Humor por telefone específico; analytics |

#### **ADMINISTRATIVE/INTEGRATION FUNCTIONS (Admin + integrações, 9 total)**

| # | Nome | Método | Endpoint | Objetivo Operacional |
|---|------|--------|----------|----------------------|
| 16 | llm-metrics | GET | llm-metrics | Métricas de uso do LLM (admin) |
| 17 | rag-search | POST | rag-search | Busca no RAG/knowledge base (search feature) |
| 18 | rag-conversation | POST | rag-conversation | Conversa com RAG (integrado ao chat) |
| 19 | import-bank-statement | POST | import-bank-statement | Importa extrato bancário (manual + ERP) |
| 20 | reconcile-bank | POST | reconcile-bank | Reconcilia extrato bancário (critical financial) |
| 21 | sync-bank-metadata | POST | sync-bank-metadata | Sincroniza metadados bancários (integração ERP) |
| 22 | financial-alerts-update | POST | financial-alerts-update | Atualiza status de alerta financeiro (resolution) |
| 23 | group-aliases-create | POST | group-aliases-create | Cria aliases de grupo (company management) |
| 24 | integrations-test | POST | integrations-test | Testa integrações F360/OMIE (health check) |

---

## 2. Classificação por Criticidade e Impacto

### Matriz de Criticidade

**Criticidade**: High (H) / Medium (M) / Low (L)  
**Impacto**: Número de usuários/processos afetados e severidade (bloqueador, degradação, informativo)

| Criticidade | Impacto | Exemplos | Frequência Sugerida |
|-------------|--------|---------|-------------------|
| **HIGH** | Bloqueia operação do cliente, interrupção de serviço crítico | whatsapp-send, track-user-usage, empresas-list, relatorios-* | 5 min (ou contínuo) |
| **MEDIUM** | Degradação de UX, falta de dados não-críticos, delay >10s | llm-chat, mood-index-*, rag-*, n8n-status | 15 min |
| **LOW** | Testes, setup, admin internos, sem impacto em produção | seed-realistic-data, whatsapp-simulator, integrations-test | 60 min (ou sob demanda) |

### Mapa de Criticidade Detalhado

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CRITICAL (Monitorar 24/7 no NOC)                                        │
├─────────────────────────────────────────────────────────────────────────┤
│ 🔴 whatsapp-send           (POST) - Comunicação client-facing            │
│ 🔴 track-user-usage        (POST) - Billing + behavioral data            │
│ 🔴 empresas-list           (GET)  - Base para todas operações            │
│ 🔴 relatorios-dre          (GET)  - Financeiro crítico                   │
│ 🔴 relatorios-cashflow     (GET)  - Financeiro crítico                   │
│ 🔴 onboarding-tokens       (GET)  - Controle de acesso                   │
│ 🔴 reconcile-bank          (POST) - Conciliação financeira               │
│ 🔴 whatsapp-conversations  (GET)  - Operação core                        │
│ 🔴 financial-alerts-update (POST) - Resolução de alertas críticos        │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│ MEDIUM (Monitorar durante expediente + alertar em degradação)           │
├─────────────────────────────────────────────────────────────────────────┤
│ 🟡 llm-chat                (POST) - IA conversacional (latência crítica)  │
│ 🟡 mood-index-timeline     (GET)  - Analytics + business intelligence    │
│ 🟡 mood-index-detail       (GET)  - Analytics detalhado                  │
│ 🟡 rag-search              (POST) - Search feature (impacta UX)          │
│ 🟡 rag-conversation        (POST) - Chat RAG (integrado)                 │
│ 🟡 n8n-status              (GET)  - Status de automações                 │
│ 🟡 llm-metrics             (GET)  - Admin metrics                        │
│ 🟡 sync-bank-metadata      (POST) - Integração ERP (eventual)            │
│ 🟡 import-bank-statement   (POST) - Importação (eventual)                │
│ 🟡 group-aliases-create    (POST) - Company management                   │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│ LOW (On-demand, testes, interno)                                        │
├─────────────────────────────────────────────────────────────────────────┤
│ 🟢 seed-realistic-data     (POST) - Testes (staging/dev)                │
│ 🟢 whatsapp-simulator      (POST) - Testes (staging/dev)                │
│ 🟢 full-test-suite         (POST) - Testes (CI/CD)                      │
│ 🟢 integrations-test       (POST) - Health check (admin)                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Recomendações para o NOC

### 3.1 TIER 1: Monitorar 24/7 (Critical Path)

**Justificativa**: Interrupção = cliente sem acesso, sem comunicação, ou sem dados financeiros.

**Functions**:
1. `whatsapp-send` - Envio de mensagens (client-facing, SLA crítico)
2. `track-user-usage` - Rastreamento (billing + comportamento)
3. `empresas-list` - Base de dados (downstream dependency)
4. `relatorios-dre` & `relatorios-cashflow` - Financeiro crítico
5. `onboarding-tokens` - Controle de acesso
6. `reconcile-bank` - Conciliação (operação noturna típica)
7. `whatsapp-conversations` - Histórico de chats
8. `financial-alerts-update` - Resolução de alertas

**Monitoramento Recomendado**:

| Métrica | Threshold | Ação |
|---------|-----------|------|
| Disponibilidade | < 99.5% em 1 hora | Page NOC + Dev on-call |
| Latência P95 | > 5s | Alert, investigar, escalar se > 10s |
| Taxa de Erro | > 1% | Alert imediato |
| Taxa de Erro | > 5% | Page dev + escalação |

**Frequency**: A cada 1-5 minutos (ou health check contínuo)  
**SLA Sugerido**: 99.5% uptime, 2 nines de latência P95 < 5s

---

### 3.2 TIER 2: Monitorar em Expediente (Degraded Mode Acceptable)

**Justificativa**: Impacto em UX ou dados não-críticos, mas não bloqueia operação.

**Functions**:
1. `llm-chat` - IA (latência é crítica, mas 404 não é bloqueador)
2. `mood-index-*` - Analytics (relatórios, impacta decisões, não operação)
3. `rag-search` & `rag-conversation` - Search feature
4. `n8n-status` - Automações (eventual, não contínuo)
5. `sync-bank-metadata` & `import-bank-statement` - Integração ERP
6. `group-aliases-create` - Gerenciamento (admin)
7. `llm-metrics` - Admin metrics

**Monitoramento Recomendado**:

| Métrica | Threshold | Ação |
|---------|-----------|------|
| Disponibilidade | < 98% em 1 hora | Alert (log + dashboard) |
| Latência P95 | > 10s | Alert (pode impactar UX) |
| Taxa de Erro | > 5% | Alert, investigar fora de horário |
| Taxa de Erro | > 15% | Escalação ao dev de turno |

**Frequency**: A cada 10-15 minutos (ou 2x por turno)  
**SLA Sugerido**: 98% uptime, P95 latência < 10s

---

### 3.3 TIER 3: Testes / Admin / On-Demand

**Justificativa**: Não impacta produção ou é controlado (testes em staging).

**Functions**:
1. `seed-realistic-data` - Testes (staging)
2. `whatsapp-simulator` - Testes (staging)
3. `full-test-suite` - CI/CD (integração)
4. `integrations-test` - Health check (admin)

**Monitoramento Recomendado**:
- Sem monitoramento contínuo no NOC
- Executar sob demanda ou em CI/CD
- Alertar apenas se falhar em staging (indica problema com base)
- Log em dashboard separado (não-crítico)

---

## 4. Recomendações Técnicas de Implementação

### 4.1 Stack de Monitoramento Sugerida

```
┌──────────────────────────────────────────────────────┐
│  Health Check / Probe (5 min)                        │
│  → curl + auth a cada função TIER 1/2                │
│  → Armazena resultado em table (metrics)             │
└────────────────────┬─────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────┐
│  Alerting Layer (Supabase Realtime + Slack/PagerDuty)│
│  → Se status = error, enviar alerta                  │
│  → Dashboard em tiempo real (status page)            │
└────────────────────┬─────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────┐
│  Logging / Tracing (Sentry / LogRocket opcional)     │
│  → Stack traces, latência, erros                     │
│  → Histórico para análise pós-mortem                 │
└──────────────────────────────────────────────────────┘
```

### 4.2 Melhorias ao Script `test-all-edge-functions.sh`

**Adicionar**:

```bash
# 1. Parsing estruturado de resultados (JSON output)
# 2. Timestamped logs para historicidade
# 3. Filtro por TIER (--tier 1 para rodar só críticas)
# 4. Armazenar resultados em Supabase (tabela public.health_checks)
# 5. Notificações Slack/Discord em falhas críticas
# 6. Métricas de latência P95/P99 (não só P0)
```

**Exemplo**:
```bash
./test-all-edge-functions.sh --tier 1 --output json > health_$(date +%s).json
# Enviar resultado para: POST /admin/health-check-result
```

### 4.3 Tabela de Histórico de Health Checks (Schema)

```sql
CREATE TABLE health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  function_name TEXT NOT NULL,
  tier INT NOT NULL (1, 2, 3),
  http_status INT NOT NULL,
  response_time_ms INT NOT NULL,
  is_success BOOLEAN NOT NULL,
  error_message TEXT,
  
  -- Indices
  CONSTRAINT unique_check UNIQUE(timestamp, function_name),
  INDEX idx_timestamp,
  INDEX idx_function_tier
);
```

---

## 5. Dashboard NOC Recomendado

### 5.1 Status Page (Real-time)

```
╔════════════════════════════════════════════════════════════╗
║  NOC DASHBOARD - EDGE FUNCTIONS STATUS                    ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  TIER 1 (Critical - Must be GREEN)                        ║
║  ─────────────────────────────────────────────────────────
║  🟢 whatsapp-send           ✓ 99.8% | ⏱ 245ms (P95)      
║  🟢 track-user-usage        ✓ 99.9% | ⏱ 152ms (P95)      
║  🟢 empresas-list           ✓ 99.5% | ⏱ 89ms (P95)       
║  🟢 relatorios-dre          ✓ 99.7% | ⏱ 1.2s (P95)       
║  🟢 relatorios-cashflow     ✓ 99.6% | ⏱ 890ms (P95)      
║  🟢 reconcile-bank          ✓ 99.4% | ⏱ 2.3s (P95)       
║  ⚠️  whatsapp-conversations  ⚠️  97.8% | ⏱ 4.5s (P95)      
║                                                            ║
║  TIER 2 (Medium - Yellow OK)                              ║
║  ─────────────────────────────────────────────────────────
║  🟡 llm-chat                ✓ 98.5% | ⏱ 3.2s (P95)       
║  🟡 mood-index-timeline     ✓ 98.9% | ⏱ 1.1s (P95)       
║  🟡 rag-search              ✓ 98.1% | ⏱ 2.8s (P95)       
║                                                            ║
║  TIER 3 (Low - Not Monitored Continuously)               ║
║  ─────────────────────────────────────────────────────────
║  🔵 seed-realistic-data     ℹ️  Manual exec only          
║  🔵 whatsapp-simulator      ℹ️  Manual exec only          
║  🔵 full-test-suite         ℹ️  CI/CD only               
║                                                            ║
║  Last Check: 2025-11-09 14:23:45 UTC                     ║
╚════════════════════════════════════════════════════════════╝
```

### 5.2 Alertas Recomendados

| Condição | Severidade | Destinatário | Ação |
|----------|-----------|--------------|------|
| TIER 1 down | **CRITICAL** | PagerDuty + Slack #critical | Page dev on-call |
| TIER 1 latência > 10s | **HIGH** | Slack #ops | Investigate, may escalate |
| TIER 2 down | **MEDIUM** | Slack #alerts | Log + escalate if > 30 min |
| TIER 2 latência > 15s | **LOW** | Dashboard log only | Monitor trend |
| TIER 3 fail | **INFO** | Debug log | No action (unless CI blocking) |

---

## 6. Checklist de Implementação

- [ ] Criar tabela `health_checks` no Supabase
- [ ] Melhorar script `test-all-edge-functions.sh` com output JSON + tier filter
- [ ] Criar edge function `POST /admin/health-check-result` para armazenar resultados
- [ ] Setup Slack/PagerDuty integration para alertas
- [ ] Criar dashboard NOC (Next.js page `/admin/noc/status`)
- [ ] Configurar cron job (Lambda / Supabase scheduled function) para executar health checks a cada 5 min (TIER 1) e 15 min (TIER 2)
- [ ] Definir SLAs em contrato/wiki interna
- [ ] Treinar NOC em resposta a cada nível de alerta

---

## 7. Conclusão

**Recomendação Final**:

Implementar monitoramento em **3 tiers** conforme proposto acima é o modelo mais eficiente:

1. **TIER 1 (8 functions)**: 24/7 monitoring, 5 min frequency, page on-call se falhar
2. **TIER 2 (10 functions)**: Business hours + alerting, 15 min frequency, escalate se > 30 min down
3. **TIER 3 (4 functions)**: On-demand / CI-only, sem NOC monitoring contínuo

**Estimativa de Implementação**: 4-6 horas (incluindo setup de alertas + dashboard)  
**Valor**: Reduz MTTR (Mean Time To Recovery) de ~30 min para ~5 min em falhas críticas.

---

**Próximos Passos**:
1. Validar TIER classification com time (product, ops, dev)
2. Confirmar SLAs com cliente
3. Implementar health check edge function
4. Setup dashboard + alerting
5. Documentar runbooks para cada falha crítica


