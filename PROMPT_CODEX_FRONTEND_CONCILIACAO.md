# 🎯 PROMPT PARA CODEX - IMPLEMENTAÇÃO FRONTEND SISTEMA DE CONCILIAÇÃO

## 📋 CONTEXTO

O backend do sistema de conciliação financeira está **100% implementado e funcional**. Agora você precisa implementar as interfaces frontend que vão consumir estes dados e permitir aos usuários:
1. Cadastrar taxas contratuais
2. Visualizar e resolver alertas financeiros
3. Importar extratos bancários
4. Realizar conciliação manual
5. Ver relatórios de taxas divergentes
6. Receber notificações de alertas

## 🗄️ BACKEND DISPONÍVEL

### Tabelas Principais
```typescript
// Todas já criadas e funcionando no Supabase

interface ContractFee {
  id: string;
  company_cnpj: string;
  tipo: 'boleto_emissao' | 'boleto_recebimento' | 'ted' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'tarifa_manutencao';
  banco_codigo: string;
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

interface BankStatement {
  id: string;
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
  conciliado: boolean;
  conciliacao_id?: string;
  created_at: string;
}

interface FinancialAlert {
  id: string;
  company_cnpj: string;
  tipo_alerta: 'taxa_divergente' | 'conciliacao_pendente' | 'pagamento_nao_encontrado' | 'valor_divergente' | 'lancamento_orfao' | 'saldo_divergente';
  prioridade: 'baixa' | 'media' | 'alta' | 'critica';
  titulo: string;
  mensagem: string;
  dados_detalhados: any; // JSON
  status: 'pendente' | 'em_analise' | 'resolvido' | 'ignorado';
  resolvido_por?: string;
  resolvido_em?: string;
  resolucao_observacoes?: string;
  notificado_whatsapp: boolean;
  notificado_whatsapp_em?: string;
  created_at: string;
  updated_at: string;
}

interface FeeValidation {
  id: string;
  company_cnpj: string;
  tipo_operacao: string;
  data_operacao: string;
  valor_operacao: number;
  taxa_esperada: number;
  taxa_cobrada: number;
  diferenca: number;
  percentual_diferenca: number;
  status: 'ok' | 'divergente' | 'alerta';
  documento?: string;
  banco_codigo: string;
  resolvido: boolean;
  observacoes?: string;
  created_at: string;
}

interface Reconciliation {
  id: string;
  company_cnpj: string;
  tipo: 'bancaria' | 'cartao' | 'caixa';
  bank_statement_id?: string;
  dre_entry_id?: number;
  cashflow_entry_id?: number;
  data_conciliacao: string;
  valor_extrato?: number;
  valor_lancamento?: number;
  diferenca?: number;
  status: 'ok' | 'divergente' | 'pendente' | 'revisao';
  confianca?: number;
  observacoes?: string;
  conciliado_por?: string;
  conciliado_em?: string;
  created_at: string;
}

interface CardTransaction {
  id: string;
  company_cnpj: string;
  operadora: string;
  bandeira?: string;
  data_venda: string;
  data_prevista_recebimento?: string;
  data_recebimento?: string;
  valor_bruto: number;
  taxa_percentual?: number;
  taxa_valor?: number;
  valor_liquido: number;
  parcelas?: number;
  parcela_numero?: number;
  nsu?: string;
  autorizacao?: string;
  conciliado: boolean;
  conciliacao_id?: string;
  created_at: string;
}
```

### Views Prontas
```typescript
// v_alertas_pendentes
interface AlertaPendente {
  id: string;
  company_cnpj: string;
  tipo_alerta: string;
  prioridade: string;
  titulo: string;
  mensagem: string;
  dados_detalhados: any;
  created_at: string;
  tempo_aberto: string;
  atrasado: boolean;
}

// v_taxas_divergentes
interface TaxaDivergente {
  id: string;
  company_cnpj: string;
  tipo_operacao: string;
  data_operacao: string;
  valor_operacao: number;
  taxa_esperada: number;
  taxa_cobrada: number;
  diferenca: number;
  percentual_diferenca: number;
  documento?: string;
  banco_codigo: string;
  resolvido: boolean;
  created_at: string;
}

// v_conciliacoes_pendentes
interface ConciliacaoPendente {
  id: string;
  company_cnpj: string;
  data_movimento: string;
  tipo: string;
  valor: number;
  descricao: string;
  banco_codigo: string;
  dias_pendente: string;
}
```

