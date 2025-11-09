# 📊 RELATÓRIO EXECUTIVO - PRONTO PARA CODEX

**Status:** ✅ Especificações completas para implementação  
**Prioridade:** 🔴 URGENTE - Terminar hoje  
**Estimado:** 4-5 horas  

---

## 🎯 O QUE FAZER

Criar uma página `/dashboard/executivo` que mostra ao empresário BPO Financeiro a realidade financeira completa em tempo real, com foco em ação.

---

## 📋 ESPECIFICAÇÕES TÉCNICAS

### Rota
```
URL: /dashboard/executivo
Componente: app/(app)/dashboard/executivo/page.tsx
Autenticação: Requer login
```

### Layout (10 Seções)

| # | Seção | Componentes | Dados |
|---|-------|------------|-------|
| 1 | **Cards de Resumo** | 6 cards (Saldo, Lucro, Margem, etc) | `/api/dashboard/executive-summary` |
| 2 | **Alertas Críticos** | Lista expansível com 3-5 alertas | `/api/dashboard/alerts` |
| 3 | **Previsão Caixa** | Gráfico linha + Tabela 7 dias | `/api/dashboard/cashflow-forecast` |
| 4 | **Análise Margens** | Top 5 lucrativos + Bottom 3 | `/api/dashboard/client-margins` |
| 5 | **Checklist Diário** | 5 seções com 24 confirmações | `/api/dashboard/daily-checklist` |
| 6 | **Sincronização** | 3 tabelas (F360 vs Omie vs Banco) | `/api/dashboard/system-sync` |
| 7 | **Oportunidades** | 4 cards com ações | `/api/dashboard/opportunities` |
| 8 | **Evolução Mensal** | 4 gráficos/gauges | `/api/dashboard/monthly-evolution` |
| 9 | **Resumo Executivo** | 1 card resumo completo | Consolidado |
| 10 | **Footer** | Botões: Atualizar, PDF, WhatsApp | Ações |

---

## 🎨 DESIGN DETALHADO

### Seção 1: Cards de Resumo (Topo)
```
┌──────────────────┬──────────────────┬──────────────────┐
│ Saldo Disponível │ Inadimplência    │ Receita (Mês)    │
│ R$ 120.000       │ R$ 8.500 (5%)    │ R$ 250.000       │
│ 🟢 Normal        │ 🟡 Atenção       │ ✅ 99.4% meta    │
│ ↗️ up 20%        │ ↗️ +1.2%         │ ↗️ on track      │
└──────────────────┴──────────────────┴──────────────────┘

┌──────────────────┬──────────────────┬──────────────────┐
│ Custos (Mês)     │ Lucro (Mês)      │ Margem %         │
│ R$ 180.000       │ R$ 70.000        │ 28%              │
│ ✅ 99.6% orç     │ ✅ 99% meta      │ 🟢 Estável       │
│ → Controlado     │ → on track       │ → Saudável       │
└──────────────────┴──────────────────┴──────────────────┘
```

**Cores:**
- 🟢 Verde: Normal, OK, Meta atingida
- 🟡 Amarelo: Atenção, Próximo ao limite
- 🔴 Vermelho: Crítico, Ação necessária

### Seção 2: Alertas Críticos
```
┌─ 🚨 ATENÇÃO NECESSÁRIA (3 alertas críticos) ─────┐
│                                                   │
│ 1️⃣ ⚡ Saldo vai negativar em 3 dias             │
│    Quarta-feira: R$ 62.000 (🔴 CRÍTICO)         │
│    → Ação: Antecipar recebimento de clientes    │
│    [AGIR AGORA]                                 │
│                                                   │
│ 2️⃣ ⚡ Impostos vencendo em 2 dias               │
│    ICMS: R$ 5.000 (vence 11/11)                │
│    IRPJ: R$ 3.000 (vence 12/11)                │
│    → Ação: Aprovar pagamentos                   │
│    [APROVAR AGORA]                              │
│                                                   │
│ 3️⃣ ⚡ Fornecedor bloqueado                      │
│    Acme LTDA: R$ 8.500 de débito               │
│    Bloqueou novas compras                       │
│    → Ação: Resolver com BPO urgentemente       │
│    [CHAMAR BPO]                                 │
│                                                   │
│ [Ver todos os alertas (8)]                       │
└───────────────────────────────────────────────────┘
```

