# 🚀 PROMPT: IMPLEMENTAR FRONTEND - SISTEMA DE CONCILIAÇÃO FINANCEIRA

**Data:** 09/11/2025  
**Para:** Frontend Developer / Codex  
**Objetivo:** Implementar todas as páginas e componentes do sistema de conciliação financeira

---

## 📋 RESUMO DO QUE FOI IMPLEMENTADO NO BACKEND

### ✅ Migration 018: Banco de Dados Completo
```sql
Tabelas criadas:
  • contract_fees         → Taxas contratuais por tipo
  • bank_statements       → Extratos bancários
  • reconciliations       → Matches entre extrato e cashflow
  • fee_validations       → Resultado de validações
  • financial_alerts      → Sistema de alertas
  • card_transactions     → Transações de cartão

Views criadas:
  • v_alertas_pendentes
  • v_taxas_divergentes
  • v_conciliacoes_pendentes
```

### ✅ 6 Edge Functions Prontas (APIs)

**1. sync-f360**
```
Endpoint: POST /sync-f360
Body: { "company_cnpj": "12.345.678/0001-90" }
Retorna: Dados sincronizados de F360
```

**2. sync-omie**
```
Endpoint: POST /sync-omie
Body: { "company_cnpj": "12.345.678/0001-90" }
Retorna: Dados sincronizados de OMIE
```

**3. sync-bank-metadata** (🆕)
```
Endpoint: POST /sync-bank-metadata
Body: { "company_cnpj": "12.345.678/0001-90" }
Retorna: {
  "success": true,
  "results": [
    { "fonte": "F360", "contas_sincronizadas": 3 },
    { "fonte": "OMIE", "contas_sincronizadas": 2 }
  ]
}
```

**4. get-bank-statements-from-erp** (🆕)
```
Endpoint: POST /get-bank-statements-from-erp
Body: {
  "company_cnpj": "12.345.678/0001-90",
  "banco_codigo": "033",
  "data_from": "2025-11-01",
  "data_to": "2025-11-30",
  "days_back": 30
}
Retorna: {
  "success": true,
  "total": 145,
  "statements": [
    {
      "company_cnpj": "12.345.678/0001-90",
      "banco_codigo": "033",
      "agencia": "0001",
      "conta": "123456",
      "data_movimento": "2025-11-01",
      "tipo": "credito",
      "valor": 1500.00,
      "descricao": "Recebimento",
      "documento": "F360-123"
    }
  ],
  "period": { "from": "2025-11-01", "to": "2025-11-30" }
}
```

**5. validate-fees**
```
Endpoint: POST /validate-fees
Body: { "company_cnpj": "12.345.678/0001-90" }
Retorna: {
  "success": true,
  "validated": 45,
  "alerts_created": 3
}
```

**6. reconcile-bank**
```
Endpoint: POST /reconcile-bank
Body: { "company_cnpj": "12.345.678/0001-90" }
Retorna: {
  "success": true,
  "reconciled": 38,
  "alerts_created": 2
}
```

### ✅ APIs Frontend Criadas (lib/api.ts)

```typescript
// Sincronização de metadados
export async function syncBankMetadata(companyCnpj?: string)

// Busca movimentações sob demanda
export async function getBankStatementsFromERP(
  companyCnpj: string,
  options?: {
    banco_codigo?: string;
    data_from?: string;
    data_to?: string;
    days_back?: number;
  }
)

// Validação de taxas
export async function validateFees(companyCnpj?: string)

// Conciliação bancária
export async function reconcileBank(companyCnpj?: string)

// Conciliação de cartão
export async function reconcileCard(companyCnpj?: string)

// Fetch alertas financeiras
export async function fetchFinancialAlerts(companyCnpj?: string)

// Fetch taxas contratadas
export async function fetchContractFees(companyCnpj?: string)

// Criar nova taxa
export async function createContractFee(data: any)

// Atualizar taxa
export async function updateContractFee(id: string, data: any)

// Deletar taxa
export async function deleteContractFee(id: string)

// Resolver alerta
export async function resolveAlert(alertId: string)

// Upload extratos (fallback)
export async function uploadBankStatement(file: File)
```

---

## 🎯 PÁGINAS A IMPLEMENTAR

### 1. `/financeiro/alertas` - Dashboard de Alertas
**Status:** ✅ Página existe mas precisa conectar ao backend