## 🎨 IMPLEMENTAÇÃO NECESSÁRIA

### 1. PÁGINA: Cadastro de Taxas Contratuais
**Rota:** `/financeiro/configuracoes/taxas`

**Componentes necessários:**
1. **TaxasList** - Lista de taxas com filtros
2. **TaxaForm** - Formulário de criação/edição
3. **TaxaCard** - Card individual de taxa

**Funcionalidades:**
- Listar todas as taxas (com filtro por banco, tipo, status)
- Criar nova taxa contratual
- Editar taxa existente
- Desativar/ativar taxa
- Ver histórico de alterações
- Indicador visual de vigência (ativa/vencida)

**Layout sugerido:**
```
┌─────────────────────────────────────────┐
│ Taxas Contratuais          [+ Nova Taxa]│
├─────────────────────────────────────────┤
│ Filtros: [Banco] [Tipo] [Status]        │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ 🏦 Banco: 237 - Bradesco            │ │
│ │ Tipo: Emissão de Boleto             │ │
│ │ Taxa: R$ 2,50 fixo                  │ │
│ │ Vigência: 01/01/2025 - Atual       │ │
│ │ Status: ✅ Ativa                    │ │
│ │ [Editar] [Desativar]                │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ 💳 Operadora: Stone                 │ │
│ │ Tipo: Cartão de Crédito             │ │
│ │ Taxa: 2,5% + R$ 0,00               │ │
│ │ Bandeira: Visa                      │ │
│ │ Vigência: 01/01/2025 - Atual       │ │
│ │ Status: ✅ Ativa                    │ │
│ │ [Editar] [Desativar]                │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Queries Supabase:**
```typescript
// Listar taxas
const { data: taxas } = await supabase
  .from('contract_fees')
  .select('*')
  .eq('company_cnpj', cnpj)
  .order('created_at', { ascending: false });

// Criar taxa
const { data, error } = await supabase
  .from('contract_fees')
  .insert({
    company_cnpj: cnpj,
    tipo: 'boleto_emissao',
    banco_codigo: '237',
    taxa_fixa: 2.50,
    vigencia_inicio: '2025-01-01',
    ativo: true
  });

// Atualizar taxa
const { data, error } = await supabase
  .from('contract_fees')
  .update({ taxa_fixa: 2.90 })
  .eq('id', taxaId);

// Desativar taxa
const { data, error } = await supabase
  .from('contract_fees')
  .update({ 
    ativo: false, 
    vigencia_fim: new Date().toISOString().split('T')[0] 
  })
  .eq('id', taxaId);
```

**Validações:**
- Taxa fixa OU percentual obrigatória
- Data início vigência obrigatória
- Banco/operadora obrigatório
- Tipo obrigatório

---

### 2. PÁGINA: Dashboard de Alertas Financeiros
**Rota:** `/financeiro/alertas`

**Componentes necessários:**
1. **AlertaDashboard** - Container principal
2. **AlertaCard** - Card de alerta individual
3. **AlertaFilters** - Filtros e ordenação
4. **AlertaModal** - Modal de detalhes
5. **AlertaStats** - Cards de estatísticas

**Funcionalidades:**
- Ver todos os alertas pendentes
- Filtrar por tipo, prioridade, data
- Ver detalhes completos do alerta
- Marcar como resolvido (com observação)
- Marcar como em análise
- Ignorar alerta
- Ver histórico de resoluções
- Indicadores de tempo (alertas atrasados)

**Layout sugerido:**
```
┌─────────────────────────────────────────────────────┐
│ Alertas Financeiros                                  │
├─────────────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐               │
│ │🔴 2  │ │🟠 5  │ │🟡 12 │ │🟢 3  │               │
│ │Crítico│ │Alta  │ │Média │ │Baixa │               │
│ └──────┘ └──────┘ └──────┘ └──────┘               │
├─────────────────────────────────────────────────────┤
│ Filtros: [Tipo] [Prioridade] [Status] [Data]       │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ 🔴 CRÍTICA | Taxa Divergente | há 2 horas      │ │
│ │ Taxa de boleto cobrada incorretamente           │ │
│ │ Diferença: R$ 1,40 a MAIS (56%)                 │ │
│ │ [Ver Detalhes] [Resolver] [Ignorar]            │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 🟠 ALTA | Conciliação Pendente | há 1 dia      │ │
│ │ Lançamento sem correspondência no extrato       │ │
│ │ Valor: R$ 150,00                                │ │
│ │ [Ver Detalhes] [Resolver] [Ignorar]            │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Cores por Prioridade:**
```typescript
const prioridadeCores = {
  critica: { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-700' },
  alta: { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-700' },
  media: { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-700' },
  baixa: { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-700' },
};
```

