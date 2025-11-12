# Finance Oráculo Backend

Backend completo para análise financeira empresarial, com integração F360 e OMIE, análise por IA (GPT-4 e Claude Sonnet 4.5), e exportação de relatórios.

## Estrutura do Projeto

```
finance-oraculo-backend/
├── .env                          # Variáveis de ambiente
├── README.md                     # Este arquivo
├── migrations/
│   └── 001_bootstrap.sql         # Migração SQL única (idempotente)
└── functions/                    # Edge Functions (Deno)
    ├── common/
    │   └── db.ts                 # Utilitários de banco de dados
    ├── sync-f360/
    │   └── index.ts              # Sincronização F360
    ├── sync-omie/
    │   └── index.ts              # Sincronização OMIE
    ├── analyze/
    │   └── index.ts              # Análise financeira com IA
    ├── export-excel/
    │   └── index.ts              # Exportação de relatórios XLSX
    └── upload-dre/
        └── index.ts              # Upload manual de DRE
```

## Tecnologias

- **Supabase**: PostgreSQL + Edge Functions (Deno)
- **PostgreSQL Extensions**: pgcrypto, pg_trgm, pg_cron, pg_net
- **Deno**: Runtime para Edge Functions
- **SheetJS (xlsx)**: Manipulação de arquivos Excel
- **OpenAI GPT-4**: Análise criativa
- **Anthropic Claude Sonnet 4.5**: Análise técnica

## Instalação e Configuração

### 1. Configurar Variáveis de Ambiente

O arquivo [.env](.env) já está configurado com suas credenciais. Certifique-se de que ele está na raiz do projeto.

### 2. Aplicar Migração SQL

No SQL Editor do Supabase, execute os seguintes comandos:

```sql
-- Configurar a chave KMS para criptografia
select set_config('app.kms', 'B5b0dcf500@#', false);

-- Configurar as URLs das Edge Functions e Service Key
select set_config('app.service_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTc1MjYyMywiZXhwIjoyMDc3MzI4NjIzfQ.716RfI9V2Vv3nGcx5rK4epnLddUUdFT3-doegfrXcmk', false);
select set_config('app.sync_f360_url', 'https://xzrmzmcoslomtzkzgskn.functions.supabase.co/sync-f360', false);
select set_config('app.sync_omie_url', 'https://xzrmzmcoslomtzkzgskn.functions.supabase.co/sync-omie', false);
```

Em seguida, execute o arquivo [migrations/001_bootstrap.sql](migrations/001_bootstrap.sql):

```bash
# Via Supabase CLI (se instalado)
supabase db push

# OU copie e cole o conteúdo do arquivo no SQL Editor
```

### 3. Deploy das Edge Functions

Instale o Supabase CLI:

```bash
npm install -g supabase
```

Faça login:

```bash
supabase login
```

Vincule o projeto:

```bash
supabase link --project-ref xzrmzmcoslomtzkzgskn
```

Deploy das funções:

```bash
# Deploy todas as funções
supabase functions deploy sync-f360
supabase functions deploy sync-omie
supabase functions deploy analyze
supabase functions deploy export-excel
supabase functions deploy upload-dre

# Definir secrets (variáveis de ambiente)
supabase secrets set SUPABASE_URL=https://xzrmzmcoslomtzkzgskn.supabase.co
supabase secrets set SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTc1MjYyMywiZXhwIjoyMDc3MzI4NjIzfQ.716RfI9V2Vv3nGcx5rK4epnLddUUdFT3-doegfrXcmk
supabase secrets set OPENAI_API_KEY=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
supabase secrets set ANTHROPIC_API_KEY=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
supabase secrets set KMS_SECRET=B5b0dcf500@#
supabase secrets set F360_API_BASE=https://api.f360.com.br/v1
supabase secrets set OMIE_API_BASE=https://app.omie.com.br/api/v1/
```

## Endpoints Disponíveis

Base URL: `https://xzrmzmcoslomtzkzgskn.functions.supabase.co`

### 1. Sincronização F360

```bash
POST /sync-f360
```

Sincroniza dados do F360 para todas as empresas configuradas.

**Resposta:**
```json
{
  "success": true,
  "results": [
    {
      "cliente": "DEX INVEST",
      "cnpj": "00052912647000",
      "synced": 150
    }
  ],
  "timestamp": "2025-11-06T10:30:00Z"
}
```

### 2. Sincronização OMIE

```bash
POST /sync-omie
```

Sincroniza dados do OMIE para todas as empresas configuradas.

### 3. Análise Financeira com IA

```bash
GET /analyze?style=creative&cnpj=00052912647000&from=2025-01-01&to=2025-11-06
```

**Parâmetros:**
- `style`: `creative` (GPT-4) ou `technical` (Claude Sonnet 4.5)
- `cnpj`: CNPJ da empresa (obrigatório)
- `from`: Data inicial (opcional, padrão: 90 dias atrás)
- `to`: Data final (opcional, padrão: hoje)

