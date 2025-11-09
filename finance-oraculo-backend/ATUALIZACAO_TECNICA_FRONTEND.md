# Atualização Técnica - Sistema de Cards + Agent Skills

**Data**: 2025-11-06
**Impacto no Frontend**: ZERO breaking changes

---

## ✅ O que mudou

### 1. Sistema de Cards (Migration 010)
Backend agora processa métricas em unidades atômicas (cards) com cache inteligente e dependências automáticas.

**Novo endpoint disponível** (opcional):
```
POST /dashboard-smart
{
  "cnpj": "12.345.678/0001-90",
  "cards": ["runway", "burn_rate", "total_caixa"],
  "force_refresh": false,      // opcional
  "use_llm_planning": true,    // opcional, default true
  "reference_date": "2025-11-01" // opcional
}
```

**Response**:
```json
{
  "success": true,
  "cards": {
    "runway": { "value": 8.5, "formatted": "8.5 meses", "alert": "ok" },
    "burn_rate": { "value": 17647, "formatted": "R$ 17.647,00", "alert": "warning" },
    "total_caixa": { "value": 150000, "formatted": "R$ 150.000,00", "alert": "ok" }
  },
  "source": "mixed",      // cache | computed | mixed
  "cache_hits": 2,
  "computed": 1,
  "tiers": 4,
  "llm_optimized": true,
  "duration_ms": 450
}
```

### 2. API Antiga Continua Funcionando
```
GET /kpi-monthly?cnpj=12.345.678/0001-90
```
Internamente usa cards, mas response é **exatamente igual** ao anterior. **Não mude nada**.

### 3. Agent Skills
Backend tem agora skill `financial-cards` que permite Claude processar métricas de forma inteligente. Não afeta APIs REST.

### 4. Modelos LLM Atualizados
- **Claude Haiku 4.5**: Fastest (usado para planning de cards, ~100ms)
- **Claude Sonnet 4.5**: Recomendado para casos gerais
- **Claude Opus 4.1**: Reasoning complexo

---

## 📊 18 Cards Disponíveis

### Tier 1 - Dados Brutos (sem deps)
- `saldo_f360`, `saldo_omie`, `lancamentos_mes`, `contas_pagar`, `contas_receber`

### Tier 2 - Agregações
- `total_caixa`, `receitas_mes`, `despesas_mes`, `receitas_por_fonte`, `despesas_por_categoria`

### Tier 3 - Cálculos Compostos
- `disponivel`, `margem_liquida`, `resultado_mes`

### Tier 4 - Análises
- `runway`, `burn_rate`, `cashflow_projection`

### Tier 5 - Dashboards
- `dashboard_overview`, `dashboard_financeiro`

---

## 🚀 Performance

| Cenário | Antes | Agora | Ganho |
|---------|-------|-------|-------|
| Dashboard completo (1ª vez) | 3.5s | 2.1s | **40%** |
| Dashboard (80% cache hit) | 3.5s | 0.4s | **88%** |
| Card individual (cache) | 200ms | 5ms | **97%** |

**LLM Planning**: 100-150ms overhead, mas otimiza ordem (só ativa com >5 cards)

---

## 🔄 Migração (Opcional)

Se quiser usar nova API:

**Antes**:
```ts
const data = await fetch('/kpi-monthly?cnpj=' + cnpj).then(r => r.json());
```

**Agora** (loading progressivo):
```ts
// 1. Carregar cards críticos primeiro
const critical = await fetch('/dashboard-smart', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ cnpj, cards: ['total_caixa', 'disponivel'] })
}).then(r => r.json());
updateUI(critical.cards);

// 2. Carregar resto depois
const rest = await fetch('/dashboard-smart', {
  method: 'POST',
  body: JSON.stringify({ cnpj, cards: ['runway', 'burn_rate', 'cashflow_projection'] })
}).then(r => r.json());
updateUI(rest.cards);
```

---

## 🛠️ Cache Management

Invalidar cache de empresa:
```sql
UPDATE card_processing_queue
SET expires_at = NOW()
WHERE company_cnpj = '12.345.678/0001-90';
```

Invalidar card específico:
```sql
UPDATE card_processing_queue
SET expires_at = NOW()
WHERE card_type = 'total_caixa' AND company_cnpj = '12.345.678/0001-90';
```

---

## 📝 Notas

1. **Zero breaking changes**: `/kpi-monthly` funciona igual
2. **Novo endpoint é opcional**: Use `/dashboard-smart` se quiser cache/otimização
3. **Cache TTL**: 15min-360min dependendo do card
4. **Timeout**: 30s max (retorna parcial se necessário, status 206)
5. **Retry**: 3 tentativas automáticas por card
6. **Workers**: 10 simultâneos por tier

---

## 🔐 Segurança

- RLS habilitado em todas as tabelas de cards
- Isolamento por CNPJ
- Logs auditáveis de todo processamento
- Rate limiting via Supabase

---

**Docs completas**: Ver [finance-oraculo-backend/docs/CARD_SYSTEM.md](./docs/CARD_SYSTEM.md)
**Skill docs**: Ver [.claude/skills/financial-cards/SKILL.md](./.claude/skills/financial-cards/SKILL.md)
