# 📋 TAREFAS PENDENTES PARA 100% - Plano de Ação

**Data:** 09 Nov 2025  
**Status Atual:** 90% (Backend 100% + Frontend 80%)  
**Objetivo:** Atingir 100% completude  

---

## 🎯 RESUMO DO QUE FALTA

### Frontend: 10 Páginas (20%)

| # | Página | Prioridade | Complexidade | Tempo Est. |
|---|--------|-----------|--------------|-----------|
| 1 | `/admin/tokens` | 🔴 CRÍTICA | Média | 2h |
| 2 | `/empresas` | 🟡 ALTA | Média | 3h |
| 3 | `/grupos` | 🟡 ALTA | Média | 2h |
| 4 | `/relatorios/dre` | 🔴 CRÍTICA | Alta | 4h |
| 5 | `/relatorios/cashflow` | 🔴 CRÍTICA | Alta | 4h |
| 6 | `/relatorios/kpis` | 🟡 ALTA | Média | 3h |
| 7 | `/relatorios/payables` | 🟢 MÉDIA | Média | 2h |
| 8 | `/relatorios/receivables` | 🟢 MÉDIA | Média | 2h |
| 9 | `/whatsapp/conversations` | 🟢 MÉDIA | Média | 3h |
| 10 | `/whatsapp/templates` | 🟢 MÉDIA | Baixa | 2h |

**Total:** ~27 horas de desenvolvimento

---

## 🚀 PRIORIZAÇÃO EXECUTIVA

### FASE 1: CRÍTICO (6h) - Fazer HOJE
```
1. /admin/tokens (criar/revogar tokens) - 2h
2. /relatorios/dre (DRE mensal) - 4h
```

**Por quê?** 
- Tokens necessário para onboarding
- DRE é o relatório mais importante

### FASE 2: IMPORTANTE (8h) - AMANHÃ
```
3. /relatorios/cashflow (fluxo de caixa) - 4h
4. /empresas (listagem clientes) - 3h
5. /grupos (agrupamentos) - 1h (aproveita estrutura de empresas)
```

### FASE 3: COMPLEMENTAR (13h) - PRÓXIMA SEMANA
```
6. /relatorios/kpis (indicadores) - 3h
7. /relatorios/payables (contas a pagar) - 2h
8. /relatorios/receivables (contas a receber) - 2h
9. /whatsapp/conversations (chat) - 3h
10. /whatsapp/templates (templates) - 2h
```

---

## 📝 ESPECIFICAÇÕES POR PÁGINA

### 1. `/admin/tokens` - Gerenciador de Tokens
**Dados disponíveis:** via `getOnboardingTokens()` API  
**Componentes:** Table, CreateDialog, RevokeButton  
**Funções:** Criar, Listar, Revogar, Validar  
**Tempo:** 2h

### 2. `/relatorios/dre` - Demonstração de Resultado
**Dados:** `getDREReport(cnpj, mes, ano)` Edge Function  
**Visualização:** Tabela estruturada + Gráfico de composição  
**Cálculos:** Receita - Custos = Lucro  
**Tempo:** 4h

### 3. `/relatorios/cashflow` - Fluxo de Caixa
**Dados:** `getCashflowReport(cnpj, periodo)` Edge Function  
**Visualização:** Gráfico timeline + Tabela de projeção  
**Análise:** Entradas vs Saídas, Saldo projetado  
**Tempo:** 4h

### 4. `/empresas` - Listagem de Clientes
**Dados:** `getClients()` API + F360  
**Visualização:** Grid com cards ou tabela  
**Ações:** Visualizar detalhe, Sincronizar, Exportar  
**Tempo:** 3h

### 5. `/grupos` - Agrupamentos
**Dados:** `getClientGroups()` + criar/editar grupos  
**Visualização:** Tree ou expandable list  
**Ações:** Criar grupo, Adicionar empresa, Remover  
**Tempo:** 1h

### 6. `/relatorios/kpis` - Indicadores-chave
**Dados:** Lucro, Margem, Faturamento, Inadimplência  
**Visualização:** Cards com trending + mini-gráficos  
**Referência:** Já tem em `app/(app)/relatorios/kpis/page.tsx` (falta só dados)  
**Tempo:** 3h

