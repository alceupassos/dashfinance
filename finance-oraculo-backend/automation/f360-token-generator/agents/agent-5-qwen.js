/* eslint-disable no-console */
/**
 * AGENTE 5: QWEN
 * Estratégia: Agressiva - tenta tudo, múltiplos métodos, sem filtros rígidos
 * Foco: Cobertura máxima, tentar todas as possibilidades
 */
const fs = require('fs-extra');
const path = require('path');
const csv = require('csv-parser');
const puppeteer = require('puppeteer');
const chalk = require('chalk');

const CONFIG = {
  csvPath: '/tmp/F360_Lista_Acessos_COMPLETA.csv',
  outputDir: path.resolve(__dirname, '../output/agents_qwen'),
  f360Url: 'https://financas.f360.com.br',
  headless: true,
  maxToProcess: 1,
  offset: 0,
  retries: Number(process.env.RETRIES || 30),
  protocolTimeout: 300000
};

function log(msg, level = 'info') {
  const prefix = {
    info: chalk.red('[QWEN]'),
    success: chalk.green('[QWEN] ✓'),
    warning: chalk.yellow('[QWEN] ⚠'),
    error: chalk.red('[QWEN] ✗')
  }[level] || chalk.red('[QWEN]');
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
    
    // ESTRATÉGIA QWEN: Agressiva - tenta tudo
    log('═══════════════════════════════════════', 'info');
    log('🎯 [QWEN] INICIANDO ESTRATÉGIA: Busca agressiva em TODOS elementos', 'info');
    log('═══════════════════════════════════════', 'info');
    log('🔍 [QWEN] Buscando em TODOS os elementos (*) com critérios amplos...', 'info');
    log('⏱️  [QWEN] Iniciando evaluate (busca em TODOS elementos pode demorar)...', 'info');
    const startTime = Date.now();
    const clicked = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));
      
      // Filtrar por múltiplos critérios simultaneamente (critérios amplos)
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
    const duration = Date.now() - startTime;
    log(`⏱️  [QWEN] Evaluate concluído em ${duration}ms`, 'info');
    
    if (!clicked) {
      log('❌ [QWEN] ESTRATÉGIA FALHOU: Nenhuma estratégia agressiva funcionou', 'error');
      throw new Error('Nenhuma estratégia agressiva funcionou');
    }
    log('✅ [QWEN] ESTRATÉGIA FUNCIONOU! Busca agressiva encontrou o botão!', 'success');
    
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
      await fs.writeJSON(path.join(CONFIG.outputDir, `token_qwen.json`), result, { spaces: 2 });
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