**Comportamento:**
- Máx 3 alertas visíveis (críticos primeiro)
- Cada alerta é clickable → detalhes
- Cada alerta tem botão de ação contextual

### Seção 3: Previsão Caixa (7 Dias)

**Gráfico:**
```
R$ 200k ┤
R$ 180k ┤     ╱╲                ╱────╮
R$ 140k ┤────╱  ╲──────────────╱     
R$ 100k ┤                             
R$ 62k  ┤────────┐ 🔴                 
R$ 0k   ┤────────────────────────────
        └──┴──┴──┴──┴──┴──┴──┴──┴──
          Seg Ter Qua Qui Sex Sab Dom

Status: 🟡 SEMANA TENSA
```

**Tabela:**
```
Dia    | Data   | Saldo   | Entrada | Saída   | Status
-------|--------|---------|---------|---------|--------
Seg    | 10/11  | 140.000 | +50.000 | -30.000 | ✅ OK
Ter    | 11/11  | 110.000 | +20.000 | -50.000 | ⚠️ Atenção
Qua    | 12/11  | 62.000  | +10.000 | -58.000 | 🔴 CRÍTICO
Qui    | 13/11  | 95.000  | +80.000 | -47.000 | ⚠️ Atenção
Sex    | 14/11  | 180.000 | +50.000 | -15.000 | ✅ OK
Sab    | 15/11  | 175.000 | -       | -       | ✅ OK
Dom    | 16/11  | 172.000 | +10.000 | -13.000 | ✅ OK
```

### Seção 4: Análise de Margens

**Top 5 Lucrativos:**
```
Posição | Cliente           | Faturamento | Margem | Lucro    | Tendência
--------|-------------------|-------------|--------|----------|----------
1       | XPTO LTDA         | R$ 50.000   | 42%    | R$ 21k   | ↗️ +5%/mês
2       | Premium SA        | R$ 35.000   | 38%    | R$ 13.3k | → Estável
3       | Tech Solutions    | R$ 28.000   | 35%    | R$ 9.8k  | ↗️ +3%/mês
4       | Distribuição Grl  | R$ 45.000   | 32%    | R$ 14.4k | → Estável
5       | Comércio Varejo   | R$ 40.000   | 28%    | R$ 11.2k | ↘️ -2%/mês
```

**Bottom 3 com Problema:**
```
Posição | Cliente           | Faturamento | Margem | Lucro   | Ação Recomendada
--------|-------------------|-------------|--------|---------|------------------
-1      | Baixa Margem Co   | R$ 20.000   | 12%    | R$ 2.4k | ⚠️ Renegociar ou desativar
-2      | Alto Custo Ltd    | R$ 15.000   | 8%     | R$ 1.2k | ⚠️ Buscar fornecedor alt
-3      | Em Transição Inc  | R$ 10.000   | 5%     | R$ 500  | ⚠️ Avaliar continuação
```

### Seção 5: Checklist Diário

