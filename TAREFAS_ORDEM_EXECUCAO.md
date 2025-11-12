# 📋 Lista de Tarefas - Ordem de Execução

**Data:** 15 de Janeiro de 2025
**Status:** PLANO DE AÇÃO CONSOLIDADO
**Objetivo:** Levar o projeto de 88% para 100%

---

## 🎯 Visão Geral

**Status Atual:** 88% completo
- ✅ Backend: 98%
- ⚠️ Frontend: 70%
- ⚠️ Integrações: 95%
- 🟡 DevOps: 80%

**Meta:** 100% em todas as áreas

---

## 🔴 PRIORIDADE MÁXIMA - FAZER HOJE (2h)

### 1. Corrigir API Omie - Endpoint 404 ⏱️ 30 min
**Status:** ✅ CAUSA IDENTIFICADA

**Arquivo:** `finance-oraculo-backend/supabase/functions/sync-omie/index.ts`

**Mudança (linha ~55):**
```typescript
// ❌ ERRADO (causa 404)
const BASE_URL = 'https://app.omie.com.br/api/v1/geral/contacorrente/'

// ✅ CORRETO
const BASE_URL = 'https://app.omie.com.br/api/v1/financas/contacorrente/'
```

**Passos:**
1. Editar arquivo `sync-omie/index.ts`
2. Trocar `/geral/` por `/financas/`
3. Deploy: `supabase functions deploy sync-omie`
4. Testar: `curl -X POST https://...supabase.co/functions/v1/sync-omie`

---

### 2. Investigar F360 Sincronização ⏱️ 1h
**Status:** ⚠️ EM INVESTIGAÇÃO

**Problema:** Função retorna `synced: 0` registros

**Ações:**
1. Testar tokens manualmente via curl
2. Verificar período de busca (ampliar de 30 para 365 dias)
3. Adicionar logs detalhados
4. Analisar response da API F360

**Comando teste:**
```bash
TOKEN="174d090d-50f4-4e82-bf7b-1831b74680bf"
curl -X GET "https://api.f360.com.br/v1/reports/dre?start_date=2025-01-01&end_date=2025-12-31" \
  -H "Authorization: Bearer $TOKEN" \
  -v | jq
```

---

## 🟡 FASE 1: FRONTEND CRÍTICO - AMANHÃ (6h)

### 3. Página `/admin/tokens` ⏱️ 2h
**Prioridade:** 🔴 CRÍTICA

**Funcionalidade:**
- Criar tokens de onboarding
- Listar tokens ativos
- Revogar tokens
- Validar tokens

**API Backend:** ✅ JÁ EXISTE
- GET /onboarding-tokens
- POST /onboarding-tokens
- DELETE /onboarding-tokens/:id

**Componentes:**
- Table (shadcn/ui)
- Dialog para criar
- Button para revogar

---

### 4. Página `/relatorios/dre` ⏱️ 4h
**Prioridade:** 🔴 CRÍTICA

**Funcionalidade:**
- Demonstração de Resultado do Exercício
- Filtro por mês/ano
- Tabela estruturada (Receitas, Custos, Lucro)
- Gráfico de composição

**API Backend:** ✅ JÁ EXISTE
- GET /relatorios-dre?cnpj=X&mes=11&ano=2025

**Componentes:**
- Select mês/ano
- Table estruturada
- Recharts para gráficos
- Cards para totais

---

## 🟢 FASE 2: FRONTEND IMPORTANTE - DIA 3 (8h)

### 5. Página `/relatorios/cashflow` ⏱️ 4h
**Prioridade:** 🔴 CRÍTICA

**Funcionalidade:**
- Fluxo de caixa projetado
- Timeline de entradas/saídas
- Gráfico de projeção
- Saldo inicial/final

**API Backend:** ✅ JÁ EXISTE
- GET /relatorios-cashflow?cnpj=X&periodo=30days

---

### 6. Página `/empresas` ⏱️ 3h
**Prioridade:** 🟡 ALTA

**Funcionalidade:**
- Listagem de clientes
- Grid com cards ou tabela
- Filtros (ativas, F360, Omie)
- Ações: Ver detalhe, Sincronizar

**API Backend:** ✅ JÁ EXISTE
- GET /empresas-list
- GET /targets

---

### 7. Página `/grupos` ⏱️ 1h
**Prioridade:** 🟡 ALTA

**Funcionalidade:**
- Listagem de grupos empresariais
- Criar grupo
- Adicionar/remover empresas
- Tree ou expandable list

**API Backend:** ✅ PARCIALMENTE
- POST /group-aliases-create ✅
- GET /group-aliases ⏳ (implementar se necessário)

---

## 🔵 FASE 3: FRONTEND COMPLEMENTAR - SEMANA 2 (13h)

### 8. Página `/relatorios/kpis` ⏱️ 3h
**Prioridade:** 🟡 ALTA

**Funcionalidade:**
- Indicadores-chave
- Cards com trending
- Mini-gráficos
- Comparação mensal

**API Backend:** ✅ JÁ EXISTE
- GET /relatorios-kpis?cnpj=X

---

### 9. Página `/relatorios/payables` ⏱️ 2h
**Prioridade:** 🟢 MÉDIA

**Funcionalidade:**
- Contas a pagar
- Tabela com vencimentos
- Filtros por status
- Ações: Marcar paga, Adiar

**API Backend:** ✅ JÁ EXISTE
- GET /relatorios-payables?cnpj=X&status=pendente

---

### 10. Página `/relatorios/receivables` ⏱️ 2h
**Prioridade:** 🟢 MÉDIA

