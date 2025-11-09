# 📋 CODEX - IMPLEMENTAR RELATÓRIO EXECUTIVO

> **Instruções detalhadas para criar o Dashboard Executivo para cliente BPO Financeiro**

---

## 🎯 O QUE FAZER

Criar uma página `/dashboard/executivo` que mostra ao empresário a realidade financeira completa em tempo real.

**Referência completa:** `RELATORIO_EXECUTIVO_CLIENTE_BPO.md`

---

## 📐 ESTRUTURA DA PÁGINA

```
/dashboard/executivo (nova rota)
```

### Layout (Top to Bottom)

#### 1. HEADER
```
Título: "Relatório Executivo - 09/11/2025 • 14:35"
Botões: [Atualizar] [Exportar PDF] [Compartilhar WhatsApp] [Filtros]
```

#### 2. CARDS DE RESUMO (6 Cards)
```
┌─ Saldo Disponível     ─┬─ Inadimplência     ─┬─ Receita Mês   ─┐
│ R$ 120.000            │ R$ 8.500 (5%)       │ R$ 250.000     │
│ 🟢 Normal             │ 🟡 Atenção          │ ✅ 99.4% meta   │
└──────────────────────┼─────────────────────┼─────────────────┘

┌─ Custos Mês          ─┬─ Lucro Mês         ─┬─ Margem %      ─┐
│ R$ 180.000           │ R$ 70.000           │ 28%             │
│ ✅ 99.6% orç         │ ✅ 99% meta         │ ↗️ Crescendo    │
└──────────────────────┴─────────────────────┴─────────────────┘
```

**Componentes a usar:**
```typescript
// Reutilizar DashboardCardsGrid + Card components
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Para cada card:
<Card>
  <div className="flex justify-between items-start">
    <div>
      <h3 className="text-sm text-gray-600">Saldo Disponível</h3>
      <p className="text-2xl font-bold text-gray-900">R$ 120.000</p>
      <Badge variant={status}>Status</Badge>
    </div>
    <TrendIcon /> {/* up/down arrow */}
  </div>
</Card>
```

#### 3. ALERTAS CRÍTICOS (Seção expansível)
```
🔴 ATENÇÃO NECESSÁRIA (3 alertas)

├─ ⚡ Saldo crítico em 3 dias
│  └─ Quarta R$ 62k. Ação: Antecipar recebimento
│
├─ ⚡ Impostos vencendo em 2 dias
│  └─ ICMS R$ 5k, IRPJ R$ 3k. Ação: Aprovar pagamentos
│
└─ ⚡ Fornecedor bloqueado
   └─ Acme LTDA com débito R$ 8.5k. Ação: Resolver com BPO

[Ver todos (5)]
```

**Componentes:**
```typescript
// Usar componentes de alerta existentes
// Considerar criar AlertCard reutilizável

interface Alert {
  id: string;
  priority: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  action: string;
  actionUrl?: string;
}

// Renderizar como lista com cores
alerts.map(alert => (
  <div className={`border-l-4 border-${alert.priority}`}>
    <h4>{alert.title}</h4>
    <p>{alert.description}</p>
    <button>{alert.action}</button>
  </div>
))
```

#### 4. PREVISÃO CAIXA (7 Dias)
```
Gráfico + Tabela lado a lado

GRÁFICO (Linha com cores)
  R$ 140k ┤     ╱──────╲          
  R$ 100k ┤────╱        ╲────┐   
  R$ 62k  ┤────────────┐  🔴   
           └──┴──┴──┴──┴──┴──┴──
             Seg Ter Qua Qui Sex

TABELA
  Seg: R$ 140k ✅ | Entrada +50k | Saída -30k
  Ter: R$ 110k ⚠️  | Entrada +20k | Saída -50k
  Qua: R$ 62k  🔴 | Entrada +10k | Saída -58k
  ... (7 linhas total)
```

**Componentes:**
```typescript
// Reutilizar GrafanaLineChart ou similar
// Adicionar tabela abaixo

import { GrafanaLineChart } from '@/components/admin-security/grafana-line-chart';
import { DenseTable } from '@/components/dense-table';

// Dados de entrada
const forecastData = [
  { dia: 'Seg', data: '10/11', saldo: 140000, entrada: 50000, saida: 30000, status: 'ok' },
  { dia: 'Ter', data: '11/11', saldo: 110000, entrada: 20000, saida: 50000, status: 'warning' },
  // ... 7 dias
];

// Renderizar
<GrafanaLineChart data={forecastData} />
<DenseTable data={forecastData} />
```

