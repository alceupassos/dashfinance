# Resumo dos Arquivos SEED

**Data**: 2025-11-09  
**Arquivos Encontrados**: 2  
**Total de Dados Geráveis**: 24+ empresas + 50+ transações + 100+ lançamentos financeiros

---

## 📋 Arquivo 1: SEED_DADOS_TESTE.sql (4.8 KB)

### O que faz:

Popular dados fictícios (seed) para 4 tabelas críticas:

1. **transactions** - 50 transações fictícias
   - Company: `12.345.678/0001-90` (teste)
   - Tipos: POS, Pagamento, Taxa, Transferência
   - Valores: R$ 100 a R$ 50.100
   - Período: Últimos 30 dias

2. **omie_config** - Configuração OMIE
   - 1 empresa: `12.345.678/0001-90`
   - API key: `omie-api-seed-123`
   - App key: `omie-app-seed-123`
   - Status: Ativo

3. **f360_config** - Configuração F360
   - 1 empresa: `12.345.678/0001-90`
   - API key: `f360-api-seed-456`
   - Status: Ativo

4. **daily_snapshots** - Snapshots diários de saldo
   - 30 dias de dados históricos
   - Saldos: R$ 100k a R$ 500k
   - Burn rate, runway, receita, EBITDA

### Para usar:

```bash
# Via Supabase SQL Editor (painel web)
# 1. Copiar todo o conteúdo do arquivo
# 2. Ir em SQL Editor no Supabase
# 3. Colar e executar

# Ou via CLI local:
psql -h localhost -U postgres -d dashfinance -f SEED_DADOS_TESTE.sql
```

### Resultado esperado:

```
✅ Total de 50 transações
✅ 1 config OMIE ativa
✅ 1 config F360 ativa
✅ 30 snapshots de saldo
```

---

## 🚀 Arquivo 2: SEED_TUDO_DE_UMA_VEZ.sql (10 KB) - **RECOMENDADO!**

### O que faz:

Popula 6 tabelas com dados REAIS de clientes reais (24 empresas):

1. **integration_f360** - 17 empresas reais F360
   - Grupo Volpe: 5 empresas
   - Grupo Dex: 2 empresas
   - Grupo AAS: 2 empresas
   - Grupo Acqua: 2 empresas
   - Individuais: 6 empresas

   Exemplo:
   ```sql
   CNPJ: 00026888098000
   Nome: VOLPE DIADEMA
   Grupo: Grupo Volpe
   Token: 223b065a-1873-4cfe-a36b-f092c602a03e
   ```

2. **integration_omie** - 7 empresas reais OMIE
   - Mana Poke
   - Med Solutions
   - BRX
   - Beauty
   - KDPLAST
   - Health Plast
   - Oral Unic

3. **onboarding_tokens** - 17 tokens únicos
   - Um para cada empresa F360
   - Link WhatsApp pré-preenchido
   - Status: pending (aguardando uso)

4. **dre_entries** - Lançamentos DRE
   - Receitas (Vendas)
   - Despesas (Folha)
   - Últimos 3 meses
   - Valores variáveis

5. **cashflow_entries** - Lançamentos de Fluxo
   - Entradas e saídas
   - Saldo projetado
   - Correlacionado com DRE

6. **financial_alerts** - 3 alertas de exemplo
   - Saldo baixo (R$ 3.500)
   - Inadimplência alta (18%)
   - Contas vencendo (5)

### Para usar:

```bash
# ⚠️ ATENÇÃO: Este arquivo TRUNCA (limpa) as tabelas primeiro!
# Só usar em staging/dev, NUNCA em produção com dados reais!

# Via Supabase SQL Editor (painel web) - RECOMENDADO
# 1. Ir em SQL Editor do Supabase
# 2. Copiar todo o conteúdo
# 3. Colar e executar
# 4. Esperar ~30 segundos

# Ou via CLI local:
psql -h localhost -U postgres -d dashfinance -f SEED_TUDO_DE_UMA_VEZ.sql
```

### Resultado esperado:

```
╔════════════════════════════════════════╗
║  🎉 SEED COMPLETO EXECUTADO!          ║
╚════════════════════════════════════════╝

📊 DADOS POPULADOS:
   • F360: 17 empresas
   • OMIE: 7 empresas
   • Tokens: 17
   • DRE: 300+ lançamentos
   • Cashflow: 300+ lançamentos
   • Alertas: 3

🚀 PRÓXIMOS PASSOS:
   1. Rodar Edge Function seed-realistic-data
   2. Rodar Edge Function whatsapp-simulator
   3. Começar testes!
```

---

## 🎯 Qual Usar?

### Use SEED_TUDO_DE_UMA_VEZ.sql se:

✅ Quer dados realistas com empresas reais  
✅ Quer testar relatórios financeiros  
✅ Quer testar alertas  
✅ Quer testar com múltiplas empresas  
✅ Ambiente é staging/dev (não produção)  

**RECOMENDAÇÃO: Este é o melhor para começar!**

### Use SEED_DADOS_TESTE.sql se:

✅ Quer dados mínimos de teste  
✅ Apenas quer validar estrutura  
✅ Quer dados menores (1 empresa, 50 transações)  
✅ Quer append (não trunca dados existentes)  

---

## ⚠️ Cuidados Importantes

### SEED_TUDO_DE_UMA_VEZ.sql:

```sql
-- TRUNCATE - LIMPA COMPLETAMENTE as tabelas!
truncate table dre_entries cascade;
truncate table cashflow_entries cascade;
truncate table financial_alerts cascade;
truncate table whatsapp_sessions cascade;
truncate table whatsapp_messages cascade;
-- ... e mais
```

