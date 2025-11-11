# ✅ CHECKLIST DE VALIDAÇÃO - INTEGRAÇÃO F360
**Data:** 11 de Novembro de 2025
**Projeto:** DashFinance - Grupo Volpe

---

## 📋 COMO USAR ESTE CHECKLIST

1. Marque cada item conforme for completado: `[ ]` → `[x]`
2. Se um item falhar, documente o erro na seção "Problemas Encontrados"
3. Não pule etapas - a ordem é importante
4. Cada etapa tem um comando SQL/bash para validação

---

## 🔐 ETAPA 1: CONFIGURAÇÃO DE SEGURANÇA

### 1.1 Chave de Criptografia

- [ ] Chave `app.encryption_key` foi configurada no Supabase
  ```sql
  SELECT current_setting('app.encryption_key', true) as key;
  -- ✅ Deve retornar: chave (não NULL)
  -- ❌ Se retornar NULL: executar script 01-configure-encryption-key.sh
  ```

- [ ] Backup da chave foi criado localmente
  ```bash
  ls -lh .encryption_key_backup
  # ✅ Deve existir arquivo com permissão 600
  ```

- [ ] Chave tem tamanho adequado (256 bits / 44 caracteres base64)
  ```sql
  SELECT LENGTH(current_setting('app.encryption_key', true)) as key_length;
  -- ✅ Deve retornar: 44
  ```

### 1.2 Função de Descriptografia

- [ ] Função `decrypt_f360_token` existe
  ```sql
  SELECT routine_name
  FROM information_schema.routines
  WHERE routine_name = 'decrypt_f360_token';
  -- ✅ Deve retornar: 1 linha
  ```

- [ ] Função aceita UUID como parâmetro
  ```sql
  SELECT parameter_name, data_type
  FROM information_schema.parameters
  WHERE specific_name IN (
    SELECT specific_name FROM information_schema.routines
    WHERE routine_name = 'decrypt_f360_token'
  );
  -- ✅ Deve retornar: _id | uuid
  ```

---

## 📊 ETAPA 2: DADOS DO GRUPO VOLPE

### 2.1 Empresas Cadastradas

- [ ] 13 empresas "Volpe" existem em `clientes`
  ```sql
  SELECT COUNT(*)
  FROM clientes
  WHERE razao_social ILIKE '%volpe%'
     OR grupo_economico = 'Grupo Volpe';
  -- ✅ Deve retornar: 13
  ```

### 2.2 CNPJs Únicos

- [ ] Todas as 13 empresas têm CNPJ não-nulo
  ```sql
  SELECT COUNT(*)
  FROM clientes
  WHERE grupo_economico = 'Grupo Volpe'
    AND cnpj IS NOT NULL
    AND cnpj != '';
  -- ✅ Deve retornar: 13
  ```

- [ ] Todos os CNPJs são únicos (sem duplicatas)
  ```sql
  SELECT cnpj, COUNT(*) as duplicatas
  FROM clientes
  WHERE grupo_economico = 'Grupo Volpe'
  GROUP BY cnpj
  HAVING COUNT(*) > 1;
  -- ✅ Deve retornar: 0 linhas
  ```

- [ ] CNPJs têm formato válido (14 dígitos)
  ```sql
  SELECT cnpj
  FROM clientes
  WHERE grupo_economico = 'Grupo Volpe'
    AND (LENGTH(cnpj) != 14 OR cnpj !~ '^[0-9]+$');
  -- ✅ Deve retornar: 0 linhas
  ```

### 2.3 Token F360 Vinculado

- [ ] Todas as empresas têm `token_f360` configurado
  ```sql
  SELECT COUNT(*)
  FROM clientes
  WHERE grupo_economico = 'Grupo Volpe'
    AND token_f360 = '223b065a-1873-4cfe-a36b-f092c602a03e';
  -- ✅ Deve retornar: 13
  ```

