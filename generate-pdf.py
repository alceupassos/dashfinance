#!/usr/bin/env python3

"""
Script para gerar PDFs dos arquivos HTML usando Chrome headless

Instalação:
pip install selenium webdriver-manager

Uso:
python3 generate-pdf.py
"""

import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

def generate_pdf(html_file, output_pdf):
    """Gera PDF a partir de um arquivo HTML"""
    
    print(f"📄 Gerando PDF: {output_pdf}...")
    
    # Configura Chrome headless
    chrome_options = Options()
    chrome_options.add_argument('--headless=new')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--window-size=1400,10000')
    
    # Configurações de impressão para PDF
    settings = {
        "recentDestinations": [{
            "id": "Save as PDF",
            "origin": "local",
            "account": ""
        }],
        "selectedDestinationId": "Save as PDF",
        "version": 2,
        "isHeaderFooterEnabled": False,
        "isLandscapeEnabled": False,
        "isCssBackgroundEnabled": True,
        "mediaSize": {
            "height_microns": 297000,
            "width_microns": 210000
        }
    }
    
    prefs = {
        'printing.print_preview_sticky_settings.appState': settings,
        'savefile.default_directory': os.getcwd()
    }
    chrome_options.add_experimental_option('prefs', prefs)
    
    # Inicia Chrome
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    
    try:
        # Carrega o arquivo HTML
        html_path = os.path.abspath(html_file)
        driver.get(f'file://{html_path}')
        
        # Aguarda 3 segundos para gráficos carregarem
        time.sleep(3)
        
        # Executa comando de impressão
        result = driver.execute_cdp_cmd('Page.printToPDF', {
            'printBackground': True,
            'landscape': False,
            'paperWidth': 8.27,  # A4 width in inches
            'paperHeight': 11.69,  # A4 height in inches
            'marginTop': 0.2,
            'marginBottom': 0.2,
            'marginLeft': 0.2,
            'marginRight': 0.2,
            'preferCSSPageSize': True
        })
        
        # Salva o PDF
        import base64
        with open(output_pdf, 'wb') as f:
            f.write(base64.b64decode(result['data']))
        
        print(f"✅ PDF gerado: {output_pdf}")
        
    finally:
        driver.quit()

def main():
    """Função principal"""
    
    print('🚀 Iniciando geração de PDFs...\n')
    
    files = [
        {
            'input': 'DESCRITIVO_SISTEMA_EXECUTIVO_CLEVEL.html',
            'output': 'DESCRITIVO_SISTEMA_EXECUTIVO_CLEVEL.pdf'
        },
        {
            'input': 'VARIAVEIS_AMBIENTE_TOKENS_MODERNO.html',
            'output': 'VARIAVEIS_AMBIENTE_TOKENS_MODERNO.pdf'
        }
    ]
    
    for file_info in files:
        input_file = file_info['input']
        output_file = file_info['output']
        
        if not os.path.exists(input_file):
            print(f"❌ Arquivo não encontrado: {input_file}")
            continue
        
        try:
            generate_pdf(input_file, output_file)
            print()
        except Exception as e:
            print(f"❌ Erro ao processar {input_file}: {str(e)}")
            print()
    
    print('✨ Processo concluído!')

if __name__ == '__main__':
    main()