**Queries Supabase:**
```typescript
// Buscar alertas pendentes
const { data: alertas } = await supabase
  .from('v_alertas_pendentes')
  .select('*')
  .eq('company_cnpj', cnpj);

// Buscar alerta específico com detalhes
const { data: alerta } = await supabase
  .from('financial_alerts')
  .select(`
    *,
    fee_validation:fee_validations(*),
    bank_statement:bank_statements(*)
  `)
  .eq('id', alertaId)
  .single();

// Marcar como resolvido
const { data, error } = await supabase
  .from('financial_alerts')
  .update({
    status: 'resolvido',
    resolvido_por: userId,
    resolvido_em: new Date().toISOString(),
    resolucao_observacoes: observacao
  })
  .eq('id', alertaId);

// Ignorar alerta
const { data, error } = await supabase
  .from('financial_alerts')
  .update({ status: 'ignorado' })
  .eq('id', alertaId);

// Marcar como em análise
const { data, error } = await supabase
  .from('financial_alerts')
  .update({ status: 'em_analise' })
  .eq('id', alertaId);

// Estatísticas
const { data: stats } = await supabase
  .rpc('fn_alert_stats', { p_cnpj: cnpj });
```

---

### 3. PÁGINA: Importação de Extrato Bancário
**Rota:** `/financeiro/extratos/importar`

**Componentes necessários:**
1. **ExtratoUpload** - Upload de arquivo
2. **ExtratoPreview** - Preview dos dados
3. **ExtratoConfirm** - Confirmação de importação

**Funcionalidades:**
- Upload de arquivo OFX/CSV
- Parse e validação do arquivo
- Preview dos dados antes de importar
- Seleção de banco/agência/conta
- Importação com feedback de progresso
- Tratamento de duplicatas
- Log de importação

**Layout sugerido:**
```
┌─────────────────────────────────────────────────────┐
│ Importar Extrato Bancário                           │
├─────────────────────────────────────────────────────┤
│ Passo 1: Selecionar Banco                           │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Banco: [Select: 237 - Bradesco ▼]              │ │
│ │ Agência: [____] Conta: [__________]             │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ Passo 2: Upload do Arquivo                          │
│ ┌─────────────────────────────────────────────────┐ │
│ │     📁 Arraste o arquivo aqui ou clique         │ │
│ │        Formatos: OFX, CSV, XLS                  │ │
│ │        Tamanho máximo: 10MB                     │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ Passo 3: Preview dos Dados (150 lançamentos)        │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Data       │ Tipo    │ Valor     │ Descrição   │ │
│ │ 01/11/2025 │ Crédito │ 1.500,00 │ Recebimento │ │
│ │ 02/11/2025 │ Débito  │  -150,00 │ Taxa Boleto │ │
│ │ ...                                             │ │
│ └─────────────────────────────────────────────────┘ │
│ ⚠️ 5 duplicatas encontradas (serão ignoradas)      │
│ [Cancelar] [Importar 145 lançamentos]              │
└─────────────────────────────────────────────────────┘
```

**Queries Supabase:**
```typescript
// Verificar duplicatas
const { data: existing } = await supabase
  .from('bank_statements')
  .select('documento, data_movimento, valor')
  .eq('company_cnpj', cnpj)
  .in('documento', documentos);

// Importar em batch
const { data, error } = await supabase
  .from('bank_statements')
  .insert(statements);

// Buscar extratos importados
const { data: extratos } = await supabase
  .from('bank_statements')
  .select('*')
  .eq('company_cnpj', cnpj)
  .order('data_movimento', { ascending: false })
  .limit(100);
```

**Edge Function (já existe no backend):**
```typescript
// Chamar Edge Function para processar arquivo
const formData = new FormData();
formData.append('file', file);
formData.append('company_cnpj', cnpj);
formData.append('banco_codigo', bancoCodigo);

const response = await fetch(`${SUPABASE_URL}/functions/v1/import-bank-statement`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
  },
  body: formData,
});
```

