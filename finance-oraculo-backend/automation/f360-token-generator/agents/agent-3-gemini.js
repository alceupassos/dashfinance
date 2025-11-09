/* eslint-disable no-console */
/**
 * AGENTE 3: GEMINI
 * Estratégia: Múltiplas abordagens simultâneas - tenta várias estratégias em paralelo
 * Foco: Abrangência e redundância
 */
const fs = require('fs-extra');
const path = require('path');
const csv = require('csv-parser');
const puppeteer = require('puppeteer');
const chalk = require('chalk');

const CONFIG = {
  csvPath: '/tmp/F360_Lista_Acessos_COMPLETA.csv',
  outputDir: path.resolve(__dirname, '../output/agents_gemini'),
  f360Url: 'https://financas.f360.com.br',
  headless: true,
  maxToProcess: 1,
  offset: 0,
  retries: Number(process.env.RETRIES || 30),
  protocolTimeout: 300000
};

function log(msg, level = 'info') {
  const prefix = {
    info: chalk.magenta('[GEMINI]'),
    success: chalk.green('[GEMINI] ✓'),
    warning: chalk.yellow('[GEMINI] ⚠'),
    error: chalk.red('[GEMINI] ✗')
  }[level] || chalk.magenta('[GEMINI]');
  console.log(`${prefix} ${msg}`);
}

