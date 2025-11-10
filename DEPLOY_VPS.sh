#!/bin/bash

# Script de Deploy para VPS 147...
# Substitua as variáveis abaixo com suas credenciais

# ============================================
# CONFIGURAÇÕES DO VPS
# ============================================
VPS_IP="147.xxx.xxx.xxx"           # Substitua com IP real
VPS_USER="root"                     # ou ubuntu, etc
VPS_PORT="22"                       # Porta SSH (padrão: 22)
VPS_PASSWORD="sua_senha_aqui"       # ou use chave SSH

# Ou use chave SSH:
# VPS_KEY="/path/to/private/key"

# ============================================
# CONFIGURAÇÕES DO PROJETO
# ============================================
PROJECT_DIR="/Users/alceualvespasssosmac/dashfinance/finance-oraculo-frontend"
BUILD_DIR="$PROJECT_DIR/.next"
REMOTE_DIR="/var/www/dashfinance"

# ============================================
# FUNÇÕES
# ============================================

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           🚀 DEPLOY DASHFINANCE PARA VPS 147... 🚀            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Passo 1: Verificar build
echo "=== PASSO 1: Verificar Build ===" 
if [ -d "$BUILD_DIR" ]; then
    echo "✅ Build encontrado em: $BUILD_DIR"
else
    echo "❌ Build não encontrado. Execute: npm run build"
    exit 1
fi

# Passo 2: Conectar ao VPS e criar diretório
echo ""
echo "=== PASSO 2: Conectar ao VPS ===" 
echo "Conectando em: $VPS_USER@$VPS_IP:$VPS_PORT"
echo ""

# Opção 1: Com Senha (usando sshpass)
if command -v sshpass &> /dev/null; then
    echo "Usando sshpass para autenticação..."
    sshpass -p "$VPS_PASSWORD" ssh -p $VPS_PORT $VPS_USER@$VPS_IP "mkdir -p $REMOTE_DIR"
else
    echo "⚠️  sshpass não instalado. Use chave SSH ou instale sshpass:"
    echo "   brew install sshpass"
    exit 1
fi

# Passo 3: Fazer upload dos arquivos
echo ""
echo "=== PASSO 3: Upload de Arquivos ===" 
echo "Enviando arquivos para: $REMOTE_DIR"
echo ""

if command -v sshpass &> /dev/null; then
    sshpass -p "$VPS_PASSWORD" scp -P $VPS_PORT -r "$PROJECT_DIR/.next" "$PROJECT_DIR/public" "$PROJECT_DIR/package.json" "$PROJECT_DIR/package-lock.json" "$VPS_USER@$VPS_IP:$REMOTE_DIR/"
    
    if [ $? -eq 0 ]; then
        echo "✅ Upload concluído com sucesso!"
    else
        echo "❌ Erro no upload"
        exit 1
    fi
fi

# Passo 4: Instalar dependências e iniciar
echo ""
echo "=== PASSO 4: Instalar Dependências ===" 
echo ""

if command -v sshpass &> /dev/null; then
    sshpass -p "$VPS_PASSWORD" ssh -p $VPS_PORT $VPS_USER@$VPS_IP "cd $REMOTE_DIR && npm install --production && npm run start"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                   ✅ DEPLOY CONCLUÍDO ✅                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Acesse: http://$VPS_IP:3000"
echo ""
