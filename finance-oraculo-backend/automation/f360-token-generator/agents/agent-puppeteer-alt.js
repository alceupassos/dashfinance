/* eslint-disable no-console */
/**
 * Alternative Puppeteer agent with a simplified, resilient flow focused on:
 * - Minimal navigation waits (domcontentloaded)
 * - Direct jump to /Webservice after login
 * - Sidebar "+ CRIAR" click heuristics (bottom-left)
 * - Token extraction with retries
 *
 * This agent is intentionally self-contained for quick iteration,
 * without coupling to the main generator file.
 */
const fs = require('fs-extra');
const path = require('path');
const csv = require('csv-parser');
const puppeteer = require('puppeteer');
const chalk = require('chalk');

const CONFIG = {
  csvPath: '/tmp/F360_Lista_Acessos_COMPLETA.csv',
  outputDir: path.resolve(__dirname, '../output/agents_alt'),
  f360Url: 'https://financas.f360.com.br',
  headless: true,
  maxToProcess: Number(process.env.LIMIT || 10), // limit for quick runs; set LIMIT env to adjust
  offset: Number(process.env.OFFSET || 0),
  navigationTimeout: 60000,
  elementTimeout: 30000,
  tokenRegex: /[A-Za-z0-9_\-]{24,}/,
  webserviceName: 'TORRE',
  webserviceType: 'API Pública da F360'
};

function log(msg, level = 'info') {
  const prefix = {
    info: chalk.cyan('[ALT]'),
    success: chalk.green('[ALT]'),
    warning: chalk.yellow('[ALT]'),
    error: chalk.red('[ALT]')
  }[level] || chalk.cyan('[ALT]');
  console.log(`${prefix} ${msg}`);
}

async function readCSV() {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(CONFIG.csvPath)
      .pipe(csv())
      .on('data', (row) => {
        const login = (row.Login || row.login || row.EMAIL || '').trim();
        const senha = (row.Senha || row.senha || row.SENHA || '').trim();
        const cnpj = (row.CNPJ || row.cnpj || '').trim();
        const empresa = (row.Empresa || row.empresa || row['Razao Social'] || row['Razão Social'] || row['Nome Fantasia'] || row.Nome || '').trim();
        if (login && senha) rows.push({ login, senha, cnpj, empresa });
      })
      .on('end', () => resolve(rows))
      .on('error', (err) => reject(err));
  });
}

async function clickByText(page, texts) {
  return page.evaluate((labelList) => {
    function isVisible(el) {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return (
        style &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 2 &&
        rect.height > 2
      );
    }
    const labels = labelList.map((t) => t.toUpperCase());
    const candidates = Array.from(document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"], div, span'));
    for (const el of candidates) {
      const text = (el.textContent || el.value || el.innerText || '').trim().toUpperCase();
      if (!text) continue;
      if (labels.some((l) => text.includes(l)) && isVisible(el)) {
        try { el.click(); return true; } catch (e) {}
      }
    }
    return false;
  }, texts);
}

async function findAndClickSidebarCreate(page) {
  // Try strict sidebar bottom-left search first
  const clicked = await page.evaluate(() => {
    const within = document.querySelector('aside, nav, [class*="sidebar"], [id*="sidebar"]') || document.body;
    const all = Array.from(within.querySelectorAll('*'));
    const candidates = all.filter((el) => {
      const t = ((el.textContent || el.innerText || '').trim() || '').toUpperCase();
      if (!t) return false;
      if (!(t === '+ CRIAR' || t.includes('CRIAR') || t.includes('+'))) return false;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight, vw = window.innerWidth;
      const inLeft = rect.left < vw * 0.35;  // left area
      const inBottom = rect.bottom > vh * 0.65; // bottom area
      const visible = (() => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 20 && rect.height > 15;
      })();
      return inLeft && inBottom && visible;
    });
    if (candidates.length) {
      candidates.sort((a, b) => {
        const ra = a.getBoundingClientRect(); const rb = b.getBoundingClientRect();
        const da = Math.hypot((window.innerHeight - ra.bottom), ra.left);
        const db = Math.hypot((window.innerHeight - rb.bottom), rb.left);
        return da - db;
      });
      try { candidates[0].scrollIntoView({ behavior: 'smooth', block: 'center' }); candidates[0].click(); return true; } catch (e) {}
    }
    return false;
  });
  if (clicked) return true;
  // fallback to textual scan
  return await clickByText(page, ['+ CRIAR', 'CRIAR']);
}