### 7. `/relatorios/payables` - Contas a Pagar
**Dados:** `getPayablesReport()` API  
**Visualização:** Tabela com filtros + vencimentos  
**Ações:** Marcar paga, Adiar, Alertar  
**Tempo:** 2h

### 8. `/relatorios/receivables` - Contas a Receber
**Dados:** `getReceivablesReport()` API  
**Visualização:** Tabela com status + análise  
**Ações:** Cobrar (WhatsApp), Marcar paga, Alertar  
**Tempo:** 2h

### 9. `/whatsapp/conversations` - Chat
**Dados:** `getWhatsappConversations()` API  
**Visualização:** Já existe! (falta só popup de mensagem)  
**Ações:** Enviar resposta, Agendar  
**Tempo:** 3h

### 10. `/whatsapp/templates` - Templates de Mensagem
**Dados:** `getWhatsappTemplates()` API  
**Visualização:** Tabela com prévia  
**Ações:** Criar, Editar, Usar, Deletar  
**Tempo:** 2h

---

## 💻 STACK TÉCNICO

Todos usarão:
- **Data Fetching:** TanStack Query
- **Tabelas:** `<Table>` component (shadcn/ui)
- **Gráficos:** Recharts ou Chart.js
- **Forms:** React Hook Form + Zod
- **Styling:** Tailwind CSS
- **Icons:** Lucide React

**Exemplos de referência:**
- Tabela: `/admin/users/page.tsx`
- Gráfico: `/admin/analytics/mood-index/page.tsx`
- Form: `/profile/page.tsx`

---

## 🔧 RECURSOS JÁ DISPONÍVEIS

### Edge Functions Prontas (chamar via API)
```typescript
// Tokens
GET /functions/v1/get-onboarding-tokens
POST /functions/v1/create-onboarding-token
DELETE /functions/v1/revoke-onboarding-token

// Relatórios
GET /functions/v1/get-dre-report?cnpj=X&mes=11&ano=2025
GET /functions/v1/get-cashflow-report?cnpj=X&periodo=30days
GET /functions/v1/get-payables-report?cnpj=X
GET /functions/v1/get-receivables-report?cnpj=X

// Dados
GET /functions/v1/get-clients
GET /functions/v1/get-client-groups
GET /functions/v1/get-whatsapp-conversations
GET /functions/v1/get-whatsapp-templates
```

### Componentes Reutilizáveis
```tsx
<Card> - Container base
<Table> - Tabelas estruturadas
<Badge> - Status indicators
<Button> - Ações
<Dialog> - Modais
<Select> - Dropdowns
<Input> - Inputs
```

---

## 📊 MÉTRICAS DE CONCLUSÃO

| Fase | Páginas | Status | % Total |
|------|---------|--------|---------|
| ✅ Backend | - | 100% | 100% |
| ✅ Frontend Base | 7 | 100% | 100% |
| ⏳ Fase 1 (Crítico) | 2 | 0% | 90→95% |
| ⏳ Fase 2 (Importante) | 3 | 0% | 95→97% |
| ⏳ Fase 3 (Complementar) | 5 | 0% | 97→100% |

---

## 📋 PRÓXIMAS AÇÕES

### HOJE (Fase 1 - 6h)
- [ ] Criar `/admin/tokens`
- [ ] Criar `/relatorios/dre`
- [ ] Testar ambas

### AMANHÃ (Fase 2 - 8h)
- [ ] Criar `/relatorios/cashflow`
- [ ] Criar `/empresas`
- [ ] Criar `/grupos`
- [ ] Testar

### PRÓXIMA SEMANA (Fase 3 - 13h)
- [ ] Complementar relatórios
- [ ] WhatsApp completo
- [ ] Testes E2E
- [ ] Deploy staging

---

## 🎯 RESULTADO FINAL

Quando as 10 páginas estiverem prontas:

```
✅ Backend: 100% (12 Edge Functions)
✅ Frontend: 100% (17 páginas)
✅ N8N: 5/20 workflows (25%)
✅ Documentação: 100%
✅ Testes: 100%
✅ Segurança: 100%

🟢 SISTEMA: 100% FUNCIONAL
🚀 PRONTO: PRODUÇÃO
```

---

**Próximo passo:** Começar Fase 1 (6h) para atingir 95% hoje.

