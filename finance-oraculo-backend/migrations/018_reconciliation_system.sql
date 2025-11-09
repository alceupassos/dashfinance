-- Migration 018: Reconciliation System
-- Created: 2025-11-09
-- Purpose: Complete financial reconciliation infrastructure for banking, cards, and fees
--
-- Tables:
--   - contract_fees: Contracted fee rates
--   - bank_statements: Imported bank statements
--   - reconciliations: Matched pairs between statements and ledger entries
--   - fee_validations: Fee discrepancies detected
--   - financial_alerts: Alert registry for all financial exceptions
--   - card_transactions: Credit/debit card transactions
--
-- Views:
--   - v_alertas_pendentes: Pending alerts requiring action
--   - v_taxas_divergentes: Fee discrepancies summary
--   - v_conciliacoes_pendentes: Unmatched ledger entries

-- =========================
-- TABLE: CONTRACT FEES
-- =========================
create table if not exists contract_fees (
  id uuid primary key default gen_random_uuid(),
  company_cnpj text not null,
  tipo text not null check (tipo in (
    'boleto_emissao',
    'boleto_recebimento',
    'ted',
    'pix',
    'cartao_credito',
    'cartao_debito',
    'tarifa_manutencao'
  )),
  banco_codigo text,
  operadora text,
  taxa_percentual numeric(5,2),
  taxa_fixa numeric(10,2),
  bandeira text,
  vigencia_inicio date not null,
  vigencia_fim date,
  ativo boolean default true,
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  constraint taxa_values_check check (taxa_fixa is not null or taxa_percentual is not null)
);

create index if not exists idx_contract_fees_company on contract_fees (company_cnpj);
create index if not exists idx_contract_fees_tipo on contract_fees (tipo);
create index if not exists idx_contract_fees_vigencia on contract_fees (vigencia_inicio, vigencia_fim);
create index if not exists idx_contract_fees_active on contract_fees (ativo);

