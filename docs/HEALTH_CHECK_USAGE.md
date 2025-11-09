# Health Check Script - Guia de Uso

## Visão Geral

O script `test-all-edge-functions.sh` foi melhorado para suportar:

1. **Tier filtering**: Testar apenas funções críticas (TIER 1), médias (TIER 2) ou tudo
2. **JSON output**: Retornar resultados estruturados para integração com NOC
3. **Latência medição**: Medir tempo de resposta em ms para cada função
4. **Armazenamento automático**: Salvar resultados em `health_checks` table

---

## Uso Básico

### 1. Testar TODAS as Edge Functions (Console Output)

```bash
cd /Users/alceualvespasssosmac/dashfinance
./test-all-edge-functions.sh
```

**Output**: Console colorido com status de cada função

---

### 2. Testar Apenas TIER 1 (Critical Functions)

```bash
./test-all-edge-functions.sh --tier 1
```

**Output**: Apenas as 8 funções críticas

**Funções testadas**:
- whatsapp-send
- track-user-usage
- empresas-list
- relatorios-dre
- relatorios-cashflow
- reconcile-bank
- whatsapp-conversations
- financial-alerts-update
- onboarding-tokens

**Frequência recomendada**: A cada 5 minutos (24/7)

---

### 3. Testar Apenas TIER 2 (Medium Priority)

```bash
./test-all-edge-functions.sh --tier 2
```

**Output**: Apenas as 10 funções de médio impacto

**Funções testadas**:
- llm-chat
- mood-index-timeline
- mood-index-detail
- rag-search
- rag-conversation
- n8n-status
- llm-metrics
- sync-bank-metadata
- import-bank-statement
- group-aliases-create

**Frequência recomendada**: A cada 15 minutos (expediente)

---

### 4. Testar Apenas TIER 3 (Admin/Testing)

```bash
./test-all-edge-functions.sh --tier 3
```

**Output**: Apenas as 4 funções de admin/testes

**Funções testadas**:
- seed-realistic-data
- whatsapp-simulator
- full-test-suite
- integrations-test

**Frequência recomendada**: On-demand ou CI/CD

---

### 5. Output JSON (para NOC/Automação)

```bash
./test-all-edge-functions.sh --output json
```

**Output**: JSON com todos os resultados

**Exemplo**:

```json
{
  "timestamp": "2025-11-09T14:23:45Z",
  "total": 24,
  "passed": 23,
  "failed": 1,
  "success_rate": 95.83,
  "tier_filter": "all",
  "results": [
    {
      "name": "seed-realistic-data",
      "tier": 3,
      "method": "POST",
      "endpoint": "seed-realistic-data",
      "http_status": 200,
      "response_time_ms": 245,
      "is_success": true,
      "error_message": "",
      "timestamp": "2025-11-09T14:23:45Z"
    },
    ...
  ]
}
```

---

### 6. JSON Output + TIER 1 (para NOC crítico)

```bash
./test-all-edge-functions.sh --output json --tier 1
```

**Ideal para**: Alertas críticos em tempo real

---

### 7. Executar e Armazenar Resultados

```bash
./test-all-edge-functions.sh --output json --save
```

**Ação**: Envia JSON para `POST /admin-health-check-results` automaticamente

---

## Combinações Recomendadas

### Para NOC em Tempo Real

```bash
# A cada 5 minutos - Critical Only
*/5 * * * * /path/to/dashfinance/test-all-edge-functions.sh --output json --tier 1 | \
  curl -X POST https://your-supabase.url/functions/v1/admin-health-check-results \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d @-
```

### Para Relatório Matinal

```bash
# Todos os dias às 6 AM
0 6 * * * /path/to/dashfinance/test-all-edge-functions.sh --output json > \
  /var/log/health_checks/$(date +\%Y\%m\%d).json
```

### Para CI/CD Pipeline

```bash
# Antes de deploy
./test-all-edge-functions.sh --tier 1
if [ $? -ne 0 ]; then
  echo "❌ TIER 1 functions failed - blocking deploy"
  exit 1
fi
```

---

## Métricas Rastreadas

