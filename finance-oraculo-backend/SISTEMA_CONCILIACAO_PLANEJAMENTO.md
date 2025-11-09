# 🎯 SISTEMA DE CONCILIAÇÃO FINANCEIRA - PLANEJAMENTO COMPLETO

## 📋 VISÃO GERAL

Sistema automatizado de conciliação financeira que valida:
1. ✅ Conciliação de caixa
2. ✅ Pagamentos e cartões de crédito
3. ✅ Conciliação bancária
4. ✅ Validação de taxas (bancárias, boleto, cartão)
5. ✅ Alertas automáticos via WhatsApp + Sistema
6. ✅ Dashboard de pendências no frontend

## 🏗️ ARQUITETURA DO SISTEMA

```
┌─────────────────────────────────────────────────────────┐
│                    DADOS DE ENTRADA                      │
├─────────────────────────────────────────────────────────┤
│  • Extrato Bancário (API/OFX)                           │
│  • Lançamentos F360/Omie                                │
│  • DRE Entries                                          │
│  • Cashflow Entries                                     │
│  • Taxas Contratuais (cadastradas)                      │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│              ROTINAS DE CONCILIAÇÃO                      │
├─────────────────────────────────────────────────────────┤
│  1. Conciliação Bancária (extrato vs lançamentos)      │
│  2. Validação de Taxas (cobrado vs contratado)         │
│  3. Conciliação de Cartão (operadora vs sistema)       │
│  4. Check de Pagamentos (pendentes vs realizados)      │
│  5. Conciliação de Caixa (saldo vs movimentações)      │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│              DETECÇÃO DE DIVERGÊNCIAS                    │
├─────────────────────────────────────────────────────────┤
│  • Taxa errada cobrada                                  │
│  • Pagamento não encontrado                             │
│  • Valor divergente                                     │
│  • Lançamento órfão (sem match)                         │
│  • Saldo bancário diferente do sistema                  │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│              SISTEMA DE ALERTAS                          │
├─────────────────────────────────────────────────────────┤
│  • WhatsApp (notificação imediata)                      │
│  • Dashboard (lista de pendências)                      │
│  • Email (relatório diário)                             │
│  • Tabela de alertas (histórico)                        │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│              AÇÕES E RESOLUÇÃO                           │
├─────────────────────────────────────────────────────────┤
│  • Marcar como resolvido                                │
│  • Adicionar observações                                │
│  • Contestar com banco                                  │
│  • Ajustar lançamento                                   │
│  • Ignorar (falso positivo)                             │
└─────────────────────────────────────────────────────────┘
```

## 🗄️ ESTRUTURA DE DADOS

### Tabela: `contract_fees` (Taxas Contratuais)
Armazena taxas contratadas com bancos/operadoras

```sql
create table contract_fees (
  id uuid primary key default gen_random_uuid(),
  company_cnpj text not null,
  tipo text not null check (tipo in ('boleto_emissao', 'boleto_recebimento', 'ted', 'pix', 'cartao_credito', 'cartao_debito', 'tarifa_manutencao')),
  banco_codigo text,  -- Código do banco
  operadora text,     -- Operadora de cartão
  taxa_percentual numeric(5,2),  -- Taxa em %
  taxa_fixa numeric(10,2),       -- Taxa fixa em R$
  bandeira text,      -- Visa, Master, Elo, etc (para cartão)
  vigencia_inicio date not null,
  vigencia_fim date,
  ativo boolean default true,
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_contract_fees_company on contract_fees (company_cnpj);
create index idx_contract_fees_tipo on contract_fees (tipo);
create index idx_contract_fees_vigencia on contract_fees (vigencia_inicio, vigencia_fim);
```

### Tabela: `bank_statements` (Extratos Bancários)
Armazena extratos bancários importados