```
CAIXA & BANCO
  ☑️ Saldo reconciliado?              SIM
  ☑️ Transferências pendentes?        3 de R$ 50k
  ☑️ Banco bloqueou algo?             NÃO
  ☑️ Taxa bancária cobrada?           R$ 45

CONTAS A RECEBER
  ☑️ Clientes atrasados?              SIM - 5 clientes
  ☑️ Total em atraso?                 R$ 8.500 (5%)
  ☑️ Cobrança acionada?               PARCIALMENTE
  ☑️ Novo atraso hoje?                1 cliente (R$ 1.2k)

CONTAS A PAGAR
  ☑️ Fornecedores bloqueados?         1 - Acme LTDA
  ☑️ Pagamento vencido?               R$ 8.500
  ☑️ Próximo vencimento?              3 dias
  ☑️ Saldo suficiente?                SIM

PESSOAL & FOLHA
  ☑️ Folha confirmada?                NÃO - Próx. Terça
  ☑️ Valor da folha?                  R$ 45.000
  ☑️ Saldo para folha?                SIM - R$ 140k
  ☑️ Adiantamentos solicitados?       1 - R$ 2.000

IMPOSTOS & COMPLIANCE
  ☑️ Impostos vencendo?               SIM - 2 em 2 dias
  ☑️ Documentação em dia?             SIM
  ☑️ NFe certificado ativo?           SIM
  ☑️ Multa fiscalizado?               NÃO

RESUMO: 🟡 ATENÇÃO NECESSÁRIA (3 itens)
```

### Seção 6: Sincronização de Sistemas

**Faturamento (F360 vs Omie vs Banco):**
```
Sistema  | Valor      | Status        | Divergência
---------|------------|---------------|-------------
F360     | R$ 250k    | ✅ Referência | -
Omie     | R$ 250k    | ✅ OK         | 0%
Banco    | R$ 248.5k  | ⚠️ Diverge    | -0.6% (OK)

Conclusão: ✅ SINCRONIZADO
```

**Custos (F360 vs Omie vs Banco):**
```
Sistema  | Valor      | Status        | Divergência
---------|------------|---------------|-------------
F360     | R$ 180k    | ✅ Referência | -
Omie     | R$ 178.5k  | ⚠️ Diverge    | -0.8% (OK)
Banco    | R$ 179.2k  | ✅ OK         | -0.4% (OK)

Conclusão: ⚠️ REVISAR OMIE
```

**Recebimentos (F360 vs Omie vs Banco):**
```
Sistema  | Valor      | Status        | Divergência
---------|------------|---------------|-------------
F360     | R$ 260k    | ✅ Referência | -
Omie     | R$ 235k    | 🔴 Diverge    | -9.6% (CRÍTICO)
Banco    | R$ 235k    | 🔴 Diverge    | -9.6% (CRÍTICO)

Conclusão: 🔴 INVESTIGAR URGENTE (R$ 25k faltando)
```

### Seção 7: Oportunidades

```
💰 SALDO ALTO - Oportunidade de Aplicação
   Saldo detectado: R$ 120.000
   Recomendação: Aplicar R$ 50k em CDB (vencimento 1 mês)
   Rentabilidade: ~1.2% = +R$ 600
   → [Executar Aplicação]

📈 CLIENTE EM CRESCIMENTO - Aumentar Linha
   Cliente: XPTO LTDA
   Crescimento: 5% ao mês (consistente)
   Recomendação: Aumentar limite de crédito
   Impacto: +R$ 5k de margem/mês
   → [Ver Detalhes]

🤝 FORNECEDOR COM DESCONTO - Aproveitar
   Fornecedor: Tech Solutions Inc
   Oferta: 3% desconto em pagamento adiantado
   Economia: -R$ 840/mês
   → [Negociar]

🎯 CLIENTE NÃO LUCRATIVO - Agir
   Cliente: "Cliente em Transição"
   Margem: 5% apenas
   Recomendação: Renegociar ou desativar
   Impacto se desativar: +R$ 9.500/mês
   → [Renegociar / Desativar]
```

### Seção 8: Evolução Mensal

**Receita Acumulada:**
```
Previsto: R$ 250.000
Realizado: R$ 248.500
Progresso: ██████████ 99.4% ✅
Status: Atingindo meta
```

**Custos Acumulados:**
```
Orçado: R$ 180.000
Realizado: R$ 179.200
Progresso: ██████████ 99.6% ✅
Status: Dentro do orçamento
```

**Lucro Acumulado:**
```
Previsto: R$ 70.000
Realizado: R$ 69.300
Progresso: ██████████ 99.0% ✅
Status: Meta praticamente atingida
```

