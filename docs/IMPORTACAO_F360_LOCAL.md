# Importação e Sincronização F360 - Ambiente Local

Este documento descreve como importar e sincronizar dados do F360 em ambiente local, **sem criptografia**.

## Pré-requisitos

- Acesso ao SQL Editor do Supabase
- Arquivo `CLIENTES_F360_com_TOKEN.csv` com os dados dos clientes

## Passo 1: Importar Registros via SQL

Execute o script SQL completo no SQL Editor do Supabase:

```bash
# Opção 1: Usar o arquivo SQL
cat scripts/import-all-f360.sql | psql <sua_connection_string>

# Opção 2: Copiar e colar o conteúdo de scripts/import-all-f360.sql no SQL Editor
```

Ou execute diretamente no SQL Editor:

```sql
-- Ver scripts/import-all-f360.sql para o script completo
SELECT public.upsert_integration_f360_company('NOME_CLIENTE', 'CNPJ', 'TOKEN', NULL);
```

## Passo 2: Verificar Importação

```sql
-- Verificar total de registros
SELECT COUNT(*) as total FROM integration_f360;

-- Listar empresas importadas
SELECT 
  cnpj,
  cliente_nome,
  LEFT(token, 20) || '...' as token_preview
FROM integration_f360
ORDER BY cnpj, cliente_nome;

-- Verificar aliases (empresas com mesmo CNPJ)
SELECT 
  i.cnpj,
  i.cliente_nome as nome_principal,
  a.alias
FROM integration_f360 i
LEFT JOIN integration_f360_aliases a ON a.integration_id = i.id
ORDER BY i.cnpj;
```

## Passo 3: Sincronizar Dados

### Opção A: Via Edge Function (recomendado)

```bash
# Configurar variáveis de ambiente
export SUPABASE_URL="https://xzrmzmcoslomtzkzgskn.supabase.co"
export SUPABASE_ANON_KEY="sua_chave_aqui"

# Executar sincronização
./scripts/sync-f360-direct.sh
```

### Opção B: Via SQL (apenas para testes)

A sincronização requer chamadas HTTP para a API do F360, então não pode ser feita diretamente em SQL. Use a Edge Function.

## Estrutura de Dados

### Tabela `integration_f360`

- `id` (uuid): ID único
- `cliente_nome` (text): Nome do cliente
- `cnpj` (text): CNPJ sanitizado (apenas números)
- `token` (text): Token F360 em texto plano (sem criptografia)
- `created_at` (timestamptz): Data de criação

### Tabela `integration_f360_aliases`

Armazena nomes alternativos para empresas com mesmo CNPJ (ex: Grupo Volpe).

- `id` (uuid): ID único
- `integration_id` (uuid): Referência para `integration_f360.id`
- `alias` (text): Nome alternativo
- `created_at` (timestamptz): Data de criação

## Funções SQL Disponíveis

### `upsert_integration_f360_company(_cliente_nome, _cnpj, _token, _kms)`

Importa ou atualiza um registro de integração F360.

**Parâmetros:**
- `_cliente_nome` (text): Nome do cliente
- `_cnpj` (text): CNPJ (será sanitizado automaticamente)
- `_token` (text): Token F360
- `_kms` (text): Ignorado (mantido para compatibilidade)

**Retorna:** UUID do registro criado/atualizado

**Exemplo:**
```sql
SELECT public.upsert_integration_f360_company(
  'VOLPE DIADEMA (GRUPO VOLPE)', 
  '00.026.888/0980-00', 
  '223b065a-1873-4cfe-a36b-f092c602a03e', 
  NULL
);
```

### `decrypt_f360_token(_id, _kms)`

Retorna o token diretamente (sem descriptografia, já que não há criptografia).

**Parâmetros:**
- `_id` (uuid): ID do registro em `integration_f360`
- `_kms` (text): Ignorado

**Retorna:** Token em texto plano

**Exemplo:**
```sql
SELECT public.decrypt_f360_token('id-aqui', NULL);
```

### `get_f360_integrations()`

Retorna todos os registros de integração F360.

**Retorna:** Tabela com `id`, `cliente_nome`, `cnpj`, `token`

**Exemplo:**
```sql
SELECT * FROM public.get_f360_integrations();
```

## Troubleshooting

### Erro: "column integration_f360.token does not exist"

Isso pode acontecer devido a cache do Supabase. Soluções:

1. **Aguardar alguns minutos** para o cache atualizar
2. **Usar a função RPC** `get_f360_integrations()` ao invés de SELECT direto
3. **Verificar se a migração foi aplicada:**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'integration_f360' 
   AND column_name = 'token';
   ```

### Erro: "Failed to decrypt token"

Isso não deve acontecer mais, pois removemos a criptografia. Se acontecer:

1. Verifique se a migração `20251113_remove_encryption.sql` foi aplicada
2. Verifique se os tokens foram importados corretamente:
   ```sql
   SELECT id, cliente_nome, token FROM integration_f360 LIMIT 5;
   ```

## Próximos Passos

Após importar os dados:

1. Execute a sincronização para buscar dados do F360
2. Verifique os dados importados em `dre_entries` e `cashflow_entries`
3. Execute a agregação de grupos (se aplicável):
   ```sql
   SELECT upsert_group_dre_entries('00026888098000');
   SELECT upsert_group_cashflow_entries('00026888098000');
   ```

## Notas de Segurança

⚠️ **IMPORTANTE**: Este setup é apenas para ambiente local. Em produção, sempre use criptografia!

- Tokens são armazenados em texto plano
- Apenas para desenvolvimento/testes locais
- Não use este setup em produção