**Resposta:**
```json
{
  "cnpj": "00052912647000",
  "period": {
    "from": "2025-01-01",
    "to": "2025-11-06"
  },
  "kpis": [
    {
      "month": "2025-01-01",
      "receita": 100000,
      "custos": -30000,
      "despesas": -40000,
      "ebitda": 30000,
      "margem_bruta": 0.7
    }
  ],
  "analysis": {
    "text": "Análise detalhada gerada pela IA...",
    "highlights": [
      "Receita cresceu 15% no último mês",
      "Margem bruta melhorou 3.2pp"
    ],
    "recommendations": [
      "Monitore a margem bruta mensalmente",
      "Revise estrutura de custos se EBITDA < 15%"
    ]
  },
  "charts_metadata": [...]
}
```

### 4. Exportar Relatório Excel

```bash
# Por CNPJ
GET /export-excel?cnpj=00052912647000&from=2025-01-01&to=2025-12-31

# Por Grupo/Alias
GET /export-excel?alias=Holding%20A&from=2025-01-01&to=2025-12-31
```

**Resposta:** Arquivo XLSX com 3 abas:
- DRE Mensal
- Fluxo de Caixa (apenas para CNPJ individual)
- Resumo

### 5. Upload Manual de DRE

```bash
POST /upload-dre
Content-Type: multipart/form-data

form-data:
  - file: arquivo.xlsx
  - cnpj: 00052912647000
```

**Formato esperado do Excel:**

Aba 1 (DRE):
| Data       | Conta            | Tipo     | Valor    | Empresa       |
|------------|------------------|----------|----------|---------------|
| 2025-01-01 | Receita Bruta    | receita  | 100000   | DEX INVEST    |
| 2025-01-01 | Custo Mercadoria | custo    | -30000   | DEX INVEST    |

Aba 2 (Fluxo de Caixa - opcional):
| Data       | Tipo    | Categoria     | Valor  |
|------------|---------|---------------|--------|
| 2025-01-01 | in      | Recebimentos  | 80000  |
| 2025-01-05 | out     | Fornecedores  | 25000  |

## Agendamentos Automáticos (pg_cron)

Os seguintes jobs estão configurados:

- **F360**: Sincronização a cada 10 minutos
- **OMIE**: Sincronização a cada 15 minutos

Para verificar os jobs:

```sql
select * from cron.job;
```

Para verificar logs:

```sql
select * from cron.job_run_details order by start_time desc limit 10;
```

## Views e Funções SQL

### Views Disponíveis

1. **v_kpi_monthly**: KPIs mensais por empresa
2. **v_kpi_monthly_enriched**: KPIs com margem bruta calculada
3. **v_audit_health**: Status de saúde das sincronizações

### Funções Disponíveis

1. **fn_kpi_monthly_grouped(group_name, dt_from, dt_to)**: KPIs consolidados por grupo/alias

```sql
-- Exemplo de uso
select * from fn_kpi_monthly_grouped('Holding A', '2025-01-01', '2025-12-31');
```

2. **decrypt_f360_token(_id)**: Descriptografar token F360
3. **decrypt_omie_keys(_id)**: Descriptografar chaves OMIE

## Criar Grupos/Holdings

Para consolidar múltiplas empresas:

```sql
-- Criar grupo
insert into group_alias(name) values ('Holding A') on conflict do nothing;

-- Adicionar empresas ao grupo
insert into group_alias_members(group_id, cliente_id)
select
  (select id from group_alias where name='Holding A'),
  id
from clientes
where nome_interno_cliente in ('DEX INVEST', 'VOLPE DIADEMA')
on conflict do nothing;

-- Consultar KPIs consolidados
select * from fn_kpi_monthly_grouped('Holding A', '2025-01-01', '2025-12-31');
```

## Monitoramento e Health Check

```sql
-- Ver status de sincronizações
select * from v_audit_health;

-- Resultado:
-- cnpj            | source | last_success_at      | dre_rows_120d | cf_rows_120d | health
-- 00052912647000  | F360   | 2025-11-06 10:30:00  | 1500          | 800          | GREEN
-- 00026888098000  | F360   | 2025-11-04 09:15:00  | 0             | 0            | RED
```

**Códigos de saúde:**
- **GREEN**: Sincronizado nas últimas 48h e com dados
- **YELLOW**: Sincronizado há mais de 2 dias
- **RED**: Sem dados nos últimos 120 dias

## Segurança

- Tokens e chaves de API são criptografados com `pgcrypto` usando `KMS_SECRET`
- Edge Functions usam `SUPABASE_SERVICE_KEY` para acesso privilegiado
- Row Level Security (RLS) pode ser configurado nas tabelas conforme necessário

## Troubleshooting

### Erro ao descriptografar tokens

Certifique-se de que a chave KMS está configurada:

```sql
select set_config('app.kms', 'B5b0dcf500@#', false);
```

### Jobs do pg_cron não executam

Verifique se as URLs das Edge Functions estão configuradas:

```sql
select current_setting('app.sync_f360_url', true);
select current_setting('app.sync_omie_url', true);
```

### Edge Function retorna erro 500

Verifique os logs:

```bash
supabase functions logs sync-f360 --follow
```

## Próximos Passos

1. Configurar RLS nas tabelas sensíveis
2. Adicionar autenticação JWT para endpoints públicos
3. Implementar cache com Redis para consultas frequentes
4. Criar dashboard frontend (Next.js + Recharts)
5. Adicionar webhooks para notificações em tempo real

## Licença

Proprietário - Uso interno

## Suporte

Para dúvidas ou problemas, contate a equipe de desenvolvimento.