**⚠️ NUNCA USAR EM PRODUÇÃO!**

Se você tiver dados reais já populados, use `SEED_DADOS_TESTE.sql` que faz INSERT (append) sem truncar.

### SEED_DADOS_TESTE.sql:

```sql
-- Comentado (seguro):
-- TRUNCATE transactions;
-- INSERT (sem delete prévio)
```

**✅ Seguro usar em qualquer ambiente** (apenas adiciona dados)

---

## 🗂️ Empresas no SEED_TUDO_DE_UMA_VEZ.sql

### F360 (17 empresas):

```
GRUPO VOLPE (5):
  • 00026888098000 - VOLPE DIADEMA (principal)
  • 00026888098001 - VOLPE GRAJAU
  • 00026888098002 - VOLPE POA
  • 00026888098003 - VOLPE SANTO ANDRE
  • 00026888098004 - VOLPE SAO MATEUS

GRUPO DEX (2):
  • 00052912647000 - DEX INVEST 392 (principal)
  • 00052912647001 - DEX INVEST 393

GRUPO AAS (2):
  • 00033542553000 - AAS GONCALVES (principal)
  • 00050716882000 - AGS PARACAMBI

GRUPO ACQUA (2):
  • 00017100902000 - ACQUA MATRIZ (principal)
  • 00017100902001 - ACQUA FILIAL

INDIVIDUAIS (6):
  • 00019822798000 - DERMOPLASTIK
  • 00005792580000 - CORPORE
  • 00022702726000 - A3 SOLUTION
  • 00041794911000 - CLUBE CACA
  • 00057220844000 - SANTA LOLLA
  • 00043212220000 - ALL IN SP
```

### OMIE (7 empresas):

```
  • 12345678000101 - MANA POKE
  • 12345678000102 - MED SOLUTIONS
  • 12345678000103 - BRX
  • 12345678000104 - BEAUTY
  • 12345678000105 - KDPLAST (Grupo Health Plast)
  • 12345678000106 - HEALTH PLAST (Grupo Health Plast)
  • 12345678000107 - ORAL UNIC
```

---

## 📊 Volume de Dados por Seed

### SEED_DADOS_TESTE.sql

| Tabela | Registros | Período |
|--------|-----------|---------|
| transactions | 50 | Últimos 30 dias |
| omie_config | 1 | 1 empresa |
| f360_config | 1 | 1 empresa |
| daily_snapshots | 30 | Últimos 30 dias |
| **TOTAL** | **82** | - |

### SEED_TUDO_DE_UMA_VEZ.sql

| Tabela | Registros | Período |
|--------|-----------|---------|
| integration_f360 | 17 | - |
| integration_omie | 7 | - |
| onboarding_tokens | 17 | - |
| dre_entries | 300+ | 3 meses |
| cashflow_entries | 300+ | 3 meses |
| financial_alerts | 3 | - |
| **TOTAL** | **640+** | - |

---

## ✅ Checklist de Execução

### Pré-Requisitos:
- [ ] Supabase projeto criado
- [ ] Tabelas estruturadas (migrations rodar)
- [ ] Acesso ao SQL Editor ou CLI

### Execução:

**Opção 1 (Recomendada - Supabase Web UI):**
```
☐ 1. Abrir: https://app.supabase.io
☐ 2. Selecionar projeto
☐ 3. Ir em "SQL Editor"
☐ 4. Novo Query
☐ 5. Copiar arquivo SEED_TUDO_DE_UMA_VEZ.sql completo
☐ 6. Colar no editor
☐ 7. Cliquem "Run"
☐ 8. Aguardar conclusão (~30s)
☐ 9. Ver resultado na mensagem de saída
```

**Opção 2 (Local via psql):**
```
☐ 1. Ter PostgreSQL instalado
☐ 2. Ter arquivo SEED_*.sql no diretório
☐ 3. Executar: psql -h localhost -U postgres -f SEED_TUDO_DE_UMA_VEZ.sql
☐ 4. Ver output com contagem de registros
```

### Pós-Execução:
```
☐ 1. Validar: SELECT COUNT(*) FROM integration_f360;
     └─ Deve retornar: 17
☐ 2. Validar: SELECT COUNT(*) FROM onboarding_tokens;
     └─ Deve retornar: 17
☐ 3. Ir no dashboard e verificar se aparece dados
☐ 4. Testar relatórios (DRE, Cashflow)
```

---

## 🎓 Próximos Passos

Após executar o seed:

1. **Executar Edge Functions** (para complementar dados)
   ```bash
   ./test-all-edge-functions.sh --tier 1
   # Testa funções críticas
   ```

2. **Ativar Integrações**
   - Ir em settings do Supabase
   - Adicionar credenciais F360 reais (ou keep seed para teste)
   - Adicionar credenciais OpenAI/Anthropic
   - Ativar WASender (WhatsApp)

3. **Testar Features**
   - Dashboard principal
   - Relatórios (DRE, Cashflow)
   - Alertas financeiros
   - Chat WhatsApp (após WASender)

---

## 📝 Conclusão

**2 arquivos seed disponíveis:**

1. **SEED_DADOS_TESTE.sql** (4.8 KB)
   - Seguro, não trunca
   - 1 empresa, 50 transações
   - Use: Teste pontual

2. **SEED_TUDO_DE_UMA_VEZ.sql** (10 KB) ⭐ **RECOMENDADO**
   - Completo, 24 empresas reais
   - 600+ registros financeiros
   - Use: Staging/dev inicial
   - ⚠️ Trunca antes de inserir

**Ação Imediata**: Executar `SEED_TUDO_DE_UMA_VEZ.sql` no Supabase SQL Editor para popular base com dados de teste realistas.


