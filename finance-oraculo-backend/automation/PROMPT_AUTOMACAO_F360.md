# PROMPT: Automação de Geração de Tokens F360

## CONTEXTO

Preciso de um script Puppeteer (Node.js) que:
1. Leia CSV com 214 registros (login, senha, CNPJ de empresas)
2. Para cada registro: faça login no F360, crie webservice "API Pública F360" com nome "TORRE", extraia token gerado
3. Salve tokens em JSON e gere SQL para inserir no banco Supabase

## DADOS

**Arquivo CSV:** `/tmp/F360_Lista_Acessos_COMPLETA.csv`
**Colunas:** `Nº, Unidade, Login, Senha, Grupo, Razão Social, CNPJ`
**Total:** 214 registros (processar TODOS)

## PROCESSO MANUAL (a automatizar)

1. Acessar: `https://financas.f360.com.br`
2. Login com email/senha do CSV
3. Clicar: "Menu de Cadastros" → "Webservices"
4. Clicar: botão "+ CRIAR" (canto inferior esquerdo)
5. Selecionar dropdown: "API Pública da F360"
6. Campo "Outros" (nome): digitar "TORRE"
7. Clicar: "Salvar"
8. **Extrair token exibido** (só aparece neste momento - crucial!)
9. Logout

## REQUISITOS TÉCNICOS

### Setup
```bash
mkdir -p automation/f360-token-generator/output/screenshots
cd automation/f360-token-generator
npm init -y
npm install puppeteer csv-parser fs-extra chalk
```

### Script: `generate-f360-tokens.js`

**Configurações principais:**
- Headless: false (para ver funcionando)
- Timeout navegação: 60s
- Timeout elementos: 30s
- Delay entre registros: 2s
- Salvar progresso a cada 10 registros
- Screenshots de cada etapa

**Seletores CSS críticos (F360 pode usar variações):**

Login:
```javascript
emailSelectors = ['input[type="email"]', 'input[name="email"]', 'input[id="email"]']
passwordSelectors = ['input[type="password"]', 'input[name="password"]']
loginButtonSelectors = ['button[type="submit"]', 'button:has-text("Entrar")']
```

Menu:
```javascript
menuCadastrosSelectors = ['text=/Menu de Cadastros/i', 'button:has-text("Menu de Cadastros")']
webservicesSelectors = ['text=/Webservices/i', 'a:has-text("Webservices")']
```

Criar:
```javascript
criarButtonSelectors = ['button:has-text("CRIAR")', 'button:has-text("+ CRIAR")']
dropdownSelectors = ['select[name="webservice"]', 'select#webservice']
outrosSelectors = ['input[name="outros"]', 'input#outros']
saveButtonSelectors = ['button[type="submit"]', 'button:has-text("Salvar")']
```

Token:
```javascript
tokenSelectors = [
  'input[readonly][value*="ey"]',
  'code:has-text("ey")',
  'pre:has-text("ey")',
  '[data-token]'
]
// Fallback: regex no texto da página
pattern = /ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/
```

**Lógica de extração:**
1. Tentar cada seletor em sequência
2. Se não encontrar, usar regex no `document.body.textContent`
3. Validar: token deve ter > 20 caracteres

**Tratamento de erros:**
- Try/catch em cada registro
- Screenshot em caso de erro
- Continuar processando próximos registros
- Salvar erros em `errors.json`

**Estrutura de saída:**
```javascript
result = {
  numero, unidade, login, senha, grupo, razaoSocial, cnpj,
  token: "eyJhbG...",  // ou null
  status: "success" | "error",
  errorMessage: null,
  screenshots: [],
  processedAt: "2025-11-06T...",
  duration: "45.3s"
}
```

### Arquivos gerados

```
output/
├── f360-tokens-extracted.json     # Todos os resultados
├── insert-f360-config.sql         # SQL pronto para Supabase
├── automation-log.txt             # Log detalhado
├── errors.json                    # Apenas erros
└── screenshots/
    ├── 1_01_homepage.png
    ├── 1_02_login_filled.png
    ├── 1_03_logged_in.png
    └── ...
```

### SQL gerado

```sql
INSERT INTO f360_config (company_cnpj, api_key, is_active, created_at, updated_at)
VALUES (
  '34.133.705/0001-07',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (company_cnpj)
DO UPDATE SET
  api_key = EXCLUDED.api_key,
  is_active = true,
  updated_at = NOW();
```