**Funcionalidades:**
- [ ] Listar alertas em tempo real
- [ ] Filtrar por tipo (taxa_divergencia, movimento_nao_conciliado, etc)
- [ ] Filtrar por prioridade (crítica, alta, média, baixa)
- [ ] Filtrar por status (pendente, resolvido)
- [ ] Botão "Resolver" para cada alerta
- [ ] Ícone de prioridade
- [ ] Cor baseada em prioridade
- [ ] Timestamp de criação
- [ ] Descrição detalhada
- [ ] Integração com Supabase realtime para atualizações
- [ ] Paginação
- [ ] Export para Excel

**Componentes necessários:**
- AlertCard
- AlertFilter
- AlertTable
- AlertPriority Badge

**API a usar:**
```typescript
const { data: alerts } = await fetchFinancialAlerts(companyCnpj);
const result = await resolveAlert(alertId);
```

---

### 2. `/financeiro/configuracoes/taxas` - Cadastro de Taxas
**Status:** ✅ Página existe mas precisa conectar ao backend

**Funcionalidades:**
- [ ] Listar todas as taxas contratadas
- [ ] Filtrar por tipo (boleto, ted, pix, cartão, tarifa)
- [ ] Filtrar por banco
- [ ] Filtrar por status (ativa, inativa)
- [ ] Botão "Nova Taxa"
- [ ] Modal/Drawer para adicionar taxa
- [ ] Modal/Drawer para editar taxa
- [ ] Confirmar deletar taxa
- [ ] Visualizar vigência (início/fim)
- [ ] Mostrar operadora (para cartão)
- [ ] Mostrar bandeira (para cartão)
- [ ] Taxa percentual e fixa
- [ ] Campo de observações

**Formulário - Nova/Editar Taxa:**
```
Campos:
- CNPJ (Select de empresas)
- Tipo (Boleto Emissão, Boleto Recebimento, TED, PIX, Cartão Crédito, Cartão Débito, Tarifa)
- Banco (Select com bancos brasileiros)
- Operadora (Para cartão - Visa, Mastercard, Elo, etc)
- Taxa Percentual (%)
- Taxa Fixa (R$)
- Bandeira (Para cartão)
- Vigência Início (Date)
- Vigência Fim (Date - opcional)
- Ativo (Toggle)
- Observações (Textarea)

Botões:
- Salvar
- Cancelar
- Deletar (apenas edit)
```

**Componentes necessários:**
- TaxaForm
- TaxaTable
- TaxaTypeSelect
- BancoSelect
- OperadoraSelect

**APIs a usar:**
```typescript
const fees = await fetchContractFees(companyCnpj);
await createContractFee(formData);
await updateContractFee(id, formData);
await deleteContractFee(id);
```

---

### 3. `/financeiro/extratos/sincronizar` - Sincronização de Extratos
**Status:** ✅ Página já criada, apenas conectar ao backend

**Funcionalidades:**
- [ ] Botão "Sincronizar Agora"
- [ ] Loading state durante sincronização
- [ ] Mostrar resultado: "✅ 5 contas sincronizadas"
- [ ] Detalhe por fonte (F360: 3, OMIE: 2)
- [ ] Status de F360 (integrado/erro)
- [ ] Status de OMIE (integrado/erro)
- [ ] Informações sobre o modelo lazy loading
- [ ] Histórico de sincronizações (timestamp, total, status)

**API a usar:**
```typescript
const result = await syncBankMetadata(companyCnpj);
```

---

### 4. `/financeiro/extratos` - Visualizar Extratos
**Status:** ❌ Não existe - criar nova página

**Funcionalidades:**
- [ ] Filtrar por período (data_from, data_to)
- [ ] Filtrar por banco (select)
- [ ] Filtrar por tipo (crédito, débito)
- [ ] Tabela com colunas:
  - Data movimento
  - Banco/Agência/Conta
  - Tipo (crédito/débito)
  - Valor
  - Descrição
  - Status conciliação (conciliado/pendente)
  - Ações
- [ ] Buscar movimentos via getBankStatementsFromERP
- [ ] Paginação
- [ ] Export para Excel
- [ ] Integração realtime com Supabase

**Componentes necessários:**
- StatementTable
- StatementFilter
- StatementDateRange
- BankSelect

**APIs a usar:**
```typescript
const statements = await getBankStatementsFromERP(companyCnpj, {
  data_from: "2025-11-01",
  data_to: "2025-11-30",
  banco_codigo: "033"
});
```

---

### 5. `/financeiro/conciliacao` - Conciliação Bancária
**Status:** ❌ Não existe - criar nova página