async function extractToken(page) {
  // try structured elements
  const token = await page.evaluate((regexSource) => {
    const re = new RegExp(regexSource, 'g');
    const candidates = Array.from(document.querySelectorAll('code, pre, input, textarea, span, div'));
    for (const el of candidates) {
      const txt = (el.value || el.textContent || '').trim();
      if (!txt) continue;
      const m = txt.match(re);
      if (m && m[0] && m[0].length >= 24) return m[0];
    }
    return null;
  }, CONFIG.tokenRegex.source);
  if (token) return token;
  // fallback to full body text
  const bodyText = await page.evaluate(() => document.body.innerText || document.body.textContent || '');
  const m = bodyText.match(CONFIG.tokenRegex);
  return m && m[0] ? m[0] : null;
}

async function processOne(browser, record, idx, total) {
  const start = Date.now();
  const result = { ...record, index: idx + 1, token: null, status: 'error', errorMessage: null, durationSec: 0 };
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(CONFIG.navigationTimeout);
  page.setDefaultTimeout(CONFIG.elementTimeout);
  try {
    log(`[${idx + 1}/${total}] ${record.login}`);
    await page.goto(CONFIG.f360Url, { waitUntil: 'domcontentloaded', timeout: CONFIG.navigationTimeout });
    // email
    const emailFilled = await page.evaluate((email) => {
      const prefer = document.querySelector('input[type="email"], input[name*="email" i], input[id*="email" i]');
      const candidates = prefer ? [prefer] : Array.from(document.querySelectorAll('input'));
      for (const el of candidates) {
        const ph = (el.placeholder || '').toLowerCase();
        const nm = (el.name || '').toLowerCase();
        const id = (el.id || '').toLowerCase();
        if (ph.includes('email') || ph.includes('e-mail') || nm.includes('email') || id.includes('email') || nm.includes('login') || id.includes('login')) {
          el.focus(); el.value = email;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      return false;
    }, record.senha ? record.login : '');
    if (!emailFilled) throw new Error('Campo email não encontrado');
    // password
    const passFilled = await page.evaluate((pwd) => {
      const prefer = document.querySelector('input[type="password"]');
      const candidates = prefer ? [prefer] : Array.from(document.querySelectorAll('input[type="password"], input'));
      for (const el of candidates) {
        const ph = (el.placeholder || '').toLowerCase();
        const nm = (el.name || '').toLowerCase();
        const id = (el.id || '').toLowerCase();
        if (el.type === 'password' || ph.includes('senha') || nm.includes('senha') || id.includes('senha') || ph.includes('password')) {
          el.focus(); el.value = pwd;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      return false;
    }, record.senha);
    if (!passFilled) throw new Error('Campo senha não encontrado');
    // login click
    const clickedLogin = await clickByText(page, ['entrar', 'acessar', 'login']);
    if (!clickedLogin) throw new Error('Botão login não encontrado');
    await page.waitForTimeout(6000);

    // jump to Webservice
    try {
      await page.goto(`${CONFIG.f360Url}/Webservice`, { waitUntil: 'domcontentloaded', timeout: CONFIG.navigationTimeout });
      await page.waitForTimeout(2500);
    } catch {}

    // "+ CRIAR"
  let criarOk = await findAndClickSidebarCreate(page);
  if (!criarOk) {
    // XY fallback: hotspots no canto inferior esquerdo
    try {
      const pts = await page.evaluate(() => {
        const vh = window.innerHeight, vw = window.innerWidth;
        const xs = [24, 56, 88, 120, 152];
        const ys = [vh - 24, vh - 56, vh - 88];
        const arr = [];
        xs.forEach(x => ys.forEach(y => arr.push({x, y})));
        return arr;
      });
      for (const p of pts) {
        await page.mouse.move(p.x, p.y);
        await page.mouse.click(p.x, p.y, { delay: 40 });
        await page.waitForTimeout(700);
        const opened = await page.evaluate(() => {
          const hasSelect = !!document.querySelector('select');
          const hasInputs = Array.from(document.querySelectorAll('input, textarea')).length > 0;
          const hasSave = Array.from(document.querySelectorAll('button, a, [role=\"button\"]')).some(el => /salvar/i.test((el.textContent||'').toLowerCase()));
          return (hasSelect && hasInputs) || hasSave;
        });
        if (opened) { criarOk = true; break; }
      }
    } catch (_) {}
  }
    if (!criarOk) throw new Error('Botão "+ CRIAR" não encontrado');
    await page.waitForTimeout(1500);

    // select type
    await page.evaluate((typeText) => {
      const selects = Array.from(document.querySelectorAll('select'));
      for (const s of selects) {
        const opt = Array.from(s.options).find(o => (o.text || '').includes(typeText));
        if (opt) {
          s.value = opt.value;
          s.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      return false;
    }, CONFIG.webserviceType);
    await page.waitForTimeout(600);

    // name "Outros"
    await page.evaluate((nameValue) => {
      const inputs = Array.from(document.querySelectorAll('input, textarea'));
      const target = inputs.find(el => {
        const lbl = (el.getAttribute('name') || '').toLowerCase();
        const id = (el.id || '').toLowerCase();
        const ph = (el.placeholder || '').toLowerCase();
        return ['outros', 'nome', 'name'].some(k => lbl.includes(k) || id.includes(k) || ph.includes(k));
      }) || inputs[0];
      if (target) {
        target.focus(); target.value = nameValue;
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    }, CONFIG.webserviceName);
    await page.waitForTimeout(400);

    // save
    const saveClicked = await clickByText(page, ['salvar', 'gravar', 'save']);
    if (!saveClicked) throw new Error('Botão Salvar não encontrado');

    // token
    let token = null;
    for (let i = 1; i <= 5; i++) {
      await page.waitForTimeout(1200 * i);
      token = await extractToken(page);
      if (token) break;
    }
    if (!token) throw new Error('Token não encontrado');

    result.token = token;
    result.status = 'success';
    result.durationSec = Math.round((Date.now() - start) / 1000);
    log(`✓ Token extraído (${result.durationSec}s): ${token.slice(0, 12)}...`, 'success');
    return result;
  } catch (err) {
    result.errorMessage = err.message;
    result.durationSec = Math.round((Date.now() - start) / 1000);
    log(`✗ ${record.login}: ${err.message}`, 'error');
    return result;
  } finally {
    try { if (page && !page.isClosed()) await page.close(); } catch {}
  }
}

async function main() {
  await fs.ensureDir(CONFIG.outputDir);
  const rows = await readCSV();
  const start = Math.min(CONFIG.offset, Math.max(0, rows.length - 1));
  const end = Math.min(start + CONFIG.maxToProcess, rows.length);
  const toProcess = rows.slice(start, end);
  log(`Lidos: ${rows.length}. Processando: ${toProcess.length} (OFFSET=${CONFIG.offset}, LIMIT=${CONFIG.maxToProcess})`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--no-zygote', '--single-process']
  });

  const results = [];
  try {
    const RETRIES = Number(process.env.RETRIES || 10);
    for (let i = 0; i < toProcess.length; i++) {
      const rec = toProcess[i];
      let res = null;
      for (let attempt = 1; attempt <= RETRIES; attempt++) {
        log(`[ALT][TRY ${attempt}/${RETRIES}] ${rec.login}`);
        res = await processOne(browser, rec, i, toProcess.length);
        if (res.status === 'success' && res.token) break;
        const backoff = 1500 * attempt;
        log(`[ALT] Sem token. Esperando ${backoff}ms para tentar novamente...`, 'warning');
        await new Promise(r => setTimeout(r, backoff));
      }
      results.push(res);
      if (!res || res.status !== 'success' || !res.token) {
        log(`[ALT] Abortando no modo estrito (não avançar sem token).`, 'error');
        break;
      }
      log(`Heartbeat: ${i + 1}/${toProcess.length} processados`);
      await new Promise(reslv => setTimeout(reslv, 500));
    }
  } finally {
    try { await browser.close(); } catch {}
  }

  const ok = results.filter(r => r.status === 'success');
  const outJson = path.join(CONFIG.outputDir, 'tokens_agent_puppeteer_alt.json');
  await fs.writeJson(outJson, results, { spaces: 2 });
  log(`Concluído. Sucesso: ${ok.length}/${results.length}. Salvo em ${outJson}`);
}

if (require.main === module) {
  main().catch((e) => {
    log(`FALHA: ${e.message}`, 'error');
    process.exit(1);
  });
}