**Margem:**
```
Alvo: 28%
Atual: 27.9%
Progresso: ████████████ 99.6% ✅
Status: Saudável e estável
```

### Seção 9: Resumo Executivo (1 Página)

```
╔════════════════════════════════════════════════════════╗
║           RESUMO EXECUTIVO - 09/11/2025 14:35         ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  📊 SAÚDE FINANCEIRA: 🟢 OPERACIONAL NORMAL          ║
║                                                        ║
║  💰 NÚMEROS CRÍTICOS:                                 ║
║     • Saldo: R$ 120.000 (↗️ up 20% vs semana)        ║
║     • Lucro: R$ 69.300 (99% da meta mensal)          ║
║     • Inadimplência: 5% (R$ 8.500 em atraso)         ║
║     • Margem: 27.9% (estável, meta 28%)              ║
║                                                        ║
║  🚨 ATENÇÃO NECESSÁRIA - 3 ITENS CRÍTICOS:           ║
║     1. Saldo crítico na QUARTA (R$ 62k)              ║
║        → AÇÃO: Antecipar recebimento de clientes     ║
║     2. Impostos vencendo em 2 DIAS (R$ 8k)           ║
║        → AÇÃO: Aprovar pagamentos hoje               ║
║     3. Fornecedor BLOQUEADO (Acme LTDA)              ║
║        → AÇÃO: Resolver com BPO urgentemente         ║
║                                                        ║
║  💡 OPORTUNIDADES - 4 AÇÕES RECOMENDADAS:            ║
║     • Aplicar R$ 50k em CDB (+R$ 600/mês)            ║
║     • Aumentar cliente XPTO (crescimento 5%/mês)     ║
║     • Renegociar desconto fornecedor (-R$ 840/mês)   ║
║     • Desativar cliente baixa margem (+R$ 9.5k/mês)  ║
║                                                        ║
║  📅 SEMANA À FRENTE:                                 ║
║     Dias 11-13 serão TENSOS (folha + impostos)       ║
║     → Recomendação: Monitorar saldo diariamente      ║
║                                                        ║
║  ✅ RECOMENDAÇÃO DO DIA:                             ║
║     PRIORIDADE 1: Resolver fornecedor bloqueado      ║
║     PRIORIDADE 2: Confirmar impostos a pagar         ║
║     PRIORIDADE 3: Investigar divergência de R$ 25k   ║
║                                                        ║
╚════════════════════════════════════════════════════════╝

[Imprimir] [Exportar PDF] [Compartilhar WhatsApp]
```

---

## 🔌 APIs NECESSÁRIAS (8 Endpoints)

```javascript
// Backend deve fornecer (já existentes ou criar)

1. GET /api/dashboard/executive-summary
   Response: {
     saldo: number,
     lucro: number,
     margem: number,
     inadimplencia: number,
     receita: number,
     custos: number,
     meta_receita_percent: number,
     meta_lucro_percent: number
   }

2. GET /api/dashboard/alerts
   Response: [
     {
       id: string,
       priority: 'critical' | 'warning' | 'info',
       title: string,
       description: string,
       action: string,
       actionUrl?: string,
       timestamp: date
     }
   ]

3. GET /api/dashboard/cashflow-forecast
   Response: [
     {
       dia: string,
       data: string,
       saldo: number,
       entrada: number,
       saida: number,
       status: 'ok' | 'warning' | 'critical'
     }
   ] // 7 dias

4. GET /api/dashboard/client-margins
   Response: {
     top5: [
       {
         cliente: string,
         faturamento: number,
         margem: number,
         lucro: number,
         tendencia: 'up' | 'down' | 'stable',
         tendencia_percent: number
       }
     ],
     bottom3: [
       {
         cliente: string,
         faturamento: number,
         margem: number,
         lucro: number,
         acao: string
       }
     ]
   }

5. GET /api/dashboard/daily-checklist
   Response: {
     caixa: [{ item: string, status: string, value: string }],
     contas_receber: [{ item: string, status: string, value: string }],
     contas_pagar: [{ item: string, status: string, value: string }],
     pessoal: [{ item: string, status: string, value: string }],
     impostos: [{ item: string, status: string, value: string }]
   }

6. GET /api/dashboard/system-sync
   Response: {
     faturamento: {
       f360: number,
       omie: number,
       banco: number,
       status: 'ok' | 'warning' | 'error'
     },
     custos: {
       f360: number,
       omie: number,
       banco: number,
       status: 'ok' | 'warning' | 'error'
     },
     recebimentos: {
       f360: number,
       omie: number,
       banco: number,
       status: 'ok' | 'warning' | 'error'
     }
   }

7. GET /api/dashboard/opportunities
   Response: [
     {
       id: string,
       icon: string,
       title: string,
       description: string,
       value: number,
       action: string,
       actionUrl?: string
     }
   ]

8. GET /api/dashboard/monthly-evolution
   Response: {
     receita: { previsto: number, realizado: number, percent: number },
     custos: { previsto: number, realizado: number, percent: number },
     lucro: { previsto: number, realizado: number, percent: number },
     margem: { alvo: number, atual: number, percent: number }
   }
```

