/* eslint-disable no-console */
/**
 * AGENTE ULTRA AGRESSIVO
 * Testa TODAS as coordenadas possíveis na área esquerda
 * Não para até encontrar o botão ou testar tudo
 */
const fs = require('fs-extra');
const path = require('path');
const csv = require('csv-parser');
const puppeteer = require('puppeteer');
const chalk = require('chalk');

const CONFIG = {
  csvPath: '/tmp/F360_Lista_Acessos_COMPLETA.csv',
  outputDir: path.resolve(__dirname, '../output/agents_ultra'),
  f360Url: 'https://financas.f360.com.br',
  headless: true,
  protocolTimeout: 300000
};

function log(msg, level = 'info') {
  const prefix = {
    info: chalk.cyan('[ULTRA]'),
    success: chalk.green('[ULTRA] ✓'),
    warning: chalk.yellow('[ULTRA] ⚠'),
    error: chalk.red('[ULTRA] ✗')
  }[level] || chalk.cyan('[ULTRA]');
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

async function processRecord(browser, record) {
  const page = await browser.newPage();
  try {
    log(`Processando: ${record.login}`);
    
    // Login
    await page.goto(CONFIG.f360Url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    const emailSelectors = ['input[type="email"]', 'input[name="email"]', 'input[id="email"]', 'input[placeholder*="email" i]', 'input[type="text"]'];
    let emailFound = false;
    for (const selector of emailSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        await page.type(selector, record.login);
        emailFound = true;
        break;
      } catch (e) {}
    }
    if (!emailFound) throw new Error('Email não encontrado');
    
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    await page.type('input[type="password"]', record.senha);
    
    await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"]') || 
                 Array.from(document.querySelectorAll('button')).find(b => 
                   (b.textContent || '').toUpperCase().includes('ENTRAR') || 
                   (b.textContent || '').toUpperCase().includes('LOGIN')
                 );
      if (btn) btn.click();
    });
    await page.waitForTimeout(10000);
    
    // Ir para /Webservice
    await page.goto(`${CONFIG.f360Url}/Webservice`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(8000); // Mais tempo
    
    // Screenshot
    await page.screenshot({ path: `/tmp/f360-ultra-${Date.now()}.png`, fullPage: true });
    
    // ESTRATÉGIA ULTRA AGRESSIVA: Testar TODAS as coordenadas na área esquerda
    log('🔥 TESTANDO TODAS AS COORDENADAS POSSÍVEIS...', 'info');
    const coords = await page.evaluate(() => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      // ÁREA GIGANTE: X de 0 até 600px, Y de 50% até o final
      const xs = [];
      for (let x = 0; x <= 600; x += 20) xs.push(x);
      const ys = [];
      for (let y = vh * 0.5; y <= vh; y += 20) ys.push(y);
      return xs.flatMap(x => ys.map(y => ({ x, y })));
    });
    
    log(`📊 Total de coordenadas: ${coords.length}`, 'info');
    
    for (let i = 0; i < coords.length; i++) {
      const pt = coords[i];
      if (i % 50 === 0) log(`Testando ${i}/${coords.length}...`, 'info');
      
      try {
        await page.mouse.move(pt.x, pt.y);
        await page.mouse.click(pt.x, pt.y, { delay: 50 });
        await page.waitForTimeout(800);
        
        const hasModal = await page.evaluate(() => {
          return !!document.querySelector('select') && 
                 document.querySelectorAll('input[type="text"], textarea').length > 0;
        });
        
        if (hasModal) {
          log(`🎉🎉🎉 ENCONTROU! Coordenada: (${pt.x}, ${pt.y}) 🎉🎉🎉`, 'success');
          
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
          await page.waitForTimeout(5000);
          
          // Extrair token
          const token = await page.evaluate(() => {
            const text = document.body.innerText;
            const match = text.match(/[A-Za-z0-9_\-]{24,}/);
            return match ? match[0] : null;
          });
          
          if (token) {
            log(`✅ TOKEN ENCONTRADO: ${token.substring(0, 30)}...`, 'success');
            return { ...record, token, status: 'success' };
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    throw new Error('Nenhuma coordenada funcionou');
    
  } catch (error) {
    log(`Erro: ${error.message}`, 'error');
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
    log('Nenhum registro encontrado', 'error');
    return;
  }
  
  log(`🎯 TESTANDO: ${firstRecord.login}`, 'info');
  log(`🔥 MODO ULTRA AGRESSIVO: Testando TODAS as coordenadas possíveis`, 'info');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    protocolTimeout: CONFIG.protocolTimeout,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  let attempt = 0;
  let result = null;
  
  while (attempt < 5 && (!result || !result.token)) {
    attempt++;
    log(`\n🔄 Tentativa ${attempt}/5`, 'info');
    result = await processRecord(browser, firstRecord);
    
    if (result.token) {
      log(`\n🎉🎉🎉 SUCESSO NA TENTATIVA ${attempt}! 🎉🎉🎉`, 'success');
      await fs.writeJSON(path.join(CONFIG.outputDir, `token_ultra.json`), result, { spaces: 2 });
      break;
    }
    
    await new Promise(r => setTimeout(r, 5000));
  }
  
  await browser.close();
  
  if (result && result.token) {
    log(`\n✅ TOKEN OBTIDO!`, 'success');
  } else {
    log(`\n❌ FALHOU`, 'error');
  }
}

main().catch(console.error);

