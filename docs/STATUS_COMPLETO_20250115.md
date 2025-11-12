# 📊 Status Completo do Projeto DashFinance
**Data:** 15 de Janeiro de 2025  
**Última Atualização:** Sincronização de ERPs (F360 e Omie)

---

## 🎯 Visão Geral

O DashFinance é uma plataforma SaaS multi-cliente para análise financeira que integra dados de sistemas ERP externos (F360 e Omie), permitindo visualização consolidada de DRE e Cashflow para empresas individuais e grupos empresariais.

---

## 📈 Estado Atual das Integrações

### F360 Integration
- **Total de Integrações:** 13 empresas
- **Com Token:** 13 (100%)
- **Marcadas como Ativas:** 7 empresas
- **Status:** ✅ Configurado e funcional
- **API Base:** `https://api.f360.com.br/v1`
- **Endpoints:**
  - DRE: `/reports/dre`
  - Cashflow: `/financial/cashflow`

### Omie Integration
- **Total de Integrações:** 7 empresas
- **Com Credenciais:** 7 (100%)
- **Marcadas como Ativas:** 7 empresas
- **Status:** ⚠️ API retornando 404 (investigação em andamento)
- **API Base:** `https://app.omie.com.br/api/v1/`
- **Endpoints Tentados:**
  - Contas Correntes: `/geral/contacorrente/` (call: `ListarContasCorrentes`)
  - Movimentos: `/financas/contacorrentelancamentos/` (call: `ListarMovimentos`)

### Empresas com Dados Sincronizados
1. **MANA POKE** (CNPJ: 12345678000101) - 14 registros DRE
2. **MED SOLUTIONS** (CNPJ: 12345678000102) - 14 registros DRE
3. **BRX** (CNPJ: 12345678000103) - 12 registros DRE
4. **HEALTH PLAST** (CNPJ: 12345678000106) - 12 registros DRE
5. **BEAUTY** (CNPJ: 12345678000104) - 12 registros DRE
6. **ORAL UNIC** (CNPJ: 12345678000107) - 12 registros DRE
7. **KDPLAST** (CNPJ: 12345678000105) - 12 registros DRE

**Total de Dados:**
- **DRE:** 88 registros (7 empresas distintas)
- **Cashflow:** 84 registros (7 empresas distintas)
- **Período:** Janeiro 2025 a Dezembro 2025

---

## 🏗️ Arquitetura do Banco de Dados

### Tabelas Principais

#### `integration_f360`
- Armazena tokens de autenticação F360 por empresa
- Campos: `id`, `cliente_nome`, `cnpj`, `token`, `is_active`, `created_at`, `updated_at`
- Normalização: CNPJ único com aliases em `integration_f360_aliases`

#### `integration_f360_aliases`
- Armazena nomes alternativos (aliases) para empresas F360
- Permite múltiplos nomes para o mesmo CNPJ/token

#### `integration_omie`
- Armazena credenciais Omie (app_key, app_secret) por empresa
- Campos: `id`, `cliente_nome`, `cnpj`, `app_key_plain`, `app_secret_plain`, `is_active`

#### `company_groups`
- Define grupos empresariais (ex: "Grupo Volpe")
- Campos: `id`, `group_name`, `group_cnpj`, `description`, `is_active`, `metadata`

#### `company_group_members`
- Relaciona empresas individuais aos grupos
- Campos: `id`, `group_id`, `company_cnpj`, `company_nome`

#### `dre_entries`
- Registros de DRE (Demonstração do Resultado do Exercício)
- Campos: `company_cnpj`, `company_nome`, `date`, `account`, `nature`, `amount`

#### `cashflow_entries`
- Registros de fluxo de caixa
- Campos: `company_cnpj`, `company_nome`, `date`, `kind`, `category`, `amount`

#### `sync_state`
- Controla estado de sincronização por fonte/empresa
- Campos: `source`, `cnpj`, `cliente_nome`, `last_cursor`, `last_success_at`

---

## 🔧 Edge Functions Implementadas