---

### 4. PÁGINA: Conciliação Manual
**Rota:** `/financeiro/conciliacao`

**Componentes necessários:**
1. **ConciliacaoBoard** - Board drag & drop
2. **MovimentoCard** - Card de movimento
3. **LancamentoCard** - Card de lançamento
4. **MatchSuggestions** - Sugestões automáticas
5. **MatchModal** - Modal de confirmação

**Funcionalidades:**
- Duas listas lado a lado (extrato vs lançamentos)
- Drag & drop para matchear
- Sugestões automáticas (mesma data ±3 dias, valor similar ±5%)
- Confirmar match
- Desfazer conciliação
- Filtros por data, valor, status
- Score de confiança do match

**Layout sugerido:**
```
┌───────────────────────────────────────────────────────────┐
│ Conciliação Bancária                                       │
│ Taxa de Conciliação: 85% | Pendentes: 45 | Período: Nov/25│
├───────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐  ┌──────────────────────┐       │
│ │ EXTRATO BANCÁRIO     │  │ LANÇAMENTOS SISTEMA  │       │
│ │ (Pendentes: 15)      │  │ (Pendentes: 30)      │       │
│ ├──────────────────────┤  ├──────────────────────┤       │
│ │ ┌──────────────────┐ │  │ ┌──────────────────┐ │       │
│ │ │ 01/11 | Crédito  │ │  │ │ 01/11 | Receita  │ │       │
│ │ │ R$ 1.500,00      │─┼──┼─│ R$ 1.500,00      │ │       │
│ │ │ Recebimento      │ │  │ │ Cliente XYZ      │ │       │
│ │ │ Match: 98% ✅    │ │  │ │ [Sugestão]       │ │       │
│ │ └──────────────────┘ │  │ └──────────────────┘ │       │
│ │ ┌──────────────────┐ │  │ ┌──────────────────┐ │       │
│ │ │ 02/11 | Débito   │ │  │ │ 03/11 | Despesa  │ │       │
│ │ │ R$ 150,00        │ │  │ │ R$ 155,00        │ │       │
│ │ │ Fornecedor       │ │  │ │ Fornecedor ABC   │ │       │
│ │ │ [Arraste aqui]   │ │  │ │ Match: 75% ⚠️    │ │       │
│ │ └──────────────────┘ │  │ └──────────────────┘ │       │
│ └──────────────────────┘  └──────────────────────┘       │
└───────────────────────────────────────────────────────────┘
```

**Queries Supabase:**
```typescript
// Buscar movimentos pendentes
const { data: pendentes } = await supabase
  .from('v_conciliacoes_pendentes')
  .select('*')
  .eq('company_cnpj', cnpj);

// Buscar lançamentos para matchear
const { data: lancamentos } = await supabase
  .from('cashflow_entries')
  .select('*')
  .eq('company_cnpj', cnpj)
  .gte('date', dataInicio)
  .lte('date', dataFim)
  .is('conciliado', null);

// Criar conciliação
const { data, error } = await supabase
  .from('reconciliations')
  .insert({
    company_cnpj: cnpj,
    tipo: 'bancaria',
    bank_statement_id: extratoId,
    cashflow_entry_id: lancamentoId,
    data_conciliacao: new Date().toISOString(),
    valor_extrato: valorExtrato,
    valor_lancamento: valorLancamento,
    diferenca: Math.abs(valorExtrato - valorLancamento),
    status: Math.abs(valorExtrato - valorLancamento) < 0.01 ? 'ok' : 'divergente',
    confianca: 0.95,
    conciliado_por: userId,
    conciliado_em: new Date().toISOString()
  });

// Marcar extrato como conciliado
await supabase
  .from('bank_statements')
  .update({ conciliado: true, conciliacao_id: conciliacaoId })
  .eq('id', extratoId);

// Desfazer conciliação
await supabase
  .from('reconciliations')
  .delete()
  .eq('id', conciliacaoId);

await supabase
  .from('bank_statements')
  .update({ conciliado: false, conciliacao_id: null })
  .eq('id', extratoId);
```

