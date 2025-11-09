---
name: financial-cards
description: Processamento inteligente de cards financeiros com cache, dependências e otimização automática. Use quando precisar buscar, calcular ou analisar métricas financeiras (runway, burn rate, cashflow, etc).
---

# Financial Cards Skill

## Objetivo
Fornecer acesso inteligente ao sistema de cards financeiros do Finance Oráculo, permitindo consultas otimizadas com cache, resolução automática de dependências e paralelização.

## Quando Usar
- Usuário solicita métricas financeiras específicas (runway, burn rate, total caixa, etc)
- Análises de dashboard precisam ser carregadas
- Dados financeiros precisam de atualização ou refresh
- Verificação de status de processamento de cards

## Cards Disponíveis

### Tier 1 - Dados Brutos
- `saldo_f360`: Saldo em contas F360 (TTL: 15min)
- `saldo_omie`: Saldo em contas OMIE (TTL: 15min)
- `lancamentos_mes`: Lançamentos do mês (TTL: 30min)
- `contas_pagar`: Contas a pagar pendentes (TTL: 30min)
- `contas_receber`: Contas a receber pendentes (TTL: 30min)

### Tier 2 - Agregações
- `total_caixa`: Total em todas as contas (deps: saldo_f360, saldo_omie)
- `receitas_mes`: Total de receitas (deps: lancamentos_mes)
- `despesas_mes`: Total de despesas (deps: lancamentos_mes)
- `receitas_por_fonte`: Breakdown de receitas (deps: lancamentos_mes)
- `despesas_por_categoria`: Breakdown de despesas (deps: lancamentos_mes)

### Tier 3 - Cálculos Compostos
- `disponivel`: Caixa disponível (deps: total_caixa, contas_pagar)
- `margem_liquida`: Margem líquida % (deps: receitas_mes, despesas_mes)
- `resultado_mes`: Lucro/Prejuízo (deps: receitas_mes, despesas_mes)

### Tier 4 - Análises Complexas
- `runway`: Meses de operação (deps: disponivel, despesas_mes)
- `burn_rate`: Taxa de queima mensal (deps: despesas_mes, receitas_mes)
- `cashflow_projection`: Projeção 6 meses (deps: receitas_mes, despesas_mes, disponivel, contas_pagar, contas_receber)

### Tier 5 - Dashboards
- `dashboard_overview`: Overview principal (deps: total_caixa, disponivel, receitas_mes, despesas_mes, runway, burn_rate, margem_liquida)
- `dashboard_financeiro`: Visão detalhada (deps: lancamentos_mes, receitas_por_fonte, despesas_por_categoria, cashflow_projection)

## Como Usar

### 1. Consulta Simples (usa cache se disponível)
```bash
curl -X POST https://[project].supabase.co/functions/v1/dashboard-smart \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cnpj": "12.345.678/0001-90",
    "cards": ["runway", "burn_rate"],
    "use_llm_planning": true
  }'
```

### 2. Forçar Recálculo
```bash
curl -X POST https://[project].supabase.co/functions/v1/dashboard-smart \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cnpj": "12.345.678/0001-90",
    "cards": ["total_caixa"],
    "force_refresh": true
  }'
```

### 3. Data Específica
```bash
curl -X POST https://[project].supabase.co/functions/v1/dashboard-smart \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cnpj": "12.345.678/0001-90",
    "cards": ["receitas_mes", "despesas_mes"],
    "reference_date": "2025-10-01"
  }'
```

## Resposta Típica

```json
{
  "success": true,
  "cards": {
    "runway": {
      "value": 8.5,
      "formatted": "8.5 meses",
      "alert": "ok",
      "timestamp": "2025-11-06T12:34:56Z"
    },
    "burn_rate": {
      "value": 17647,
      "formatted": "R$ 17.647,00",
      "alert": "warning",
      "timestamp": "2025-11-06T12:34:56Z"
    }
  },
  "source": "mixed",
  "cache_hits": 1,
  "computed": 1,
  "tiers": 4,
  "llm_optimized": true,
  "duration_ms": 450
}
```

## Interpretação de Status

- `source: "cache"`: Todos os cards vieram do cache
- `source: "computed"`: Todos foram recalculados
- `source: "mixed"`: Parte cache, parte recalculado
- `llm_optimized: true`: LLM otimizou ordem de processamento (Haiku 4.5)

## Otimizações Automáticas

1. **Cache Inteligente**: TTL por tipo de card (15min-360min)
2. **Resolução de Dependências**: Expande automaticamente deps necessárias
3. **LLM Planning**: Claude Haiku 4.5 otimiza ordem quando >5 cards (150ms overhead)
4. **Paralelização**: Processa todos cards de um tier simultaneamente
5. **Partial Response**: Retorna parcial se timeout (status 206)

## Monitoramento

```sql
-- Ver estatísticas gerais
SELECT * FROM get_card_processing_stats('12.345.678/0001-90');

-- Ver cards lentos
SELECT card_type, AVG(actual_duration_ms) as avg_ms
FROM card_processing_queue
WHERE status = 'done'
GROUP BY card_type
ORDER BY avg_ms DESC
LIMIT 10;

-- Cache hit rate
SELECT
  card_type,
  COUNT(*) FILTER (WHERE actual_duration_ms = 0) * 100.0 / COUNT(*) as cache_hit_rate
FROM card_processing_queue
WHERE status = 'done'
GROUP BY card_type;
```

## Troubleshooting

### Cards ficam pending forever
```sql
-- Verificar dependências quebradas
SELECT q.card_type, q.status, d.depends_on
FROM card_processing_queue q
JOIN card_dependencies d ON d.card_type = q.card_type
WHERE q.status = 'pending'
  AND company_cnpj = '12.345.678/0001-90';
```

### Invalidar cache específico
```sql
UPDATE card_processing_queue
SET expires_at = NOW()
WHERE company_cnpj = '12.345.678/0001-90'
  AND card_type = 'total_caixa';
```

## Performance Esperada

| Cenário | Sem Cache | Com Cache | Melhoria |
|---------|-----------|-----------|----------|
| Dashboard completo (1ª vez) | 3.5s | 2.1s | 40% |
| Dashboard (80% cache) | 3.5s | 0.4s | 88% |
| Card individual (cache hit) | 200ms | 5ms | 97% |

## Notas Importantes

- LLM planning usa Haiku 4.5 (mais rápido, ~100ms)
- Custo LLM: ~$0.0001 por planejamento
- Timeout padrão: 30s (retorna parcial após isso)
- Workers simultâneos: 10
- Retry automático: até 3 tentativas por card
