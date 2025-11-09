# 🚀 PROMPT PARA CODEX - IMPLEMENTAR FRONTEND FINAL

> **STATUS:** 🔴 URGENTE - 10 Páginas críticas faltando
> **PRIORIDADE:** Implementar na ordem listada
> **DEADLINE:** Esta semana
> **CLIENTE:** Alceu (alceu@angrax.com.br)

---

## 📌 CONTEXTO

O backend está **100% pronto** com todas as Edge Functions, tabelas e integrações. O frontend está **80% pronto** (dashboard, admin panels, auth).

**Faltam apenas 10 páginas críticas** para o sistema ir ao vivo.

Todas as páginas:
- ✅ Têm dados disponíveis no Supabase
- ✅ Têm APIs prontas (Edge Functions)
- ✅ Têm componentes base prontos
- ✅ Têm definição clara de layout
- ✅ Têm prioridade definida

---

## 🎯 ORDEM DE IMPLEMENTAÇÃO

### 1️⃣ **`/admin/tokens` - CRÍTICO** (começa por aqui)

**O que é:** Gerenciador de tokens de acesso para clientes

**Dados do Supabase:**
```typescript
interface OnboardingToken {
  id: string;
  token: string; // Ex: VOLPE1, ADRI5, JES02
  empresa_id?: string;
  empresa_nome?: string;
  ativo: boolean;
  criado_em: string;
  ultimo_uso?: string;
  criado_por: string;
  funcao: string; // "onboarding", "admin"
}
```

**Layout esperado:**
```
┌─────────────────────────────────────────────────┐
│ 🔑 Gerenciador de Tokens                        │
├─────────────────────────────────────────────────┤
│ [+ Novo Token] [Buscar...] [Filtro]            │
├─────────────────────────────────────────────────┤
│ TOKEN  │ EMPRESA         │ STATUS  │ AÇÕES    │
├────────┼─────────────────┼─────────┼──────────┤
│ VOLPE1 │ Grupo Volpe     │ Ativo   │ ⋯ Menu  │
│ ADRI5  │ Adri Limpeza    │ Ativo   │ ⋯ Menu  │
│ JES02  │ Jessica Kenupp  │ Ativo   │ ⋯ Menu  │
│ TEST1  │ -               │ Inativo │ ⋯ Menu  │
└─────────────────────────────────────────────────┘
```

**Funcionalidades:**
- ✅ Listar tokens (tabela)
- ✅ Criar novo token (gerar 5 chars aleatórios + selecionar empresa)
- ✅ Ativar/desativar token
- ✅ Deletar token
- ✅ Copiar para clipboard (com notificação)
- ✅ Ver histórico de ativações
- ✅ Badge de status (Ativo/Inativo)
- ✅ Link para empresa (se houver)

**Componentes a usar:**
```typescript
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
// Dense table component exists: DenseTable
```

**API para buscar tokens:**
```bash
GET /api/onboarding-tokens?empresa_id=xxx&ativo=true

Response:
{
  tokens: OnboardingToken[],
  total: number
}
```

**API para criar token:**
```bash
POST /api/onboarding-tokens
Body: {
  empresa_id?: string,
  funcao: "onboarding" | "admin"
}

Response: { token: "VOLPE1", id: "uuid" }
```

---

### 2️⃣ **`/empresas` - CRÍTICO** (implementar logo após tokens)

**O que é:** Dashboard de clientes integrados

**Dados do Supabase:**
```typescript
interface Empresa {
  id: string;
  cnpj: string;
  nome_fantasia: string;
  razao_social: string;
  logo_url?: string;
  status: "ativo" | "inativo";
  integracao_f360: boolean;
  integracao_omie: boolean;
  whatsapp_ativo: boolean;
  saldo_atual?: number;
  inadimplencia?: number;
  receita_mes?: number;
  ultimo_sync?: string;
}
```