### Por Função

| Métrica | Descrição |
|---------|-----------|
| `name` | Nome da edge function |
| `tier` | 1 (crítica), 2 (média) ou 3 (admin) |
| `method` | GET, POST, etc. |
| `http_status` | HTTP status code (200, 404, 500, etc.) |
| `response_time_ms` | Latência em milissegundos |
| `is_success` | true se 200-299, false caso contrário |
| `error_message` | Descrição do erro (se houver) |
| `timestamp` | ISO 8601 timestamp UTC |

### Resumo

| Métrica | Descrição |
|---------|-----------|
| `total` | Total de funções testadas |
| `passed` | Quantas tiveram sucesso (2xx) |
| `failed` | Quantas falharam |
| `success_rate` | Percentual de sucesso |
| `tier_filter` | Qual tier foi testado |

---

## Dashboard NOC (Próximos Passos)

Crie um dashboard em `/admin/noc/health-check` que:

1. **Leia de `health_checks_summary`** (view criada automaticamente)
2. **Mostre status em tempo real**:
   - 🟢 Green: 100% sucesso
   - 🟡 Yellow: 90-99% sucesso
   - 🔴 Red: < 90% sucesso

3. **Exiba gráficos**:
   - Taxa de sucesso por hora
   - Latência P95/P99 por função
   - Contagem de erros por tipo

4. **Configure alertas**:
   - TIER 1 < 100% → PagerDuty
   - TIER 2 < 90% → Slack
   - Latência P95 > 10s → Investigação

---

## Troubleshooting

### "Variáveis de ambiente não configuradas"

Certifique-se que `.env.local` está no diretório `finance-oraculo-frontend/`:

```bash
echo "NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co" > \
  finance-oraculo-frontend/.env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key" >> \
  finance-oraculo-frontend/.env.local
```

### Erro "jq: command not found"

Instale `jq` para parsing JSON:

```bash
# macOS
brew install jq

# Linux (Ubuntu/Debian)
sudo apt-get install jq

# Linux (CentOS/RHEL)
sudo yum install jq
```

### Timeout em funções lentas

Aumente timeout do curl:

```bash
# Edite test-all-edge-functions.sh e adicione:
# --max-time 30
```

---

## Integração com Supabase RLS

A tabela `health_checks` está protegida com:

1. **RLS habilitado**: Apenas leitura para usuários autenticados
2. **Insert via service role**: Edge function usa chave de service
3. **View pública**: `health_checks_summary` para dashboard

---

## Performance

- **TIER 1 (8 funções)**: ~30-40 segundos
- **TIER 2 (10 funções)**: ~40-50 segundos
- **TIER 3 (4 funções)**: ~20-30 segundos
- **Todos (24 funções)**: ~80-100 segundos

---

## Exemplo de Cron Job (Linux/macOS)

```bash
# Editar crontab
crontab -e

# Adicionar:
# TIER 1 - A cada 5 minutos (24/7)
*/5 * * * * cd /Users/alceualvespasssosmac/dashfinance && \
  ./test-all-edge-functions.sh --output json --tier 1 | \
  jq -r '.results | @json' | \
  curl -X POST https://your-supabase.url/functions/v1/admin-health-check-results \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" -d @- 2>/dev/null

# TIER 2 - A cada 15 minutos (expediente)
*/15 9-18 * * 1-5 cd /Users/alceualvespasssosmac/dashfinance && \
  ./test-all-edge-functions.sh --output json --tier 2 2>/dev/null | \
  curl -X POST https://your-supabase.url/functions/v1/admin-health-check-results \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" -d @- 2>/dev/null
```

---

## Próximos Passos

1. ✅ Script melhorado com tiers + JSON ← **FEITO**
2. ✅ Tabela `health_checks` criada ← **FEITO**
3. ✅ Edge function `admin-health-check-results` ← **FEITO**
4. ⏳ Dashboard NOC (`/admin/noc/health-check`)
5. ⏳ Configurar cron jobs
6. ⏳ Setup de alertas (Slack/PagerDuty)
7. ⏳ Documentar runbooks de resposta


