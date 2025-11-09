#!/bin/bash
# Script para executar o F360 Token Scraper

echo "Ativando ambiente virtual..."
source venv/bin/activate

echo "Executando F360 Token Scraper..."
echo ""
python automation/f360_token_scraper.py

echo ""
echo "Desativando ambiente virtual..."
deactivate

