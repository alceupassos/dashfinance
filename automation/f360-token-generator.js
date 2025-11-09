#!/usr/bin/env node
/**
 * F360 Token Generator - Automação de criação de tokens WebService
 *
 * Este script faz login em cada cliente F360 e cria automaticamente
 * um WebService "TORRE" para capturar o token de integração.
 */

const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');

// Configuração Supabase
const supabaseUrl = 'https://xzrmzmcoslomtzkzgskn.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNTI5ODM0OSwiZXhwIjoyMDQwODc0MzQ5fQ.FxWTC7w-bZHEeJ7BT-aaxLHKs0Wz9SBdpMTfOBYbTxM';
const supabase = createClient(supabaseUrl, supabaseKey);

// URL do F360
const F360_URL = 'https://financas.f360.com.br';

/**
 * Estrutura de dados dos clientes
 * Formato esperado:
 * {
 *   cnpj: '00.000.000/0000-00',
 *   razao_social: 'Nome da Empresa',
 *   email: 'login@empresa.com',
 *   senha: 'senha123'
 * }
 */
const clientes = [
  // VOCÊ VAI PREENCHER AQUI COM OS DADOS DOS 17 CLIENTES
  // Exemplo:
  // { cnpj: '00.052.912/6470-00', razao_social: 'DEX INVEST 392', email: 'contato@dex.com', senha: 'senha123' },
];

/**
 * Função principal de automação
 */
async function gerarTokenF360(cliente) {
  console.log(`\n🚀 Processando: ${cliente.razao_social}`);

  const browser = await puppeteer.launch({
    headless: false, // Mude para true quando estiver confiante
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // 1. Fazer login
    console.log('  → Acessando página de login...');
    await page.goto(`${F360_URL}/login`, { waitUntil: 'networkidle2' });

    console.log('  → Preenchendo credenciais...');
    await page.type('input[name="email"], input[type="email"]', cliente.email);
    await page.type('input[name="password"], input[type="password"]', cliente.senha);

    console.log('  → Fazendo login...');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);

    // Verificar se login foi bem-sucedido
    const loginFailed = await page.$('text=Credenciais inválidas').catch(() => null);
    if (loginFailed) {
      throw new Error('❌ Login falhou - credenciais inválidas');
    }

    // 2. Navegar até Webservices
    console.log('  → Navegando para Webservices...');
    await page.goto(`${F360_URL}/Webservice`, { waitUntil: 'networkidle2' });

    // 3. Clicar em "+ CRIAR" (botão no canto inferior esquerdo)
    console.log('  → Clicando em "+ CRIAR"...');
    await page.waitForSelector('button:has-text("CRIAR"), button:has-text("Criar"), a:has-text("CRIAR")', { timeout: 5000 });
    await page.click('button:has-text("CRIAR"), button:has-text("Criar"), a:has-text("CRIAR")');

    // 4. Selecionar "API Pública da F360"
    console.log('  → Selecionando "API Pública da F360"...');
    await page.waitForSelector('select, .select, [role="listbox"]', { timeout: 3000 });

    // Tentar selecionar via dropdown
    const selectExists = await page.$('select');
    if (selectExists) {
      await page.select('select', 'API Pública da F360');
    } else {
      // Se for um componente customizado
      await page.click('[role="listbox"], .select');
      await page.click('text=API Pública da F360');
    }

    // 5. Preencher nome "TORRE"
    console.log('  → Preenchendo nome "TORRE"...');
    await page.waitForSelector('input[name="name"], input[placeholder*="nome"]', { timeout: 2000 });
    await page.type('input[name="name"], input[placeholder*="nome"]', 'TORRE');

    // 6. Salvar
    console.log('  → Salvando WebService...');
    await page.click('button:has-text("Salvar"), button:has-text("Criar"), button[type="submit"]');

    // 7. Capturar o token (aparece UMA VEZ após criação)
    console.log('  → Aguardando token aparecer...');
    await page.waitForSelector('[class*="token"], [id*="token"], code, pre', { timeout: 5000 });

    const token = await page.evaluate(() => {
      // Procurar por padrão de UUID/GUID
      const elements = document.querySelectorAll('[class*="token"], [id*="token"], code, pre, input[readonly]');
      for (const el of elements) {
        const text = el.textContent || el.value;
        // Regex para UUID: 8-4-4-4-12 caracteres hexadecimais
        const match = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        if (match) return match[0];
      }
      return null;
    });

    if (!token) {
      throw new Error('❌ Token não encontrado na página');
    }

    console.log(`  ✅ Token capturado: ${token.substring(0, 8)}...${token.substring(token.length - 8)}`);

    // 8. Inserir no banco de dados
    console.log('  → Inserindo no banco...');
    const { error } = await supabase
      .from('f360_config')
      .upsert({
        company_cnpj: cliente.cnpj,
        api_key: token,
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'company_cnpj'
      });

    if (error) {
      console.error('  ❌ Erro ao inserir no banco:', error);
      throw error;
    }

    // Também atualizar o CNPJ na tabela clientes se ainda não existir
    await supabase
      .from('clientes')
      .update({ cnpj: cliente.cnpj })
      .match({ razao_social: cliente.razao_social })
      .is('cnpj', null);

    console.log(`  ✅ ${cliente.razao_social} - CONCLUÍDO!`);

    return { success: true, token, cnpj: cliente.cnpj };

  } catch (error) {
    console.error(`  ❌ Erro ao processar ${cliente.razao_social}:`, error.message);
    return { success: false, error: error.message, cnpj: cliente.cnpj };

  } finally {
    await browser.close();
  }
}

/**
 * Processar todos os clientes
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('    F360 Token Generator - Automação de WebServices');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (clientes.length === 0) {
    console.error('❌ ERRO: Array de clientes está vazio!');
    console.error('   Por favor, preencha o array "clientes" com os dados de login.');
    process.exit(1);
  }

  const resultados = [];

  for (const cliente of clientes) {
    const resultado = await gerarTokenF360(cliente);
    resultados.push(resultado);

    // Aguardar 3 segundos entre cada cliente (evitar rate limiting)
    if (clientes.indexOf(cliente) < clientes.length - 1) {
      console.log('  ⏳ Aguardando 3 segundos...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Resumo final
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('                     RESUMO FINAL');
  console.log('═══════════════════════════════════════════════════════════\n');

  const sucessos = resultados.filter(r => r.success).length;
  const falhas = resultados.filter(r => !r.success).length;

  console.log(`✅ Sucessos: ${sucessos}/${clientes.length}`);
  console.log(`❌ Falhas: ${falhas}/${clientes.length}\n`);

  if (falhas > 0) {
    console.log('Clientes com falha:');
    resultados.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.cnpj}: ${r.error}`);
    });
  }

  console.log('\n✅ Automação concluída!');
}

// Executar
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { gerarTokenF360 };
