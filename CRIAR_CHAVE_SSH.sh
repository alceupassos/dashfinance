#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║     🔐 CRIAR CHAVE SSH DEDICADA PARA DEPLOY AUTOMÁTICO 🔐     ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

SSH_DIR="$HOME/.ssh"
KEY_NAME="dashfinance_deploy"
KEY_FILE="$SSH_DIR/$KEY_NAME"

# Verificar se chave já existe
if [ -f "$KEY_FILE" ]; then
    echo "⚠️  Chave já existe: $KEY_FILE"
    echo ""
    read -p "Deseja usar a chave existente? (s/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo "Abortado."
        exit 1
    fi
else
    echo "🔑 Gerando nova chave SSH..."
    ssh-keygen -t ed25519 -f "$KEY_FILE" -N "" -C "dashfinance@$(date +%Y%m%d)"
    echo "✅ Chave criada: $KEY_FILE"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. Copiar a chave pública para o servidor:"
echo ""
echo "   ssh-copy-id -i $KEY_FILE root@147.93.183.55"
echo ""
echo "   OU manualmente (execute no servidor 147.93.183.55):"
echo ""
cat "$KEY_FILE.pub"
echo ""
echo ""
echo "   Cole o conteúdo acima em: ~/.ssh/authorized_keys"
echo ""
echo "2. Depois de adicionar a chave no servidor, execute:"
echo ""
echo "   bash /Users/alceualvespasssosmac/dashfinance/DEPLOY_COM_MINHA_CHAVE.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

