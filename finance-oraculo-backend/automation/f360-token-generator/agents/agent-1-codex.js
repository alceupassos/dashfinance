/* eslint-disable no-console */
/**
 * AGENTE 1: CODEX
 * Estratégia: Técnica e direta - busca por seletores CSS precisos e coordenadas XY
 * Foco: Eficiência e precisão técnica
 */
const fs = require('fs-extra');
const path = require('path');
const csv = require('csv-parser');
const puppeteer = require('puppeteer');
const chalk = require('chalk');

const CONFIG = {
  csvPath: '/tmp/F360_Lista_Acessos_COMPLETA.csv',
  outputDir: path.resolve(__dirname, '../output/agents_codex'),
  f360Url: 'https://financas.f360.com.br',
  headless: true,
  maxToProcess: 1, // MODO ESTRITO: apenas 1 registro até conseguir token
  offset: 0, // SEMPRE o primeiro registro
  retries: Number(process.env.RETRIES || 30), // Muitas tentativas no mesmo registro
  protocolTimeout: 300000
};

function log(msg, level = 'info') {
  const prefix = {
    info: chalk.blue('[CODEX]'),
    success: chalk.green('[CODEX] ✓'),
    warning: chalk.yellow('[CODEX] ⚠'),
    error: chalk.red('[CODEX] ✗')
  }[level] || chalk.blue('[CODEX]');
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
    log('📍 [CODEX] Passo 0.1: Navegando para página de login...', 'info');
    await page.goto(CONFIG.f360Url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000); // Aguardar página carregar
    log('📍 [CODEX] Passo 0.2: Página carregada, buscando campo de email...', 'info');
    
    // Tentar múltiplos seletores para email
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[id="email"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="e-mail" i]',
      'input[type="text"]'
    ];
    
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
    log('📍 [CODEX] Passo 0.3: Email preenchido, buscando campo de senha...', 'info');
    
    // Campo de senha
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    await page.type('input[type="password"]', record.senha);
    log('📍 [CODEX] Passo 0.4: Senha preenchida, clicando em login...', 'info');
    
    // Botão de login - usar evaluate para ser mais robusto
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
    log('📍 [CODEX] Passo 0.5: Login realizado, navegando para /Webservice...', 'info');
    
    // Ir direto para /Webservice
    await page.goto(`${CONFIG.f360Url}/Webservice`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000); // Mais tempo para carregar
    log('📍 [CODEX] Passo 0.6: Chegou em /Webservice, verificando página...', 'info');
    
    // Screenshot para debug
    await page.screenshot({ path: `/tmp/f360-debug-webservice-${Date.now()}.png`, fullPage: true });
    log('📸 Screenshot salvo para debug', 'info');
    
    // Verificar o que realmente está na página
    const pageInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        hasSidebar: !!document.querySelector('aside, nav, [class*="sidebar"]'),
        allButtons: Array.from(document.querySelectorAll('button, a, [role="button"]')).map(btn => ({
          text: (btn.textContent || '').trim().substring(0, 50),
          left: btn.getBoundingClientRect().left,
          bottom: btn.getBoundingClientRect().bottom,
          visible: btn.offsetParent !== null
        })).filter(btn => btn.text.includes('CRIAR') || btn.text.includes('+')),
        bodyText: document.body.innerText.substring(0, 500)
      };
    });
    log(`🔍 [CODEX] Página: ${pageInfo.url}`, 'info');
    log(`🔍 [CODEX] Sidebar encontrado: ${pageInfo.hasSidebar}`, 'info');
    log(`🔍 [CODEX] Botões com "CRIAR": ${pageInfo.allButtons.length}`, 'info');
    if (pageInfo.allButtons.length > 0) {
      log(`🔍 [CODEX] Primeiro botão: "${pageInfo.allButtons[0].text}" (left: ${pageInfo.allButtons[0].left}, bottom: ${pageInfo.allButtons[0].bottom})`, 'info');
    }
    
    // Scroll para baixo para garantir que tudo está visível
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);
    
    // ESTRATÉGIA CODEX: XY primeiro, depois seletores precisos
    log('═══════════════════════════════════════', 'info');
    log('🎯 [CODEX] INICIANDO ESTRATÉGIA: XY + CSS', 'info');
    log('═══════════════════════════════════════', 'info');
    let clicked = false;
    
    // 1. XY direto (canto inferior esquerdo) - EXPANDIDO
    log('📍 [CODEX] Passo 1/2: Tentando XY no canto inferior esquerdo (área expandida)...', 'info');
    log('⏱️  [CODEX] Calculando coordenadas XY expandidas...', 'info');
    const coords = await page.evaluate(() => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      // Área MUITO maior: X de 0 até 400px, Y do meio até o final
      const xs = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 250, 300, 350, 400];
      const ys = [vh - 20, vh - 40, vh - 60, vh - 80, vh - 100, vh - 120, vh - 140, vh - 160, vh * 0.8, vh * 0.7, vh * 0.6];
      return xs.flatMap(x => ys.map(y => ({ x, y })));
    });
    log(`⏱️  [CODEX] ${coords.length} coordenadas calculadas, testando cada uma...`, 'info');
    
    for (let i = 0; i < coords.length; i++) {
      const pt = coords[i];
      log(`📍 [CODEX] Testando coordenada ${i + 1}/${coords.length}: (${pt.x}, ${pt.y})`, 'info');
      await page.mouse.move(pt.x, pt.y);
      await page.mouse.click(pt.x, pt.y, { delay: 100 });
      await page.waitForTimeout(1500);
      const hasModal = await page.evaluate(() => {
        const hasSelect = !!document.querySelector('select');
        const hasInputs = document.querySelectorAll('input[type="text"], textarea').length > 0;
        const hasSave = Array.from(document.querySelectorAll('button, [role="button"]')).some(el => 
          /salvar/i.test((el.textContent || '').toLowerCase())
        );
        return hasSelect && (hasInputs || hasSave);
      });
      if (hasModal) {
        clicked = true;
        log(`✅ [CODEX] XY funcionou! (${pt.x}, ${pt.y})`, 'success');
        break;
      }
    }
    
    // 2. Seletores CSS precisos (usando evaluate para buscar por texto)
    if (!clicked) {
      log('📍 [CODEX] Passo 2/2: Tentando seletores CSS precisos...', 'info');
      clicked = await page.evaluate(() => {
        // Buscar botão por texto
        const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
        const criarBtn = buttons.find(btn => {
          const text = (btn.textContent || '').trim().toUpperCase();
          return text.includes('+ CRIAR') || text.includes('CRIAR');
        });
        if (criarBtn) {
          criarBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
          criarBtn.click();
          return true;
        }
        return false;
      });
      if (clicked) {
        await page.waitForTimeout(2000);
        log('Botão encontrado por texto!', 'success');
      }
    }
    
    if (!clicked) {
      log('❌ [CODEX] ESTRATÉGIA FALHOU: Botão "+ CRIAR" não encontrado', 'error');
      throw new Error('Botão "+ CRIAR" não encontrado');
    }
    log('✅ [CODEX] ESTRATÉGIA FUNCIONOU! Botão clicado com sucesso!', 'success');
    
    // Preencher formulário
    log('Preenchendo formulário...', 'info');
    await page.evaluate(() => {
      const select = document.querySelector('select');
      if (select) {
        const options = Array.from(select.options);
        const apiOption = options.find(opt => opt.text.includes('API Pública') || opt.text.includes('F360'));
        if (apiOption) select.value = apiOption.value;
      }
    });
    await page.waitForTimeout(1000);
    
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
      if (inputs.length > 0) inputs[0].value = 'TORRE';
    });
    await page.waitForTimeout(1000);
    
    // Clicar em Salvar
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
      const salvarBtn = buttons.find(btn => {
        const text = (btn.textContent || '').trim().toUpperCase();
        return text.includes('SALVAR') || text === 'SALVAR';
      });
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
    log(`❌ [CODEX] ERRO em ${record.login}: ${error.message}`, 'error');
    log(`📍 [CODEX] Stack: ${error.stack?.split('\n')[0]}`, 'error');
    return { ...record, token: null, status: 'error', errorMessage: error.message };
  } finally {
    try {
      await page.close();
    } catch (e) {}
  }
}