- [ ] Status do token é "ativo"
  ```sql
  SELECT COUNT(*)
  FROM clientes
  WHERE grupo_economico = 'Grupo Volpe'
    AND token_status = 'ativo';
  -- ✅ Deve retornar: 13
  ```

---

## 🔑 ETAPA 3: TOKEN F360

### 3.1 Token em integration_f360

- [ ] Token 223b065a existe
  ```sql
  SELECT id, cliente_nome, cnpj
  FROM integration_f360
  WHERE id = '223b065a-1873-4cfe-a36b-f092c602a03e'::uuid;
  -- ✅ Deve retornar: 1 linha
  ```

- [ ] Token tem `token_enc` não-nulo
  ```sql
  SELECT LENGTH(token_enc) as token_length
  FROM integration_f360
  WHERE id = '223b065a-1873-4cfe-a36b-f092c602a03e'::uuid;
  -- ✅ Deve retornar: número > 0
  ```

### 3.2 Descriptografia do Token

- [ ] Token pode ser descriptografado
  ```sql
  SELECT decrypt_f360_token('223b065a-1873-4cfe-a36b-f092c602a03e'::uuid) as token;
  -- ✅ Deve retornar: string não-NULL (token em texto)
  -- ❌ Se NULL: re-criptografar token com script 02
  ```

- [ ] Token descriptografado tem formato esperado
  ```sql
  SELECT LENGTH(decrypt_f360_token('223b065a-1873-4cfe-a36b-f092c602a03e'::uuid)) as length;
  -- ✅ Deve retornar: número > 20 (tokens F360 são longos)
  ```

---

## 🗄️ ETAPA 4: ESTRUTURA DE DADOS

### 4.1 Tabelas Principais

- [ ] Tabela `dre_entries` existe
  ```sql
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_name = 'dre_entries';
  -- ✅ Deve retornar: 1
  ```

- [ ] Tabela `cashflow_entries` existe
  ```sql
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_name = 'cashflow_entries';
  -- ✅ Deve retornar: 1
  ```

- [ ] Tabela `sync_state` existe
  ```sql
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_name = 'sync_state';
  -- ✅ Deve retornar: 1
  ```

### 4.2 Colunas Essenciais

- [ ] `dre_entries` tem coluna `company_cnpj`
  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'dre_entries' AND column_name = 'company_cnpj';
  -- ✅ Deve retornar: 1 linha
  ```

- [ ] `cashflow_entries` tem coluna `company_cnpj`
  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'cashflow_entries' AND column_name = 'company_cnpj';
  -- ✅ Deve retornar: 1 linha
  ```

