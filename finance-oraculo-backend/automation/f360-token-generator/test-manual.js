const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false, // VER o que está acontecendo
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  console.log('1. Navegando para login...');
  await page.goto('https://financas.f360.com.br', { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForTimeout(5000);
  
  console.log('2. Verificando o que tem na página...');
  const pageInfo = await page.evaluate(() => {
    return {
      url: window.location.href,
      title: document.title,
      inputs: Array.from(document.querySelectorAll('input')).map(inp => ({
        type: inp.type,
        name: inp.name,
        id: inp.id,
        placeholder: inp.placeholder
      })),
      buttons: Array.from(document.querySelectorAll('button')).map(btn => ({
        text: (btn.textContent || '').trim().substring(0, 30),
        type: btn.type
      }))
    };
  });
  console.log(JSON.stringify(pageInfo, null, 2));
  
  await page.screenshot({ path: '/tmp/f360-login-page.png', fullPage: true });
  console.log('Screenshot salvo: /tmp/f360-login-page.png');
  
  console.log('Aguardando 30s para você ver a página...');
  await page.waitForTimeout(30000);
  
  await browser.close();
})();

