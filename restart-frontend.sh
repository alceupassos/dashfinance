#!/bin/bash

# 🚀 Script para reiniciar o frontend com cache limpo

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         🚀 REINICIANDO FRONTEND - DASHFINANCE                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Diretório do frontend
FRONTEND_DIR="/Users/alceualvespasssosmac/dashfinance/finance-oraculo-frontend"

echo "📍 Navegando para: $FRONTEND_DIR"
cd "$FRONTEND_DIR"
echo "✅ Diretório correto"
echo ""

# Limpar cache Next.js
echo "🧹 Limpando cache Next.js..."
if [ -d ".next" ]; then
    rm -rf .next
    echo "✅ Cache .next removido"
else
    echo "ℹ️  Pasta .next não existe (OK)"
fi
echo ""

# Limpar node_modules/.cache se existir
echo "🧹 Limpando cache do node_modules..."
if [ -d "node_modules/.cache" ]; then
    rm -rf node_modules/.cache
    echo "✅ Cache node_modules removido"
else
    echo "ℹ️  Cache node_modules não existe (OK)"
fi
echo ""

# Verificar se node_modules existe
echo "📦 Verificando dependências..."
if [ ! -d "node_modules" ]; then
    echo "📥 Instalando dependências (npm install)..."
    npm install
    echo "✅ Dependências instaladas"
else
    echo "✅ node_modules já existe"
fi
echo ""

# Iniciar servidor de desenvolvimento
echo "════════════════════════════════════════════════════════════════"
echo "🚀 INICIANDO SERVIDOR DE DESENVOLVIMENTO"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📱 Frontend rodando em: http://localhost:3000"
echo ""
echo "🔑 Credenciais de teste:"
echo "   Email: alceu@angrax.com.br"
echo "   Senha: ALceu322ie#"
echo ""
echo "💡 Dica: Abra seu navegador em http://localhost:3000"
echo "   e use Cmd+Shift+R para limpar cache do navegador"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""

npm run dev

