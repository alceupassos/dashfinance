# 🎯 FRONTEND - PROMPT RESUMIDO

**Para:** Frontend Developer / Codex  
**Data:** 09/11/2025  
**Tempo Estimado:** 8-10 horas

---

## 📋 6 PÁGINAS A IMPLEMENTAR

### 1. `/financeiro/alertas` ✅ (existe, conectar)
**O que fazer:**
- [ ] Conectar ao `fetchFinancialAlerts()`
- [ ] Listar alertas com status, prioridade, tipo
- [ ] Botão "Resolver" para cada alerta
- [ ] Filtros: tipo, prioridade, status
- [ ] Realtime updates com Supabase
- [ ] Paginação + Export Excel

---

### 2. `/financeiro/configuracoes/taxas` ✅ (existe, conectar)
**O que fazer:**
- [ ] Conectar ao `fetchContractFees()`
- [ ] Listar taxas: tipo, banco, taxa_percentual, taxa_fixa, vigência
- [ ] Botão "Nova Taxa" → Modal com form
- [ ] Editar taxa → Modal com form
- [ ] Deletar taxa (com confirmação)
- [ ] Filtros: tipo, banco, status

---

### 3. `/financeiro/extratos/sincronizar` ✅ (já criada, só testar)
**O que fazer:**
- [ ] Testar `syncBankMetadata()`
- [ ] Mostrar resultado com contas sincronizadas
- [ ] Histórico de sincronizações

---

### 4. `/financeiro/extratos` ❌ (criar nova)
**O que fazer:**
- [ ] Conectar ao `getBankStatementsFromERP()`
- [ ] Tabela: data, banco, agência, conta, tipo, valor, descrição, status
- [ ] Filtros: período, banco, tipo (crédito/débito)
- [ ] Paginação + Export Excel

---

### 5. `/financeiro/conciliacao` ❌ (criar nova)
**O que fazer:**
- [ ] Conectar ao `reconcileBank()`
- [ ] Tabela: data, valor, descrição_movimento, descrição_lançamento, confidence_score, status
- [ ] Botão "Executar Conciliação"
- [ ] Mostrar resultado

---

### 6. `/financeiro/relatorios/divergencias` ❌ (criar nova)
**O que fazer:**
- [ ] Conectar ao `validateFees()` e `fetchFinancialAlerts()`
- [ ] Tabela: data, banco, tipo, taxa_contratada, taxa_cobrada, diferença, diferença (%)
- [ ] Botão "Gerar Relatório"
- [ ] Export Excel com cores

---

## 🔌 APIS DISPONÍVEIS (em lib/api.ts)

```typescript
// Sincronização
syncBankMetadata(companyCnpj?)
getBankStatementsFromERP(companyCnpj, options?)
validateFees(companyCnpj?)
reconcileBank(companyCnpj?)

// Taxas
fetchContractFees(companyCnpj?)
createContractFee(data)
updateContractFee(id, data)
deleteContractFee(id)

// Alertas
fetchFinancialAlerts(companyCnpj?)
resolveAlert(alertId)
```

---

## 🎨 COMPONENTES SHADCN/UI DISPONÍVEIS

```
Card, Button, Badge, Select, Input, Textarea
DatePicker, Checkbox, Dialog, Drawer, Tabs
Table, Skeleton, Alert, Pagination
```

---

## 📊 TIPOS TYPESCRIPT

```typescript
interface FinancialAlert {
  id: string;
  tipo: 'taxa_divergencia' | 'movimento_nao_conciliado' | 'cartao_divergencia' | 'saldo_inconsistente';
  prioridade: 'crítica' | 'alta' | 'média' | 'baixa';
  titulo: string;
  status: 'pendente' | 'resolvido' | 'ignorado';
}

interface ContractFee {
  id: string;
  tipo: 'boleto_emissao' | 'boleto_recebimento' | 'ted' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'tarifa_manutencao';
  banco_codigo?: string;
  taxa_percentual?: number;
  taxa_fixa?: number;
  vigencia_inicio: string;
  ativo: boolean;
}

interface BankStatement {
  data_movimento: string;
  banco_codigo: string;
  tipo: 'credito' | 'debito';
  valor: number;
}
```

---

## ⚡ PADRÃO DE IMPLEMENTAÇÃO

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { RoleGuard } from '@/components/role-guard';
import { fetchFinancialAlerts } from '@/lib/api';

export default function AlertsPage() {
  const { company } = useAuth();
  const { data: alerts, isLoading, refetch } = useQuery({
    queryKey: ['alerts', company?.cnpj],
    queryFn: () => fetchFinancialAlerts(company?.cnpj),
  });

  if (isLoading) return <LoadingSkeleton />;
  if (!alerts?.length) return <EmptyState />;

  return (
    <RoleGuard allow="admin">
      <div className="space-y-6">
        {/* Header, Filters, Table */}
      </div>
    </RoleGuard>
  );
}
```

---

## 📁 ARQUIVO COMPLETO

Para detalhes completos, ver:
**`PROMPT_IMPLEMENTAR_FRONTEND_COMPLETO.md`**

Contém:
- Descrição detalhada de cada página
- Componentes a criar
- Tipos TypeScript
- Integração realtime
- Checklist completo
- Exemplos de código

---

## ✅ CHECKLIST RÁPIDO

- [ ] Página 1: Alertas (conectar)
- [ ] Página 2: Taxas (conectar)
- [ ] Página 3: Sincronizar (testar)
- [ ] Página 4: Extratos (criar)
- [ ] Página 5: Conciliação (criar)
- [ ] Página 6: Divergências (criar)
- [ ] Componentes: Status, Priority, Type Badges
- [ ] Filtros e Paginação
- [ ] Export Excel
- [ ] Realtime com Supabase
- [ ] Testes

---

**Estimado:** 8-10 horas  
**Documento Completo:** PROMPT_IMPLEMENTAR_FRONTEND_COMPLETO.md  
**Pronto para começar!** 🚀