-- =========================
-- TABLE: BANK STATEMENTS
-- =========================
create table if not exists bank_statements (
  id uuid primary key default gen_random_uuid(),
  company_cnpj text not null,
  banco_codigo text not null,
  agencia text,
  conta text,
  data_movimento date not null,
  tipo text not null check (tipo in ('credito', 'debito')),
  valor numeric(18,2) not null,
  descricao text,
  documento text,
  saldo numeric(18,2),
  conciliado boolean default false,
  conciliacao_id uuid,
  importado_em timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_bank_statements_company on bank_statements (company_cnpj);
create index if not exists idx_bank_statements_data on bank_statements (data_movimento);
create index if not exists idx_bank_statements_conciliado on bank_statements (conciliado);
create index if not exists idx_bank_statements_banco on bank_statements (banco_codigo);

-- =========================
-- TABLE: RECONCILIATIONS
-- =========================
create table if not exists reconciliations (
  id uuid primary key default gen_random_uuid(),
  company_cnpj text not null,
  tipo text not null check (tipo in ('bancaria', 'cartao', 'caixa')),
  bank_statement_id uuid references bank_statements(id) on delete cascade,
  dre_entry_id bigint references dre_entries(id) on delete cascade,
  cashflow_entry_id bigint references cashflow_entries(id) on delete cascade,
  data_conciliacao date not null,
  valor_extrato numeric(18,2),
  valor_lancamento numeric(18,2),
  diferenca numeric(18,2),
  status text not null default 'pendente' check (status in ('ok', 'divergente', 'pendente', 'revisao')),
  confianca numeric(3,2),
  observacoes text,
  conciliado_por uuid references auth.users(id) on delete set null,
  conciliado_em timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_reconciliations_company on reconciliations (company_cnpj);
create index if not exists idx_reconciliations_status on reconciliations (status);
create index if not exists idx_reconciliations_data on reconciliations (data_conciliacao);
create index if not exists idx_reconciliations_bank_stmt on reconciliations (bank_statement_id);

-- =========================
-- TABLE: FEE VALIDATIONS
-- =========================
create table if not exists fee_validations (
  id uuid primary key default gen_random_uuid(),
  company_cnpj text not null,
  tipo_operacao text not null,
  bank_statement_id uuid references bank_statements(id) on delete cascade,
  contract_fee_id uuid references contract_fees(id) on delete cascade,
  data_operacao date not null,
  valor_operacao numeric(18,2) not null,
  taxa_esperada numeric(18,2),
  taxa_cobrada numeric(18,2),
  diferenca numeric(18,2),
  percentual_diferenca numeric(7,2),
  status text not null default 'ok' check (status in ('ok', 'divergente', 'alerta')),
  documento text,
  banco_codigo text,
  resolvido boolean default false,
  resolvido_por uuid references auth.users(id) on delete set null,
  resolvido_em timestamptz,
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_fee_validations_company on fee_validations (company_cnpj);
create index if not exists idx_fee_validations_status on fee_validations (status);
create index if not exists idx_fee_validations_resolvido on fee_validations (resolvido);
create index if not exists idx_fee_validations_data on fee_validations (data_operacao);

-- =========================
-- TABLE: FINANCIAL ALERTS
-- =========================
create table if not exists financial_alerts (
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
  prioridade text not null default 'media' check (prioridade in ('baixa', 'media', 'alta', 'critica')),
  titulo text not null,
  mensagem text not null,
  dados_detalhados jsonb,
  
  -- References
  fee_validation_id uuid references fee_validations(id) on delete cascade,
  reconciliation_id uuid references reconciliations(id) on delete cascade,
  bank_statement_id uuid references bank_statements(id) on delete cascade,
  
  -- Status and workflow
  status text not null default 'pendente' check (status in ('pendente', 'em_analise', 'resolvido', 'ignorado')),
  resolvido_por uuid references auth.users(id) on delete set null,
  resolvido_em timestamptz,
  resolucao_observacoes text,
  
  -- Notifications
  notificado_whatsapp boolean default false,
  notificado_whatsapp_em timestamptz,
  notificado_email boolean default false,
  notificado_email_em timestamptz,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_financial_alerts_company on financial_alerts (company_cnpj);
create index if not exists idx_financial_alerts_tipo on financial_alerts (tipo_alerta);
create index if not exists idx_financial_alerts_status on financial_alerts (status);
create index if not exists idx_financial_alerts_prioridade on financial_alerts (prioridade);
create index if not exists idx_financial_alerts_created on financial_alerts (created_at desc);
create index if not exists idx_financial_alerts_pending on financial_alerts (company_cnpj, status) where status = 'pendente';

-- =========================
-- TABLE: CARD TRANSACTIONS
-- =========================
create table if not exists card_transactions (
  id uuid primary key default gen_random_uuid(),
  company_cnpj text not null,
  operadora text not null,
  bandeira text,
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
  conciliacao_id uuid references reconciliations(id) on delete set null,
  importado_em timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_card_transactions_company on card_transactions (company_cnpj);
create index if not exists idx_card_transactions_data on card_transactions (data_venda);
create index if not exists idx_card_transactions_conciliado on card_transactions (conciliado);
create index if not exists idx_card_transactions_operadora on card_transactions (operadora);

-- =========================
-- VIEW: PENDING ALERTS
-- =========================
create or replace view v_alertas_pendentes as
select
  a.id,
  a.company_cnpj,
  a.tipo_alerta,
  a.prioridade,
  a.titulo,
  a.mensagem,
  a.status,
  a.created_at,
  a.dados_detalhados,
  extract(day from now() - a.created_at) as dias_aberto,
  case when extract(day from now() - a.created_at) > 3 then true else false end as atrasado
from financial_alerts a
where a.status in ('pendente', 'em_analise')
order by
  case a.prioridade
    when 'critica' then 1
    when 'alta' then 2
    when 'media' then 3
    when 'baixa' then 4
  end,
  a.created_at desc;

-- =========================
-- VIEW: DIVERGENT FEES
-- =========================
create or replace view v_taxas_divergentes as
select
  fv.id,
  fv.company_cnpj,
  fv.tipo_operacao,
  fv.data_operacao,
  fv.valor_operacao,
  fv.taxa_esperada,
  fv.taxa_cobrada,
  fv.diferenca,
  fv.percentual_diferenca,
  fv.documento,
  fv.banco_codigo,
  fv.resolvido,
  fv.created_at
from fee_validations fv
where fv.status in ('divergente', 'alerta')
order by fv.percentual_diferenca desc, fv.data_operacao desc;

-- =========================
-- VIEW: PENDING RECONCILIATIONS
-- =========================
create or replace view v_conciliacoes_pendentes as
select
  bs.id,
  bs.company_cnpj,
  bs.data_movimento,
  bs.tipo,
  bs.valor,
  bs.descricao,
  bs.banco_codigo,
  extract(day from now() - bs.data_movimento) as dias_pendente
from bank_statements bs
where bs.conciliado = false
order by bs.data_movimento desc;

-- =========================
-- FUNCTION: Calculate Alert Priority
-- =========================
create or replace function fn_calculate_alert_priority(p_diferenca numeric)
returns text as $$
begin
  if abs(p_diferenca) > 100 then return 'critica';
  elsif abs(p_diferenca) > 50 then return 'alta';
  elsif abs(p_diferenca) > 10 then return 'media';
  else return 'baixa';
  end if;
end;
$$ language plpgsql immutable;

-- =========================
-- FUNCTION: Reconciliation Match Score
-- =========================
create or replace function fn_match_score(
  p_data_diff integer,
  p_valor_diff_pct numeric
)
returns numeric as $$
declare
  v_score numeric := 0;
begin
  -- Data score (±3 days = 40 points)
  if p_data_diff = 0 then v_score := v_score + 40;
  elsif p_data_diff <= 1 then v_score := v_score + 30;
  elsif p_data_diff <= 3 then v_score := v_score + 20;
  end if;
  
  -- Amount score (±5% = 50 points)
  if abs(p_valor_diff_pct) < 0.01 then v_score := v_score + 50;
  elsif abs(p_valor_diff_pct) < 1 then v_score := v_score + 40;
  elsif abs(p_valor_diff_pct) < 5 then v_score := v_score + 30;
  end if;
  
  return v_score;
end;
$$ language plpgsql immutable;

-- =========================
-- GRANTS
-- =========================
grant select on contract_fees to anon, authenticated;
grant select on bank_statements to anon, authenticated;
grant select on reconciliations to anon, authenticated;
grant select on fee_validations to anon, authenticated;
grant select on financial_alerts to anon, authenticated;
grant select on card_transactions to anon, authenticated;

grant select on v_alertas_pendentes to anon, authenticated;
grant select on v_taxas_divergentes to anon, authenticated;
grant select on v_conciliacoes_pendentes to anon, authenticated;

-- Insert/update grants for specific roles will be handled by RLS policies

commit;

