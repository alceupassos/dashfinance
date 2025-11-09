#!/bin/bash

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║     🔐 CRIAR ACESSO SSH PARA IA - DASHFINANCE 🔐              ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

SSH_DIR="$HOME/.ssh"
KEY_NAME="ia_dashfinance_deploy"
KEY_FILE="$SSH_DIR/$KEY_NAME"

echo "🔑 Gerando chave SSH para IA..."
echo ""

# Gerar chave
ssh-keygen -t ed25519 -f "$KEY_FILE" -N "" -C "ia-dashfinance@$(date +%Y%m%d)" 2>&1 | grep -v "^Enter\|^Generating\|^Your"

echo ""
echo "✅ Chave criada!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. Copie a chave pública abaixo:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat "$KEY_FILE.pub"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "2. SSH no servidor 147.93.183.55:"
echo "   ssh -i ~/.ssh/contabo_vps root@147.93.183.55"
echo ""

echo "3. Cole a chave em ~/.ssh/authorized_keys:"
echo "   mkdir -p ~/.ssh"
echo "   echo 'COLAR_AQUI' >> ~/.ssh/authorized_keys"
echo "   chmod 600 ~/.ssh/authorized_keys"
echo ""

echo "4. Depois, volte e execute:"
echo "   bash /Users/alceualvespasssosmac/dashfinance/DEPLOY_COM_IA_SSH.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Salvar em arquivo para fácil referência
cat > /Users/alceualvespasssosmac/dashfinance/.ia_ssh_key.pub << 'KEYFILE'
KEYFILE
cat "$KEY_FILE.pub" >> /Users/alceualvespasssosmac/dashfinance/.ia_ssh_key.pub

echo "✅ Chave também salva em: /Users/alceualvespasssosmac/dashfinance/.ia_ssh_key.pub"
echo ""

