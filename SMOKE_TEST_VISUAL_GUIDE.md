# 🧪 Guia de Smoke Test Visual dos Painéis

## Pré-requisitos
- ✅ Frontend rodando: `npm run dev` (porta 3000)
- ✅ Usuário logado: `alceu@angrax.com.br` / `B5b0dcf500`
- ✅ Banco populado: 21 empresas, 17 tokens, 299 DRE entries, 284 cashflow entries

---

## 📊 Painéis para Testar

### 1. `/admin/tokens` - Tokens de Onboarding
**URL:** http://localhost:3000/admin/tokens

**O que verificar:**
- [ ] Página carrega sem erros
- [ ] Lista de tokens aparece (esperado: vazio ou erro de cache - problema conhecido)
- [ ] Botão "Criar Token" visível
- [ ] Filtros funcionam

**Status Esperado:** ⚠️ Pode mostrar erro devido ao problema de cache do PostgREST (conhecido)

---

### 2. `/relatorios/dre` - Demonstrativo de Resultado
**URL:** http://localhost:3000/relatorios/dre

**O que verificar:**
- [ ] Página carrega sem erros
- [ ] Seletor de empresa funciona (21 empresas)
- [ ] Seletor de período funciona
- [ ] Gráfico de DRE renderiza
- [ ] Tabela de contas aparece
- [ ] Valores aparecem (podem ser zeros se não houver dados do período)

**Status Esperado:** ✅ Deve funcionar (Edge Function testada)

---

### 3. `/relatorios/cashflow` - Fluxo de Caixa
**URL:** http://localhost:3000/relatorios/cashflow

**O que verificar:**
- [ ] Página carrega sem erros
- [ ] Seletor de empresa funciona
- [ ] Seletor de período funciona
- [ ] Gráfico de cashflow renderiza
- [ ] Previsão 7 dias aparece
- [ ] Saldo inicial/final/atual aparecem

**Status Esperado:** ✅ Deve funcionar (Edge Function testada)

---

### 4. `/empresas` - Lista de Empresas
**URL:** http://localhost:3000/empresas

**O que verificar:**
- [ ] Página carrega sem erros
- [ ] Lista de 21 empresas aparece
- [ ] Busca funciona
- [ ] Badges de integração (F360/OMIE) aparecem
- [ ] Status WhatsApp aparece
- [ ] Paginação funciona (se houver)

**Status Esperado:** ✅ Deve funcionar perfeitamente (Edge Function testada e funcionando)

---

### 5. `/grupos` - Grupos/Aliases
**URL:** http://localhost:3000/grupos

**O que verificar:**
- [ ] Página carrega sem erros
- [ ] Lista de grupos aparece
- [ ] Botão "Criar Grupo" funciona
- [ ] Indicadores de empresas por grupo aparecem
- [ ] Badges de integração aparecem

**Status Esperado:** ✅ Deve funcionar (5 grupos criados no seed)

---

### 6. `/relatorios/kpis` - KPIs Financeiros
**URL:** http://localhost:3000/relatorios/kpis

**O que verificar:**
- [ ] Página carrega sem erros
- [ ] Seletor de empresa funciona
- [ ] Seletor de período funciona
- [ ] Cards de KPIs aparecem
- [ ] Gráficos renderizam
- [ ] Valores podem estar zerados (normal se não houver dados calculados)

**Status Esperado:** ✅ Deve funcionar (Edge Function testada)

---

### 7. `/relatorios/payables` - Contas a Pagar
**URL:** http://localhost:3000/relatorios/payables

**O que verificar:**
- [ ] Página carrega sem erros
- [ ] Seletor de empresa funciona
- [ ] Lista de contas aparece (pode estar vazia)
- [ ] Filtros funcionam
- [ ] Totalizadores aparecem

**Status Esperado:** ⚠️ Pode estar vazio (não populamos contas a pagar no seed)

---

### 8. `/relatorios/receivables` - Contas a Receber
**URL:** http://localhost:3000/relatorios/receivables

**O que verificar:**
- [ ] Página carrega sem erros
- [ ] Seletor de empresa funciona
- [ ] Lista de contas aparece (pode estar vazia)
- [ ] Filtros funcionam
- [ ] Totalizadores aparecem

**Status Esperado:** ⚠️ Pode estar vazio (não populamos contas a receber no seed)

---

### 9. `/whatsapp/conversations` - Conversas WhatsApp
**URL:** http://localhost:3000/whatsapp/conversations

**O que verificar:**
- [ ] Página carrega sem erros
- [ ] Lista de conversas aparece (85 conversas no banco)
- [ ] Filtros funcionam
- [ ] Badges de sentimento aparecem
- [ ] Detalhes da conversa abrem

**Status Esperado:** ✅ Deve funcionar (85 conversas no banco)

---

### 10. `/whatsapp/templates` - Templates WhatsApp
**URL:** http://localhost:3000/whatsapp/templates

**O que verificar:**
- [ ] Página carrega sem erros
- [ ] Lista de templates aparece
- [ ] Botão "Criar Template" funciona
- [ ] Preview de template funciona
- [ ] Variáveis são detectadas

**Status Esperado:** ⚠️ Pode precisar de implementação adicional

---

## 📝 Como Reportar Problemas

Para cada painel com problema, anote:

1. **URL do painel**
2. **Erro exato** (console do navegador: F12 → Console)
3. **Screenshot** (se aplicável)
4. **Comportamento esperado vs. observado**

---

## ✅ Checklist Rápido

Execute este comando para abrir todos os painéis de uma vez (Mac):

```bash
open http://localhost:3000/admin/tokens
open http://localhost:3000/relatorios/dre
open http://localhost:3000/relatorios/cashflow
open http://localhost:3000/empresas
open http://localhost:3000/grupos
open http://localhost:3000/relatorios/kpis
open http://localhost:3000/relatorios/payables
open http://localhost:3000/relatorios/receivables
open http://localhost:3000/whatsapp/conversations
open http://localhost:3000/whatsapp/templates
```

---

## 🎯 Resultado Esperado

**Mínimo aceitável:**
- ✅ 7/10 painéis funcionando sem erros críticos
- ⚠️ 2-3 painéis com dados vazios (normal)
- ❌ 0-1 painel com erro (onboarding-tokens esperado)

**Ideal:**
- ✅ 9/10 painéis funcionando perfeitamente
- ⚠️ 1 painel com problema conhecido (onboarding-tokens)