**Algoritmo de Sugestão:**
```typescript
function calcularMatchScore(extrato: any, lancamento: any): number {
  let score = 0;
  
  // Data (±3 dias = 40 pontos)
  const diffDias = Math.abs(daysBetween(extrato.data_movimento, lancamento.date));
  if (diffDias === 0) score += 40;
  else if (diffDias <= 1) score += 30;
  else if (diffDias <= 3) score += 20;
  
  // Valor (±5% = 50 pontos)
  const diffPercentual = Math.abs((extrato.valor - lancamento.amount) / lancamento.amount * 100);
  if (diffPercentual < 0.01) score += 50;
  else if (diffPercentual < 1) score += 40;
  else if (diffPercentual < 5) score += 30;
  
  // Descrição similar (10 pontos)
  if (stringSimilarity(extrato.descricao, lancamento.category) > 0.7) {
    score += 10;
  }
  
  return score; // 0-100
}
```

---

### 5. PÁGINA: Relatórios de Taxas Divergentes
**Rota:** `/financeiro/relatorios/taxas`

**Componentes necessários:**
1. **TaxasReportDashboard** - Container principal
2. **TaxasChart** - Gráfico de evolução
3. **TaxasTable** - Tabela de divergências
4. **TaxasStats** - Cards de estatísticas
5. **TaxasExport** - Botão de exportar

**Funcionalidades:**
- Ver todas as taxas divergentes do período
- Filtrar por banco, tipo, período
- Gráfico de evolução mensal
- Tabela detalhada com todas as divergências
- Cards de totalizadores (total divergente, economia potencial, etc)
- Exportar para Excel
- Ver histórico de contestações

**Layout sugerido:**
```
┌───────────────────────────────────────────────────────────┐
│ Relatório de Taxas Divergentes                            │
│ Período: [Nov/2025 ▼] [Exportar Excel]                   │
├───────────────────────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐             │
│ │ R$ 450 │ │   15   │ │ R$ 280 │ │  85%   │             │
│ │Divergido│ │Alertas │ │Recuper.│ │Resolvid│             │
│ └────────┘ └────────┘ └────────┘ └────────┘             │
├───────────────────────────────────────────────────────────┤
│ 📊 Evolução Mensal                                        │
│ [Gráfico de linha com taxas cobradas vs esperadas]       │
├───────────────────────────────────────────────────────────┤
│ 📋 Detalhamento                                           │
│ ┌─────────────────────────────────────────────────────┐   │
│ │Data│Tipo│Banco│Esperado│Cobrado│Dif│Status│Ação  │   │
│ │01/11│Bole│237 │R$ 2,50│R$ 3,90│+56%│✅Res│Ver  │   │
│ │02/11│PIX │033 │R$ 0,00│R$ 2,00│+100%│⏳Pend│Ver │   │
│ │...                                                  │   │
│ └─────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

**Queries Supabase:**
```typescript
// Buscar taxas divergentes
const { data: divergencias } = await supabase
  .from('v_taxas_divergentes')
  .select('*')
  .eq('company_cnpj', cnpj)
  .gte('data_operacao', mesAtual);

// Estatísticas do mês
const { data: stats } = await supabase
  .rpc('fn_taxa_stats', {
    p_cnpj: cnpj,
    p_mes_inicio: mesInicio,
    p_mes_fim: mesFim
  });

// Evolução mensal (últimos 6 meses)
const { data: evolucao } = await supabase
  .from('fee_validations')
  .select('data_operacao, taxa_esperada, taxa_cobrada, diferenca')
  .eq('company_cnpj', cnpj)
  .gte('data_operacao', ultimos6Meses)
  .order('data_operacao');

// Top divergências
const { data: top } = await supabase
  .from('fee_validations')
  .select('*, contract_fee:contract_fees(*)')
  .eq('company_cnpj', cnpj)
  .eq('status', 'divergente')
  .order('diferenca', { ascending: false })
  .limit(10);
```

**Função de Exportar:**
```typescript
// Exportar para Excel usando biblioteca xlsx
import * as XLSX from 'xlsx';

