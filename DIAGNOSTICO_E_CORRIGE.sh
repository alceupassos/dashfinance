#!/bin/bash

SERVER_IP="147.93.183.55"
SSH_KEY="$HOME/.ssh/contabo_vps"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║        🔍 DIAGNÓSTICO E CORREÇÃO DO NGINX 🔍                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

ssh -i $SSH_KEY -o StrictHostKeyChecking=no root@$SERVER_IP << 'DIAG'

echo "📋 1. TESTANDO NGINX"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
nginx -t
echo ""

echo "📋 2. STATUS DO NGINX"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
systemctl status nginx | head -5
echo ""

echo "📋 3. TESTANDO CONEXÃO LOCAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -I http://localhost/ 2>&1 | head -3
echo ""

echo "📋 4. TESTANDO LOCALHOST:443"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -k -I https://localhost/ 2>&1 | head -3
echo ""

echo "📋 5. VERIFICANDO CERTIFICADOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ls -lh /etc/letsencrypt/live/ia.angrax.com.br/
echo ""

echo "📋 6. LOGS DO NGINX (ÚLTIMAS 30 LINHAS)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
tail -30 /var/log/nginx/error.log
echo ""

echo "📋 7. VERIFICANDO CONFIGURAÇÃO ATIVA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Sites enabled:"
ls -la /etc/nginx/sites-enabled/
echo ""

DIAG

echo ""
echo "📋 LOCAL - Verificando DNS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "DNS resolution para ia.angrax.com.br:"
dig ia.angrax.com.br @8.8.8.8 +short || echo "DNS não conseguiu resolver"
echo ""

echo "IP esperado: 147.93.183.55"
echo ""