---

## ⚡ FUNCIONALIDADES

- ✅ Real-time updates (a cada 5 minutos)
- ✅ Auto-refresh com spinner
- ✅ Exportar para PDF
- ✅ Compartilhar no WhatsApp (resumo)
- ✅ Filtro por período (hoje, semana, mês)
- ✅ Responsivo (mobile/tablet/desktop)
- ✅ Dark mode suportado
- ✅ Todos os alertas com clickable → detalhes + ações
- ✅ Expandir/colapsar seções

---

## 📱 ESTRUTURA DE COMPONENTES

```typescript
// app/(app)/dashboard/executivo/page.tsx

export default function ExecutivoDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Header />
      
      {/* 1. Cards de Resumo */}
      <SummaryCards />
      
      {/* 2. Alertas Críticos */}
      <CriticalAlerts />
      
      {/* 3. Previsão Caixa */}
      <CashflowForecast />
      
      {/* 4. Análise Margens */}
      <MarginAnalysis />
      
      {/* 5. Checklist */}
      <DailyChecklist />
      
      {/* 6. Sincronização */}
      <SystemSync />
      
      {/* 7. Oportunidades */}
      <Opportunities />
      
      {/* 8. Evolução Mensal */}
      <MonthlyEvolution />
      
      {/* 9. Resumo Executivo */}
      <ExecutiveBrief />
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
```

---

## 🏁 CHECKLIST FINAL

```
DESENVOLVIMENTO
  ☐ Criar rota /dashboard/executivo
  ☐ Implementar 9 componentes principais
  ☐ Integrar 8 APIs
  ☐ Real-time updates
  ☐ Export PDF
  ☐ Share WhatsApp
  ☐ Mobile responsive
  ☐ Dark mode
  ☐ Error handling
  ☐ Loading states

TESTES
  ☐ Todos dados aparecem corretos
  ☐ Cores corretas por status
  ☐ Gráficos renderizam
  ☐ Responsividade OK
  ☐ Cliques funcionam
  ☐ Export funciona
  ☐ Share funciona
  ☐ Performance OK (< 2s load)

ENTREGA
  ☐ Código clean
  ☐ Documentação inline
  ☐ Sem erros no console
  ☐ Deployment OK
```

---

## 📚 REFERÊNCIA COMPLETA

Veja os documentos detalhados:
1. **RELATORIO_EXECUTIVO_CLIENTE_BPO.md** - Specs completas com mockups
2. **CODEX_IMPLEMENTAR_RELATORIO_EXECUTIVO.md** - Guia técnico passo a passo
3. **.plan.md** - Timeline geral do projeto

---

**Pronto para implementar! 🚀**

**Tempo estimado:** 4-5 horas  
**Dificuldade:** Média (design + integração de APIs)  
**Impacto:** ALTÍSSIMO (core do sistema para o cliente)

