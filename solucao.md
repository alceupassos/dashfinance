# Plano Geral de Solução – DashFinance (Grupo Volpe, Oráculo, Haiku 4.5)

Status atual (11/10/2025)
- Funções Edge deployadas: sync-f360, scheduled-sync-erp, dashboard-cards, dashboard-metrics, kpi-monthly, relatorios-dre, targets.
- Ingestão F360 centralizada em common/f360-sync.ts (agrupamento por token compartilhado OK).
- Bloqueios: (1) decrypt_f360_token retorna NULL – segredo app.encryption_key incorreto/ausente; (2) sync_state não possui company_cnpj; (3) Funções exigem JWT de usuário e estamos testando com Service Role; (4) RLS com problemas em algumas tabelas (ex.: users policy recursiva); (5) Frontend: botão Enter no Oráculo, contraste da DRE e menus.
- Dados: criados registros mínimos de teste para 00026888098000 e 00026888098001; ambiente ainda sem dados reais por falha na descriptografia.

Prioridade P1 – Popular Grupo Volpe com dados reais
Objetivo: destravar ingestão real (dre_entries/cashflow_entries) para os CNPJs do Grupo Volpe, sem duplicação, com estado de sincronização rastreável.

1) Segredos e função decriptadora
- Setar chave de criptografia (a mesma usada quando os tokens foram criptografados):
  supabase secrets set app.encryption_key='SUA_CHAVE_REAL_AQUI' --project-ref xzrmzmcoslomtzkzgskn
- Validar no SQL Editor:
  SELECT current_setting('app.encryption_key', true) as current_key;
  SELECT decrypt_f360_token('<um_id_da_integration_f360>');  -- deve retornar texto não nulo
- Observação: nossa função usa integration_f360.token_enc (bytea) + pgp_sym_decrypt(current_setting('app.encryption_key')).

2) Schema e controles
- sync_state: rastrear estado por CNPJ
  ALTER TABLE sync_state ADD COLUMN IF NOT EXISTS company_cnpj TEXT;
  CREATE UNIQUE INDEX IF NOT EXISTS ux_sync_state_company_cnpj ON sync_state(company_cnpj);
  -- Opcional: colunas de diagnóstico
  ALTER TABLE sync_state ADD COLUMN IF NOT EXISTS last_success_at timestamptz;
  ALTER TABLE sync_state ADD COLUMN IF NOT EXISTS last_error text;
  ALTER TABLE sync_state ADD COLUMN IF NOT EXISTS source text;

- Deduplicação segura (antes do backfill)
  -- DRE
  WITH d AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY company_cnpj, date, account, nature, amount
             ORDER BY id
           ) AS rn
    FROM dre_entries
  )
  DELETE FROM dre_entries USING d WHERE dre_entries.id = d.id AND d.rn > 1;

  -- Cashflow
  WITH c AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY company_cnpj, date, amount, kind, category
             ORDER BY id
           ) AS rn
    FROM cashflow_entries
  )
  DELETE FROM cashflow_entries USING c WHERE cashflow_entries.id = c.id AND c.rn > 1;

- Unicidade preventiva (opcional, ajustável por negócio)
  CREATE UNIQUE INDEX IF NOT EXISTS ux_dre_entries_unique
  ON dre_entries(company_cnpj, date, account, nature, amount);

  CREATE UNIQUE INDEX IF NOT EXISTS ux_cashflow_entries_unique
  ON cashflow_entries(company_cnpj, date, amount, kind, category);

3) Execução do backfill (pipeline agrupado por token)
- Recomendado testar com Service Role (admin) enquanto o frontend usa JWTs de usuário.
- Script sugerido (já criado): test-sync-fixed.sh
  export SUPABASE_SERVICE_ROLE_KEY="<service_role>"
  ./test-sync-fixed.sh
- Esperado: funções retornam listas de empresas processadas com status success e as tabelas recebem lançamentos reais. sync_state atualizado por CNPJ.

4) Validações pós-backfill
- Verificar contagens e amostras:
  -- REST (por CNPJ)
  GET /rest/v1/dre_entries?company_cnpj=eq.<CNPJ>&select=id  -> length > 0
  GET /rest/v1/cashflow_entries?company_cnpj=eq.<CNPJ>&select=id -> length > 0
- Verificar totais coerentes no período atual e anterior (mês-1) – checar se receitas - custos - despesas = lucro.
- Confirmar que Grupo Volpe aparece completo no seletor e que APIs retornam números > 0.

Prioridade P2 – Oráculo funcionando (Haiku 4.5) e UX (Enter para enviar)
Objetivo: habilitar chat com dados reais, via LLM Haiku 4.5, com envio pelo Enter.

1) LLM (Haiku 4.5)
- Variáveis de ambiente (Edge Functions):
  LLM_PROVIDER=anthropic
  LLM_MODEL=haiku-4.5            # ou o identificador exposto pelo provedor/rota (ex.: claude-3.5-haiku, caso 4.5 não esteja disponível)
  ANTHROPIC_API_KEY=...          # ou via OpenRouter se for o caso: OPENROUTER_API_KEY=..., LLM_PROVIDER=openrouter, LLM_MODEL=anthropic/haiku-4.5
- oracle-response deve encaminhar para routeLLM com base nas variáveis acima e incluir dados contextuais (DRE/Cashflow). Já está aceitando UUID/CNPJ.

2) Autenticação
- Produção/Frontend: usar JWT de usuário (supabase.auth) – o código de oracle-response e dashboard-cards valida com getUser().
- Admin/Dev (opção rápida): permitir Service Role (somente se header Authorization == SERVICE_ROLE) pular getUser() e operar como admin – remover antes do go-live.

