-- Migration: Create LLM Pricing and Token Usage tables
-- Description: Tables for managing LLM pricing and tracking token usage

-- Table: llm_pricing
-- Stores pricing information for different LLM providers and models
CREATE TABLE IF NOT EXISTS public.llm_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    cost_per_1k_input_tokens DECIMAL(10, 6) NOT NULL DEFAULT 0,
    cost_per_1k_output_tokens DECIMAL(10, 6) NOT NULL DEFAULT 0,
    price_per_1k_input_tokens DECIMAL(10, 6) NOT NULL DEFAULT 0,
    price_per_1k_output_tokens DECIMAL(10, 6) NOT NULL DEFAULT 0,
    markup_multiplier DECIMAL(5, 2) NOT NULL DEFAULT 3.5,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(provider, model)
);

-- Table: llm_token_usage
-- Tracks token usage for billing and analytics
CREATE TABLE IF NOT EXISTS public.llm_token_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    empresa_cnpj TEXT,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,
    client_price_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,
    feature TEXT,
    endpoint TEXT,
    request_id TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_llm_pricing_provider_model ON public.llm_pricing(provider, model);
CREATE INDEX IF NOT EXISTS idx_llm_pricing_is_active ON public.llm_pricing(is_active);
CREATE INDEX IF NOT EXISTS idx_llm_token_usage_user_id ON public.llm_token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_token_usage_empresa_cnpj ON public.llm_token_usage(empresa_cnpj);
CREATE INDEX IF NOT EXISTS idx_llm_token_usage_provider_model ON public.llm_token_usage(provider, model);
CREATE INDEX IF NOT EXISTS idx_llm_token_usage_created_at ON public.llm_token_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_llm_token_usage_feature ON public.llm_token_usage(feature);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_llm_pricing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_llm_pricing_updated_at ON public.llm_pricing;
CREATE TRIGGER trigger_update_llm_pricing_updated_at
    BEFORE UPDATE ON public.llm_pricing
    FOR EACH ROW
    EXECUTE FUNCTION update_llm_pricing_updated_at();

-- Enable RLS
ALTER TABLE public.llm_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_token_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for llm_pricing
-- Admins can do everything
CREATE POLICY "Admins can manage llm_pricing"
    ON public.llm_pricing
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'executivo_conta')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'executivo_conta')
        )
    );

-- All authenticated users can read active pricing
CREATE POLICY "Authenticated users can read active pricing"
    ON public.llm_pricing
    FOR SELECT
    TO authenticated
    USING (is_active = true);

-- RLS Policies for llm_token_usage
-- Admins can see all usage
CREATE POLICY "Admins can view all token usage"
    ON public.llm_token_usage
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'executivo_conta')
        )
    );

-- Users can see their own usage
CREATE POLICY "Users can view their own token usage"
    ON public.llm_token_usage
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- System can insert usage (service role)
CREATE POLICY "Service role can insert token usage"
    ON public.llm_token_usage
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Insert default pricing for common models
INSERT INTO public.llm_pricing (provider, model, cost_per_1k_input_tokens, cost_per_1k_output_tokens, markup_multiplier) VALUES
    ('openai', 'gpt-4o', 0.0025, 0.010, 3.5),
    ('openai', 'gpt-4o-mini', 0.00015, 0.0006, 3.5),
    ('openai', 'gpt-4-turbo', 0.010, 0.030, 3.5),
    ('openai', 'gpt-3.5-turbo', 0.0005, 0.0015, 3.5),
    ('anthropic', 'claude-3-5-sonnet-20241022', 0.003, 0.015, 3.5),
    ('anthropic', 'claude-3-5-haiku-20241022', 0.001, 0.005, 3.5),
    ('anthropic', 'claude-3-opus-20240229', 0.015, 0.075, 3.5),
    ('openrouter', 'anthropic/claude-3.5-sonnet', 0.003, 0.015, 3.5),
    ('openrouter', 'anthropic/claude-3-haiku', 0.00025, 0.00125, 3.5),
    ('openrouter', 'openai/gpt-4o', 0.0025, 0.010, 3.5)
ON CONFLICT (provider, model) DO NOTHING;

-- Update price_per_1k_*_tokens based on cost and markup
UPDATE public.llm_pricing
SET 
    price_per_1k_input_tokens = cost_per_1k_input_tokens * markup_multiplier,
    price_per_1k_output_tokens = cost_per_1k_output_tokens * markup_multiplier
WHERE price_per_1k_input_tokens = 0;

-- Add comments
COMMENT ON TABLE public.llm_pricing IS 'Stores pricing configuration for LLM providers and models';
COMMENT ON TABLE public.llm_token_usage IS 'Tracks token usage for billing and analytics';
COMMENT ON COLUMN public.llm_pricing.markup_multiplier IS 'Multiplier applied to cost to calculate client price (default 3.5x)';
COMMENT ON COLUMN public.llm_token_usage.cost_usd IS 'Our cost in USD for this request';
COMMENT ON COLUMN public.llm_token_usage.client_price_usd IS 'Price charged to client in USD';

