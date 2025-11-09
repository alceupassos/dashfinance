CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- CORE TABLES FOR DRE / CASHFLOW / ACCOUNTS
-- =============================================

CREATE TABLE IF NOT EXISTS public.dre_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_cnpj TEXT NOT NULL,
  date DATE NOT NULL,
  account TEXT,
  nature TEXT NOT NULL CHECK (nature IN ('receita', 'custo', 'despesa', 'outras')),
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  cost_center TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dre_entries_company_date_idx ON public.dre_entries (company_cnpj, date);

CREATE TABLE IF NOT EXISTS public.cashflow_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_cnpj TEXT NOT NULL,
  date DATE NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('in', 'out')),
  category TEXT,
  description TEXT,
  status TEXT DEFAULT 'realizado',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cashflow_entries_company_date_idx ON public.cashflow_entries (company_cnpj, date);
CREATE INDEX IF NOT EXISTS cashflow_entries_kind_idx ON public.cashflow_entries (kind);

CREATE TABLE IF NOT EXISTS public.daily_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_cnpj TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  cash_balance NUMERIC(18,2) DEFAULT 0,
  available_for_payments NUMERIC(18,2) DEFAULT 0,
  runway_days INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS daily_snapshots_company_date_uidx
  ON public.daily_snapshots (company_cnpj, snapshot_date);

CREATE TABLE IF NOT EXISTS public.contas_pagar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID,
  company_cnpj TEXT,
  fornecedor TEXT,
  descricao TEXT,
  categoria TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  data_emissao DATE,
  data_vencimento DATE NOT NULL,
  valor NUMERIC(18,2) NOT NULL,
  pago_em DATE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contas_pagar_empresa_idx ON public.contas_pagar (empresa_id);
CREATE INDEX IF NOT EXISTS contas_pagar_vencimento_idx ON public.contas_pagar (data_vencimento);
CREATE INDEX IF NOT EXISTS contas_pagar_status_idx ON public.contas_pagar (status);

CREATE TABLE IF NOT EXISTS public.contas_receber (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID,
  company_cnpj TEXT,
  cliente TEXT,
  descricao TEXT,
  categoria TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  data_emissao DATE,
  data_vencimento DATE NOT NULL,
  valor NUMERIC(18,2) NOT NULL,
  recebido_em DATE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contas_receber_empresa_idx ON public.contas_receber (empresa_id);
CREATE INDEX IF NOT EXISTS contas_receber_vencimento_idx ON public.contas_receber (data_vencimento);
CREATE INDEX IF NOT EXISTS contas_receber_status_idx ON public.contas_receber (status);

-- =============================================
-- INTEGRATIONS / SYNC STATE
-- =============================================

CREATE TABLE IF NOT EXISTS public.integration_f360 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'connected',
  last_sync_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.integration_omie (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_nome TEXT NOT NULL,
  cnpj TEXT,
  status TEXT DEFAULT 'connected',
  last_sync_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS integration_omie_cliente_idx ON public.integration_omie (cliente_nome);

CREATE TABLE IF NOT EXISTS public.sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT DEFAULT 'idle',
  last_success_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sync_state_cnpj_source_uidx ON public.sync_state (cnpj, source);

-- =============================================
-- ONBOARDING TOKENS
-- =============================================

CREATE TABLE IF NOT EXISTS public.onboarding_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  empresa_id UUID,
  funcao TEXT DEFAULT 'onboarding',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_por UUID,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS onboarding_tokens_empresa_idx ON public.onboarding_tokens (empresa_id);
CREATE INDEX IF NOT EXISTS onboarding_tokens_ativo_idx ON public.onboarding_tokens (ativo);

-- =============================================
-- FINANCIAL KPI TABLE + VIEW
-- =============================================

CREATE TABLE IF NOT EXISTS public.financial_kpi_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_cnpj TEXT NOT NULL,
  month DATE NOT NULL,
  receita NUMERIC(18,2) DEFAULT 0,
  custos NUMERIC(18,2) DEFAULT 0,
  ebitda NUMERIC(18,2) DEFAULT 0,
  margem_bruta NUMERIC(8,4) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS financial_kpi_monthly_uidx
  ON public.financial_kpi_monthly (company_cnpj, month);

CREATE OR REPLACE VIEW public.v_kpi_monthly_enriched AS
SELECT
  company_cnpj,
  to_char(month, 'YYYY-MM') AS month,
  receita,
  custos,
  ebitda,
  margem_bruta,
  CASE WHEN receita <> 0 THEN (receita - custos) / receita ELSE 0 END AS margem_liquida,
  receita - custos AS lucro_bruto
FROM public.financial_kpi_monthly;

-- =============================================
-- WHATSAPP TABLES
-- =============================================

CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_cnpj TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  contact_type TEXT DEFAULT 'cliente',
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ativo',
  provider TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_conversations_company_idx ON public.whatsapp_conversations (company_cnpj);
CREATE INDEX IF NOT EXISTS whatsapp_conversations_status_idx ON public.whatsapp_conversations (status);
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_conversations_unique_phone_idx ON public.whatsapp_conversations (company_cnpj, phone_number);

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_cnpj TEXT,
  contato_phone TEXT,
  phone_number TEXT,
  direction TEXT,
  status TEXT,
  message_text TEXT,
  texto_enviado TEXT,
  texto_recebido TEXT,
  message_id TEXT,
  template_usada TEXT,
  variaveis_usadas JSONB,
  sentiment_score NUMERIC(6,3),
  sentiment_label TEXT,
  received_at TIMESTAMPTZ,
  timestamp TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_messages_company_idx ON public.whatsapp_messages (company_cnpj);
CREATE INDEX IF NOT EXISTS whatsapp_messages_direction_idx ON public.whatsapp_messages (direction);
CREATE INDEX IF NOT EXISTS whatsapp_messages_created_idx ON public.whatsapp_messages (created_at DESC);

CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  provider TEXT,
  language TEXT,
  content JSONB NOT NULL,
  variables TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_templates_name_idx ON public.whatsapp_templates (name);
CREATE INDEX IF NOT EXISTS whatsapp_templates_status_idx ON public.whatsapp_templates (status);

-- =============================================
-- RLS / POLICIES (READ FOR AUTH + ANON)
-- =============================================

ALTER TABLE public.dre_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashflow_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_f360 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_omie ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_kpi_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol TEXT;
  policy_name TEXT;
BEGIN
  FOR pol IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
    'dre_entries','cashflow_entries','daily_snapshots','contas_pagar','contas_receber',
    'integration_f360','integration_omie','sync_state','onboarding_tokens','financial_kpi_monthly',
    'whatsapp_conversations','whatsapp_messages','whatsapp_templates'
  ) LOOP
    policy_name := pol || '_select';
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = pol AND policyname = policy_name
    ) THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (true);', policy_name, pol);
    END IF;

    policy_name := pol || '_write';
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = pol AND policyname = policy_name
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'');',
        policy_name,
        pol
      );
    END IF;
  END LOOP;
END $$;

GRANT SELECT ON public.v_kpi_monthly_enriched TO anon, authenticated;