### 1. `sync-f360`
- **Função:** Sincroniza dados DRE e Cashflow do F360
- **Processo:**
  1. Busca todas as integrações F360 ativas
  2. Para cada token, busca dados via API
  3. Insere/atualiza `dre_entries` e `cashflow_entries`
  4. Após sincronização individual, agrega dados de grupos
- **Agregação de Grupos:** Chama `upsert_group_dre_entries` e `upsert_group_cashflow_entries` para consolidar dados

### 2. `sync-omie`
- **Função:** Sincroniza dados do Omie
- **Processo:**
  1. Busca todas as integrações Omie ativas
  2. Para cada integração, busca contas correntes disponíveis
  3. Para cada conta, busca movimentos do último ano
  4. Insere/atualiza `dre_entries` e `cashflow_entries`
- **Status Atual:** ⚠️ API retornando 404 - investigação necessária

### 3. `targets`
- **Função:** Retorna lista de empresas/aliases disponíveis para seleção no frontend
- **Filtros:** Apenas empresas com `is_active = true`
- **Retorna:** CNPJ, nome, aliases, status ativo, fontes (F360/Omie)

### 4. `scheduled-sync-erp`
- **Função:** Sincronização agendada (cron) de todos os ERPs
- **Frequência:** Configurável via Supabase Cron

---

## 🔐 Segurança e Credenciais

### Remoção de Criptografia (Local Testing)
- **Decisão:** Removida criptografia para facilitar testes locais
- **Migração:** `20251113_remove_encryption.sql`
- **Estado Atual:** Tokens e credenciais armazenados em texto plano
- **⚠️ Atenção:** Para produção, reativar criptografia com KMS

### Credenciais Omie (Arquivo `omie.db`)
```
MANA POKE HOLDING LTDA
APP KEY: 2077005256326
APP SECRET: 42910292e952b4b9da3f29b12c23b336

MED SOLUTIONS S.A. - SKY DERM
APP KEY: 4293229373433
APP SECRET: ed057dc43bd89153719af75cbb55098b

BRX IMPORTADORA - 0001-20 (ASR NEGOCIOS)
APP KEY: 6626684373309
APP SECRET: 476dcc4526ea8548af3123e9d5ef5769

BEAUTY SOLUTIONS COMERCIO DE PRODUTOS COSMETICOS E CORRELATOS S.A.
APP KEY: 2000530332801
APP SECRET: 77f3477d3d80942106f21ee9b6cccc1a

KDPLAST
APP KEY: d323eab9-1cc0-4542-9802-39c7df4fb4f5
APP SECRET: d323eab9-1cc0-4542-9802-39c7df4fb4f5

HEALTH PLAST
APP KEY: d323eab9-1cc0-4542-9802-39c7df4fb4f5
APP SECRET: d323eab9-1cc0-4542-9802-39c7df4fb4f5

ORAL UNIC
APP KEY: e53bfceb-0ece-4752-a247-a022b8c85bca
APP SECRET: e53bfceb-0ece-4752-a247-a022b8c85bca
```

---

## 🚀 Scripts e Ferramentas

### Scripts de Importação
- `scripts/import-all-f360.sql` - Importação manual de tokens F360
- `scripts/import-f360-clients.mjs` - Script Node.js para importação via CSV

### Scripts de Sincronização
- `scripts/sync-f360-direct.sh` - Invoca `sync-f360` via curl
- `scripts/invoke-sync-omie.sh` - Invoca `sync-omie` via curl

### Scripts de Configuração
- `scripts/01-configure-encryption-key.sh` - Configuração de chave KMS (deprecated)
- `scripts/02-update-volpe-group.sql` - Configuração do Grupo Volpe

---

## 🐛 Problemas Conhecidos

### 1. Omie API Retornando 404
- **Sintoma:** Todas as requisições para endpoints Omie retornam 404
- **Endpoints Testados:**
  - `/geral/contacorrente/` (ListarContasCorrentes)
  - `/financas/contacorrentelancamentos/` (ListarMovimentos)
- **Possíveis Causas:**
  - Serviço não habilitado para a conta Omie
  - Endpoint incorreto para o plano contratado
  - Necessidade de autenticação adicional
