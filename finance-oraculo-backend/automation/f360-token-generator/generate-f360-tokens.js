const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const csv = require('csv-parser');
const chalk = require('chalk');
const path = require('path');
const { Client } = require('pg');

// Configurações
const CONFIG = {
  csvPath: '/tmp/F360_Lista_Acessos_COMPLETA.csv',
  outputDir: './output',
  screenshotsDir: './output/screenshots',
  f360Url: 'https://financas.f360.com.br',
  webserviceName: 'TORRE',
  webserviceType: 'API Pública da F360',
  headless: true, // true = modo invisível (mais estável), false = ver navegador
  testMode: false, // MUDAR PARA false PARA PRODUÇÃO
  testLimit: 20, // Apenas para testMode
  delayBetweenRecords: 2000, // 2 segundos
  maxConcurrent: 1, // Reduzir concorrência para estabilidade (ajustar após estabilizar)
  batchSize: 20, // Processar e salvar no banco a cada N registros
  timeouts: {
    navigation: 60000,
    element: 30000
  },
  saveProgressInterval: 10, // Salvar a cada 10 registros
  // Modo estrito: NÃO avançar para o próximo login até obter token
  strictSequential: true,
  strictRetries: 30, // tentativas por registro antes de abortar
  strictBackoffBaseMs: 2000,
  // Configurações do banco Supabase
  database: {
    host: 'db.xzrmzmcoslomtzkzgskn.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'B5b0dcf500@#'
  }
};

// Seletores CSS (múltiplos fallbacks)
const SELECTORS = {
  email: [
    'input[type="email"]',
    'input[name="email"]',
    'input[id="email"]',
    'input[placeholder*="email" i]',
    'input[placeholder*="e-mail" i]'
  ],
  password: [
    'input[type="password"]',
    'input[name="password"]',
    'input[id="password"]'
  ],
  loginButton: [
    'button[type="submit"]',
    'button:has-text("Entrar")',
    'button:has-text("Login")',
    'button.btn-primary',
    'input[type="submit"]'
  ],
  menuCadastros: [
    'text=/Menu de Cadastros/i',
    'button:has-text("Menu de Cadastros")',
    'a:has-text("Menu de Cadastros")',
    '[aria-label*="Cadastros" i]'
  ],
  integracoes: [
    'text=/Integrações/i',
    'text=/Integracoes/i',
    'a:has-text("Integrações")',
    'a:has-text("Integracoes")',
    'button:has-text("Integrações")',
    'a[href*="integracao" i]',
    'a[href*="webservice" i]',
    '[aria-label*="Integração" i]',
    '[aria-label*="Integracao" i]'
  ],
  webservices: [
    'text=/Webservices/i',
    'a:has-text("Webservices")',
    'button:has-text("Webservices")',
    'a[href*="webservice" i]'
  ],
  criarButton: [
    'button:has-text("+ CRIAR")',
    'button:has-text("CRIAR")',
    'button.btn-success:has-text("CRIAR")',
    'a:has-text("CRIAR")',
    'button[aria-label*="criar" i]',
    // Buscar especificamente no canto inferior esquerdo
    'button[style*="position: fixed"]:has-text("CRIAR")',
    'button[style*="bottom"]:has-text("CRIAR")',
    'button[style*="left"]:has-text("CRIAR")'
  ],
  webserviceDropdown: [
    'select[name="webservice"]',
    'select#webservice',
    'select[aria-label*="webservice" i]',
    'select.form-control'
  ],
  outrosInput: [
    'input[name="outros"]',
    'input#outros',
    'input[placeholder*="nome" i]',
    'input[type="text"]'
  ],
  saveButton: [
    'button:has-text("Salvar")',
    'button[type="submit"]',
    'button.btn-primary:has-text("Salvar")',
    'button:has-text("Confirmar")'
  ],
  token: [
    'input[readonly][value*="ey"]',
    'input[readonly]',
    'code:has-text("ey")',
    'pre:has-text("ey")',
    '[data-token]',
    '.token',
    '#token'
  ]
};

// Token regex pattern
const TOKEN_PATTERN = /ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/;

// Logging
const logFile = path.join(CONFIG.outputDir, 'automation-log.txt');
let logStream = null;

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  if (!logStream) {
    logStream = fs.createWriteStream(logFile, { flags: 'a' });
  }
  logStream.write(logMessage);
  
  // Console com cores
  switch (type) {
    case 'success':
      console.log(chalk.green(message));
      break;
    case 'error':
      console.log(chalk.red(message));
      break;
    case 'warning':
      console.log(chalk.yellow(message));
      break;
    case 'info':
      console.log(chalk.blue(message));
      break;
    default:
      console.log(message);
  }
}

// Ler CSV
async function readCSV() {
  log(`Lendo CSV: ${CONFIG.csvPath}`, 'info');
  const records = [];
  
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(CONFIG.csvPath)) {
      reject(new Error(`Arquivo CSV não encontrado: ${CONFIG.csvPath}`));
      return;
    }
    
    fs.createReadStream(CONFIG.csvPath)
      .pipe(csv())
      .on('data', (data) => {
        // Ler Login e Senha (obrigatórios), CNPJ e Empresa (opcionais)
        const record = {
          login: data['Login'] || data['login'] || data['Email'] || data['email'] || data['LOGIN'] || data['EMAIL'],
          senha: data['Senha'] || data['senha'] || data['Password'] || data['password'] || data['SENHA'],
          cnpj: data['CNPJ'] || data['cnpj'] || data['Cnpj'] || null,
          empresa: data['Empresa'] || data['empresa'] || data['Razao Social'] || data['Razão Social'] || data['RAZAO SOCIAL'] || data['Nome Fantasia'] || data['Nome'] || data['Cliente'] || null
        };
        
        // Validar campos obrigatórios (apenas login e senha)
        if (record.login && record.senha) {
          records.push(record);
        } else {
          log(`Registro ignorado (login ou senha faltando): Login=${record.login ? 'OK' : 'FALTANDO'}, Senha=${record.senha ? 'OK' : 'FALTANDO'}`, 'warning');
        }
      })
      .on('end', () => {
        const limit = CONFIG.testMode ? CONFIG.testLimit : records.length;
        const filtered = records.slice(0, limit);
        log(`Total de registros lidos: ${records.length}, Processando: ${filtered.length}`, 'info');
        resolve(filtered);
      })
      .on('error', reject);
  });
}

// Screenshot helper
async function takeScreenshot(page, name, recordIndex) {
  try {
    const filename = `${String(recordIndex + 1).padStart(3, '0')}_${name}.png`;
    const filepath = path.join(CONFIG.screenshotsDir, filename);
    await page.screenshot({ path: filepath, fullPage: true });
    return filepath;
  } catch (error) {
    log(`Erro ao tirar screenshot ${name}: ${error.message}`, 'warning');
    return null;
  }
}