async function main() {
  await fs.ensureDir(CONFIG.outputDir);
  const records = await readCSV();
  const firstRecord = records[0]; // SEMPRE o primeiro registro
  
  if (!firstRecord) {
    log('Nenhum registro encontrado no CSV', 'error');
    return;
  }
  
  log(`🎯 MODO ESTRITO: Tentando obter token para ${firstRecord.login}`, 'info');
  log(`📋 Total de registros no CSV: ${records.length}`, 'info');
  log(`🔄 Máximo de tentativas: ${CONFIG.retries}`, 'info');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    protocolTimeout: CONFIG.protocolTimeout,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  let result = null;
  let attempt = 0;
  
  // MODO ESTRITO: tenta até conseguir token ou esgotar tentativas
  while (attempt < CONFIG.retries && (!result || !result.token)) {
    attempt++;
    log(`\n🔄 Tentativa ${attempt}/${CONFIG.retries}`, 'info');
    
    result = await processRecord(browser, firstRecord, 0, 1);
    
    if (result.token) {
      log(`\n🎉🎉🎉 SUCESSO! Token obtido na tentativa ${attempt}! 🎉🎉🎉`, 'success');
      log(`Token: ${result.token.substring(0, 30)}...`, 'success');
      await fs.writeJSON(path.join(CONFIG.outputDir, `token_codex.json`), result, { spaces: 2 });
      break;
    } else {
      const backoff = Math.min(2000 * attempt, 30000); // Backoff até 30s
      log(`❌ Sem token. Aguardando ${backoff}ms antes de tentar novamente...`, 'warning');
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