#### 5. ANÁLISE DE MARGENS (Top + Bottom)
```
┌─ TOP 5 MAIS LUCRATIVOS ──────────────┐
│ 1. XPTO LTDA        42% | ↗️ +5%     │
│ 2. Premium SA       38% | → Estável │
│ 3. Tech Inc         35% | ↗️ +3%    │
│ ...                                  │
└──────────────────────────────────────┘

┌─ BOTTOM 3 COM PROBLEMA ──────────────┐
│ -1. Baixa Margem    12% | ⚠️ Agir    │
│ -2. Alto Custo      8%  | ⚠️ Agir    │
│ -3. Em Transição    5%  | ⚠️ Agir    │
└──────────────────────────────────────┘
```

**Componentes:**
```typescript
// Usar DenseTable ou criar MarginsCard
// Top: sort desc by margin
// Bottom: sort asc by margin

interface ClientMargin {
  cliente: string;
  margem: number;
  lucro: number;
  tendencia: 'up' | 'down' | 'stable';
}

const topClients = clientes.sort((a, b) => b.margem - a.margem).slice(0, 5);
const bottomClients = clientes.sort((a, b) => a.margem - b.margem).slice(0, 3);
```

#### 6. CHECKLIST DIÁRIO (Confirmações)
```
CHECKLIST HOJE (09/11)
═══════════════════════════════════════

CAIXA & BANCO
  ☑️ Saldo reconciliado?      SIM
  ☑️ Transferências pendentes? 3 de R$ 50k
  ☑️ Banco bloqueou?          NÃO
  ☑️ Taxa bancária?           R$ 45

... (24 itens no total)
```

**Componentes:**
```typescript
// Criar ChecklistSection reutilizável

interface ChecklistItem {
  id: string;
  label: string;
  status: 'ok' | 'warning' | 'critical' | 'pending';
  value: string;
  action?: string;
}

const sections = [
  {
    title: 'CAIXA & BANCO',
    items: [
      { id: 'saldo', label: 'Saldo reconciliado?', status: 'ok', value: 'SIM' },
      // ...
    ]
  },
  // ... 5 seções no total
];

// Renderizar
sections.map(section => (
  <div>
    <h3>{section.title}</h3>
    {section.items.map(item => (
      <div className="flex justify-between">
        <span>{item.label}</span>
        <Badge variant={item.status}>{item.value}</Badge>
      </div>
    ))}
  </div>
))
```

#### 7. SINCRONIZAÇÃO SISTEMAS (3 Tabelas)
```
FATURAMENTO
┌──────────────┬──────────┬─────────┐
│ Sistema      │ Valor    │ Status  │
├──────────────┼──────────┼─────────┤
│ F360         │ 250k     │ ✅ OK   │
│ Omie         │ 250k     │ ✅ OK   │
│ Banco        │ 248.5k   │ ⚠️ -0.6%│
└──────────────┴──────────┴─────────┘

... (3 tabelas)
```

#### 8. OPORTUNIDADES (4 Cards)
```
💰 Saldo Alto → Aplicação
   R$ 50k em CDB = +R$ 600
   [Executar]

📈 Cliente em Crescimento
   XPTO LTDA: +5% ao mês
   [Ver detalhes]

... (4 oportunidades)
```

#### 9. EVOLUÇÃO MENSAL (4 Gráficos)
```
PERFORMANCE DO MÊS
═══════════════════════════════════════

Receita         Custos          Lucro           Margem
██████████ 99%  ██████████ 99%  ██████████ 99%  27.9%
Meta: 100%      Orç: 100%       Meta: 100%      Alvo: 28%
```

#### 10. RESUMO EXECUTIVO (1 Página)
```
╔════════════════════════════════════╗
║  RESUMO EXECUTIVO - 09/11/2025   ║
╠════════════════════════════════════╣
║ Status: 🟢 OPERACIONAL NORMAL     ║
║                                    ║
║ Números Importantes:              ║
║  • Saldo: R$ 120k (up 20%)        ║
║  • Lucro: R$ 69.3k (99% meta)     ║
║  • Inadimplência: 5%              ║
║  • Margem: 27.9% (estável)        ║
║                                    ║
║ Atenção Necessária: 3 itens       ║
║ Oportunidades: 4 ações            ║
║ Recomendação: [Ver ações]         ║
╚════════════════════════════════════╝
```

---

## 🔌 APIS NECESSÁRIAS

Você vai precisar destas 8 APIs:

