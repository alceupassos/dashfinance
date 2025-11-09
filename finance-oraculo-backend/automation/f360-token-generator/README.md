# F360 Token Generator

Automação Puppeteer para geração de tokens F360 via web scraping.

## Instalação

```bash
cd automation/f360-token-generator
npm install
```

## Configuração

Edite `generate-f360-tokens.js` e ajuste as configurações:

```javascript
const CONFIG = {
  csvPath: '/tmp/F360_Lista_Acessos_COMPLETA.csv', // Caminho do CSV
  testMode: true,  // true = apenas 3 registros, false = todos os 214
  headless: false, // false = ver navegador, true = modo invisível
  // ...
};
```

## Uso

### Modo Teste (3 registros)

```bash
# Editar: CONFIG.testMode = true
node generate-f360-tokens.js
```

### Modo Produção (todos os 214 registros)

```bash
# Editar: CONFIG.testMode = false
node generate-f360-tokens.js
```

### Monitorar Progresso

```bash
tail -f output/automation-log.txt
```

## Arquivos Gerados

- `output/f360-tokens-extracted.json` - Todos os resultados
- `output/f360-tokens-progress.json` - Progresso (atualizado a cada 10 registros)
- `output/insert-f360-config.sql` - SQL pronto para Supabase
- `output/automation-log.txt` - Log detalhado
- `output/errors.json` - Apenas erros
- `output/screenshots/` - Screenshots de cada etapa

## Executar SQL no Supabase

```bash
PGPASSWORD='B5b0dcf500@#' psql \
  -h db.xzrmzmcoslomtzkzgskn.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -f output/insert-f360-config.sql
```

## Validar Resultados

```bash
psql -h db.xzrmzmcoslomtzkzgskn.supabase.co \
     -p 5432 \
     -U postgres \
     -d postgres \
     -c "SELECT COUNT(*) FROM f360_config;"
```

## Estrutura do CSV

O CSV deve ter as seguintes colunas:
- `Nº` ou `Numero`
- `Unidade`
- `Login` ou `Email`
- `Senha` ou `Password`
- `Grupo`
- `Razão Social` ou `Razao Social`
- `CNPJ`

## Notas Importantes

1. **Token só aparece uma vez** - A extração deve ser precisa
2. **Tempo estimado**: 2-3 horas para 214 registros
3. **Screenshots**: Essenciais para debug de erros
4. **Progresso**: Salvo automaticamente a cada 10 registros