3) UX – Enter para enviar
- Frontend (componente de chat):
  - No input de mensagem, adicionar handler onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
  - Desabilitar botão durante envio, mostrar spinner e rolagem automática.
  - Garantir que erros de API sejam exibidos (toast) e histórico atualize após resposta.

4) Testes
- cURL: POST /functions/v1/oracle-response com question + company_cnpj
- Validação da resposta textual com base em totais do mês corrente e anterior.

Prioridade P3 – DRE, dashboards e demais menus
Objetivo: todas as páginas consumirem dados reais, consistentes e sem erros de RLS/CORS.

1) Dashboard cards/metrics/kpi/relatórios
- Confirmar que todos aceitam CNPJ OU UUID (já ajustado) e que consultam colunas corretas.
- Testes rápidos (após dados reais):
  GET /functions/v1/dashboard-cards?cnpj=<CNPJ>
  GET /functions/v1/dashboard-metrics?cnpj=<CNPJ>
  GET /functions/v1/kpi-monthly?cnpj=<CNPJ>
  GET /functions/v1/relatorios-dre?company_cnpj=<CNPJ>&periodo=YYYY-MM

2) CORS e base URLs no frontend
- Verificar .env:
  NEXT_PUBLIC_SUPABASE_URL=...
  NEXT_PUBLIC_SUPABASE_ANON_KEY=...
  NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL=https://<project>.functions.supabase.co
- Garantir que lib/api.ts usa o Functions URL.

3) RLS e policies
- Corrigir recursão na tabela users (ou equivalente) – ações possíveis:
  - Identificar a policy recursiva e ajustá-la para não ler a própria tabela na USING/ WITH CHECK.
  - Temporariamente (apenas para desbloqueio): alter table users disable row level security; (reverter após correção)
- Garantir policies coerentes para leitura de dre_entries/cashflow_entries pelas funções/usuários esperados.

4) Menus e páginas
- DRE: corrigir contraste e garantir agregação por nature (receita/custo/despesa) e subtotal/lucro, com filtro por período.
- Outros menus (contas a pagar/receber, snapshots, etc.) – validar existência de dados e ligar às tabelas correspondentes quando a ingestão real estiver ativa.

Prioridade P4 – Agendamentos e monitoramento
- scheduled-sync-erp já deployado; configurar cron no Dashboard (ex.: 0 */6 * * * para a cada 6h), canal F360 + OMIE.
- Logging e alertas: criar logs de sucesso/erro por empresa; painel rápido (tabela sync_logs ou colunas em sync_state) para último sucesso/erro.
- Auditoria: dump diário de contagens por empresa e mês (dre/cashflow) e diffs vs. dia anterior.

Fluxo operacional sugerido (checklist)
1) Segredos
   - Definir app.encryption_key correta e validar decrypt_f360_token.
2) Schema e chaves
   - Ajustar sync_state e criar índices/uniqueness.
3) Deduplicar base atual (SQL acima) e ativar índices únicos.
4) Executar pipeline agrupado (script test-sync-fixed.sh) com Service Role ou JWT de usuário.
5) Validar contagens por CNPJ, totais do mês corrente e anterior.
6) Testar funções de API e UI (dashboard, DRE, Oráculo com Haiku 4.5, Enter para enviar).
7) Configurar cron e observabilidade; documentar STATUS em STATUS_FINAL.md.

Comandos úteis (admin/dev)
- Deploy funções:
  supabase functions deploy sync-f360 --project-ref xzrmzmcoslomtzkzgskn
  supabase functions deploy scheduled-sync-erp --project-ref xzrmzmcoslomtzkzgskn

- Execução agrupada (script):
  export SUPABASE_SERVICE_ROLE_KEY="<service_role>"
  ./test-sync-fixed.sh

- Verificações REST (por CNPJ):
  GET /rest/v1/dre_entries?company_cnpj=eq.<CNPJ>&select=id
  GET /rest/v1/cashflow_entries?company_cnpj=eq.<CNPJ>&select=id

Decisões de arquitetura (resumo)
- Identificador primário nas APIs: aceitar tanto UUID (company_id) quanto CNPJ e converter quando necessário, mantendo consistência interna por CNPJ nas tabelas financeiras.
- Ingestão multiempresa: agrupamento por fingerprint de token; shared tokens distribuem lançamentos e atualizam sync_state por CNPJ.
- LLM: parametrizado por variáveis de ambiente (provider/model), alvo padrão Haiku 4.5; fallback em rota alternativa.
- Segurança: em produção, sempre JWT de usuário; Service Role apenas para admin/CI. RLS revisada para impedir loops e vazar dados.

Critérios de aceite
- Grupo Volpe com dados reais (DRE e Cashflow > 0) e dashboards renderizando sem erros.
- Oráculo responde com base nos dados reais, envio com Enter e histórico salvo.
- scheduled-sync-erp dispara e mantém sync_state atualizado por CNPJ.
- Deduplicação garantida (sem registros duplicados) e índices únicos ativos.
- Documentação de estado final atualizada (STATUS_FINAL.md) e solucao.md versionado.

Riscos e mitigação
- Chave de criptografia desconhecida: bloquear pipeline – mitigar com alinhamento com quem gerou os tokens ou recriptografar tokens com a nova chave e atualizar integration_f360.
- Políticas RLS quebrando rotas: manter verificação após cada alteração e logs de erro claros nas funções.
- Diferenças de schema entre ambientes: padronizar migrations e usar db push apenas com ordem correta de migrações.
