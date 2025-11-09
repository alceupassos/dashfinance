#!/bin/bash

# Script para gerar PDFs dos relatórios HTML
# Usa wkhtmltopdf (instale com: brew install wkhtmltopdf)

echo "🚀 Gerando PDFs dos relatórios iFinance..."
echo ""

# Verifica se wkhtmltopdf está instalado
if ! command -v wkhtmltopdf &> /dev/null; then
    echo "❌ wkhtmltopdf não está instalado!"
    echo ""
    echo "📦 Para instalar:"
    echo "   brew install wkhtmltopdf"
    echo ""
    echo "Ou use o navegador (Cmd+P → Salvar como PDF)"
    exit 1
fi

# Arquivo 1: Descritivo do Sistema
if [ -f "DESCRITIVO_SISTEMA_EXECUTIVO_CLEVEL.html" ]; then
    echo "📄 Gerando: DESCRITIVO_SISTEMA_EXECUTIVO_CLEVEL.pdf"
    wkhtmltopdf \
      --enable-local-file-access \
      --print-media-type \
      --enable-javascript \
      --javascript-delay 2000 \
      --background \
      --no-stop-slow-scripts \
      --margin-top 5mm \
      --margin-bottom 5mm \
      --margin-left 5mm \
      --margin-right 5mm \
      DESCRITIVO_SISTEMA_EXECUTIVO_CLEVEL.html \
      DESCRITIVO_SISTEMA_EXECUTIVO_CLEVEL.pdf
    echo "   ✅ Concluído!"
else
    echo "   ⚠️  Arquivo não encontrado: DESCRITIVO_SISTEMA_EXECUTIVO_CLEVEL.html"
fi

echo ""

# Arquivo 2: Variáveis de Ambiente
if [ -f "VARIAVEIS_AMBIENTE_TOKENS_MODERNO.html" ]; then
    echo "📄 Gerando: VARIAVEIS_AMBIENTE_TOKENS_MODERNO.pdf"
    wkhtmltopdf \
      --enable-local-file-access \
      --print-media-type \
      --enable-javascript \
      --javascript-delay 2000 \
      --background \
      --no-stop-slow-scripts \
      --margin-top 5mm \
      --margin-bottom 5mm \
      --margin-left 5mm \
      --margin-right 5mm \
      VARIAVEIS_AMBIENTE_TOKENS_MODERNO.html \
      VARIAVEIS_AMBIENTE_TOKENS_MODERNO.pdf
    echo "   ✅ Concluído!"
else
    echo "   ⚠️  Arquivo não encontrado: VARIAVEIS_AMBIENTE_TOKENS_MODERNO.html"
fi

echo ""
echo "✨ Processo concluído!"
echo ""
echo "📂 PDFs gerados nesta pasta:"
ls -lh *.pdf 2>/dev/null | awk '{print "   -", $9, "(" $5 ")"}'
echo ""
echo "💡 Para abrir os PDFs:"
echo "   open *.pdf"

