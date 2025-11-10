#!/bin/bash

# ============================================
# DEPLOY SEGURO DASHFINANCE PARA VPS 147.93.183.55
# ⚠️  CUIDADO: Não mexer no nginx!
# ============================================

set -e

VPS_IP="147.93.183.55"
VPS_USER="root"
SSH_KEY="/Users/alceualvespasssosmac/dashfinance/ssh_key.txt"
ARCHIVE="dashfinance-frontend.tar.gz"
REMOTE_DIR="/var/www/dashfinance"
BACKUP_DIR="/var/www/dashfinance-backup-$(date +%s)"

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║              🚀 DEPLOY SEGURO DASHFINANCE PARA VPS 🚀                     ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

# ============================================
# PASSO 1: Verificar Arquivo
# ============================================
echo "=== PASSO 1: Verificar Arquivo ===" 
if [ ! -f "$ARCHIVE" ]; then
    echo "❌ Arquivo não encontrado: $ARCHIVE"
    exit 1
fi
echo "✅ Arquivo encontrado: $(ls -lh $ARCHIVE | awk '{print $5, $9}')"
echo ""

# ============================================
# PASSO 2: Testar Conexão SSH
# ============================================
echo "=== PASSO 2: Testar Conexão SSH ===" 
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    "$VPS_USER@$VPS_IP" "echo '✅ Conexão SSH OK!'" || exit 1
echo ""

# ============================================
# PASSO 3: Backup do Diretório Atual
# ============================================
echo "=== PASSO 3: Backup do Diretório Atual ===" 
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    "$VPS_USER@$VPS_IP" "
    if [ -d '$REMOTE_DIR' ]; then
        cp -r '$REMOTE_DIR' '$BACKUP_DIR'
        echo '✅ Backup criado em: $BACKUP_DIR'
    else
        mkdir -p '$REMOTE_DIR'
        echo '✅ Diretório criado'
    fi
"
echo ""

# ============================================
# PASSO 4: Parar Servidor (sem mexer no nginx!)
# ============================================
echo "=== PASSO 4: Parar Servidor Node ===" 
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    "$VPS_USER@$VPS_IP" "
    pkill -f 'npm run start' || true
    sleep 2
    echo '✅ Servidor Node parado'
"
echo ""

# ============================================
# PASSO 5: Upload do Arquivo
# ============================================
echo "=== PASSO 5: Upload do Arquivo ===" 
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    "$ARCHIVE" "$VPS_USER@$VPS_IP:$REMOTE_DIR/"
echo "✅ Arquivo enviado"
echo ""

# ============================================
# PASSO 6: Extrair e Instalar
# ============================================
echo "=== PASSO 6: Extrair e Instalar ===" 
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    "$VPS_USER@$VPS_IP" "
    cd '$REMOTE_DIR'
    tar -xzf '$ARCHIVE'
    rm '$ARCHIVE'
    npm install --production
    echo '✅ Instalação concluída'
"
echo ""

# ============================================
# PASSO 7: Iniciar Servidor
# ============================================
echo "=== PASSO 7: Iniciar Servidor ===" 
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    "$VPS_USER@$VPS_IP" "
    cd '$REMOTE_DIR'
    nohup npm run start > /var/log/dashfinance.log 2>&1 &
    sleep 3
    if pgrep -f 'npm run start' > /dev/null; then
        echo '✅ Servidor Node iniciado'
    else
        echo '❌ Erro ao iniciar servidor'
        exit 1
    fi
"
echo ""

# ============================================
# PASSO 8: Verificar Status
# ============================================
echo "=== PASSO 8: Verificar Status ===" 
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    "$VPS_USER@$VPS_IP" "
    echo 'Status do Servidor:'
    ps aux | grep 'npm run start' | grep -v grep || echo 'Iniciando...'
    echo ''
    echo 'Logs:'
    tail -5 /var/log/dashfinance.log
"
echo ""

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ DEPLOY CONCLUÍDO COM SUCESSO ✅                     ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Acesse: http://147.93.183.55:3000"
echo ""
echo "⚠️  IMPORTANTE:"
echo "   - Nginx NÃO foi tocado"
echo "   - Backup salvo em: $BACKUP_DIR"
echo "   - Logs em: /var/log/dashfinance.log"
echo ""
echo "Se precisar reverter:"
echo "   ssh -i $SSH_KEY root@$VPS_IP 'rm -rf $REMOTE_DIR && cp -r $BACKUP_DIR $REMOTE_DIR'"
echo ""