```sql
create table bank_statements (
  id uuid primary key default gen_random_uuid(),
  company_cnpj text not null,
  banco_codigo text not null,
  agencia text,
  conta text,
  data_movimento date not null,
  tipo text not null check (tipo in ('credito', 'debito')),
  valor numeric(18,2) not null,
  descricao text,
  documento text,  -- Número do documento
  saldo numeric(18,2),
  conciliado boolean default false,
  conciliacao_id uuid,
  importado_em timestamptz default now(),
  created_at timestamptz default now()
);

create index idx_bank_statements_company on bank_statements (company_cnpj);
create index idx_bank_statements_data on bank_statements (data_movimento);
create index idx_bank_statements_conciliado on bank_statements (conciliado);
```

### Tabela: `reconciliations` (Conciliações)
Registra matches entre extrato e lançamentos

```sql
create table reconciliations (
  id uuid primary key default gen_random_uuid(),
  company_cnpj text not null,
  tipo text not null check (tipo in ('bancaria', 'cartao', 'caixa')),
  bank_statement_id uuid references bank_statements(id),
  dre_entry_id bigint references dre_entries(id),
  cashflow_entry_id bigint references cashflow_entries(id),
  data_conciliacao date not null,
  valor_extrato numeric(18,2),
  valor_lancamento numeric(18,2),
  diferenca numeric(18,2),
  status text not null check (status in ('ok', 'divergente', 'pendente', 'revisao')),
  observacoes text,
  conciliado_por uuid references users(id),
  conciliado_em timestamptz,
  created_at timestamptz default now()
);

create index idx_reconciliations_company on reconciliations (company_cnpj);
create index idx_reconciliations_status on reconciliations (status);
create index idx_reconciliations_data on reconciliations (data_conciliacao);
```

### Tabela: `fee_validations` (Validações de Taxas)
Registra validações de taxas cobradas vs contratadas

```sql
create table fee_validations (
  id uuid primary key default gen_random_uuid(),
  company_cnpj text not null,
  tipo_operacao text not null,
  bank_statement_id uuid references bank_statements(id),
  contract_fee_id uuid references contract_fees(id),
  data_operacao date not null,
  valor_operacao numeric(18,2) not null,
  taxa_esperada numeric(18,2),
  taxa_cobrada numeric(18,2),
  diferenca numeric(18,2),
  percentual_diferenca numeric(5,2),
  status text not null check (status in ('ok', 'divergente', 'alerta')),
  documento text,  -- Número do título/boleto
  banco_codigo text,
  resolvido boolean default false,
  resolvido_por uuid references users(id),
  resolvido_em timestamptz,
  observacoes text,
  created_at timestamptz default now()
);

create index idx_fee_validations_company on fee_validations (company_cnpj);
create index idx_fee_validations_status on fee_validations (status);
create index idx_fee_validations_resolvido on fee_validations (resolvido);
```

### Tabela: `financial_alerts` (Alertas Financeiros)
Sistema unificado de alertas

```sql
create table financial_alerts (
  id uuid primary key default gen_random_uuid(),
  company_cnpj text not null,
  tipo_alerta text not null check (tipo_alerta in (
    'taxa_divergente', 
    'conciliacao_pendente', 
    'pagamento_nao_encontrado',
    'valor_divergente',
    'lancamento_orfao',
    'saldo_divergente'
  )),
  prioridade text not null check (prioridade in ('baixa', 'media', 'alta', 'critica')),
  titulo text not null,
  mensagem text not null,
  dados_detalhados jsonb,  -- JSON com detalhes específicos
  
  -- Referências
  fee_validation_id uuid references fee_validations(id),
  reconciliation_id uuid references reconciliations(id),
  bank_statement_id uuid references bank_statements(id),
  
  -- Status e workflow
  status text not null default 'pendente' check (status in ('pendente', 'em_analise', 'resolvido', 'ignorado')),
  resolvido_por uuid references users(id),
  resolvido_em timestamptz,
  resolucao_observacoes text,
  
  -- Notificações
  notificado_whatsapp boolean default false,
  notificado_whatsapp_em timestamptz,
  notificado_email boolean default false,
  notificado_email_em timestamptz,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_financial_alerts_company on financial_alerts (company_cnpj);
create index idx_financial_alerts_tipo on financial_alerts (tipo_alerta);
create index idx_financial_alerts_status on financial_alerts (status);
create index idx_financial_alerts_prioridade on financial_alerts (prioridade);
create index idx_financial_alerts_created on financial_alerts (created_at desc);
```