**Funcionalidades:**
- [ ] Listar conciliações criadas
- [ ] Filtrar por período
- [ ] Filtrar por status
- [ ] Tabela com colunas:
  - Data movimento
  - Valor
  - Descrição movimento
  - Descrição lançamento
  - Confidence score (%)
  - Status (confirmada/pendente)
  - Ações
- [ ] Botão "Executar Conciliação"
- [ ] Modal de confirmação
- [ ] Mostrar resultado
- [ ] Visualizar detalhes de cada conciliação

**Componentes necessários:**
- ReconciliationTable
- ReconciliationFilter
- ConfidenceScoreBadge

**APIs a usar:**
```typescript
const result = await reconcileBank(companyCnpj);
```

---

### 6. `/financeiro/relatorios/divergencias` - Relatório de Divergências
**Status:** ❌ Não existe - criar nova página

**Funcionalidades:**
- [ ] Tabela de divergências de taxas
- [ ] Filtrar por período
- [ ] Filtrar por tipo de taxa
- [ ] Filtrar por banco
- [ ] Colunas:
  - Data
  - Banco
  - Tipo de operação
  - Taxa contratada
  - Taxa cobrada
  - Diferença
  - Diferença (%)
  - Status (resolvido/pendente)
- [ ] Botão "Gerar Relatório"
- [ ] Executar validate-fees
- [ ] Mostrar resultado
- [ ] Export para Excel com cores

**Componentes necessários:**
- DivergenceTable
- DivergenceFilter
- DifferencePercentageBadge

**APIs a usar:**
```typescript
const result = await validateFees(companyCnpj);
const alerts = await fetchFinancialAlerts(companyCnpj);
```

---

## 🎨 COMPONENTES GENÉRICOS A CRIAR

```typescript
// Badge de status
<StatusBadge status="pendente" />
<StatusBadge status="resolvido" />

// Badge de prioridade
<PriorityBadge priority="crítica" />
<PriorityBadge priority="alta" />
<PriorityBadge priority="média" />
<PriorityBadge priority="baixa" />

// Badge de tipo de alerta
<AlertTypeBadge type="taxa_divergencia" />
<AlertTypeBadge type="movimento_nao_conciliado" />
<AlertTypeBadge type="cartao_divergencia" />

// Card de estatísticas
<StatCard title="Alertas Pendentes" value={15} icon="⚠️" />
<StatCard title="Conciliações" value={245} icon="✅" />
<StatCard title="Taxa Média de Acerto" value="97.3%" icon="📊" />

// Filter bar
<FilterBar
  filters={[
    { name: "status", label: "Status", type: "select", options: [...] },
    { name: "prioridade", label: "Prioridade", type: "select", options: [...] },
    { name: "data_from", label: "Data Início", type: "date" },
    { name: "data_to", label: "Data Fim", type: "date" }
  ]}
/>

// Date range picker
<DateRangePicker
  from={dateFrom}
  to={dateTo}
  onChange={(from, to) => {...}}
/>

// Loading skeleton
<TableSkeleton rows={5} />
<CardSkeleton />

// Empty state
<EmptyState
  title="Nenhum alerta"
  description="Não há alertas para este período"
  icon="🎉"
/>

// Error state
<ErrorState
  title="Erro ao carregar dados"
  description="Tente novamente mais tarde"
  onRetry={() => {...}}
/>
```

---

## 🔄 PADRÃO DE IMPLEMENTAÇÃO

### Padrão de Página
```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { RoleGuard } from '@/components/role-guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { fetchFinancialAlerts, resolveAlert } from '@/lib/api';

export default function AlertsPage() {
  const { user, company } = useAuth();

  const { data: alerts, isLoading, error, refetch } = useQuery({
    queryKey: ['alerts', company?.cnpj],
    queryFn: () => fetchFinancialAlerts(company?.cnpj),
    enabled: !!company?.cnpj,
  });

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState onRetry={() => refetch()} />;
  if (!alerts?.length) return <EmptyState />;

  return (
    <RoleGuard allow="admin">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Alertas Financeiros</CardTitle>
          </CardHeader>
        </Card>

        <AlertTable
          alerts={alerts}
          onResolve={async (id) => {
            await resolveAlert(id);
            refetch();
          }}
        />
      </div>
    </RoleGuard>
  );
}
```

---

## 📊 TIPOS TYPESCRIPT