function exportarParaExcel(divergencias: any[]) {
  const worksheet = XLSX.utils.json_to_sheet(divergencias.map(d => ({
    'Data': formatDate(d.data_operacao),
    'Tipo': d.tipo_operacao,
    'Banco': d.banco_codigo,
    'Documento': d.documento,
    'Taxa Esperada': d.taxa_esperada,
    'Taxa Cobrada': d.taxa_cobrada,
    'Diferença': d.diferenca,
    'Percentual': d.percentual_diferenca + '%',
    'Status': d.resolvido ? 'Resolvido' : 'Pendente'
  })));
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Taxas Divergentes');
  XLSX.writeFile(workbook, `taxas-divergentes-${new Date().toISOString()}.xlsx`);
}
```

---

### 6. COMPONENTE: Widget de Alertas (Para qualquer página)
**Componente:** `<AlertasWidget />`

**Funcionalidades:**
- Badge com contador de alertas críticos
- Dropdown com últimos 5 alertas
- Link para página completa de alertas
- Auto-refresh a cada 30 segundos
- Som/notificação para novos alertas

**Layout sugerido:**
```
┌────────────────────────────────┐
│ 🔔 [5]                         │ ← Badge no header
│                                │
│ Clique = Dropdown:             │
│ ┌────────────────────────────┐│
│ │ 🔴 Taxa divergente          ││
│ │    há 2 horas               ││
│ ├────────────────────────────┤│
│ │ 🟠 Conciliação pendente     ││
│ │    há 1 dia                 ││
│ ├────────────────────────────┤│
│ │ Ver todos os alertas →      ││
│ └────────────────────────────┘│
└────────────────────────────────┘
```

**Query Supabase:**
```typescript
// Buscar alertas críticos
const { count: alertasCriticos } = await supabase
  .from('financial_alerts')
  .select('*', { count: 'exact', head: true })
  .eq('company_cnpj', cnpj)
  .eq('status', 'pendente')
  .eq('prioridade', 'critica');

// Buscar últimos 5 alertas
const { data: ultimosAlertas } = await supabase
  .from('financial_alerts')
  .select('*')
  .eq('company_cnpj', cnpj)
  .eq('status', 'pendente')
  .order('created_at', { ascending: false })
  .limit(5);

// Subscribe para novos alertas
const subscription = supabase
  .channel('alertas')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'financial_alerts',
    filter: `company_cnpj=eq.${cnpj}`
  }, (payload) => {
    // Atualizar UI e mostrar notificação
    showNotification(payload.new);
  })
  .subscribe();
```

---

## 🎨 DESIGN SYSTEM

### Cores
```typescript
const colors = {
  prioridade: {
    critica: '#DC2626', // red-600
    alta: '#EA580C',    // orange-600
    media: '#CA8A04',   // yellow-600
    baixa: '#16A34A',   // green-600
  },
  status: {
    pendente: '#6B7280',  // gray-500
    em_analise: '#3B82F6', // blue-500
    resolvido: '#10B981',  // green-500
    ignorado: '#9CA3AF',   // gray-400
  }
};
```

### Componentes Base
```typescript
// Use componentes do shadcn/ui ou sua biblioteca atual:
- Card
- Button
- Badge
- Modal/Dialog
- Select
- Input
- Table
- DatePicker
- DropdownMenu
```

---

## 📱 RESPONSIVIDADE

**Prioridades:**
1. Desktop (1920x1080) - Principal
2. Tablet (1024x768) - Secundário
3. Mobile (375x667) - Básico (apenas alertas)

**Breakpoints:**
```typescript
const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
};
```

---

## 🔐 PERMISSÕES

```typescript
// Verificar permissões do usuário
const { data: { user } } = await supabase.auth.getUser();

// Roles disponíveis (já no sistema):
type Role = 'admin' | 'seller' | 'financeiro' | 'gerente';