**Layout esperado:**
```
┌─────────────────────────────────────────────────┐
│ 🏢 Empresas                                     │
├─────────────────────────────────────────────────┤
│ [Buscar...] [Filtro Status] [+ Nova Empresa]  │
├─────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐   │
│ │ [Logo] Empresa LTDA                       │   │
│ │ CNPJ: 12.345.678/0001-00                  │   │
│ │ Status: Ativo | Saldo: R$ 120.000         │   │
│ │ F360 ✓ Omie ✓ WhatsApp ✓                 │   │
│ │ Inadimplência: 5% | Receita: R$ 250.000  │   │
│ │ Último sync: há 2 horas                   │   │
│ └──────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────┐   │
│ │ [Logo] Outra Empresa                      │   │
│ │ ... (cards repetidos)                     │   │
│ └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

**Funcionalidades:**
- ✅ Grid de cards (ou tabela densa)
- ✅ Buscar por nome/CNPJ
- ✅ Filtrar por status
- ✅ Badges: F360 ✓, Omie ✓, WhatsApp ✓
- ✅ Mostrar saldo, inadimplência, receita
- ✅ Link para `/empresas/[cnpj]` (detalhes)
- ✅ Último sync com tooltip

**Componentes a usar:**
```typescript
import { DashboardCardsGrid } from '@/components/dashboard-cards-grid';
import { Badge } from '@/components/ui/badge';
```

**API:**
```bash
GET /api/empresas?search=xxx&status=ativo&limit=50

Response:
{
  empresas: Empresa[],
  total: number
}
```

---

### 3️⃣ **`/grupos` - IMPORTANTE**

**O que é:** Agrupar e consolidar empresas

**Dados:**
```typescript
interface Grupo {
  id: string;
  nome: string;
  descricao?: string;
  empresas: Empresa[];
  saldo_total: number;
  receita_total: number;
  inadimplencia_total: number;
  criado_em: string;
}
```

**Layout similar a `/empresas` mas com:**
- Cards mostrando grupo + lista de empresas dentro
- Consolidação de valores
- Expandir/colapsar

**API:**
```bash
GET /api/grupos?limit=50

Response:
{
  grupos: Grupo[],
  total: number
}
```

---

### 4️⃣ **`/relatorios/dre` - IMPORTANTE**

**O que é:** Demonstrativo de Resultado do Exercício

**Dados:**
```typescript
interface DREEntry {
  periodo: string; // YYYY-MM
  receita_bruta: number;
  deducoes: number;
  receita_liquida: number;
  custos: number;
  lucro_bruto: number;
  despesas_operacionais: number;
  ebitda: number;
  depreciacacao: number;
  ebit: number;
  despesas_financeiras: number;
  receitas_financeiras: number;
  lucro_antes_ir: number;
  ir_csll: number;
  lucro_liquido: number;
}
```

**Layout esperado:**
```
┌─────────────────────────────────────────────────┐
│ 📊 DRE - Demonstrativo de Resultado              │
├─────────────────────────────────────────────────┤
│ Período: [Nov/2025 ▼] | Empresa: [Selecionar▼] │
│ [Exportar Excel] [Imprimir] [Comparar meses]  │
├─────────────────────────────────────────────────┤
│ ESTRUTURA DRE                                   │
│ ────────────────────────────────────────────    │
│ Receita Bruta                    R$ 500.000     │
│ (-) Deduções                     R$ (50.000)    │
│ ═════════════════════════════════════════════   │
│ Receita Líquida                  R$ 450.000     │
│                                                  │
│ (-) Custos                       R$ (200.000)   │
│ ═════════════════════════════════════════════   │
│ Lucro Bruto                      R$ 250.000     │
│                                                  │
│ (-) Despesas Operacionais        R$ (100.000)   │
│ ═════════════════════════════════════════════   │
│ EBITDA                           R$ 150.000     │
│                                                  │
│ (-) Depreciação                  R$ (10.000)    │
│ ═════════════════════════════════════════════   │
│ EBIT                             R$ 140.000     │
│                                                  │
│ (-) Despesas Financeiras         R$ (20.000)    │
│ (+) Receitas Financeiras         R$ 5.000       │
│ ═════════════════════════════════════════════   │
│ Lucro Antes do IR                R$ 125.000     │
│                                                  │
│ (-) IR/CSLL                      R$ (31.250)    │
│ ═════════════════════════════════════════════   │
│ LUCRO LÍQUIDO                    R$ 93.750      │
├─────────────────────────────────────────────────┤
│ Gráfico: Evolução Lucro (últimos 6 meses)       │
│ [Gráfico de linha mostrando tendência]          │
└─────────────────────────────────────────────────┘
```

**Funcionalidades:**
- ✅ Tabela estruturada com linhas de subtotal
- ✅ Valores formatados como moeda
- ✅ Período selecionável (month picker)
- ✅ Empresa selecionável
- ✅ Gráfico de evolução (últimos 6 meses)
- ✅ Exportar Excel
- ✅ Comparar períodos (dropdown)

**Componentes a usar:**
```typescript
import { PeriodPicker } from '@/components/period-picker';
// Usar GrafanaLineChart para gráficos
```

**API:**
```bash
GET /api/relatorios/dre?periodo=2025-11&empresa_id=xxx

