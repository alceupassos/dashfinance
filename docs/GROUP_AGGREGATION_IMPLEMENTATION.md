# Implementação de Agregação de Grupos

## Resumo

Implementação completa do sistema de agregação de dados para grupos de empresas (como Grupo Volpe), permitindo que tokens F360 que representam múltiplas empresas tenham dados consolidados enquanto mantêm dados individuais para consulta.

## Estrutura Criada

### 1. Tabelas de Banco de Dados

#### `company_groups`
Tabela para representar grupos (empresas sintéticas com CNPJ falso):
- `id`: UUID primário
- `group_cnpj`: CNPJ sintético do grupo (ex: `00026888098000` para Grupo Volpe)
- `group_name`: Nome do grupo (ex: "Grupo Volpe")
- `description`: Descrição opcional
- `is_active`: Flag de ativação
- `metadata`: JSONB para metadados adicionais
- `created_at`, `updated_at`: Timestamps

#### `company_group_members`
Tabela de relacionamento entre grupos e empresas individuais:
- `id`: UUID primário
- `group_id`: FK para `company_groups`
- `member_cnpj`: CNPJ real da empresa individual
- `member_name`: Nome opcional da empresa
- `is_active`: Flag de ativação
- `created_at`: Timestamp
- Constraint único: `(group_id, member_cnpj)`

### 2. Funções SQL

#### `aggregate_dre_for_group(_group_cnpj, _from_date, _to_date)`
Agrega entradas DRE de todas as empresas membro de um grupo, somando valores por `(date, account, nature)`.

#### `aggregate_cashflow_for_group(_group_cnpj, _from_date, _to_date)`
Agrega entradas de cashflow de todas as empresas membro de um grupo, somando valores por `(date, kind, category)`.

#### `upsert_group_dre_entries(_group_cnpj, _from_date, _to_date)`
Cria/atualiza entradas DRE agregadas na tabela `dre_entries` usando o CNPJ do grupo. Retorna o número de registros processados.

#### `upsert_group_cashflow_entries(_group_cnpj, _from_date, _to_date)`
Cria/atualiza entradas de cashflow agregadas na tabela `cashflow_entries` usando o CNPJ do grupo. Retorna o número de registros processados.

### 3. Views

#### `v_companies_with_groups`
View que lista grupos com seus membros, útil para consultas consolidadas.

### 4. Edge Functions Atualizadas

#### `sync-f360/index.ts`
- Após sincronizar dados individuais de cada empresa, automaticamente agrega dados para todos os grupos ativos
- Chama `upsert_group_dre_entries` e `upsert_group_cashflow_entries` para cada grupo
- Logs detalhados do processo de agregação

#### `targets/index.ts`
- Inclui grupos (`company_groups`) na lista de aliases disponíveis
- Grupos aparecem tanto como aliases quanto como empresas individuais (pelo CNPJ sintético)
- Mostra membros de cada grupo e suas fontes de dados

## Migrações Aplicadas

1. **20251113_create_company_groups.sql**: Cria estrutura de grupos, funções de agregação e views
2. **20251113_populate_grupo_volpe.sql**: Popula Grupo Volpe com seus 5 membros
3. **20251113_ensure_unique_indexes.sql**: Garante índices únicos para upserts

## Fluxo de Dados

### Sincronização F360

1. **Importação Individual**: 
   - Token F360 é usado para buscar transações
   - Cada transação é mapeada para o CNPJ correto da empresa individual
   - Dados são salvos em `dre_entries` e `cashflow_entries` com CNPJ individual

2. **Agregação Automática**:
   - Após sincronizar todas as empresas, o sistema identifica grupos ativos
   - Para cada grupo, agrega dados de todas as empresas membro
   - Cria/atualiza entradas em `dre_entries` e `cashflow_entries` com CNPJ do grupo
   - Valores são somados por `(date, account)` para DRE e `(date, kind, category)` para cashflow

### Consulta de Dados

- **Empresa Individual**: Consultar `dre_entries` ou `cashflow_entries` com CNPJ individual
- **Grupo Consolidado**: Consultar `dre_entries` ou `cashflow_entries` com CNPJ do grupo (ex: `00026888098000`)
- **Frontend**: O seletor de empresas mostra grupos como opções, permitindo visualizar dados consolidados

## Grupo Volpe

### Configuração Atual

- **CNPJ do Grupo**: `00026888098000`
- **Nome**: "Grupo Volpe"
- **Membros**: 5 empresas
  - `00026888098000`
  - `00026888098001`
  - `00026888098002`
  - `00026888098003`
  - `00026888098004`

### Como Funciona

1. Token F360 do Grupo Volpe retorna transações de todas as 5 empresas
2. Cada transação é salva com o CNPJ individual correto
3. Após sincronização, dados são agregados e salvos com CNPJ `00026888098000`
4. Frontend pode consultar dados individuais ou consolidados

## Próximos Passos

1. **Testar Sincronização**: Executar `sync-f360` e verificar agregação automática
2. **Validar Dados**: Comparar valores individuais vs. consolidados
3. **Frontend**: Garantir que relatórios DRE e Cashflow funcionem com grupos
4. **Outros Grupos**: Criar grupos adicionais conforme necessário usando o mesmo padrão

## Exemplos de Uso

### Criar um Novo Grupo

```sql
-- Criar grupo
INSERT INTO company_groups (group_cnpj, group_name, description)
VALUES ('00000000000001', 'Novo Grupo', 'Descrição do grupo');

-- Adicionar membros
INSERT INTO company_group_members (group_id, member_cnpj, member_name)
SELECT 
  g.id,
  '00012345678901',
  'Empresa 1'
FROM company_groups g
WHERE g.group_cnpj = '00000000000001';
```

### Agregar Dados Manualmente

```sql
-- Agregar DRE para um grupo
SELECT upsert_group_dre_entries('00026888098000');

-- Agregar Cashflow para um grupo
SELECT upsert_group_cashflow_entries('00026888098000');
```

### Consultar Dados Consolidados

```sql
-- DRE consolidado do Grupo Volpe
SELECT * FROM dre_entries 
WHERE company_cnpj = '00026888098000'
ORDER BY date DESC;

-- Cashflow consolidado do Grupo Volpe
SELECT * FROM cashflow_entries
WHERE company_cnpj = '00026888098000'
ORDER BY date DESC;
```

## Notas Técnicas

- Índices únicos garantem que upserts funcionem corretamente
- Funções de agregação usam `security definer` para acesso completo aos dados
- RLS policies permitem leitura para usuários autenticados e escrita apenas para service_role
- Agregação é feita automaticamente após cada sincronização F360
- Dados individuais são sempre mantidos para consulta detalhada