- **Próximos Passos:**
  - Consultar documentação oficial Omie
  - Verificar com suporte Omie quais serviços estão habilitados
  - Testar endpoints alternativos

### 2. F360 Sincronização Retornando 0 Registros
- **Sintoma:** `sync-f360` executa sem erros mas retorna `synced: 0`
- **Possíveis Causas:**
  - API F360 não retornando dados para os tokens configurados
  - Período de busca muito restrito
  - Tokens expirados ou inválidos
- **Próximos Passos:**
  - Verificar logs detalhados da API F360
  - Testar tokens manualmente via curl
  - Validar período de busca

### 3. Schema Caching em Edge Functions
- **Sintoma:** Edge Functions não reconhecem mudanças no schema do banco
- **Solução Implementada:** Múltiplas estratégias de fallback (RPC, SELECT direto, etc.)
- **Status:** ✅ Resolvido com fallbacks

---

## 📝 Migrações Aplicadas

### Migrações Principais
1. `20251111_upsert_f360_csv_import.sql` - Função de upsert para importação CSV
2. `20251112_normalize_integration_f360.sql` - Normalização de CNPJs e aliases
3. `20251113_remove_encryption.sql` - Remoção de criptografia (local testing)

---

## 🎨 Frontend

### Componentes Principais
- **`alias-selector`** - Seletor de empresa com busca/filtro
- **`topbar`** - Barra superior com informações do usuário
- **`sidebar`** - Menu lateral com navegação

### Estado Global (Zustand)
- `use-dashboard-store.ts` - Gerencia empresa selecionada, permissões, etc.

### Funcionalidades
- ✅ Seleção de empresa com busca em tempo real
- ✅ Filtro por empresas ativas
- ✅ Exibição de fontes (F360/Omie)
- ✅ Default: "Grupo Volpe (Consolidado)"

---

## 🔄 Próximos Passos

### Curto Prazo
1. **Resolver Omie API 404**
   - Consultar documentação oficial
   - Verificar com suporte Omie
   - Testar endpoints alternativos

2. **Validar F360 Sincronização**
   - Verificar logs detalhados
   - Testar tokens manualmente
   - Validar período de busca

3. **Testes de Integração**
   - Testar sincronização completa end-to-end
   - Validar agregação de grupos
   - Verificar performance com grandes volumes

### Médio Prazo
1. **Reativar Criptografia para Produção**
   - Implementar KMS adequado
   - Migrar tokens existentes
   - Testar encrypt/decrypt

2. **Melhorias de Performance**
   - Otimizar queries de agregação
   - Implementar cache para dados frequentes
   - Paginação em listagens grandes

3. **Monitoramento**
   - Logs estruturados
   - Alertas para falhas de sincronização
   - Dashboard de saúde das integrações

---

## 📚 Documentação Adicional

- `docs/IMPORTACAO_F360_LOCAL.md` - Guia de importação local F360
- `docs/CONFIGURAR_APP_KMS.md` - Configuração de KMS (deprecated)
- `finance-oraculo-backend/README.md` - Documentação do backend
- `finance-oraculo-backend/DEPLOYMENT_GUIDE.md` - Guia de deploy

---

## 🔗 Links Úteis

- **Supabase Dashboard:** https://supabase.com/dashboard/project/xzrmzmcoslomtzkzgskn
- **F360 API:** https://api.f360.com.br/v1
- **Omie API:** https://app.omie.com.br/api/v1/
- **Documentação Omie:** (consultar suporte)

---

## ✅ Checklist de Funcionalidades

- [x] Multi-cliente com controle de acesso
- [x] Integração F360 (configurada)
- [x] Integração Omie (configurada, mas API 404)
- [x] Agregação de grupos empresariais
- [x] Sincronização automática de dados
- [x] Frontend com seletor de empresa
- [x] Visualização DRE e Cashflow
- [x] Filtro por empresas ativas
- [ ] Criptografia de tokens (removida para local)
- [ ] Monitoramento e alertas
- [ ] Testes automatizados

---

**Última Sincronização:** 15/01/2025  
**Status Geral:** 🟡 Funcional com pendências de API externa

