#!/bin/bash

# ============================================================================
# 🔐 GERAR CHAVE SSH PARA IA NO SERVIDOR
# ============================================================================
# Execute isto NO SERVIDOR para criar acesso SSH para IA
# ============================================================================

echo ""
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                            ║"
echo "║        🔐 GERAR CHAVE SSH PARA IA - DASHFINANCE 🔐                        ║"
echo "║                                                                            ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Preparar diretório SSH
mkdir -p ~/.ssh
chmod 700 ~/.ssh

echo "🔑 Gerando nova chave SSH para IA..."
echo ""

# Gerar chave ed25519
ssh-keygen -t ed25519 -f /tmp/ia_deploy_key -N "" -C "ia-dashfinance-$(date +%Y%m%d)" 2>&1 | head -3

echo ""
echo "✅ Chave gerada!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 CHAVE PRIVADA (para IA):"
echo ""
cat /tmp/ia_deploy_key
echo ""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Adicionar chave pública ao authorized_keys
echo "🔐 Adicionando chave pública ao servidor..."
cat /tmp/ia_deploy_key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

echo "✅ Chave adicionada ao ~/.ssh/authorized_keys"
echo ""

# Salvar as duas chaves em arquivos
cp /tmp/ia_deploy_key /root/ia_deploy_key_PRIVADA
cp /tmp/ia_deploy_key.pub /root/ia_deploy_key.pub

echo "✅ Chaves salvas em:"
echo "   - Privada: /root/ia_deploy_key_PRIVADA"
echo "   - Pública: /root/ia_deploy_key.pub"
echo ""

# Exibir info para download
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. Fazer download da chave privada:"
echo "   scp -i ~/.ssh/contabo_vps root@147.93.183.55:/root/ia_deploy_key_PRIVADA ./ia_deploy_key"
echo ""
echo "2. Depois enviar para IA com permissão correta:"
echo "   chmod 600 ia_deploy_key"
echo ""
echo "3. IA vai usar para conectar:"
echo "   ssh -i ia_deploy_key root@147.93.183.55"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Testar acesso local
echo "🧪 Testando acesso SSH local..."
if ssh -i /tmp/ia_deploy_key -o StrictHostKeyChecking=no root@localhost "echo 'SSH OK'" 2>/dev/null | grep -q "SSH OK"; then
    echo "✅ SSH funcionando!"
else
    echo "⚠️  SSH local não testado (esperado)"
fi

echo ""
echo "✅ Tudo pronto!"
echo ""