// Tentar múltiplos seletores
async function tryMultipleSelectors(page, selectors, action = 'click', value = null) {
  for (const selector of selectors) {
    try {
      if (selector.startsWith('text=/')) {
        // Seletores de texto (XPath-like)
        const textMatch = selector.match(/text=\/(.+)\/i?/);
        if (textMatch) {
          const text = textMatch[1];
          const [element] = await page.$x(`//*[contains(text(), '${text}')]`);
          if (element) {
            if (action === 'click') {
              await element.click();
            } else if (action === 'type') {
              await element.type(value);
            } else if (action === 'select') {
              await element.select(value);
            }
            await page.waitForTimeout(1000);
            return true;
          }
        }
      } else if (selector.includes(':has-text(')) {
        // Seletores com :has-text (não suportado nativamente, usar XPath)
        const textMatch = selector.match(/:has-text\("(.+)"\)/);
        if (textMatch) {
          const text = textMatch[1];
          const baseSelector = selector.split(':has-text')[0];
          const [element] = await page.$x(`//${baseSelector}[contains(text(), '${text}')]`);
          if (element) {
            if (action === 'click') {
              await element.click();
            } else if (action === 'type') {
              await element.type(value);
            } else if (action === 'select') {
              await element.select(value);
            }
            await page.waitForTimeout(1000);
            return true;
          }
        }
      } else {
        // Seletores CSS normais
        await page.waitForSelector(selector, { timeout: CONFIG.timeouts.element });
        const element = await page.$(selector);
        if (element) {
          if (action === 'click') {
            await element.click();
          } else if (action === 'type') {
            await element.type(value, { delay: 50 });
          } else if (action === 'select') {
            await page.select(selector, value);
          } else if (action === 'getValue') {
            return await page.$eval(selector, el => el.value);
          } else if (action === 'getText') {
            return await page.$eval(selector, el => el.textContent);
          }
          await page.waitForTimeout(1000);
          return true;
        }
      }
    } catch (error) {
      // Continuar tentando próximo seletor
      continue;
    }
  }
  return false;
}

