#!/bin/bash
# Script de instalação do F360 Token Scraper

echo "============================================================"
echo "F360 Token Scraper - Instalação"
echo "============================================================"
echo ""

# Verificar Python
echo "1. Verificando Python..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 não encontrado!"
    echo "   Por favor, instale Python 3 primeiro:"
    echo "   brew install python3"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
echo "   ✅ $PYTHON_VERSION encontrado"
echo ""

# Instalar dependências
echo "2. Instalando dependências Python..."
python3 -m pip install --upgrade pip
python3 -m pip install -r automation/requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ Erro ao instalar dependências Python"
    exit 1
fi
echo "   ✅ Dependências Python instaladas"
echo ""

# Instalar navegadores Playwright
echo "3. Instalando navegadores Playwright..."
python3 -m playwright install chromium

if [ $? -ne 0 ]; then
    echo "❌ Erro ao instalar navegadores Playwright"
    exit 1
fi
echo "   ✅ Navegadores Playwright instalados"
echo ""

echo "============================================================"
echo "✅ Instalação concluída com sucesso!"
echo "============================================================"
echo ""
echo "Para executar o script:"
echo "  python3 automation/f360_token_scraper.py"
echo ""
echo "Para ver opções:"
echo "  python3 automation/f360_token_scraper.py --help"
echo ""