Response:
{
  dre: DREEntry,
  historico: DREEntry[] // 6 meses
}
```

---

### 5️⃣ **`/relatorios/cashflow` - IMPORTANTE**

**O que é:** Fluxo de Caixa

**Dados:**
```typescript
interface CashflowEntry {
  data: string; // YYYY-MM-DD
  descricao: string;
  tipo: "entrada" | "saida";
  valor: number;
  categoria: string;
  status: "realizado" | "previsto";
}
```

**Layout esperado:**
```
┌─────────────────────────────────────────────────┐
│ 💰 Fluxo de Caixa                               │
├─────────────────────────────────────────────────┤
│ Saldo Inicial: R$ 100.000                       │
│ [Período: Nov/2025 ▼]                           │
├─────────────────────────────────────────────────┤
│ TIMELINE CASHFLOW (últimos 7 dias)              │
│                                                  │
│ 09/11 ⬆️  R$ 50.000  | Vendas                   │
│ 08/11 ⬇️  R$ 20.000  | Salários                 │
│ 07/11 ⬆️  R$ 30.000  | Recebimento             │
│ 06/11 ⬇️  R$ 15.000  | Despesas                │
│ 05/11 ⬇️  R$ 5.000   | Telefone                │
│                                                  │
├─────────────────────────────────────────────────┤
│ SALDO ACUMULADO (gráfico de área)               │
│ [Gráfico mostrando saldo ao longo do mês]      │
│                                                  │
│ Saldo Final Projetado: R$ 140.000               │
├─────────────────────────────────────────────────┤
│ PREVISÃO 7 DIAS                                 │
│ Seg: R$ 140.000 ✓                              │
│ Ter: R$ 120.000 ⚠️                             │
│ Qua: R$ 85.000  🔴 CRÍTICO                     │
│ Qui: R$ 110.000 ⚠️                             │
│ Sex: R$ 180.000 ✓                              │
│ Sab: R$ 175.000 ✓                              │
│ Dom: R$ 172.000 ✓                              │
└─────────────────────────────────────────────────┘
```

**Funcionalidades:**
- ✅ Timeline de movimentações (últimos 7 dias)
- ✅ Gráfico de saldo acumulado
- ✅ Previsão 7 dias com alertas
- ✅ Filtro por categoria
- ✅ Mostrar realizado vs previsto
- ✅ Cores para entradas (verde) e saídas (vermelho)

**API:**
```bash
GET /api/relatorios/cashflow?periodo=2025-11&empresa_id=xxx