```typescript
// Types para Financial Alerts
interface FinancialAlert {
  id: string;
  company_cnpj: string;
  tipo: 'taxa_divergencia' | 'movimento_nao_conciliado' | 'cartao_divergencia' | 'saldo_inconsistente';
  prioridade: 'crítica' | 'alta' | 'média' | 'baixa';
  titulo: string;
  descricao: string;
  status: 'pendente' | 'resolvido' | 'ignorado';
  dados: Record<string, any>;
  created_at: string;
  resolved_at?: string;
}

// Types para Taxas
interface ContractFee {
  id: string;
  company_cnpj: string;
  tipo: 'boleto_emissao' | 'boleto_recebimento' | 'ted' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'tarifa_manutencao';
  banco_codigo?: string;
  operadora?: string;
  taxa_percentual?: number;
  taxa_fixa?: number;
  bandeira?: string;
  vigencia_inicio: string;
  vigencia_fim?: string;
  ativo: boolean;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

// Types para Extratos
interface BankStatement {
  company_cnpj: string;
  banco_codigo: string;
  agencia?: string;
  conta?: string;
  data_movimento: string;
  tipo: 'credito' | 'debito';
  valor: number;
  descricao: string;
  documento?: string;
  saldo?: number;
}

// Types para Conciliações
interface Reconciliation {
  id: string;
  company_cnpj: string;
  bank_statement_id: string;
  cashflow_entry_id: string;
  confidence_score: number;
  status: 'confirmada' | 'pendente' | 'rejeitada';
  criacao_em: string;
}
```

---

## 🔌 INTEGRAÇÃO COM REALTIME (Supabase)

```typescript
// Usar Supabase Realtime para atualizações em tempo real
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useEffect } from 'react';

export function useAlertsRealtime(companyCnpj: string) {
  const supabase = useSupabaseClient();
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    // Subscribe to changes
    const subscription = supabase
      .channel('financial_alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financial_alerts',
          filter: `company_cnpj=eq.${companyCnpj}`
        },
        (payload) => {
          // Handle realtime updates
          setAlerts(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [companyCnpj, supabase]);

  return alerts;
}
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Páginas
- [ ] `/financeiro/alertas` - Conectar ao backend
- [ ] `/financeiro/configuracoes/taxas` - Conectar ao backend
- [ ] `/financeiro/extratos/sincronizar` - Já existe, testar
- [ ] `/financeiro/extratos` - Criar nova página
- [ ] `/financeiro/conciliacao` - Criar nova página
- [ ] `/financeiro/relatorios/divergencias` - Criar nova página

### Componentes Genéricos
- [ ] StatusBadge
- [ ] PriorityBadge
- [ ] AlertTypeBadge
- [ ] StatCard
- [ ] FilterBar
- [ ] DateRangePicker
- [ ] TableSkeleton
- [ ] EmptyState
- [ ] ErrorState

### APIs
- [ ] fetchFinancialAlerts
- [ ] fetchContractFees
- [ ] createContractFee
- [ ] updateContractFee
- [ ] deleteContractFee
- [ ] resolveAlert
- [ ] syncBankMetadata
- [ ] getBankStatementsFromERP
- [ ] validateFees
- [ ] reconcileBank

### Testes
- [ ] Testar sincronização
- [ ] Testar validação de taxas
- [ ] Testar conciliação
- [ ] Testar realtime updates
- [ ] Testar filtros
- [ ] Testar paginação
- [ ] Testar export Excel

---

## 📚 REFERÊNCIAS

**Documentação Backend:**
- `IMPLEMENTACAO_ERP_LAZY_LOADING.md` - Arquitetura e APIs
- `GUIA_TESTE_ERP_LAZY_LOADING.md` - Como testar
- `RESUMO_FINAL_ERP_LAZY_LOADING.md` - Resumo executivo

**Componentes UI Disponíveis (shadcn/ui):**
- Card, CardHeader, CardContent, CardTitle
- Button, ButtonGroup
- Badge
- Select, SelectContent, SelectItem, SelectTrigger, SelectValue
- Input, Textarea
- DatePicker
- Checkbox, Toggle
- Dialog, AlertDialog
- Drawer
- Tabs, TabsContent, TabsList, TabsTrigger
- Table, TableBody, TableCell, TableHead, TableHeader, TableRow
- Skeleton
- Alert, AlertDescription, AlertTitle
- Pagination
- Dropdown (pode usar Popover)

---

## 🚀 PRÓXIMOS PASSOS

1. **Hoje:** Implementar páginas usando este prompt
2. **Amanhã:** Deploy em staging e testes
3. **Dia 3:** Deploy em produção
4. **Dia 4+:** Monitoramento e otimizações

---

**Desenvolvido:** 09/11/2025  
**Status:** Pronto para frontend implementar  
**Estimado:** 8-10 horas de desenvolvimento


