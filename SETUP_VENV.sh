#!/bin/bash
# Setup com ambiente virtual para F360 Token Scraper

echo "============================================================"
echo "F360 Token Scraper - Setup com Ambiente Virtual"
echo "============================================================"
echo ""

# 1. Criar ambiente virtual
echo "1. Criando ambiente virtual..."
python3 -m venv venv

if [ $? -ne 0 ]; then
    echo "❌ Erro ao criar ambiente virtual"
    exit 1
fi
echo "   ✅ Ambiente virtual criado"
echo ""

# 2. Ativar ambiente virtual
echo "2. Ativando ambiente virtual..."
source venv/bin/activate

if [ $? -ne 0 ]; then
    echo "❌ Erro ao ativar ambiente virtual"
    exit 1
fi
echo "   ✅ Ambiente virtual ativado"
echo ""

# 3. Atualizar pip
echo "3. Atualizando pip..."
pip install --upgrade pip

# 4. Instalar Playwright
echo ""
echo "4. Instalando Playwright..."
pip install playwright==1.40.0

if [ $? -ne 0 ]; then
    echo "❌ Erro ao instalar Playwright"
    exit 1
fi
echo "   ✅ Playwright instalado"
echo ""

# 5. Instalar navegadores
echo "5. Instalando navegador Chromium..."
playwright install chromium

if [ $? -ne 0 ]; then
    echo "❌ Erro ao instalar navegadores"
    exit 1
fi
echo "   ✅ Navegador Chromium instalado"
echo ""

echo "============================================================"
echo "✅ Setup concluído com sucesso!"
echo "============================================================"
echo ""
echo "Para executar o script:"
echo ""
echo "  1. Ativar o ambiente virtual:"
echo "     source venv/bin/activate"
echo ""
echo "  2. Executar o scraper:"
echo "     python automation/f360_token_scraper.py"
echo ""
echo "  3. Quando terminar, desativar o ambiente:"
echo "     deactivate"
echo ""