// Extrair token da página
async function extractToken(page) {
  // Tentar seletores específicos primeiro
  for (const selector of SELECTORS.token) {
    try {
      if (selector.includes('value*=')) {
        // Input com value contendo token
        const baseSelector = selector.split('[')[0];
        const value = await page.$eval(baseSelector, el => el.value);
        const match = value.match(TOKEN_PATTERN);
        if (match && match[0].length > 20) {
          return match[0];
        }
      } else if (selector.includes(':has-text(')) {
        const textMatch = selector.match(/:has-text\("(.+)"\)/);
        if (textMatch) {
          const baseSelector = selector.split(':has-text')[0];
          const text = await page.$eval(baseSelector, el => el.textContent);
          const match = text.match(TOKEN_PATTERN);
          if (match && match[0].length > 20) {
            return match[0];
          }
        }
      } else {
        const element = await page.$(selector);
        if (element) {
          const text = await page.$eval(selector, el => {
            return el.value || el.textContent || el.innerText;
          });
          const match = text.match(TOKEN_PATTERN);
          if (match && match[0].length > 20) {
            return match[0];
          }
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  // Fallback: buscar no texto completo da página
  try {
    const pageContent = await page.evaluate(() => document.body.textContent);
    const match = pageContent.match(TOKEN_PATTERN);
    if (match && match[0].length > 20) {
      return match[0];
    }
  } catch (error) {
    log(`Erro ao extrair token do texto da página: ${error.message}`, 'warning');
  }
  
  return null;
}

// Salvar tokens no banco de dados
async function saveTokensToDatabase(results) {
  const client = new Client(CONFIG.database);
  
  try {
    await client.connect();
    log(`\nConectado ao banco de dados`, 'success');
    
    let savedCount = 0;
    let errorCount = 0;
    
    for (const result of results) {
      if (result.status === 'success' && result.token && result.cnpj) {
        try {
          // Limpar CNPJ (remover caracteres especiais)
          const cleanCnpj = result.cnpj.replace(/[^\d]/g, '');
          
          // Tentar inserir COM nome de empresa se a coluna existir; caso contrário, fallback sem empresa
          const tryWithCompany = `
            INSERT INTO f360_config (company_cnpj, company_name, api_key, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, true, NOW(), NOW())
            ON CONFLICT (company_cnpj)
            DO UPDATE SET
              api_key = EXCLUDED.api_key,
              company_name = COALESCE(EXCLUDED.company_name, f360_config.company_name),
              is_active = true,
              updated_at = NOW()
          `;
          const tryWithoutCompany = `
            INSERT INTO f360_config (company_cnpj, api_key, is_active, created_at, updated_at)
            VALUES ($1, $2, true, NOW(), NOW())
            ON CONFLICT (company_cnpj)
            DO UPDATE SET
              api_key = EXCLUDED.api_key,
              is_active = true,
              updated_at = NOW()
          `;
          try {
            await client.query(tryWithCompany, [cleanCnpj, result.empresa || null, result.token]);
          } catch (e) {
            // Fallback se a coluna company_name não existir
            await client.query(tryWithoutCompany, [cleanCnpj, result.token]);
          }
          savedCount++;
          log(`  ✓ Token salvo no banco: CNPJ ${cleanCnpj.substring(0, 14)}...`, 'success');
        } catch (error) {
          errorCount++;
          log(`  ✗ Erro ao salvar token (CNPJ: ${result.cnpj}): ${error.message}`, 'error');
        }
      }
    }
    
    log(`\nTokens salvos no banco: ${savedCount} sucessos, ${errorCount} erros`, savedCount > 0 ? 'success' : 'warning');
    return { saved: savedCount, errors: errorCount };
  } catch (error) {
    log(`\nERRO ao conectar ao banco: ${error.message}`, 'error');
    throw error;
  } finally {
    await client.end();
  }
}

// Processar múltiplos registros com política estrita (não avança sem token) ou com paralelismo limitado
async function processInParallel(browsers, records, maxConcurrent, startIndex = 0) {
  const results = [];
  const total = records.length;
  
  // Callback para salvar progresso
  const saveProgress = async (currentResults) => {
    const progressPath = path.join(CONFIG.outputDir, 'f360-tokens-progress.json');
    await fs.writeJson(progressPath, currentResults, { spaces: 2 });
    log(`\nProgresso salvo: ${currentResults.length} registros processados`, 'info');
  };
  
  if (CONFIG.strictSequential) {
    // Usar apenas um browser no modo estrito
    const browser = browsers[0];
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      let attempt = 1;
      let result = null;
      while (attempt <= CONFIG.strictRetries) {
        log(`\n[STRICT] Tentativa ${attempt}/${CONFIG.strictRetries} para ${record.login}`, 'warning');
        result = await processRecord(browser, record, startIndex + i, total);
        if (result.status === 'success' && result.token) {
          results.push(result);
          await saveProgress(results);
          break;
        }
        const waitMs = CONFIG.strictBackoffBaseMs * attempt;
        log(`[STRICT] Sem token. Aguardando ${waitMs}ms antes de nova tentativa...`, 'warning');
        await new Promise(r => setTimeout(r, waitMs));
      }
      if (!result || result.status !== 'success' || !result.token) {
        log(`[STRICT] Não foi possível obter token após ${CONFIG.strictRetries} tentativas para ${record.login}. Abortando processamento conforme política estrita.`, 'error');
        // salvar progresso parcial e abortar
        await saveProgress(results);
        return results;
      }
    }
    return results;
  }
  
  // Processar em lotes
  for (let i = 0; i < records.length; i += maxConcurrent) {
    const batch = records.slice(i, i + maxConcurrent);
    const batchPromises = batch.map((record, batchIndex) => {
      const globalIndex = startIndex + i + batchIndex;
      const browser = browsers[globalIndex % browsers.length];
      return processRecord(browser, record, globalIndex, total);
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    log(`\nLote ${Math.floor(i / maxConcurrent) + 1} concluído: ${Math.min(i + maxConcurrent, total)}/${total}`, 'info');
    
    // Salvar progresso a cada N registros
    if (results.length % CONFIG.saveProgressInterval === 0 || results.length === total) {
      await saveProgress(results);
    }
    
    // Pequeno delay entre lotes para não sobrecarregar
    if (i + maxConcurrent < records.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

// Processar um registro
async function processRecord(browser, record, index, total, attempt = 1) {
  const startTime = Date.now();
  const screenshots = [];
  let page = null;
  
  try {
    // Criar página com tratamento de erro
    try {
      page = await browser.newPage();
      // Configurar timeouts
      page.setDefaultNavigationTimeout(CONFIG.timeouts.navigation);
      page.setDefaultTimeout(CONFIG.timeouts.element);
      
      // Verificar se página está válida
      if (!page || page.isClosed()) {
        throw new Error('Página inválida ou fechada');
      }
    } catch (error) {
      throw new Error(`Erro ao criar página: ${error.message}`);
    }
    log(`\n[${index + 1}/${total}] Processando: ${record.login}${record.cnpj ? ` (CNPJ: ${record.cnpj})` : ''}`, 'info');
    
    // 1. Navegar para página inicial
    log(`  → Navegando para ${CONFIG.f360Url}`, 'info');
    await page.goto(CONFIG.f360Url, { waitUntil: 'domcontentloaded', timeout: CONFIG.timeouts.navigation });
    await page.waitForTimeout(3000); // Aguardar página carregar completamente
    screenshots.push(await takeScreenshot(page, '01_homepage', index));
    
    // 2. Preencher login
    log(`  → Preenchendo email: ${record.login}`, 'info');
    
    // Verificar se página ainda está aberta
    if (page.isClosed()) {
      throw new Error('Página foi fechada durante o processo');
    }
    
    await page.waitForTimeout(2000); // Aguardar elementos aparecerem
    const emailFilled = await tryMultipleSelectors(page, SELECTORS.email, 'type', record.login);
    if (!emailFilled) {
      // Tentar buscar por qualquer input de texto visível
      try {
        // Verificar página antes de evaluate
        if (page.isClosed()) {
          throw new Error('Página fechada antes de preencher email');
        }
        await page.evaluate((email) => {
          const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="email"], input:not([type])'));
          const emailInput = inputs.find(input => {
            const placeholder = (input.placeholder || '').toLowerCase();
            const name = (input.name || '').toLowerCase();
            const id = (input.id || '').toLowerCase();
            return placeholder.includes('email') || placeholder.includes('e-mail') || 
                   name.includes('email') || name.includes('login') ||
                   id.includes('email') || id.includes('login');
          });
          if (emailInput) {
            emailInput.value = email;
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
            emailInput.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
          return false;
        }, record.login);
        await page.waitForTimeout(1000);
        emailFilled = true;
      } catch (error) {
        log(`  → Erro ao tentar método alternativo de preenchimento: ${error.message}`, 'warning');
      }
    }
    if (!emailFilled) {
      throw new Error('Não foi possível encontrar campo de email');
    }
    screenshots.push(await takeScreenshot(page, '02_login_filled', index));
    
    // 3. Preencher senha
    log(`  → Preenchendo senha`, 'info');
    
    // Verificar se página ainda está aberta
    if (page.isClosed()) {
      throw new Error('Página foi fechada durante preenchimento de senha');
    }
    
    const passwordFilled = await tryMultipleSelectors(page, SELECTORS.password, 'type', record.senha);
    if (!passwordFilled) {
      throw new Error('Não foi possível encontrar campo de senha');
    }
    screenshots.push(await takeScreenshot(page, '03_password_filled', index));
    
    // 4. Clicar em login
    log(`  → Clicando em login`, 'info');
    
    // Verificar se página ainda está aberta
    if (page.isClosed()) {
      throw new Error('Página foi fechada antes de clicar em login');
    }
    
    await page.waitForTimeout(1000);
    let loginClicked = await tryMultipleSelectors(page, SELECTORS.loginButton, 'click');
    if (!loginClicked) {
      // Tentar buscar botão por texto
      try {
        if (page.isClosed()) {
          throw new Error('Página fechada durante tentativa de login');
        }
        loginClicked = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], a[role="button"]'));
          const loginButton = buttons.find(btn => {
            const text = (btn.textContent || btn.value || btn.innerText || '').toLowerCase();
            return text.includes('entrar') || text.includes('login') || text.includes('acessar') || 
                   btn.type === 'submit' || btn.getAttribute('type') === 'submit';
          });
          if (loginButton) {
            loginButton.click();
            return true;
          }
          return false;
        });
        await page.waitForTimeout(1000);
      } catch (error) {
        log(`  → Erro ao tentar método alternativo de clique: ${error.message}`, 'warning');
      }
    }
    if (!loginClicked) {
      throw new Error('Não foi possível encontrar botão de login');
    }
    
    // Aguardar após login (não depender de navegação)
    log(`  → Aguardando login processar...`, 'info');
    await page.waitForTimeout(10000); // Aumentar para 10 segundos
    
    // Verificar se login foi bem-sucedido (URL mudou ou elementos da página logada aparecem)
    const currentUrl = page.url();
    log(`  → URL após login: ${currentUrl}`, 'info');
    
    // Se ainda estiver na página de login, pode ter dado erro - tentar navegar diretamente
    if (currentUrl.includes('login') || currentUrl === CONFIG.f360Url || currentUrl === CONFIG.f360Url + '/') {
      log(`  → Ainda na página de login, tentando navegar diretamente para /Webservice`, 'warning');
      try {
        await page.goto(`${CONFIG.f360Url}/Webservice`, { waitUntil: 'networkidle2', timeout: CONFIG.timeouts.navigation });
        await page.waitForTimeout(3000);
        log(`  ✓ Navegação direta bem-sucedida`, 'success');
      } catch (error) {
        log(`  → Erro na navegação direta: ${error.message}`, 'warning');
        await page.waitForTimeout(5000);
      }
    }
    
    screenshots.push(await takeScreenshot(page, '04_logged_in', index));
    
    // 5. Tentar navegar diretamente para /Webservice OU seguir menu
    log(`  → Tentando navegar diretamente para /Webservice`, 'info');
    try {
      await page.goto(`${CONFIG.f360Url}/Webservice`, { waitUntil: 'networkidle2', timeout: CONFIG.timeouts.navigation });
      screenshots.push(await takeScreenshot(page, '05_webservice_direct', index));
      log(`  ✓ Navegação direta bem-sucedida`, 'success');
    } catch (error) {
      log(`  → Navegação direta falhou, usando menu`, 'warning');
      
      // 5a. Navegar para Menu de Cadastros
      log(`  → Abrindo Menu de Cadastros`, 'info');
      const menuClicked = await tryMultipleSelectors(page, SELECTORS.menuCadastros, 'click');
      if (!menuClicked) {
        throw new Error('Não foi possível encontrar Menu de Cadastros');
      }
      await page.waitForTimeout(2000);
      screenshots.push(await takeScreenshot(page, '05_menu_opened', index));
      
      // 5b. Clicar em Integrações
      log(`  → Abrindo Integrações`, 'info');
      const integracoesClicked = await tryMultipleSelectors(page, SELECTORS.integracoes, 'click');
      if (!integracoesClicked) {
        throw new Error('Não foi possível encontrar Integrações');
      }
      await page.waitForTimeout(2000);
      screenshots.push(await takeScreenshot(page, '06_integracoes_opened', index));
      
      // 5c. Clicar em Webservices
      log(`  → Abrindo Webservices`, 'info');
      const webservicesClicked = await tryMultipleSelectors(page, SELECTORS.webservices, 'click');
      if (!webservicesClicked) {
        throw new Error('Não foi possível encontrar Webservices');
      }
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: CONFIG.timeouts.navigation });
      screenshots.push(await takeScreenshot(page, '07_webservices_page', index));
    }
    
    // 6. Garantir que estamos na página de Webservices
    const webserviceUrl = page.url();
    if (!webserviceUrl.includes('webservice') && !webserviceUrl.includes('Webservice')) {
      log(`  → URL atual não contém 'webservice', tentando navegar novamente`, 'warning');
      await page.goto(`${CONFIG.f360Url}/Webservice`, { waitUntil: 'networkidle2', timeout: CONFIG.timeouts.navigation });
    }
    screenshots.push(await takeScreenshot(page, '08_webservices_page_final', index));
    
    // 7. Clicar em CRIAR (botão está no MENU LATERAL ESQUERDO, parte inferior)
    log(`  → Procurando botão "+ CRIAR" no MENU LATERAL ESQUERDO (parte inferior)`, 'info');
    
    // Aguardar página carregar completamente
    await page.waitForTimeout(5000);
    
    // ===== SISTEMA MULTI-AGENTE =====
    // 5 agentes diferentes tentando encontrar o botão simultaneamente
    // Cada um com uma estratégia diferente baseada em diferentes modelos de IA
    let criarClicked = false;
    
    // ESTRATÉGIA 0: XY FALLBACK PRIMEIRO (mais simples e direto)
    log(`  → [ESTRATÉGIA XY] Tentando clicar por coordenadas no canto inferior esquerdo`, 'info');
    try {
      if (page.isClosed()) throw new Error('Página foi fechada');
      const hotzones = await page.evaluate(() => {
        const vh = window.innerHeight;
        const vw = window.innerWidth;
        // Hotspots no canto inferior esquerdo: X pequeno (24-152px), Y próximo do bottom
        const xs = [24, 56, 88, 120, 152, 184];
        const ys = [vh - 24, vh - 56, vh - 88, vh - 120];
        const pts = [];
        xs.forEach(x => ys.forEach(y => pts.push({ x, y })));
        return pts;
      });
      for (const pt of hotzones) {
        try {
          await page.mouse.move(pt.x, pt.y);
          await page.mouse.click(pt.x, pt.y, { delay: 50 });
          await page.waitForTimeout(1000);
          const createView = await page.evaluate(() => {
            const hasSelect = !!document.querySelector('select');
            const hasSave = Array.from(document.querySelectorAll('button, a, [role="button"]')).some(el => /salvar/i.test((el.textContent || '').toLowerCase()));
            const hasInputs = Array.from(document.querySelectorAll('input[type="text"], textarea')).length > 0;
            return (hasSelect && hasInputs) || hasSave;
          });
          if (createView) {
            criarClicked = true;
            log(`  ✓ [ESTRATÉGIA XY] Modal de criação aberto! (X:${pt.x}, Y:${pt.y})`, 'success');
            break;
          }
        } catch (err) {
          continue;
        }
      }
    } catch (error) {
      log(`  → [ESTRATÉGIA XY] Erro: ${error.message}`, 'warning');
    }
    
    // AGENTE 1: CODEX (Estratégia técnica/direta - busca por seletores CSS precisos)
    if (!criarClicked) {
      log(`  → [AGENTE CODEX] Buscando por seletores CSS precisos`, 'info');
      try {
        // Verificar se página ainda está aberta
        if (page.isClosed()) {
          throw new Error('Página foi fechada');
        }
        criarClicked = await page.evaluate(() => {
          // Estratégia CODEX: Busca direta por seletores CSS comuns
          const selectors = [
            'button:contains("+ CRIAR")',
            '[aria-label*="criar" i]',
            '[title*="criar" i]',
            'button[class*="create"]',
            'button[class*="add"]',
            'a[class*="create"]',
            'div[class*="create"] button',
            'nav button:last-child',
            'aside button:last-child'
          ];
          
          // Buscar sidebar primeiro
          const sidebar = document.querySelector('aside, nav, [class*="sidebar"], [id*="sidebar"]');
          const searchArea = sidebar || document.body;
          
          // Buscar por texto exato
          const allElements = Array.from(searchArea.querySelectorAll('button, a, [role="button"], div, span'));
          const criarButtons = allElements.filter(el => {
            const text = (el.textContent || el.innerText || '').trim().toUpperCase();
            const rect = el.getBoundingClientRect();
            return (text === '+ CRIAR' || text === '+CRIAR' || text.includes('+ CRIAR')) &&
                   rect.left < window.innerWidth * 0.3 &&
                   rect.bottom > window.innerHeight * 0.7;
          });
          
          if (criarButtons.length > 0) {
            criarButtons[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            criarButtons[0].click();
            return true;
          }
          return false;
        });
        if (criarClicked) log(`  ✓ [AGENTE CODEX] Sucesso!`, 'success');
      } catch (error) {
        log(`  → [AGENTE CODEX] Erro: ${error.message}`, 'warning');
      }
    }
    
    // AGENTE 2: DeepSeek-V3.2-Exp (Estratégia exploratória - busca ampla e recursiva)
    if (!criarClicked) {
      log(`  → [AGENTE DeepSeek] Busca exploratória ampla`, 'info');
      try {
        if (page.isClosed()) throw new Error('Página foi fechada');
        criarClicked = await page.evaluate(() => {
          // Estratégia DeepSeek: Busca exploratória em toda a estrutura DOM
          function findInElement(el, depth = 0) {
            if (depth > 5) return null; // Limitar profundidade
            
            const text = (el.textContent || el.innerText || '').trim().toUpperCase();
            const rect = el.getBoundingClientRect();
            
            if ((text.includes('CRIAR') || text.includes('+')) &&
                rect.left < window.innerWidth * 0.35 &&
                rect.bottom > window.innerHeight * 0.65 &&
                rect.width > 30 && rect.height > 20) {
              return el;
            }
            
            // Buscar recursivamente nos filhos
            for (const child of Array.from(el.children)) {
              const found = findInElement(child, depth + 1);
              if (found) return found;
            }
            
            return null;
          }
          
          const sidebar = document.querySelector('aside, nav, [class*="sidebar"], [class*="menu"]');
          const searchArea = sidebar || document.body;
          const found = findInElement(searchArea);
          
          if (found) {
            found.scrollIntoView({ behavior: 'smooth', block: 'center' });
            found.click();
            return true;
          }
          return false;
        });
        if (criarClicked) log(`  ✓ [AGENTE DeepSeek] Sucesso!`, 'success');
      } catch (error) {
        log(`  → [AGENTE DeepSeek] Erro: ${error.message}`, 'warning');
      }
    }
    
    // AGENTE 3: GEMINI (Estratégia abrangente - múltiplas abordagens simultâneas)
    if (!criarClicked) {
      log(`  → [AGENTE GEMINI] Busca abrangente multi-abordagem`, 'info');
      try {
        if (page.isClosed()) throw new Error('Página foi fechada');
        criarClicked = await page.evaluate(() => {
          // Estratégia GEMINI: Múltiplas abordagens simultâneas
          const strategies = [
            // Abordagem 1: Por posição absoluta
            () => {
              const all = Array.from(document.querySelectorAll('*'));
              return all.find(el => {
                const rect = el.getBoundingClientRect();
                const text = (el.textContent || '').trim().toUpperCase();
                return text.includes('CRIAR') && rect.left < 300 && rect.bottom > window.innerHeight - 100;
              });
            },
            // Abordagem 2: Por hierarquia DOM
            () => {
              const navs = Array.from(document.querySelectorAll('nav, aside, [role="navigation"]'));
              for (const nav of navs) {
                const buttons = Array.from(nav.querySelectorAll('button, a, [role="button"]'));
                const found = buttons.find(btn => {
                  const text = (btn.textContent || '').trim().toUpperCase();
                  return text.includes('CRIAR') || text.includes('+');
                });
                if (found) return found;
              }
              return null;
            },
            // Abordagem 3: Por atributos data-*
            () => {
              return document.querySelector('[data-action*="create"], [data-action*="add"], [data-testid*="create"]');
            },
            // Abordagem 4: Por último elemento do sidebar
            () => {
              const sidebar = document.querySelector('aside, nav');
              if (sidebar) {
                const children = Array.from(sidebar.children);
                const last = children[children.length - 1];
                if (last) {
                  const buttons = Array.from(last.querySelectorAll('button, a'));
                  return buttons.find(btn => {
                    const text = (btn.textContent || '').trim().toUpperCase();
                    return text.includes('CRIAR') || text.includes('+');
                  });
                }
              }
              return null;
            }
          ];
          
          for (const strategy of strategies) {
            const found = strategy();
            if (found) {
              found.scrollIntoView({ behavior: 'smooth', block: 'center' });
              found.click();
              return true;
            }
          }
          return false;
        });
        if (criarClicked) log(`  ✓ [AGENTE GEMINI] Sucesso!`, 'success');
      } catch (error) {
        log(`  → [AGENTE GEMINI] Erro: ${error.message}`, 'warning');
      }
    }
    
    // AGENTE 4: MISTRAL (Estratégia conservadora - validação rigorosa)
    if (!criarClicked) {
      log(`  → [AGENTE MISTRAL] Busca conservadora com validação rigorosa`, 'info');
      try {
        if (page.isClosed()) throw new Error('Página foi fechada');
        criarClicked = await page.evaluate(() => {
          // Estratégia MISTRAL: Validação rigorosa de múltiplos critérios
          const candidates = Array.from(document.querySelectorAll('button, a, [role="button"], div[onclick], span[onclick]'));
          
          const validButtons = candidates.filter(btn => {
            const rect = btn.getBoundingClientRect();
            const style = window.getComputedStyle(btn);
            const text = (btn.textContent || btn.innerText || '').trim().toUpperCase();
            const ariaLabel = (btn.getAttribute('aria-label') || '').toUpperCase();
            
            // Critérios rigorosos
            const hasText = text.includes('CRIAR') || text.includes('+ CRIAR') || ariaLabel.includes('CRIAR');
            const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
            const isInLeftMenu = rect.left < window.innerWidth * 0.3;
            const isBottom = rect.bottom > window.innerHeight * 0.7;
            const hasSize = rect.width > 30 && rect.height > 20;
            const isClickable = !btn.disabled && btn.offsetParent !== null;
            
            return hasText && isVisible && isInLeftMenu && isBottom && hasSize && isClickable;
          });
          
          if (validButtons.length > 0) {
            // Escolher o mais próximo do canto inferior esquerdo
            validButtons.sort((a, b) => {
              const rectA = a.getBoundingClientRect();
              const rectB = b.getBoundingClientRect();
              const distA = Math.sqrt(Math.pow(window.innerHeight - rectA.bottom, 2) + Math.pow(rectA.left, 2));
              const distB = Math.sqrt(Math.pow(window.innerHeight - rectB.bottom, 2) + Math.pow(rectB.left, 2));
              return distA - distB;
            });
            
            validButtons[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            validButtons[0].click();
            return true;
          }
          return false;
        });
        if (criarClicked) log(`  ✓ [AGENTE MISTRAL] Sucesso!`, 'success');
      } catch (error) {
        log(`  → [AGENTE MISTRAL] Erro: ${error.message}`, 'warning');
      }
    }
    
    // AGENTE 5: Qwen 3 Max (Estratégia agressiva - tenta tudo)
    if (!criarClicked) {
      log(`  → [AGENTE Qwen] Busca agressiva - tentando todas as possibilidades`, 'info');
      try {
        if (page.isClosed()) throw new Error('Página foi fechada');
        criarClicked = await page.evaluate(() => {
          // Estratégia Qwen: Tenta todas as possibilidades agressivamente
          const allElements = Array.from(document.querySelectorAll('*'));
          
          // Filtrar por múltiplos critérios simultaneamente
          const candidates = allElements.filter(el => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            const text = (el.textContent || el.innerText || el.title || '').trim().toUpperCase();
            const ariaLabel = (el.getAttribute('aria-label') || '').toUpperCase();
            const className = (el.className || '').toUpperCase();
            const id = (el.id || '').toUpperCase();
            
            // Critérios amplos
            const hasCriarText = text.includes('CRIAR') || text.includes('+') || 
                                ariaLabel.includes('CRIAR') || ariaLabel.includes('ADD') ||
                                className.includes('CRIAR') || className.includes('CREATE') ||
                                id.includes('CRIAR') || id.includes('CREATE');
            
            const isInLeftArea = rect.left < window.innerWidth * 0.4; // Mais flexível
            const isBottomArea = rect.bottom > window.innerHeight * 0.6; // Mais flexível
            const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
            
            return hasCriarText && isInLeftArea && isBottomArea && isVisible;
          });
          
          if (candidates.length > 0) {
            // Ordenar por múltiplos fatores
            candidates.sort((a, b) => {
              const rectA = a.getBoundingClientRect();
              const rectB = b.getBoundingClientRect();
              const textA = (a.textContent || '').trim().toUpperCase();
              const textB = (b.textContent || '').trim().toUpperCase();
              
              // Priorizar elementos com texto exato "+ CRIAR"
              const exactMatchA = textA === '+ CRIAR' || textA === '+CRIAR' ? 0 : 1;
              const exactMatchB = textB === '+ CRIAR' || textB === '+CRIAR' ? 0 : 1;
              if (exactMatchA !== exactMatchB) return exactMatchA - exactMatchB;
              
              // Depois por proximidade do canto inferior esquerdo
              const distA = Math.sqrt(Math.pow(window.innerHeight - rectA.bottom, 2) + Math.pow(rectA.left, 2));
              const distB = Math.sqrt(Math.pow(window.innerHeight - rectB.bottom, 2) + Math.pow(rectB.left, 2));
              return distA - distB;
            });
            
            const target = candidates[0];
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Tentar múltiplos métodos de clique
            try {
              target.click();
            } catch (e) {
              target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            }
            
            return true;
          }
          return false;
        });
        if (criarClicked) log(`  ✓ [AGENTE Qwen] Sucesso!`, 'success');
      } catch (error) {
        log(`  → [AGENTE Qwen] Erro: ${error.message}`, 'warning');
      }
    }
    
    // Fallback: Estratégias originais se nenhum agente conseguir
    if (!criarClicked) {
      log(`  → Nenhum agente conseguiu, tentando estratégias originais...`, 'warning');
      
      // Estratégia 1: Buscar no MENU LATERAL ESQUERDO (sidebar) por texto "+ CRIAR"
      log(`  → Buscando "+ CRIAR" no menu lateral esquerdo`, 'info');
      try {
      criarClicked = await page.evaluate(() => {
        // Buscar primeiro no menu lateral (sidebar) - geralmente tem classes como sidebar, nav, menu, aside
        const sidebarSelectors = [
          'aside', 'nav', '[class*="sidebar"]', '[class*="menu"]', '[class*="nav"]',
          '[id*="sidebar"]', '[id*="menu"]', '[id*="nav"]'
        ];
        
        let sidebar = null;
        for (const selector of sidebarSelectors) {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            const rect = el.getBoundingClientRect();
            // Menu lateral geralmente está na esquerda e ocupa parte da largura
            if (rect.left < window.innerWidth * 0.3 && rect.width < window.innerWidth * 0.4) {
              sidebar = el;
              break;
            }
          }
          if (sidebar) break;
        }
        
        // Se não encontrou sidebar específico, buscar em toda a página mas priorizar elementos da esquerda
        const searchArea = sidebar || document.body;
        
        // Buscar todos os elementos clicáveis dentro do menu lateral ou na área esquerda
        const clickableElements = Array.from(searchArea.querySelectorAll('button, a, div[role="button"], span[role="button"], [onclick], [class*="btn"], [class*="button"], div, span'));
        
        // Filtrar elementos que contêm "+ CRIAR" ou "CRIAR"
        const criarButtons = clickableElements.filter(el => {
          const text = (el.textContent || el.innerText || el.title || '').toUpperCase().trim();
          const ariaLabel = (el.getAttribute('aria-label') || '').toUpperCase();
          
          const hasCriarText = text.includes('CRIAR') || text.includes('+ CRIAR') || text.includes('+CRIAR') || 
                               text === '+ CRIAR' || text === '+CRIAR' || ariaLabel.includes('CRIAR');
          
          if (!hasCriarText) return false;
          
          // Verificar se está no MENU LATERAL ESQUERDO (parte inferior)
          const rect = el.getBoundingClientRect();
          const windowHeight = window.innerHeight;
          const windowWidth = window.innerWidth;
          
          // Menu lateral esquerdo: left < 30% da largura E bottom > 70% da altura (parte inferior do menu)
          const isInLeftMenu = rect.left < windowWidth * 0.3;
          const isBottom = rect.bottom > windowHeight * 0.7;
          
          return isInLeftMenu && isBottom;
        });
        
        if (criarButtons.length > 0) {
          // Ordenar por proximidade do canto inferior esquerdo
          criarButtons.sort((a, b) => {
            const rectA = a.getBoundingClientRect();
            const rectB = b.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            
            // Calcular distância do canto inferior esquerdo
            const distA = Math.sqrt(
              Math.pow(windowHeight - rectA.bottom, 2) + Math.pow(rectA.left, 2)
            );
            const distB = Math.sqrt(
              Math.pow(windowHeight - rectB.bottom, 2) + Math.pow(rectB.left, 2)
            );
            
            return distA - distB;
          });
          
          // Tentar clicar no primeiro
          try {
            criarButtons[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            criarButtons[0].click();
            return true;
          } catch (e) {
            criarButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            return true;
          }
        }
        return false;
      });
      
      if (criarClicked) {
        await page.waitForTimeout(2000);
        log(`  ✓ Botão "+ CRIAR" encontrado no menu lateral e clicado!`, 'success');
      }
    } catch (error) {
      log(`  → Erro ao buscar botão: ${error.message}`, 'warning');
    }
    
    // Estratégia 2: Buscar qualquer elemento com "+" no menu lateral esquerdo (parte inferior)
    if (!criarClicked) {
      log(`  → Buscando elemento com "+" no menu lateral esquerdo`, 'info');
      try {
        criarClicked = await page.evaluate(() => {
          // Buscar todos os elementos com "+" ou "CRIAR"
          const allElements = Array.from(document.querySelectorAll('*'));
          const plusElements = allElements.filter(el => {
            const text = (el.textContent || el.innerText || '').trim();
            const hasPlus = text === '+' || text.startsWith('+ ') || text.includes('+ CRIAR') || 
                           text.includes('+CRIAR') || text.includes('CRIAR');
            
            if (!hasPlus) return false;
            
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            
            // Verificar se está visível e no menu lateral esquerdo (parte inferior)
            return style.display !== 'none' && 
                   style.visibility !== 'hidden' &&
                   rect.left < window.innerWidth * 0.3 &&  // Menu lateral esquerdo
                   rect.bottom > window.innerHeight * 0.7;  // Parte inferior
          });
          
          if (plusElements.length > 0) {
            plusElements.sort((a, b) => {
              const rectA = a.getBoundingClientRect();
              const rectB = b.getBoundingClientRect();
              return (window.innerHeight - rectA.bottom) - (window.innerHeight - rectB.bottom);
            });
            
            plusElements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            plusElements[0].click();
            return true;
          }
          return false;
        });
        
        if (criarClicked) {
          await page.waitForTimeout(2000);
          log(`  ✓ Elemento "+" encontrado no menu lateral e clicado!`, 'success');
        }
      } catch (error) {
        log(`  → Erro: ${error.message}`, 'warning');
      }
    }
    
    // Estratégia 3: Usar seletores padrão (fallback)
    if (!criarClicked) {
      criarClicked = await tryMultipleSelectors(page, SELECTORS.criarButton, 'click');
    }
    
    // Estratégia 4: Buscar botão flutuante (FAB) no canto inferior esquerdo
    if (!criarClicked) {
      log(`  → Buscando botão flutuante (FAB) no canto inferior ESQUERDO`, 'info');
      try {
        criarClicked = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
          const fabButtons = buttons.filter(btn => {
            const style = window.getComputedStyle(btn);
            const rect = btn.getBoundingClientRect();
            const isFixed = style.position === 'fixed' || style.position === 'absolute';
            // Canto inferior ESQUERDO: bottom > 70% E left < 30%
            const isBottomLeft = rect.bottom > window.innerHeight * 0.7 && rect.left < window.innerWidth * 0.3;
            return isFixed && isBottomLeft;
          });
          
          if (fabButtons.length > 0) {
            fabButtons.sort((a, b) => {
              const rectA = a.getBoundingClientRect();
              const rectB = b.getBoundingClientRect();
              return (window.innerHeight - rectA.bottom) - (window.innerHeight - rectB.bottom);
            });
            fabButtons[0].click();
            return true;
          }
          return false;
        });
        
        if (criarClicked) {
          await page.waitForTimeout(2000);
        }
      } catch (error) {
        log(`  → Erro ao buscar FAB: ${error.message}`, 'warning');
      }
    }
    
    if (!criarClicked) {
      // Fallback XY: clicar em hotspots no canto inferior esquerdo (sem depender do DOM)
      log(`  → Fallback XY: tentando hotspots no canto inferior esquerdo`, 'warning');
      try {
        const hotzones = await page.evaluate(() => {
          const vh = window.innerHeight;
          const vw = window.innerWidth;
          const xs = [24, 56, 88, 120, 152];
          const ys = [vh - 24, vh - 56, vh - 88];
          const pts = [];
          xs.forEach(x => ys.forEach(y => pts.push({ x, y })));
          return pts;
        });
        for (const pt of hotzones) {
          await page.mouse.move(pt.x, pt.y);
          await page.mouse.click(pt.x, pt.y, { delay: 40 });
          await page.waitForTimeout(800);
          const createView = await page.evaluate(() => {
            const hasSelect = !!document.querySelector('select');
            const hasSave = Array.from(document.querySelectorAll('button, a, [role="button"]')).some(el => /salvar/i.test((el.textContent || '').toLowerCase()));
            const hasInputs = Array.from(document.querySelectorAll('input, textarea')).length > 0;
            return (hasSelect && hasInputs) || hasSave;
          });
          if (createView) {
            criarClicked = true;
            break;
          }
        }
      } catch (error) {
        log(`  → Erro no fallback XY: ${error.message}`, 'warning');
      }
    }
    
    if (!criarClicked) {
      // Última tentativa: screenshot e buscar qualquer botão no menu lateral esquerdo
      log(`  → Última tentativa: buscando qualquer elemento no MENU LATERAL ESQUERDO`, 'info');
      await takeScreenshot(page, 'BEFORE_CRIAR_SEARCH', index);
      
      try {
        criarClicked = await page.evaluate(() => {
          const allButtons = Array.from(document.querySelectorAll('button, a, [role="button"], div[onclick], span[onclick], div, span'));
          const menuLeftButtons = allButtons.filter(btn => {
            const rect = btn.getBoundingClientRect();
            const style = window.getComputedStyle(btn);
            const text = (btn.textContent || btn.innerText || '').trim();
            
            return style.display !== 'none' && 
                   style.visibility !== 'hidden' &&
                   rect.bottom > window.innerHeight * 0.7 &&  // Parte inferior
                   rect.left < window.innerWidth * 0.3 &&     // Menu lateral esquerdo
                   (text.includes('CRIAR') || text.includes('+') || rect.width > 40);
          });
          
          if (menuLeftButtons.length > 0) {
            menuLeftButtons.sort((a, b) => {
              const rectA = a.getBoundingClientRect();
              const rectB = b.getBoundingClientRect();
              const distA = Math.sqrt(Math.pow(window.innerHeight - rectA.bottom, 2) + Math.pow(rectA.left, 2));
              const distB = Math.sqrt(Math.pow(window.innerHeight - rectB.bottom, 2) + Math.pow(rectB.left, 2));
              return distA - distB;
            });
            
            menuLeftButtons[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            menuLeftButtons[0].click();
            return true;
          }
          return false;
        });
      } catch (error) {
        log(`  → Erro na última tentativa: ${error.message}`, 'warning');
      }
    }
    } // Fechar bloco if (!criarClicked) do fallback
    
    if (!criarClicked) {
      throw new Error('Não foi possível encontrar botão "+ CRIAR" no MENU LATERAL ESQUERDO');
    }
    
    await page.waitForTimeout(2000);
    screenshots.push(await takeScreenshot(page, '09_create_modal', index));
    
    // 8. Selecionar tipo de webservice
    log(`  → Selecionando tipo: ${CONFIG.webserviceType}`, 'info');
    const dropdownSelected = await tryMultipleSelectors(page, SELECTORS.webserviceDropdown, 'select', CONFIG.webserviceType);
    if (!dropdownSelected) {
      // Tentar selecionar por texto se não funcionar por value
      await page.evaluate((type) => {
        const selects = document.querySelectorAll('select');
        for (const select of selects) {
          const options = Array.from(select.options);
          const option = options.find(opt => opt.text.includes(type));
          if (option) {
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
        return false;
      }, CONFIG.webserviceType);
    }
    await page.waitForTimeout(1000);
    screenshots.push(await takeScreenshot(page, '10_dropdown_selected', index));
    
    // 9. Preencher campo "Outros" (nome)
    log(`  → Preenchendo nome: ${CONFIG.webserviceName}`, 'info');
    const outrosFilled = await tryMultipleSelectors(page, SELECTORS.outrosInput, 'type', CONFIG.webserviceName);
    if (!outrosFilled) {
      throw new Error('Não foi possível encontrar campo "Outros"');
    }
    screenshots.push(await takeScreenshot(page, '11_name_filled', index));
    
    // 10. Clicar em Salvar
    log(`  → Clicando em Salvar`, 'info');
    const saveClicked = await tryMultipleSelectors(page, SELECTORS.saveButton, 'click');
    if (!saveClicked) {
      throw new Error('Não foi possível encontrar botão Salvar');
    }
    
    // Aguardar token aparecer (CRÍTICO!)
    await page.waitForTimeout(5000); // Aumentar tempo de espera
    screenshots.push(await takeScreenshot(page, '12_token_generated', index));
    
    // 11. Extrair token (tentar múltiplas vezes)
    log(`  → Extraindo token`, 'info');
    let token = null;
    
    // Tentar extrair até 5 vezes com delays
    for (let attempt = 1; attempt <= 5; attempt++) {
      token = await extractToken(page);
      if (token && token.length > 20) {
        log(`  ✓ Token extraído com sucesso na tentativa ${attempt}: ${token.substring(0, 30)}...`, 'success');
        break;
      }
      if (attempt < 5) {
        log(`  → Tentativa ${attempt} falhou, aguardando mais tempo...`, 'warning');
        await page.waitForTimeout(2000);
        await takeScreenshot(page, `12_token_attempt_${attempt}`, index);
      }
    }
    
    if (!token || token.length < 20) {
      // Última tentativa: buscar no texto completo da página
      log(`  → Última tentativa: buscando token no texto completo da página`, 'warning');
      const pageText = await page.evaluate(() => document.body.innerText || document.body.textContent);
      const tokenMatch = pageText.match(TOKEN_PATTERN);
      if (tokenMatch && tokenMatch[0].length > 20) {
        token = tokenMatch[0];
        log(`  ✓ Token encontrado no texto da página!`, 'success');
      } else {
        throw new Error('Token não encontrado após múltiplas tentativas');
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    return {
      ...record,
      token: token,
      status: 'success',
      errorMessage: null,
      screenshots: screenshots.filter(s => s !== null),
      processedAt: new Date().toISOString(),
      duration: `${duration}s`
    };
    
  } catch (error) {
    log(`  ✗ Erro ao processar registro: ${error.message}`, 'error');
    
    // Retentativas para erros transitórios de sessão/página
    const retryable = /Protocol error|Session closed|Target closed|Página foi fechada|Navigation failed/i.test(error.message || '');
    if (attempt < 3 && retryable) {
      const backoffMs = 2000 * attempt;
      log(`  → Retentativa ${attempt}/3 após erro transitório. Aguardando ${backoffMs}ms...`, 'warning');
      await new Promise(r => setTimeout(r, backoffMs));
      return await processRecord(browser, record, index, total, attempt + 1);
    }
    
    // Tentar tirar screenshot apenas se página ainda estiver aberta - com tratamento robusto
    try {
      if (page) {
        try {
          const isClosed = page.isClosed();
          if (!isClosed) {
            await takeScreenshot(page, 'ERROR', index).catch(() => {
              // Ignorar erro de screenshot
            });
          }
        } catch (checkError) {
          // Ignorar erro ao verificar se página está fechada
        }
      }
    } catch (screenshotError) {
      // Ignorar completamente qualquer erro de screenshot
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    return {
      ...record,
      token: null,
      status: 'error',
      errorMessage: error.message,
      screenshots: screenshots.filter(s => s !== null),
      processedAt: new Date().toISOString(),
      duration: `${duration}s`
    };
  } finally {
    // Fechar página apenas se ainda estiver aberta - com tratamento MUITO robusto
    try {
      if (page) {
        // Verificar se página está fechada antes de tentar fechar
        try {
          const isClosed = page.isClosed();
          if (!isClosed) {
            await page.close().catch(() => {
              // Ignorar erro se página já foi fechada
            });
          }
        } catch (checkError) {
          // Se isClosed() lançar erro, página provavelmente já está fechada
          // Não fazer nada
        }
      }
    } catch (closeError) {
      // Ignorar completamente qualquer erro ao fechar página
      // Página pode já estar fechada ou browser desconectado
    }
    
    // Delay entre registros
    if (index < total - 1) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenRecords));
    }
  }
}

// Gerar SQL
async function generateSQL(results) {
  log(`\nGerando SQL para ${results.length} registros`, 'info');
  
  const sqlLines = [
    '-- SQL gerado automaticamente para inserção de tokens F360',
    '-- Gerado em: ' + new Date().toISOString(),
    '',
    '-- Limpar tokens existentes (opcional)',
    '-- DELETE FROM f360_config;',
    '',
    '-- Inserir/atualizar tokens',
    ''
  ];
  
  let successCount = 0;
  
  for (const result of results) {
    if (result.status === 'success' && result.token) {
      // CNPJ é opcional, mas preferível para o SQL
      if (result.cnpj) {
        // Limpar CNPJ (remover caracteres especiais)
        const cleanCnpj = result.cnpj.replace(/[^\d]/g, '');
        const empresaSqlValue = result.empresa ? `'${String(result.empresa).replace(/'/g, "''")}'` : 'NULL';
        // Preferir incluir company_name; se a coluna não existir, o DBA pode remover essa coluna do statement
        sqlLines.push(`INSERT INTO f360_config (company_cnpj, company_name, api_key, is_active, created_at, updated_at)`);
        sqlLines.push(`VALUES (`);
        sqlLines.push(`  '${cleanCnpj}',`);
        sqlLines.push(`  ${empresaSqlValue},`);
        sqlLines.push(`  '${result.token}',`);
        sqlLines.push(`  true,`);
        sqlLines.push(`  NOW(),`);
        sqlLines.push(`  NOW()`);
        sqlLines.push(`)`);
        sqlLines.push(`ON CONFLICT (company_cnpj)`);
        sqlLines.push(`DO UPDATE SET`);
        sqlLines.push(`  api_key = EXCLUDED.api_key,`);
        sqlLines.push(`  company_name = COALESCE(EXCLUDED.company_name, f360_config.company_name),`);
        sqlLines.push(`  is_active = true,`);
        sqlLines.push(`  updated_at = NOW();`);
        sqlLines.push('');
      } else {
        // Se não tiver CNPJ, gerar SQL sem CNPJ (será necessário ajustar manualmente)
        sqlLines.push(`-- ATENÇÃO: Token sem CNPJ - ajustar manualmente`);
        sqlLines.push(`-- Login: ${result.login}`);
        if (result.empresa) sqlLines.push(`-- Empresa: ${String(result.empresa).replace(/'/g, "''")}`);
        sqlLines.push(`INSERT INTO f360_config (company_cnpj, company_name, api_key, is_active, created_at, updated_at)`);
        sqlLines.push(`VALUES (`);
        sqlLines.push(`  'CNPJ_AQUI', -- ADICIONAR CNPJ MANUALMENTE`);
        sqlLines.push(`  ${result.empresa ? `'${String(result.empresa).replace(/'/g, "''")}'` : 'NULL'},`);
        sqlLines.push(`  '${result.token}',`);
        sqlLines.push(`  true,`);
        sqlLines.push(`  NOW(),`);
        sqlLines.push(`  NOW()`);
        sqlLines.push(`);`);
        sqlLines.push('');
      }
      
      successCount++;
    }
  }
  
  const sqlContent = sqlLines.join('\n');
  const sqlPath = path.join(CONFIG.outputDir, 'insert-f360-config.sql');
  await fs.writeFile(sqlPath, sqlContent);
  
  log(`SQL gerado: ${sqlPath}`, 'success');
  log(`Total de INSERTs: ${successCount}`, 'info');
  
  return sqlPath;
}

// Salvar erros separadamente
async function saveErrors(results) {
  const errors = results.filter(r => r.status === 'error');
  const errorsPath = path.join(CONFIG.outputDir, 'errors.json');
  await fs.writeJson(errorsPath, errors, { spaces: 2 });
  log(`Erros salvos: ${errorsPath} (${errors.length} erros)`, errors.length > 0 ? 'warning' : 'success');
}

// Função principal
async function main() {
  try {
    log('='.repeat(60), 'info');
    log('F360 Token Generator - Iniciando', 'info');
    log(`Modo: ${CONFIG.testMode ? 'TESTE' : 'PRODUÇÃO'}`, CONFIG.testMode ? 'warning' : 'info');
    log('='.repeat(60), 'info');
    
    // Criar diretórios
    await fs.ensureDir(CONFIG.outputDir);
    await fs.ensureDir(CONFIG.screenshotsDir);
    
    // Ler CSV
    const records = await readCSV();
    
    if (records.length === 0) {
      throw new Error('Nenhum registro encontrado no CSV');
    }
    
    // Ajustar maxConcurrent baseado em headless
    const effectiveMaxConcurrent = CONFIG.headless ? CONFIG.maxConcurrent : 1;
    log(`\nIniciando ${effectiveMaxConcurrent} browser(s) paralelo(s) (headless: ${CONFIG.headless})`, 'info');
    const browsers = [];
    for (let i = 0; i < effectiveMaxConcurrent; i++) {
      const browser = await puppeteer.launch({
        headless: 'new', // Novo modo headless mais estável
        protocolTimeout: 300000, // 5 minutos (aumentado para evitar "Target.createTarget timed out")
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-zygote',
          '--single-process'
        ]
      });
      browsers.push(browser);
      log(`  Browser ${i + 1}/${effectiveMaxConcurrent} iniciado`, 'info');
    }
    
    const startTime = Date.now();
    
    // Processar registros em lotes de CONFIG.batchSize
    const allResults = [];
    const totalRecords = records.length;
    const totalBatches = Math.ceil(totalRecords / CONFIG.batchSize);
    
    log(`\nProcessando ${totalRecords} registros em ${totalBatches} lotes de ${CONFIG.batchSize}`, 'info');
    
    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
      const batchStart = batchNum * CONFIG.batchSize;
      const batchEnd = Math.min(batchStart + CONFIG.batchSize, totalRecords);
      const batchRecords = records.slice(batchStart, batchEnd);
      
      log(`\n${'='.repeat(60)}`, 'info');
      log(`LOTE ${batchNum + 1}/${totalBatches} - Registros ${batchStart + 1} a ${batchEnd}`, 'info');
      log(`${'='.repeat(60)}`, 'info');
      
      // Processar lote
      const batchResults = await processInParallel(browsers, batchRecords, effectiveMaxConcurrent, batchStart);
      allResults.push(...batchResults);
      
      // Salvar tokens do lote no banco
      log(`\nSalvando tokens do lote ${batchNum + 1} no banco de dados...`, 'info');
      try {
        await saveTokensToDatabase(batchResults);
      } catch (error) {
        log(`Erro ao salvar lote no banco: ${error.message}`, 'error');
        log(`Os tokens serão salvos no SQL ao final`, 'warning');
      }
      
      // Salvar progresso geral
      const progressPath = path.join(CONFIG.outputDir, 'f360-tokens-progress.json');
      await fs.writeJson(progressPath, allResults, { spaces: 2 });
      
      log(`\nLote ${batchNum + 1}/${totalBatches} concluído. Total processado: ${allResults.length}/${totalRecords}`, 'success');
      
      // Delay entre lotes (exceto no último)
      if (batchNum < totalBatches - 1) {
        log(`Aguardando 5 segundos antes do próximo lote...`, 'info');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    const results = allResults;
    
    // Fechar todos os browsers
    log(`\nFechando ${browsers.length} browsers...`, 'info');
    await Promise.all(browsers.map(browser => browser.close()));
    
    // Salvar resultados finais
    const resultsPath = path.join(CONFIG.outputDir, 'f360-tokens-extracted.json');
    await fs.writeJson(resultsPath, results, { spaces: 2 });
    log(`\nResultados salvos: ${resultsPath}`, 'success');
    
    // Salvar erros separadamente
    await saveErrors(results);
    
    // Gerar SQL
    await generateSQL(results);
    
    // Estatísticas finais
    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    log('\n' + '='.repeat(60), 'info');
    log('PROCESSAMENTO CONCLUÍDO', 'success');
    log('='.repeat(60), 'info');
    log(`Total processado: ${results.length}`, 'info');
    log(`Sucessos: ${successCount}`, 'success');
    log(`Erros: ${errorCount}`, errorCount > 0 ? 'error' : 'success');
    log(`Tempo total: ${totalTime} minutos`, 'info');
    log(`Taxa de sucesso: ${((successCount / results.length) * 100).toFixed(1)}%`, 'info');
    log('='.repeat(60), 'info');
    
  } catch (error) {
    log(`\nERRO FATAL: ${error.message}`, 'error');
    log(error.stack, 'error');
    process.exit(1);
  } finally {
    if (logStream) {
      logStream.end();
    }
  }
}

// Executar
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Erro fatal:'), error);
    process.exit(1);
  });
}

module.exports = { main, processRecord, extractToken };