### Tabela: `card_transactions` (Transações de Cartão)
Armazena transações de cartão para conciliação

```sql
create table card_transactions (
  id uuid primary key default gen_random_uuid(),
  company_cnpj text not null,
  operadora text not null,  -- Stone, Cielo, Rede, etc
  bandeira text,             -- Visa, Master, Elo
  data_venda date not null,
  data_prevista_recebimento date,
  data_recebimento date,
  valor_bruto numeric(18,2) not null,
  taxa_percentual numeric(5,2),
  taxa_valor numeric(18,2),
  valor_liquido numeric(18,2),
  parcelas integer,
  parcela_numero integer,
  nsu text,
  autorizacao text,
  conciliado boolean default false,
  conciliacao_id uuid references reconciliations(id),
  importado_em timestamptz default now(),
  created_at timestamptz default now()
);

create index idx_card_transactions_company on card_transactions (company_cnpj);
create index idx_card_transactions_data on card_transactions (data_venda);
create index idx_card_transactions_conciliado on card_transactions (conciliado);
```

## 🔄 ROTINAS AUTOMATIZADAS

### 1. Conciliação Bancária (`reconcile-bank-statements`)
**Frequência:** Diária às 06:00 BRT
**Função:** Matchear extratos bancários com lançamentos do sistema

```typescript
// Lógica:
// 1. Buscar extratos não conciliados
// 2. Buscar lançamentos próximos (data ±3 dias, valor ±5%)
// 3. Criar matches automáticos quando há alta confiança
// 4. Criar alertas para casos duvidosos
```

### 2. Validação de Taxas (`validate-fees`)
**Frequência:** Diária às 07:00 BRT
**Função:** Comparar taxas cobradas vs taxas contratadas

```typescript
// Lógica:
// 1. Identificar operações com taxa no extrato
// 2. Buscar taxa contratual vigente
// 3. Calcular taxa esperada
// 4. Comparar com taxa cobrada
// 5. Se divergência > 2%, criar alerta
```

### 3. Conciliação de Cartão (`reconcile-card-transactions`)
**Frequência:** Diária às 08:00 BRT
**Função:** Validar recebimentos de cartão

```typescript
// Lógica:
// 1. Buscar transações de cartão pendentes
// 2. Buscar recebimentos no extrato bancário
// 3. Validar taxas da operadora
// 4. Matchear valores líquidos
// 5. Alertar sobre divergências
```

### 4. Check de Pagamentos (`check-pending-payments`)
**Frequência:** Diária às 09:00 BRT
**Função:** Validar se pagamentos agendados foram realizados

```typescript
// Lógica:
// 1. Buscar pagamentos com vencimento D-1
// 2. Verificar se há débito correspondente no extrato
// 3. Alertar sobre pagamentos não encontrados
```

### 5. Conciliação de Caixa (`reconcile-cash`)
**Frequência:** Diária às 10:00 BRT
**Função:** Validar saldo de caixa

```typescript
// Lógica:
// 1. Calcular saldo esperado (saldo anterior + entradas - saídas)
// 2. Comparar com saldo no extrato
// 3. Identificar lançamentos órfãos
// 4. Alertar sobre divergências > R$ 10,00
```

## 🚨 SISTEMA DE ALERTAS

### Tipos de Alertas e Mensagens

#### 1. Taxa Divergente - Boleto
```
🚨 ALERTA: Taxa de boleto incorreta

Empresa: [Nome da Empresa]
Título: [Número do Título]
Data: [Data da Operação]

Taxa Contratada: R$ 2,50
Taxa Cobrada: R$ 3,90
Diferença: R$ 1,40 a mais

Ação: Entre em contato com o banco [Nome do Banco] 
para contestar a cobrança incorreta.

Agência: [Agência] | Conta: [Conta]
Protocolo de atendimento necessário.
```

#### 2. Pagamento Não Encontrado
```
⚠️ ALERTA: Pagamento não localizado

Empresa: [Nome da Empresa]
Fornecedor: [Nome]
Vencimento: [Data]
Valor: R$ [Valor]

O pagamento estava agendado mas não foi 
encontrado no extrato bancário.

Ação: Verificar se o pagamento foi processado.
```

