-- =====================================================
-- TABELAS DE CONFIGURAÇÃO DE AUTOMAÇÕES
-- =====================================================

-- Tabela de configuração de automações por cliente
CREATE TABLE IF NOT EXISTS config_automacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Identificação
  cliente_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  
  -- Limites e Alertas
  saldo_minimo DECIMAL(15,2) DEFAULT 10000,
  saldo_critico DECIMAL(15,2) DEFAULT 5000,
  taxa_inadimplencia_max DECIMAL(5,2) DEFAULT 8.0,
  variacao_vendas_max DECIMAL(5,2) DEFAULT 20.0,
  
  -- Horários
  horario_resumo_matinal TEXT DEFAULT '08:00',
  horario_meio_dia TEXT DEFAULT '12:00',
  horario_fechamento TEXT DEFAULT '17:00',
  dias_semana_relatorio TEXT DEFAULT '1,2,3,4,5,6,7', -- 1=seg, 7=dom
  
  -- Canais
  canal_principal TEXT DEFAULT 'whatsapp', -- whatsapp, email, ambos
  telefone_whatsapp TEXT,
  email_notificacoes TEXT,
  
  -- Modelos LLM
  modelo_simples TEXT DEFAULT 'haiku-3.5',
  modelo_complexo TEXT DEFAULT 'gpt-5-high',
  temperatura_simples DECIMAL(3,2) DEFAULT 0.3,
  temperatura_complexa DECIMAL(3,2) DEFAULT 0.7,
  
  -- Flags
  ativo BOOLEAN DEFAULT true,
  incluir_infograficos BOOLEAN DEFAULT true,
  incluir_analises_ia BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de registro de execuções de automações
CREATE TABLE IF NOT EXISTS automation_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Identificação
  config_automacoes_id UUID NOT NULL REFERENCES config_automacoes(id),
  workflow_name TEXT NOT NULL,
  workflow_id TEXT,
  
  -- Execução
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running', -- running, success, failed, partial
  
  -- Detalhes
  mensagens_enviadas INTEGER DEFAULT 0,
  mensagens_falhadas INTEGER DEFAULT 0,
  modelo_usado TEXT,
  latencia_ms INTEGER,
  
  -- Erros
  erro TEXT,
  stack_trace TEXT,
  
  -- Metadados
  dados_processados JSONB,
  resultado JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de chamadas LLM
CREATE TABLE IF NOT EXISTS llm_calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Identificação
  automation_run_id UUID REFERENCES automation_runs(id),
  workflow_name TEXT NOT NULL,
  
  -- Chamada
  modelo TEXT NOT NULL,
  prompt_class TEXT, -- 'simples', 'complexa', 'analise'
  tokens_in INTEGER,
  tokens_out INTEGER,
  
  -- Resultado
  status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed
  resposta TEXT,
  erro TEXT,
  
  -- Performance
  latencia_ms INTEGER,
  temperatura DECIMAL(3,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de falhas de automação
CREATE TABLE IF NOT EXISTS automation_failures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Identificação
  automation_run_id UUID REFERENCES automation_runs(id),
  config_automacoes_id UUID REFERENCES config_automacoes(id),
  
  -- Erro
  tipo_erro TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  stack_trace TEXT,
  
  -- Tentativas
  tentativas INTEGER DEFAULT 1,
  proxima_tentativa TIMESTAMPTZ,
  
  -- Notificação
  notificado_admin BOOLEAN DEFAULT false,
  notificado_em TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_config_automacoes_cliente ON config_automacoes(cliente_id);
CREATE INDEX idx_config_automacoes_token ON config_automacoes(token);
CREATE INDEX idx_automation_runs_config ON automation_runs(config_automacoes_id);
CREATE INDEX idx_automation_runs_status ON automation_runs(status);
CREATE INDEX idx_automation_runs_created ON automation_runs(created_at DESC);
CREATE INDEX idx_llm_calls_automation ON llm_calls(automation_run_id);
CREATE INDEX idx_llm_calls_modelo ON llm_calls(modelo);
CREATE INDEX idx_automation_failures_config ON automation_failures(config_automacoes_id);

-- Seed: Configuração para Jessica/Grupo Volpe
INSERT INTO config_automacoes (
  cliente_id,
  token,
  saldo_minimo,
  saldo_critico,
  taxa_inadimplencia_max,
  telefone_whatsapp,
  canal_principal,
  ativo
) VALUES (
  (SELECT id FROM onboarding_tokens WHERE token = 'VOLPE1' LIMIT 1),
  'VOLPE1',
  10000,
  5000,
  8.0,
  '5524998567466',
  'whatsapp',
  true
) ON CONFLICT DO NOTHING;

COMMENT ON TABLE config_automacoes IS 'Configurações de automações por cliente';
COMMENT ON TABLE automation_runs IS 'Registro de execuções de workflows';
COMMENT ON TABLE llm_calls IS 'Log de todas chamadas a LLMs';
COMMENT ON TABLE automation_failures IS 'Rastreamento de falhas em automações';

