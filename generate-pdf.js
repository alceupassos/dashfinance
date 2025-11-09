#!/usr/bin/env node

/**
 * Script para gerar PDFs e PNGs dos arquivos HTML
 * 
 * Instalação:
 * npm install -g puppeteer
 * 
 * Uso:
 * node generate-pdf.js
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const files = [
    {
        input: 'DESCRITIVO_SISTEMA_EXECUTIVO_CLEVEL.html',
        outputPdf: 'DESCRITIVO_SISTEMA_EXECUTIVO_CLEVEL.pdf',
        outputPng: 'DESCRITIVO_SISTEMA_EXECUTIVO_CLEVEL.png'
    },
    {
        input: 'VARIAVEIS_AMBIENTE_TOKENS_MODERNO.html',
        outputPdf: 'VARIAVEIS_AMBIENTE_TOKENS_MODERNO.pdf',
        outputPng: 'VARIAVEIS_AMBIENTE_TOKENS_MODERNO.png'
    }
];

async function generatePDF(inputFile, outputPdf) {
    console.log(`📄 Gerando PDF: ${outputPdf}...`);
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Carrega o arquivo HTML
    const htmlPath = path.resolve(__dirname, inputFile);
    await page.goto(`file://${htmlPath}`, {
        waitUntil: 'networkidle0'
    });
    
    // Aguarda os gráficos Chart.js carregarem
    await page.waitForTimeout(2000);
    
    // Gera o PDF
    await page.pdf({
        path: outputPdf,
        format: 'A4',
        printBackground: true,
        margin: {
            top: '0.5cm',
            right: '0.5cm',
            bottom: '0.5cm',
            left: '0.5cm'
        }
    });
    
    await browser.close();
    console.log(`✅ PDF gerado: ${outputPdf}`);
}

async function generatePNG(inputFile, outputPng) {
    console.log(`🖼️  Gerando PNG: ${outputPng}...`);
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Define viewport para captura de tela
    await page.setViewport({
        width: 1400,
        height: 10000,
        deviceScaleFactor: 2 // Retina quality
    });
    
    // Carrega o arquivo HTML
    const htmlPath = path.resolve(__dirname, inputFile);
    await page.goto(`file://${htmlPath}`, {
        waitUntil: 'networkidle0'
    });
    
    // Aguarda os gráficos Chart.js carregarem
    await page.waitForTimeout(2000);
    
    // Captura a altura total da página
    const bodyHandle = await page.$('body');
    const { height } = await bodyHandle.boundingBox();
    await bodyHandle.dispose();
    
    // Ajusta viewport para altura completa
    await page.setViewport({
        width: 1400,
        height: Math.ceil(height),
        deviceScaleFactor: 2
    });
    
    // Gera o PNG
    await page.screenshot({
        path: outputPng,
        fullPage: true
    });
    
    await browser.close();
    console.log(`✅ PNG gerado: ${outputPng}`);
}

async function main() {
    console.log('🚀 Iniciando geração de PDFs e PNGs...\n');
    
    for (const file of files) {
        const inputPath = path.resolve(__dirname, file.input);
        
        if (!fs.existsSync(inputPath)) {
            console.error(`❌ Arquivo não encontrado: ${file.input}`);
            continue;
        }
        
        try {
            await generatePDF(file.input, file.outputPdf);
            await generatePNG(file.input, file.outputPng);
            console.log('');
        } catch (error) {
            console.error(`❌ Erro ao processar ${file.input}:`, error.message);
        }
    }
    
    console.log('✨ Processo concluído!');
}

main().catch(console.error);