#### 3. Conciliação Pendente
```
📋 ALERTA: Lançamento sem conciliação

Empresa: [Nome da Empresa]
Lançamento: [Descrição]
Data: [Data]
Valor: R$ [Valor]

Este lançamento não foi encontrado no 
extrato bancário.

Ação: Verificar se a movimentação foi realizada.
```

## 📱 INTEGRAÇÃO COM WHATSAPP

### Fluxo de Notificação

```typescript
// Quando um alerta é criado:
1. Buscar contato WhatsApp do cliente (código_whatsapp)
2. Formatar mensagem específica do tipo de alerta
3. Enviar via wasender-send-message
4. Marcar como notificado_whatsapp = true
5. Registrar timestamp
```

### Template de Mensagem WhatsApp

```
🔔 *ALERTA FINANCEIRO - [EMPRESA]*

*Tipo:* [Tipo do Alerta]
*Prioridade:* [Prioridade]

[Mensagem detalhada]

🔍 *Detalhes:*
[Dados específicos]

✅ *Ação Necessária:*
[O que fazer]

_Para mais informações, acesse o sistema._
_Ref: ALT-[ID]_
```

## 🎨 INTERFACE FRONTEND

### Dashboard de Conciliação

**Seções:**

1. **Resumo Geral**
   - Total de alertas pendentes
   - Divergências totais em R$
   - Taxa de conciliação (%)
   - Últimas atualizações

2. **Lista de Alertas**
   - Filtros: tipo, prioridade, status, data
   - Ordenação: mais recentes, maior valor, maior prioridade
   - Ações rápidas: resolver, analisar, ignorar

3. **Conciliação Bancária**
   - Extratos importados
   - Lançamentos pendentes de conciliação
   - Match automático sugerido
   - Match manual

4. **Validação de Taxas**
   - Lista de taxas cobradas
   - Comparativo com contrato
   - Histórico de contestações
   - Gráfico de evolução

5. **Detalhes do Alerta**
   - Informações completas
   - Linha do tempo
   - Anexos/documentos
   - Campo de observações
   - Botões de ação

## 📊 RELATÓRIOS

### Relatório Diário de Conciliação
- Total conciliado vs pendente
- Divergências encontradas
- Alertas criados
- Taxa de resolução

### Relatório Mensal de Taxas
- Taxas cobradas vs contratadas
- Economia/prejuízo acumulado
- Top 5 maiores divergências
- Recomendações

## 🔐 PERMISSÕES

### Roles e Acessos:

- **Admin:** Tudo
- **Financeiro:** Ver e resolver alertas
- **Gerente:** Ver apenas sua empresa
- **Auditor:** Somente leitura

## 📈 MÉTRICAS E KPIs

1. **Taxa de Conciliação Automática:** % de matches automáticos
2. **Tempo Médio de Resolução:** Dias até resolver alerta
3. **Economia com Contestações:** R$ recuperado de taxas erradas
4. **Divergências por Banco:** Qual banco tem mais erros
5. **Assertividade:** % de alertas que eram realmente erros

## 🚀 PRIORIZAÇÃO DE IMPLEMENTAÇÃO

### Fase 1 (Crítico - 1 semana)
- [x] Criar tabelas
- [ ] Rotina de validação de taxas
- [ ] Sistema básico de alertas
- [ ] Integração WhatsApp

### Fase 2 (Importante - 2 semanas)
- [ ] Conciliação bancária
- [ ] Importação de extratos
- [ ] Dashboard frontend
- [ ] CRUD de taxas contratuais

### Fase 3 (Desejável - 3 semanas)
- [ ] Conciliação de cartão
- [ ] Relatórios avançados
- [ ] Machine learning para matches
- [ ] API de contestação automática

---

**Próximos passos:**
1. Criar estrutura de tabelas
2. Implementar Edge Functions
3. Criar sistema de alertas
4. Integrar com WhatsApp
5. Desenvolver frontend

