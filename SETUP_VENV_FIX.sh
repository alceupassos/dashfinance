#!/bin/bash
# Setup com ambiente virtual - versão corrigida

echo "============================================================"
echo "F360 Token Scraper - Setup (Versão Corrigida)"
echo "============================================================"
echo ""

# 1. Remover ambiente virtual antigo se existir
if [ -d "venv" ]; then
    echo "Removendo ambiente virtual antigo..."
    rm -rf venv
    echo "   ✅ Removido"
    echo ""
fi

# 2. Criar ambiente virtual
echo "1. Criando ambiente virtual..."
python3 -m venv venv
echo "   ✅ Ambiente virtual criado"
echo ""

# 3. Ativar ambiente virtual
echo "2. Ativando ambiente virtual..."
source venv/bin/activate
echo "   ✅ Ambiente virtual ativado"
echo ""

# 4. Atualizar pip e instalar wheel
echo "3. Atualizando pip e ferramentas..."
pip install --upgrade pip setuptools wheel
echo "   ✅ Ferramentas atualizadas"
echo ""

# 5. Instalar greenlet primeiro (versão binária)
echo "4. Instalando greenlet (pré-compilado)..."
pip install --only-binary :all: greenlet
echo "   ✅ Greenlet instalado"
echo ""

# 6. Instalar Playwright
echo "5. Instalando Playwright..."
pip install --only-binary :all: playwright
echo "   ✅ Playwright instalado"
echo ""

# 7. Instalar navegadores
echo "6. Instalando navegador Chromium..."
playwright install chromium
echo "   ✅ Navegador Chromium instalado"
echo ""

echo "============================================================"
echo "✅ Setup concluído com sucesso!"
echo "============================================================"
echo ""
echo "Para executar o script:"
echo ""
echo "  bash RUN_SCRAPER.sh"
echo ""
echo "Ou manualmente:"
echo "  source venv/bin/activate"
echo "  python automation/f360_token_scraper.py"
echo ""