```javascript
// 1. Resumo Geral
GET /api/dashboard/executive-summary
Response: { saldo, lucro, margin, inadimplencia, meta_percentual }

// 2. Alertas Críticos
GET /api/dashboard/alerts?priority=critical
Response: [ { id, priority, title, description, action } ]

// 3. Previsão Caixa 7 Dias
GET /api/dashboard/cashflow-forecast
Response: [ { dia, data, saldo, entrada, saida, status } ]

// 4. Análise Margens
GET /api/dashboard/client-margins
Response: { top5: [], bottom3: [] }

// 5. Checklist Diário
GET /api/dashboard/daily-checklist
Response: { caixa: [], contas_receber: [], ... }

// 6. Sincronização Sistemas
GET /api/dashboard/system-sync
Response: { faturamento: {}, custos: {}, recebimentos: {} }

// 7. Oportunidades
GET /api/dashboard/opportunities
Response: [ { title, description, value, action } ]

// 8. Evolução Mensal
GET /api/dashboard/monthly-evolution
Response: { receita: { previsto, realizado, % }, ... }
```

---

## 🎨 COMPONENTES EXISTENTES A REUTILIZAR

```typescript
✅ DashboardCardsGrid      // Para os 6 cards de resumo
✅ Card                    // Para componentes individuais
✅ Badge                   // Para status badges
✅ Button                  // Para ações
✅ DenseTable              // Para tabelas
✅ GrafanaLineChart        // Para gráficos
✅ PeriodPicker            // Para filtro de período
✅ Tabs                    // Para seções (se necessário)
```

---

## 📋 CHECKLIST DE DESENVOLVIMENTO

```
PÁGINA /dashboard/executivo

ESTRUTURA
  ☐ Criar arquivo app/(app)/dashboard/executivo/page.tsx
  ☐ Criar layout responsivo
  ☐ Criar componentes reutilizáveis

CARDS DE RESUMO
  ☐ 6 cards com números principais
  ☐ Cores por status (🟢🟡🔴)
  ☐ Trending icons (↗️↘️→)

ALERTAS CRÍTICOS
  ☐ Listar alertas com prioridade
  ☐ Clickable para detalhes
  ☐ Link para ação

PREVISÃO CAIXA
  ☐ Gráfico de linha (7 dias)
  ☐ Tabela com valores
  ☐ Cores por status

ANÁLISE MARGENS
  ☐ Tabela top 5
  ☐ Tabela bottom 3
  ☐ Tendências visuais

CHECKLIST
  ☐ 5 seções expansíveis
  ☐ 24 itens total
  ☐ Status indicators

SINCRONIZAÇÃO
  ☐ 3 tabelas comparativas
  ☐ Divergências destacadas
  ☐ Status visual

OPORTUNIDADES
  ☐ 4 cards com ações
  ☐ Valores de impacto
  ☐ Botões de ação

EVOLUÇÃO MENSAL
  ☐ 4 gráficos/gauges
  ☐ Performance vs meta
  ☐ Tendências

RESUMO EXECUTIVO
  ☐ Card 1-página
  ☐ Dados consolidados
  ☐ Ações recomendadas

FUNCIONALIDADES
  ☐ Real-time updates (a cada 5 min)
  ☐ Auto-refresh
  ☐ Exportar PDF
  ☐ Compartilhar WhatsApp
  ☐ Filtro por período
  ☐ Mobile responsive
  ☐ Dark mode

DADOS & PERFORMANCE
  ☐ Integrar 8 APIs
  ☐ Caching de dados
  ☐ Loading states
  ☐ Error handling
  ☐ Tratamento de dados vazios
```

---

## 🚀 PRIORIDADE DE IMPLEMENTAÇÃO

### Fase 1 (Hoje - 2h)
- [x] Cards de resumo (6 cards)
- [x] Alertas críticos
- [x] Previsão caixa (gráfico + tabela)

### Fase 2 (Hoje - 1h)
- [ ] Análise margens (top + bottom)
- [ ] Checklist diário

### Fase 3 (Amanhã - 1.5h)
- [ ] Sincronização sistemas
- [ ] Oportunidades
- [ ] Evolução mensal

### Fase 4 (Amanhã - 1h)
- [ ] Resumo executivo
- [ ] Funcionalidades (export, share, refresh)
- [ ] Mobile responsive

---

## 💡 DICAS IMPORTANTES

1. **Real-time:** Use `useEffect` + `setInterval` para atualizar a cada 5 min
2. **Performance:** Cache dados com `useMemo`
3. **Estado:** Use `useState` para expand/collapse de seções
4. **Responsividade:** Cards em 2 colunas no mobile, 3+ no desktop
5. **Cores:** Use a paleta existente (verde/amarelo/vermelho para status)
6. **Dados:** Trate valores vazios/undefined gracefully
7. **Loading:** Mostre skeleton enquanto carrega

---

## 📞 REFERÊNCIA

Leia antes de começar:
- `RELATORIO_EXECUTIVO_CLIENTE_BPO.md` (este doc tem todas as specs)
- `AUTOMACOES_ESTRATEGICAS_BPO.md` (contexto do cliente BPO)
- `.plan.md` (timeline geral)

---

**Este dashboard é a visualização perfeita para um empresário com BPO Financeiro! 🧠💡**