- [ ] `sync_state` tem coluna `company_cnpj`
  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'sync_state' AND column_name = 'company_cnpj';
  -- ✅ Deve retornar: 1 linha
  ```

### 4.3 Índices Únicos

- [ ] Índice único em `dre_entries`
  ```sql
  SELECT indexname FROM pg_indexes
  WHERE tablename = 'dre_entries' AND indexname = 'ux_dre_entries_unique';
  -- ✅ Deve retornar: 1 linha
  ```

- [ ] Índice único em `cashflow_entries`
  ```sql
  SELECT indexname FROM pg_indexes
  WHERE tablename = 'cashflow_entries' AND indexname = 'ux_cashflow_entries_unique';
  -- ✅ Deve retornar: 1 linha
  ```

---

## 🧹 ETAPA 5: LIMPEZA E PREPARAÇÃO

### 5.1 Deduplicação DRE

- [ ] Sem duplicatas em `dre_entries`
  ```sql
  WITH duplicates AS (
    SELECT company_cnpj, date, account, nature, amount, COUNT(*) as count
    FROM dre_entries
    GROUP BY company_cnpj, date, account, nature, amount
    HAVING COUNT(*) > 1
  )
  SELECT COUNT(*) as total_duplicates FROM duplicates;
  -- ✅ Deve retornar: 0
  -- ❌ Se > 0: executar deduplicação do script 03
  ```

### 5.2 Deduplicação Cashflow

- [ ] Sem duplicatas em `cashflow_entries`
  ```sql
  WITH duplicates AS (
    SELECT company_cnpj, date, amount, kind, category, COUNT(*) as count
    FROM cashflow_entries
    GROUP BY company_cnpj, date, amount, kind, category
    HAVING COUNT(*) > 1
  )
  SELECT COUNT(*) as total_duplicates FROM duplicates;
  -- ✅ Deve retornar: 0
  -- ❌ Se > 0: executar deduplicação do script 03
  ```

### 5.3 sync_state Limpo

- [ ] Sem estados antigos de sincronização F360
  ```sql
  SELECT COUNT(*)
  FROM sync_state
  WHERE source = 'F360'
    AND company_cnpj IN (
      SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
    )
    AND last_success_at < NOW() - INTERVAL '1 hour';
  -- ✅ Deve retornar: 0 (ou estados são recentes)
  ```

---

## 🚀 ETAPA 6: SINCRONIZAÇÃO

### 6.1 Pré-Sincronização

- [ ] Contagem ANTES da sincronização documentada
  ```sql
  SELECT
    'DRE' as tabela,
    COUNT(*) as count_before
  FROM dre_entries
  WHERE company_cnpj IN (
    SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
  )
  UNION ALL
  SELECT
    'Cashflow' as tabela,
    COUNT(*) as count_before
  FROM cashflow_entries
  WHERE company_cnpj IN (
    SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
  );
  -- Anote os valores
  ```

### 6.2 Execução da Sincronização

- [ ] Script `04-test-f360-sync.sh` executado sem erros
  ```bash
  ./scripts/04-test-f360-sync.sh
  # ✅ Deve retornar: ✅ SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO
  # ❌ Se erro: verificar logs e mensagem de erro
  ```

- [ ] Todas as 10 etapas do script foram bem-sucedidas
  - [ ] Etapa 1: ✅ Chave de criptografia configurada
  - [ ] Etapa 2: ✅ Token Volpe encontrado
  - [ ] Etapa 3: ✅ Token descriptografado
  - [ ] Etapa 4: ✅ 13 empresas encontradas
  - [ ] Etapa 5: Contagens ANTES registradas
  - [ ] Etapa 6: ✅ Sincronização concluída
  - [ ] Etapa 7: Contagens DEPOIS aumentaram
  - [ ] Etapa 8: Dados por CNPJ validados
  - [ ] Etapa 9: sync_state atualizado
  - [ ] Etapa 10: Cálculos DRE validados

### 6.3 Pós-Sincronização

- [ ] Contagem DEPOIS da sincronização aumentou
  ```sql
  SELECT
    'DRE' as tabela,
    COUNT(*) as count_after
  FROM dre_entries
  WHERE company_cnpj IN (
    SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
  )
  UNION ALL
  SELECT
    'Cashflow' as tabela,
    COUNT(*) as count_after
  FROM cashflow_entries
  WHERE company_cnpj IN (
    SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
  );
  -- ✅ Valores devem ser maiores que count_before
  ```

- [ ] Diferença documentada
  ```
  DRE: count_after - count_before = _____ novos registros
  Cashflow: count_after - count_before = _____ novos registros
  ```

---

## ✅ ETAPA 7: VALIDAÇÃO DE DADOS

### 7.1 Dados por Empresa

- [ ] Todas as 13 empresas têm dados DRE
  ```sql
  SELECT COUNT(DISTINCT company_cnpj)
  FROM dre_entries
  WHERE company_cnpj IN (
    SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
  );
  -- ✅ Deve retornar: 13
  ```

- [ ] Todas as 13 empresas têm dados Cashflow
  ```sql
  SELECT COUNT(DISTINCT company_cnpj)
  FROM cashflow_entries
  WHERE company_cnpj IN (
    SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
  );
  -- ✅ Deve retornar: 13
  ```

- [ ] Nenhuma empresa tem 0 registros
  ```sql
  SELECT c.cnpj, c.razao_social,
         (SELECT COUNT(*) FROM dre_entries WHERE company_cnpj = c.cnpj) as dre_count,
         (SELECT COUNT(*) FROM cashflow_entries WHERE company_cnpj = c.cnpj) as cf_count
  FROM clientes c
  WHERE c.grupo_economico = 'Grupo Volpe'
  HAVING (SELECT COUNT(*) FROM dre_entries WHERE company_cnpj = c.cnpj) = 0
     OR (SELECT COUNT(*) FROM cashflow_entries WHERE company_cnpj = c.cnpj) = 0;
  -- ✅ Deve retornar: 0 linhas
  ```

### 7.2 Integridade Referencial

- [ ] Sem CNPJs órfãos em DRE
  ```sql
  SELECT d.company_cnpj, COUNT(*) as registros_orfaos
  FROM dre_entries d
  LEFT JOIN clientes c ON d.company_cnpj = c.cnpj
  WHERE c.cnpj IS NULL
    AND d.company_cnpj LIKE '00026888%'
  GROUP BY d.company_cnpj;
  -- ✅ Deve retornar: 0 linhas
  ```

- [ ] Sem CNPJs órfãos em Cashflow
  ```sql
  SELECT cf.company_cnpj, COUNT(*) as registros_orfaos
  FROM cashflow_entries cf
  LEFT JOIN clientes c ON cf.company_cnpj = c.cnpj
  WHERE c.cnpj IS NULL
    AND cf.company_cnpj LIKE '00026888%'
  GROUP BY cf.company_cnpj;
  -- ✅ Deve retornar: 0 linhas
  ```

### 7.3 Cálculos DRE

- [ ] Fórmula DRE válida para todas as empresas
  ```sql
  SELECT
    company_cnpj,
    SUM(CASE WHEN nature = 'receita' THEN amount ELSE 0 END) as receita,
    SUM(CASE WHEN nature = 'custo' THEN amount ELSE 0 END) as custo,
    SUM(CASE WHEN nature = 'despesa' THEN amount ELSE 0 END) as despesa,
    SUM(CASE WHEN nature = 'receita' THEN amount
             WHEN nature = 'custo' THEN -amount
             WHEN nature = 'despesa' THEN -amount
             ELSE 0 END) as lucro,
    -- Validação
    CASE
      WHEN SUM(CASE WHEN nature = 'receita' THEN amount ELSE 0 END) > 0 THEN '✅ OK'
      ELSE '❌ Sem receita'
    END as status
  FROM dre_entries
  WHERE company_cnpj IN (
    SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
  )
  GROUP BY company_cnpj
  ORDER BY company_cnpj;
  -- ✅ Todas as linhas devem ter status '✅ OK'
  -- ✅ Validar manualmente: receita - custo - despesa ≈ lucro
  ```

### 7.4 Valores Monetários

- [ ] Sem valores negativos em DRE (amount é sempre positivo)
  ```sql
  SELECT COUNT(*)
  FROM dre_entries
  WHERE company_cnpj IN (
    SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
  )
  AND amount < 0;
  -- ✅ Deve retornar: 0
  ```

- [ ] Sem valores negativos em Cashflow (amount é sempre positivo)
  ```sql
  SELECT COUNT(*)
  FROM cashflow_entries
  WHERE company_cnpj IN (
    SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
  )
  AND amount < 0;
  -- ✅ Deve retornar: 0
  ```

- [ ] Valores dentro do range esperado (ex: < R$ 10 milhões por transação)
  ```sql
  SELECT MAX(amount) as maior_valor
  FROM dre_entries
  WHERE company_cnpj IN (
    SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
  );
  -- ✅ Deve retornar: valor razoável (ex: < 10000000)
  ```

### 7.5 Datas

- [ ] Sem datas futuras em DRE
  ```sql
  SELECT COUNT(*)
  FROM dre_entries
  WHERE company_cnpj IN (
    SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
  )
  AND date > CURRENT_DATE;
  -- ✅ Deve retornar: 0
  ```

- [ ] Sem datas futuras em Cashflow
  ```sql
  SELECT COUNT(*)
  FROM cashflow_entries
  WHERE company_cnpj IN (
    SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
  )
  AND date > CURRENT_DATE;
  -- ✅ Deve retornar: 0
  ```

- [ ] Datas dentro do range esperado (ex: últimos 2 anos)
  ```sql
  SELECT
    MIN(date) as data_mais_antiga,
    MAX(date) as data_mais_recente
  FROM dre_entries
  WHERE company_cnpj IN (
    SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
  );
  -- ✅ Validar manualmente se range faz sentido
  ```

---

## 🔄 ETAPA 8: SYNC_STATE

### 8.1 Atualização por CNPJ

- [ ] Todas as 13 empresas têm registro em sync_state
  ```sql
  SELECT COUNT(*)
  FROM sync_state
  WHERE company_cnpj IN (
    SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
  );
  -- ✅ Deve retornar: 13
  ```

### 8.2 Timestamps Recentes

- [ ] Todas as sincronizações são recentes (última hora)
  ```sql
  SELECT COUNT(*)
  FROM sync_state
  WHERE company_cnpj IN (
    SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
  )
  AND last_success_at > NOW() - INTERVAL '1 hour';
  -- ✅ Deve retornar: 13
  ```

### 8.3 Source Correto

- [ ] Todas as sincronizações têm source = 'F360'
  ```sql
  SELECT COUNT(*)
  FROM sync_state
  WHERE company_cnpj IN (
    SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
  )
  AND source = 'F360';
  -- ✅ Deve retornar: 13
  ```

### 8.4 Sem Erros

- [ ] Nenhuma empresa tem erro registrado
  ```sql
  SELECT company_cnpj, last_error
  FROM sync_state
  WHERE company_cnpj IN (
    SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
  )
  AND last_error IS NOT NULL;
  -- ✅ Deve retornar: 0 linhas
  ```

---

## 🌐 ETAPA 9: EDGE FUNCTIONS

### 9.1 Função sync-f360

- [ ] Função deployada no Supabase
  ```bash
  curl -s "https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/sync-f360" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq '.success'
  # ✅ Deve retornar: true (ou erro 400 se faltarem parâmetros)
  ```

### 9.2 Função dashboard-cards

- [ ] Função aceita CNPJ do Grupo Volpe
  ```bash
  JWT="seu_jwt_aqui"
  CNPJ="00026888000100"  # Ajuste com CNPJ real
  curl -s "https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/dashboard-cards?cnpj=$CNPJ" \
    -H "Authorization: Bearer $JWT" | jq '.cards | length'
  # ✅ Deve retornar: número > 0
  ```

### 9.3 Função relatorios-dre

- [ ] Função retorna dados do Grupo Volpe
  ```bash
  JWT="seu_jwt_aqui"
  CNPJ="00026888000100"  # Ajuste com CNPJ real
  curl -s "https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/relatorios-dre?company_cnpj=$CNPJ&periodo=2025-11" \
    -H "Authorization: Bearer $JWT" | jq '.receita_bruta'
  # ✅ Deve retornar: valor numérico
  ```

---

## 🖥️ ETAPA 10: FRONTEND

### 10.1 Build

- [ ] Build do frontend sem erros
  ```bash
  cd finance-oraculo-frontend
  npm run build
  # ✅ Deve retornar: ✓ Compiled successfully
  ```

### 10.2 Deploy

- [ ] Frontend deployado em produção
  ```bash
  # Vercel
  vercel deploy --prod
  # OU Netlify
  netlify deploy --prod
  # ✅ Deve retornar: URL de produção
  ```

- [ ] URL de produção acessível
  ```bash
  curl -s -o /dev/null -w "%{http_code}" https://sua-url.vercel.app
  # ✅ Deve retornar: 200
  ```

### 10.3 Funcionalidades

- [ ] Login funcionando
- [ ] Seletor de empresa mostra Grupo Volpe
- [ ] Dashboard carrega com valores
- [ ] DRE exibe cálculos corretos
- [ ] Oráculo responde (ChatGPT-5)
- [ ] Enter envia mensagens no chat

---

## ⚙️ ETAPA 11: AUTOMAÇÃO

### 11.1 Cron Configurado

- [ ] Função scheduled-sync-erp existe
  ```bash
  curl -s "https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/scheduled-sync-erp" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
  # ✅ Deve retornar resposta (não 404)
  ```

- [ ] Cron configurado no Dashboard Supabase
  - Acesse: Functions > scheduled-sync-erp > Cron Job
  - [ ] Cron expression: `0 */6 * * *` (cada 6 horas)
  - [ ] Status: Ativo

### 11.2 Monitoramento

- [ ] Logs de execução disponíveis
  ```bash
  supabase functions logs scheduled-sync-erp --project-ref xzrmzmcoslomtzkzgskn
  # ✅ Deve mostrar logs recentes
  ```

---

## 📊 ETAPA 12: MÉTRICAS FINAIS

### 12.1 Contagens

- [ ] Total de empresas sincronizadas: _____
  ```sql
  SELECT COUNT(DISTINCT company_cnpj)
  FROM dre_entries
  WHERE company_cnpj IN (
    SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
  );
  ```

- [ ] Total de DRE entries: _____
  ```sql
  SELECT COUNT(*)
  FROM dre_entries
  WHERE company_cnpj IN (
    SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
  );
  ```

- [ ] Total de Cashflow entries: _____
  ```sql
  SELECT COUNT(*)
  FROM cashflow_entries
  WHERE company_cnpj IN (
    SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
  );
  ```

### 12.2 Valores Agregados

- [ ] Receita total do Grupo: R$ _____
  ```sql
  SELECT SUM(amount)
  FROM dre_entries
  WHERE company_cnpj IN (
    SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
  )
  AND nature = 'receita';
  ```

- [ ] Lucro total do Grupo: R$ _____
  ```sql
  SELECT SUM(CASE WHEN nature = 'receita' THEN amount
                   WHEN nature = 'custo' THEN -amount
                   WHEN nature = 'despesa' THEN -amount
                   ELSE 0 END)
  FROM dre_entries
  WHERE company_cnpj IN (
    SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
  );
  ```

---

## 🎉 CONCLUSÃO

### Resumo Final

**Total de checklist items:** 100+

**Items completos:** _____ / _____

**Taxa de sucesso:** _____ %

### Status Geral

- [ ] ✅ Sistema 100% funcional
- [ ] ✅ Todas as empresas sincronizadas
- [ ] ✅ Dados validados e corretos
- [ ] ✅ Frontend em produção
- [ ] ✅ Automação configurada
- [ ] ✅ Monitoramento ativo

### Próximos Passos

Se todos os itens estão ✅:
1. [ ] Comunicar conclusão aos stakeholders
2. [ ] Documentar lições aprendidas
3. [ ] Criar runbook operacional
4. [ ] Treinar equipe de suporte

Se alguns itens falharam:
1. [ ] Documentar problemas na seção abaixo
2. [ ] Criar plano de correção
3. [ ] Re-executar checklist após correções

---

## 🐛 PROBLEMAS ENCONTRADOS

**Data/Hora:** _____
**Item:** _____
**Erro:** _____
**Solução:** _____
**Status:** _____

---

**Checklist criado por:** Claude Code (Sonnet 4.5)
**Data:** 11 de Novembro de 2025
**Versão:** 1.0
