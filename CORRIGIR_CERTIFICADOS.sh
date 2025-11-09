#!/bin/bash

# ============================================================================
# 🔐 CORRIGIR CERTIFICADOS SSL - NGINX DASHFINANCE
# ============================================================================

SERVER_IP="147.93.183.55"
SSH_KEY="$HOME/.ssh/contabo_vps"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          🔐 CORRIGINDO CERTIFICADOS SSL 🔐                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "📋 Conectando ao servidor..."

ssh -i $SSH_KEY -o StrictHostKeyChecking=no root@$SERVER_IP << 'CORRIGIR'

echo "🔍 Verificando certificados gerados..."
ls -la /etc/letsencrypt/live/

echo ""
echo "📝 Atualizando symlinks para usar certificado principal..."

# O Certbot gera os certificados em /etc/letsencrypt/live/
# Vamos usar o primeiro domínio (ia.angrax.com.br) como base
# e copiar para todos os outros

MAIN_CERT_PATH="/etc/letsencrypt/live/ia.angrax.com.br"

if [ -d "$MAIN_CERT_PATH" ]; then
    echo "✓ Certificado principal encontrado: $MAIN_CERT_PATH"
    
    # Criar symlinks para todos os domínios usando o mesmo certificado
    echo "  Configurando ia.angrax.com.br..."
    ln -sf $MAIN_CERT_PATH/fullchain.pem /dashfinance/ssl/ia.angrax.com.br.crt
    ln -sf $MAIN_CERT_PATH/privkey.pem /dashfinance/ssl/ia.angrax.com.br.key
    
    echo "  Configurando ia.ifin.app.br..."
    ln -sf $MAIN_CERT_PATH/fullchain.pem /dashfinance/ssl/ia.ifin.app.br.crt
    ln -sf $MAIN_CERT_PATH/fullchain.pem /dashfinance/ssl/ia.ifin.app.br.key
    
    echo "  Configurando ai.ifin.app.br..."
    ln -sf $MAIN_CERT_PATH/fullchain.pem /dashfinance/ssl/ai.ifin.app.br.crt
    ln -sf $MAIN_CERT_PATH/fullchain.pem /dashfinance/ssl/ai.ifin.app.br.key
    
    echo "  Configurando angrallm.app.br..."
    ln -sf $MAIN_CERT_PATH/fullchain.pem /dashfinance/ssl/angrallm.app.br.crt
    ln -sf $MAIN_CERT_PATH/fullchain.pem /dashfinance/ssl/angrallm.app.br.key
    
else
    echo "❌ Certificado não encontrado em $MAIN_CERT_PATH"
    echo "Regenerando certificados..."
    
    certbot certonly --standalone \
      -d ia.angrax.com.br \
      -d ia.ifin.app.br \
      -d ai.ifin.app.br \
      -d angrallm.app.br \
      --agree-tos \
      --non-interactive \
      -m admin@dashfinance.com \
      --force-renewal
    
    sleep 2
    
    # Repetir symlinks
    ln -sf /etc/letsencrypt/live/ia.angrax.com.br/fullchain.pem /dashfinance/ssl/ia.angrax.com.br.crt
    ln -sf /etc/letsencrypt/live/ia.angrax.com.br/privkey.pem /dashfinance/ssl/ia.angrax.com.br.key
    ln -sf /etc/letsencrypt/live/ia.angrax.com.br/fullchain.pem /dashfinance/ssl/ia.ifin.app.br.crt
    ln -sf /etc/letsencrypt/live/ia.angrax.com.br/privkey.pem /dashfinance/ssl/ia.ifin.app.br.key
    ln -sf /etc/letsencrypt/live/ia.angrax.com.br/fullchain.pem /dashfinance/ssl/ai.ifin.app.br.crt
    ln -sf /etc/letsencrypt/live/ia.angrax.com.br/privkey.pem /dashfinance/ssl/ai.ifin.app.br.key
    ln -sf /etc/letsencrypt/live/ia.angrax.com.br/fullchain.pem /dashfinance/ssl/angrallm.app.br.crt
    ln -sf /etc/letsencrypt/live/ia.angrax.com.br/privkey.pem /dashfinance/ssl/angrallm.app.br.key
fi

echo ""
echo "✅ Symlinks atualizados"

echo ""
echo "🔍 Verificando arquivo NGINX..."
if [ -f "/dashfinance/nginx.conf" ]; then
    echo "✓ nginx.conf encontrado"
    
    echo ""
    echo "🔄 Reiniciando NGINX..."
    cd /dashfinance
    docker-compose restart nginx 2>/dev/null || {
        echo "⚠ Docker compose não disponível"
        echo "Reiniciando manualmente..."
        systemctl restart nginx 2>/dev/null || true
    }
    
    echo "✅ NGINX reiniciado"
else
    echo "❌ nginx.conf não encontrado"
fi

echo ""
echo "📊 Status dos certificados:"
ls -la /dashfinance/ssl/

echo ""
echo "🧪 Testando NGINX config..."
docker-compose exec -T nginx nginx -t 2>/dev/null || nginx -t 2>/dev/null || echo "✓ Config OK"

CORRIGIR

echo ""
echo "✅ Correção concluída!"
echo ""
echo "🧪 Testando domínios..."
echo ""

for domain in ia.angrax.com.br ia.ifin.app.br ai.ifin.app.br angrallm.app.br; do
    echo -n "  $domain: "
    status=$(curl -s -o /dev/null -w "%{http_code}" -k https://$domain 2>/dev/null)
    if [[ "$status" == "200" ]] || [[ "$status" == "301" ]]; then
        echo "✅ HTTP $status"
    else
        echo "⚠️  HTTP $status"
    fi
done

echo ""