## EXECUÇÃO

```bash
# Teste (apenas 3 registros)
# Editar: CONFIG.testMode = true
node generate-f360-tokens.js

# Produção (todos os 214)
# Editar: CONFIG.testMode = false
node generate-f360-tokens.js

# Monitorar progresso
tail -f output/automation-log.txt
```

## VALIDAÇÃO

```bash
# Executar SQL no Supabase
PGPASSWORD='B5b0dcf500@#' psql \
  -h db.xzrmzmcoslomtzkzgskn.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -f output/insert-f360-config.sql

# Validar
psql <<SQL
SELECT COUNT(*) FROM f360_config;
SELECT company_cnpj, LEFT(api_key, 30) FROM f360_config LIMIT 10;
SQL
```

## PONTOS CRÍTICOS

1. **Token só aparece uma vez** (ao criar webservice) - não pode errar extração
2. **F360 pode ter mudado layout** - usar múltiplos seletores alternativos
3. **214 registros = 2-3 horas** - salvar progresso frequentemente
4. **Algumas contas podem estar bloqueadas** - capturar erro e continuar
5. **Screenshots são essenciais** para debug de erros

## ESTRUTURA DO CÓDIGO

```javascript
const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const csv = require('csv-parser');
const chalk = require('chalk');

const CONFIG = {
  csvPath: '/tmp/F360_Lista_Acessos_COMPLETA.csv',
  outputDir: './output',
  f360Url: 'https://financas.f360.com.br',
  webserviceName: 'TORRE',
  headless: false,
  timeouts: { navigation: 60000, element: 30000 }
};

async function readCSV() { /* ler e filtrar CSV */ }
async function takeScreenshot(page, name, record) { /* screenshot */ }
async function tryMultipleSelectors(page, selectors, action) { /* tentar seletores */ }

async function processRecord(browser, record, index, total) {
  const page = await browser.newPage();
  try {
    // 1. Login
    await page.goto(CONFIG.f360Url);
    await page.type('input[type="email"]', record.login);
    await page.type('input[type="password"]', record.senha);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    // 2. Navegar
    await page.click('text=/Menu de Cadastros/i');
    await page.click('text=/Webservices/i');

    // 3. Criar
    await page.click('button:has-text("CRIAR")');
    await page.select('select[name="webservice"]', 'API Pública da F360');
    await page.type('input[name="outros"]', 'TORRE');
    await page.click('button:has-text("Salvar")');

    // 4. Extrair token
    const token = await page.$eval('input[readonly]', el => el.value);

    return { ...record, token, status: 'success' };
  } catch (error) {
    return { ...record, status: 'error', errorMessage: error.message };
  } finally {
    await page.close();
  }
}

async function generateSQL(results) { /* gerar INSERT statements */ }

async function main() {
  const records = await readCSV();
  const browser = await puppeteer.launch({ headless: false });
  const results = [];

  for (let i = 0; i < records.length; i++) {
    const result = await processRecord(browser, records[i], i, records.length);
    results.push(result);

    if ((i + 1) % 10 === 0) {
      await fs.writeJson('./output/tokens.json', results);
    }
  }

  await browser.close();
  await fs.writeJson('./output/f360-tokens-extracted.json', results);
  await generateSQL(results);
}

main();
```

## TAREFAS

1. Criar estrutura de diretórios
2. Implementar código completo baseado na estrutura acima
3. Adicionar logging detalhado (chalk para cores)
4. Implementar tratamento de erros robusto
5. Adicionar screenshots em cada etapa
6. Testar com 3 registros primeiro
7. Executar produção (214 registros)
8. Gerar SQL
9. Executar no Supabase
10. Validar resultados

## RESULTADO ESPERADO

- JSON com 214 registros (status: success/error)
- SQL com ~200+ INSERTs (taxa de sucesso esperada: 90-95%)
- Screenshots de todas as etapas
- Log detalhado de execução
- Tabela `f360_config` populada no Supabase

## CREDENCIAIS SUPABASE

```
Host: db.xzrmzmcoslomtzkzgskn.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: B5b0dcf500@#
```

---

**POR FAVOR: Crie o código completo e funcional do script `generate-f360-tokens.js` seguindo exatamente estas especificações.**
