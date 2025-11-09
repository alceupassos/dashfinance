#!/bin/bash
# Comandos para instalar e executar o F360 Token Scraper

echo "Instalando Playwright..."
python3 -m pip install --user playwright==1.40.0

echo ""
echo "Instalando navegador Chromium..."
python3 -m playwright install chromium

echo ""
echo "Instalação concluída!"
echo ""
echo "Para executar o script, use:"
echo "  python3 automation/f360_token_scraper.py"