// Controle de acesso:
const permissions = {
  admin: ['*'], // Tudo
  financeiro: ['view_alerts', 'resolve_alerts', 'manage_fees', 'reconcile'],
  gerente: ['view_alerts', 'view_reports'],
  seller: [] // Sem acesso ao financeiro
};
```

---

## 🧪 VALIDAÇÕES

### Formulário de Taxa
```typescript
const taxaSchema = z.object({
  tipo: z.enum(['boleto_emissao', 'boleto_recebimento', 'ted', 'pix', 'cartao_credito', 'cartao_debito', 'tarifa_manutencao']),
  banco_codigo: z.string().min(3),
  taxa_fixa: z.number().min(0).optional(),
  taxa_percentual: z.number().min(0).max(100).optional(),
  vigencia_inicio: z.string().date(),
  observacoes: z.string().optional(),
}).refine(data => data.taxa_fixa || data.taxa_percentual, {
  message: "Informe taxa fixa ou percentual"
});
```

### Importação de Extrato
```typescript
const extratoSchema = z.object({
  banco_codigo: z.string().min(3),
  data_movimento: z.string().date(),
  tipo: z.enum(['credito', 'debito']),
  valor: z.number(),
  descricao: z.string().min(1),
});
```

---

## 🚀 PRIORIZAÇÃO

### MVP (Semana 1-2)
1. ✅ Dashboard de Alertas (crítico!)
2. ✅ Widget de Alertas (header)
3. ✅ Cadastro de Taxas

### Fase 2 (Semana 3)
4. ✅ Relatório de Taxas
5. ✅ Importação de Extrato

### Fase 3 (Semana 4)
6. ✅ Conciliação Manual

---

## 📝 CHECKLIST DE IMPLEMENTAÇÃO

### Setup Inicial
- [ ] Criar rotas no Next.js
- [ ] Configurar tipos TypeScript
- [ ] Setup Supabase client
- [ ] Criar layout base

### Dashboard de Alertas
- [ ] Componente AlertaDashboard
- [ ] Componente AlertaCard
- [ ] Filtros e ordenação
- [ ] Modal de detalhes
- [ ] Ações (resolver, ignorar, analisar)
- [ ] Stats cards
- [ ] Integração com API

### Widget de Alertas
- [ ] Badge no header
- [ ] Dropdown com últimos alertas
- [ ] Link para página completa
- [ ] Auto-refresh
- [ ] Subscription realtime

### Cadastro de Taxas
- [ ] Lista de taxas
- [ ] Formulário de criação
- [ ] Formulário de edição
- [ ] Ações (ativar/desativar)
- [ ] Filtros
- [ ] Validações

### Relatório de Taxas
- [ ] Cards de estatísticas
- [ ] Gráfico de evolução
- [ ] Tabela de divergências
- [ ] Filtros de período
- [ ] Exportar para Excel

### Importação de Extrato
- [ ] Upload de arquivo
- [ ] Preview dos dados
- [ ] Validação de duplicatas
- [ ] Importação batch
- [ ] Feedback de progresso

### Conciliação Manual
- [ ] Layout drag & drop
- [ ] Cards de movimento
- [ ] Sugestões automáticas
- [ ] Modal de confirmação
- [ ] Desfazer conciliação

---

## 🎯 RESULTADO ESPERADO

Ao final da implementação, o usuário deve conseguir:

1. ✅ Ver alertas de taxas divergentes em tempo real
2. ✅ Cadastrar e gerenciar taxas contratuais
3. ✅ Importar extratos bancários
4. ✅ Realizar conciliação manual
5. ✅ Ver relatórios de divergências
6. ✅ Receber notificações de alertas críticos
7. ✅ Resolver/ignorar alertas
8. ✅ Exportar dados para Excel
9. ✅ Ver histórico de resoluções
10. ✅ Monitorar taxa de conciliação

---

## 📚 REFERÊNCIAS

- Backend: 100% pronto e funcional
- Documentação completa: `SISTEMA_CONCILIACAO_RESUMO.md`
- Estrutura de dados: Todas as tabelas criadas
- Edge Functions: `validate-fees` e `scheduled-sync-erp` deployadas
- Cron jobs: 4 rotinas automáticas ativas

---

## 💡 DICAS DE IMPLEMENTAÇÃO

1. **Comece pelo Dashboard de Alertas** - É o mais crítico e visível
2. **Use componentes reutilizáveis** - Card, Badge, Button, etc
3. **Implemente realtime** - Use Supabase subscriptions para alertas
4. **Otimize queries** - Use as views prontas (`v_alertas_pendentes`, etc)
5. **Valide no frontend** - Use Zod ou similar
6. **Feedback visual** - Loading states, toasts, confirmações
7. **Trate erros** - Mensagens claras para o usuário
8. **Cache inteligente** - React Query ou SWR
9. **Testes** - Pelo menos os fluxos críticos
10. **Acessibilidade** - ARIA labels, keyboard navigation

---

## 🆘 SE PRECISAR DE AJUDA

- Todas as queries SQL estão documentadas
- Exemplos de código fornecidos
- Estrutura de dados completa
- Backend funcionando 100%

**COMECE JÁ! O backend está esperando! 🚀**