async function readCSV() {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(CONFIG.csvPath)
      .pipe(csv())
      .on('data', (row) => {
        const login = (row.Login || row.login || '').trim();
        const senha = (row.Senha || row.senha || '').trim();
        const cnpj = (row.CNPJ || row.cnpj || '').trim();
        const empresa = (row.Empresa || row.empresa || '').trim();
        if (login && senha) rows.push({ login, senha, cnpj, empresa });
      })
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

async function processRecord(browser, record, index, total) {
  const page = await browser.newPage();
  try {
    log(`[${index + 1}/${total}] ${record.login}`);
    
    // Login - busca robusta do campo de email
    await page.goto(CONFIG.f360Url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    const emailSelectors = ['input[type="email"]', 'input[name="email"]', 'input[id="email"]', 'input[placeholder*="email" i]', 'input[placeholder*="e-mail" i]', 'input[type="text"]'];
    let emailFound = false;
    for (const selector of emailSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        await page.type(selector, record.login);
        emailFound = true;
        break;
      } catch (e) {}
    }
    if (!emailFound) throw new Error('Campo de email não encontrado');
    
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    await page.type('input[type="password"]', record.senha);
    await page.evaluate(() => {
      const submitBtn = document.querySelector('button[type="submit"]') || 
                       document.querySelector('button.btn-primary') ||
                       Array.from(document.querySelectorAll('button')).find(btn => 
                         (btn.textContent || '').trim().toUpperCase().includes('ENTRAR') ||
                         (btn.textContent || '').trim().toUpperCase().includes('LOGIN')
                       );
      if (submitBtn) {
        submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        submitBtn.click();
      }
    });
    await page.waitForTimeout(8000);
    
    await page.goto(`${CONFIG.f360Url}/Webservice`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    // ESTRATÉGIA GEMINI: Múltiplas abordagens simultâneas
    log('═══════════════════════════════════════', 'info');
    log('🎯 [GEMINI] INICIANDO ESTRATÉGIA: 4 abordagens sequenciais', 'info');
    log('═══════════════════════════════════════', 'info');
    log('🔍 [GEMINI] Tentando 4 abordagens: posição → hierarquia → data-* → último sidebar', 'info');
    log('⏱️  [GEMINI] Iniciando evaluate (4 abordagens sequenciais)...', 'info');
    const startTime = Date.now();
    const clicked = await page.evaluate(() => {
      // Abordagem 1: Por posição absoluta
      const all = Array.from(document.querySelectorAll('*'));
      const byPos = all.find(el => {
        const rect = el.getBoundingClientRect();
        const text = (el.textContent || '').trim().toUpperCase();
        return text.includes('CRIAR') && rect.left < 300 && rect.bottom > window.innerHeight - 100;
      });
      if (byPos) { byPos.click(); return true; }
      
      // Abordagem 2: Por hierarquia DOM
      const navs = Array.from(document.querySelectorAll('nav, aside'));
      for (const nav of navs) {
        const buttons = Array.from(nav.querySelectorAll('button, a'));
        const found = buttons.find(btn => {
          const text = (btn.textContent || '').trim().toUpperCase();
          return text.includes('CRIAR') || text.includes('+');
        });
        if (found) { found.click(); return true; }
      }
      
      // Abordagem 3: Por atributos data-*
      const dataBtn = document.querySelector('[data-action*="create"], [data-action*="add"]');
      if (dataBtn) { dataBtn.click(); return true; }
      
      // Abordagem 4: Último elemento do sidebar
      const sidebar = document.querySelector('aside, nav');
      if (sidebar) {
        const children = Array.from(sidebar.children);
        const last = children[children.length - 1];
        if (last) {
          const buttons = Array.from(last.querySelectorAll('button, a'));
          const found = buttons.find(btn => {
            const text = (btn.textContent || '').trim().toUpperCase();
            return text.includes('CRIAR') || text.includes('+');
          });
          if (found) { found.click(); return true; }
        }
      }
      
      return false;
    });
    const duration = Date.now() - startTime;
    log(`⏱️  [GEMINI] Evaluate concluído em ${duration}ms`, 'info');
    
    if (!clicked) {
      log('❌ [GEMINI] ESTRATÉGIA FALHOU: Nenhuma das 4 abordagens funcionou', 'error');
      throw new Error('Nenhuma abordagem funcionou');
    }
    log('✅ [GEMINI] ESTRATÉGIA FUNCIONOU! Uma das 4 abordagens encontrou o botão!', 'success');
    
    await page.waitForTimeout(2000);
    
    // Preencher formulário
    await page.evaluate(() => {
      const select = document.querySelector('select');
      if (select) {
        const options = Array.from(select.options);
        const apiOption = options.find(opt => opt.text.includes('API Pública') || opt.text.includes('F360'));
        if (apiOption) select.value = apiOption.value;
      }
      const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
      if (inputs.length > 0) inputs[0].value = 'TORRE';
      const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
      const salvarBtn = buttons.find(btn => (btn.textContent || '').trim().toUpperCase().includes('SALVAR'));
      if (salvarBtn) salvarBtn.click();
    });
    await page.waitForTimeout(3000);
    
    // Extrair token
    const token = await page.evaluate(() => {
      const text = document.body.innerText;
      const match = text.match(/[A-Za-z0-9_\-]{24,}/);
      return match ? match[0] : null;
    });
    
    if (!token) throw new Error('Token não encontrado');
    
    log(`Token extraído: ${token.substring(0, 20)}...`, 'success');
    return { ...record, token, status: 'success' };
    
  } catch (error) {
    log(`${record.login}: ${error.message}`, 'error');
    return { ...record, token: null, status: 'error', errorMessage: error.message };
  } finally {
    await page.close();
  }
}

async function main() {
  await fs.ensureDir(CONFIG.outputDir);
  const records = await readCSV();
  const firstRecord = records[0];
  
  if (!firstRecord) {
    log('Nenhum registro encontrado no CSV', 'error');
    return;
  }
  
  log(`🎯 MODO ESTRITO: Tentando obter token para ${firstRecord.login}`, 'info');
  log(`🔄 Máximo de tentativas: ${CONFIG.retries}`, 'info');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    protocolTimeout: CONFIG.protocolTimeout,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  let result = null;
  let attempt = 0;
  
  while (attempt < CONFIG.retries && (!result || !result.token)) {
    attempt++;
    log(`\n🔄 Tentativa ${attempt}/${CONFIG.retries}`, 'info');
    
    result = await processRecord(browser, firstRecord, 0, 1);
    
    if (result.token) {
      log(`\n🎉🎉🎉 SUCESSO! Token obtido na tentativa ${attempt}! 🎉🎉🎉`, 'success');
      await fs.writeJSON(path.join(CONFIG.outputDir, `token_gemini.json`), result, { spaces: 2 });
      break;
    } else {
      const backoff = Math.min(2000 * attempt, 30000);
      log(`❌ Sem token. Aguardando ${backoff}ms...`, 'warning');
      await new Promise(r => setTimeout(r, backoff));
    }
  }
  
  await browser.close();
  
  if (result && result.token) {
    log(`\n✅ MISSÃO CUMPRIDA! Token obtido após ${attempt} tentativa(s)`, 'success');
  } else {
    log(`\n❌ FALHOU após ${CONFIG.retries} tentativas`, 'error');
  }
}

main().catch(console.error);