Response:
{
  saldo_inicial: number,
  saldo_final: number,
  movimentacoes: CashflowEntry[],
  previsao_7_dias: Array
}
```

---

### 6️⃣ **`/relatorios/payables` - NICE-TO-HAVE**

**Dados:**
```typescript
interface Pagavel {
  id: string;
  fornecedor: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  status: "pendente" | "pago" | "atrasado";
  categoria: string;
}
```

**Layout:** Tabela com filtros por vencimento, status, fornecedor

---

### 7️⃣ **`/relatorios/receivables` - NICE-TO-HAVE**

**Similar a payables mas para Contas a Receber**

---

### 8️⃣ **`/relatorios/kpis` - NICE-TO-HAVE**

**Dashboard com:** Margem operacional, ROE, ROA, Liquidez, Comparativo vs meta

---

### 9️⃣ **`/whatsapp/conversations` - JÁ EXISTE**

**Verificar se está completo:**
- Chat com usuário
- Histórico de mensagens
- Enviar mensagem
- Sugestões IA
- Timeline de conversas

---

### 🔟 **`/whatsapp/templates` - NICE-TO-HAVE**

**CRUD de templates de mensagem:**
- Listar
- Criar
- Editar
- Deletar
- Testar

---

## ✅ O QUE JÁ EXISTE (NÃO REFAZER)

```typescript
// ✅ Components já prontos:
import { DashboardCardsGrid } from '@/components/dashboard-cards-grid';
import { DenseTable } from '@/components/dense-table';
import { PeriodPicker } from '@/components/period-picker';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';

// ✅ Hooks já prontos:
import { useAuth } from '@/lib/auth';
import { useDashboardCards } from '@/lib/hooks/use-dashboard-cards';

// ✅ Utils já prontos:
import { formatters } from '@/lib/formatters'; // toLocaleString, etc
import { api } from '@/lib/api'; // fetch wrapper
```

---

## 🔄 FLUXO DE DADOS

**Todas as APIs retornam dados do Supabase via Edge Functions:**

```
Frontend → NEXT_PUBLIC_API_BASE/route
         ↓
Supabase Edge Function
         ↓
Busca em Supabase (tabelas + views)
         ↓
Retorna JSON
         ↓
Frontend renderiza
```

---

## 📊 PRIORITÁRIO

### 🔴 FAZER HOJE (Kritisch)
1. ✅ `/admin/tokens`
2. ✅ `/empresas`

### 🟡 FAZER AMANHÃ (Important)
3. `/relatorios/dre`
4. `/relatorios/cashflow`

### 🟢 FAZER RESTO DA SEMANA (Nice-to-have)
5. `/grupos`
6. `/relatorios/kpis`
7. `/relatorios/payables`
8. `/relatorios/receivables`
9. `/whatsapp/templates`

---

## 🧪 TESTES

Depois de implementar cada página:

```bash
# Verificar se renderiza sem erros
npm run dev

# Verificar se dados vêm do Supabase
# (abrir DevTools → Network)

# Verificar se filtering funciona
# (testar busca, filtros, seleção)

# Verificar se exportação funciona
# (se tiver Excel export)
```

---

## 📝 REFERÊNCIAS

**Documentação completa em:**
- `TAREFAS_FRONTEND_RESTANTES.md` (este arquivo)
- `✨_STATUS_FINAL_COMPLETO.md` (overview)
- `SETUP_LOGIN_TESTES.md` (configuração)

**Dados de teste:**
```
Email:    alceu@angrax.com.br
Senha:    ALceu322ie#
API Base: https://newczbjzzfkwwnpfmygm.supabase.co/functions/v1
```

---

## 🎯 PRÓXIMOS PASSOS APÓS TERMINAR

1. ✅ Testar cada página
2. ✅ Rodar testes automáticos
3. ✅ Deploy em staging
4. ✅ Review com stakeholder
5. ✅ Deploy produção

---

**🚀 Bora implementar o frontend final e ir ao vivo!**

```
Backend:  ✅ 100% PRONTO
Frontend: ⏳ 80% PRONTO → 100% (você vai fazer!)
Sistema:  🎯 90% PRONTO → 100% (quase lá!)
```