**Funcionalidade:**
- Contas a receber
- Análise de inadimplência
- Cobrar via WhatsApp
- Marcar como paga

**API Backend:** ✅ JÁ EXISTE
- GET /relatorios-receivables?cnpj=X&status=pendente

---

### 11. Página `/whatsapp/conversations` ⏱️ 3h
**Prioridade:** 🟢 MÉDIA

**Funcionalidade:**
- Chat de conversas WhatsApp
- Lista de conversas
- Enviar resposta
- Popup de mensagem

**API Backend:** ✅ JÁ EXISTE
- GET /whatsapp-conversations
- POST /whatsapp-send

---

### 12. Página `/whatsapp/templates` ⏱️ 2h
**Prioridade:** 🟢 MÉDIA

**Funcionalidade:**
- Templates de mensagem
- CRUD completo
- Prévia de template
- Variáveis dinâmicas

**API Backend:** ✅ JÁ EXISTE
- GET /whatsapp-templates

---

## 🛠️ FASE 4: ENDPOINTS OPCIONAIS (se necessário)

### 13. Implementar Endpoints Group Aliases ⏱️ 2-3h
**Prioridade:** 🔵 BAIXA (só se frontend precisar)

**Endpoints faltantes:**
- GET /group-aliases (listar todos)
- GET /group-aliases/:id (buscar por ID)
- PATCH /group-aliases/:id (atualizar)
- DELETE /group-aliases/:id (deletar)

**Quando implementar:** Apenas quando frontend precisar editar/deletar grupos

---

## 📊 FASE 5: MONITORAMENTO & ALERTAS - SEMANA 3 (8h)

### 14. Dashboard de Monitoramento ⏱️ 4h
**Prioridade:** 🟡 MÉDIA

**Funcionalidade:**
- Métricas em tempo real
- Gráficos de performance
- Status de serviços
- Dashboard estilo Grafana

**API Backend:** ✅ JÁ EXISTE
- GET /health-check
- GET /get-live-metrics
- GET /admin-security-dashboard

---

### 15. Sistema de Alertas ⏱️ 4h
**Prioridade:** 🟡 MÉDIA

**Funcionalidade:**
- Alertas automáticos
- Notificações
- Configuração de thresholds
- Histórico de alertas

---

## 🧪 FASE 6: TESTES - SEMANA 4 (16h)

### 16. Testes Unitários ⏱️ 6h
**Prioridade:** 🟢 MÉDIA

**Escopo:**
- Funções críticas de sincronização
- Validações de dados
- Transformações
- Edge Functions

---

### 17. Testes de Integração ⏱️ 6h
**Prioridade:** 🟢 MÉDIA

**Escopo:**
- APIs F360 e Omie
- Edge Functions end-to-end
- Fluxos completos

---

### 18. Testes E2E Frontend ⏱️ 4h
**Prioridade:** 🟢 MÉDIA

**Escopo:**
- Navegação
- Formulários
- Integrações com backend
- Playwright ou Cypress

---

## 📋 CRONOGRAMA COMPLETO

### Dia 1 (Hoje) - 2h ⏱️
- ✅ Corrigir Omie (30 min)
- ✅ Investigar F360 (1h)
- ✅ Commit & Push (30 min)

### Dia 2 - 6h ⏱️
- `/admin/tokens` (2h)
- `/relatorios/dre` (4h)

### Dia 3 - 8h ⏱️
- `/relatorios/cashflow` (4h)
- `/empresas` (3h)
- `/grupos` (1h)

### Semana 2 (5 dias) - 13h ⏱️
- Fase 3: 5 páginas complementares

### Semana 3 (5 dias) - 8h ⏱️
- Monitoramento & Alertas

### Semana 4 (5 dias) - 16h ⏱️
- Testes completos

**TOTAL:** ~47 horas de desenvolvimento

---

## ✅ Checklist de Progresso

### Backend
- [x] Edge Functions (97/97)
- [x] APIs REST (100%)
- [ ] Integração Omie (corrigir 404)
- [ ] Integração F360 (investigar 0 registros)
- [x] Banco de Dados (100%)

### Frontend
- [x] Componentes base (100%)
- [x] Autenticação (100%)
- [ ] `/admin/tokens`
- [ ] `/relatorios/dre`
- [ ] `/relatorios/cashflow`
- [ ] `/empresas`
- [ ] `/grupos`
- [ ] `/relatorios/kpis`
- [ ] `/relatorios/payables`
- [ ] `/relatorios/receivables`
- [ ] `/whatsapp/conversations`
- [ ] `/whatsapp/templates`

### DevOps
- [x] Deploy (100%)
- [ ] Monitoramento (60%)
- [ ] Alertas (40%)
- [ ] Testes (20%)
- [ ] CI/CD (0%)

---

## 📊 Progresso Visual

```
Backend:      ████████████████████░ 98%
Frontend:     ██████████████░░░░░░░ 70%
Integrações:  ███████████████████░░ 95%
DevOps:       ████████████████░░░░░ 80%
────────────────────────────────────
GERAL:        ████████████████░░░░░ 88%
```

**Meta:** ██████████████████████ 100%

---

## 🎯 Próxima Ação Imediata

**AGORA (próximos 30 minutos):**

1. Abrir `finance-oraculo-backend/supabase/functions/sync-omie/index.ts`
2. Trocar `/geral/contacorrente/` por `/financas/contacorrente/`
3. `supabase functions deploy sync-omie`
4. Testar endpoint
5. Commit & Push

---

**Desenvolvido por:** Angra.io by Alceu Passos
**Última atualização:** 15/01/2025
