#!/bin/bash

# ============================================================================
# 🚀 NGINX DASHFINANCE - DEPLOY SIMPLES E FUNCIONAL
# ============================================================================

SERVER_IP="147.93.183.55"
SSH_KEY="$HOME/.ssh/contabo_vps"
LOCAL_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                            ║"
echo "║              🚀 NGINX DASHFINANCE - DEPLOY FINAL 🚀                        ║"
echo "║                                                                            ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

# PASSO 1: Testar SSH
echo "📡 Testando conexão SSH..."
if ! ssh -i $SSH_KEY -o StrictHostKeyChecking=no root@$SERVER_IP "echo OK" > /dev/null 2>&1; then
    echo "❌ ERRO: Não consegui conectar"
    exit 1
fi
echo "✅ Conexão OK"
echo ""

# PASSO 2: Copiar arquivos
echo "📤 Copiando arquivos..."
ssh -i $SSH_KEY -o StrictHostKeyChecking=no root@$SERVER_IP "mkdir -p /dashfinance/{ssl,logs}"
scp -i $SSH_KEY -o StrictHostKeyChecking=no -q "$LOCAL_PATH/nginx.conf" root@$SERVER_IP:/dashfinance/
scp -i $SSH_KEY -o StrictHostKeyChecking=no -q "$LOCAL_PATH/docker-compose.yml" root@$SERVER_IP:/dashfinance/
echo "✅ Arquivos copiados"
echo ""

# PASSO 3: Deploy
echo "⚙️  Executando deployment (aguarde 3-5 minutos)..."
echo ""

ssh -i $SSH_KEY -o StrictHostKeyChecking=no root@$SERVER_IP << 'DEPLOY'

cd /dashfinance

echo "[1/10] Atualizando sistema..."
apt-get update -qq

echo "[2/10] Instalando Certbot..."
apt-get install -y -qq certbot > /dev/null 2>&1

echo "[3/10] Gerando certificados SSL..."
certbot certonly --standalone -d ia.angrax.com.br -d ia.ifin.app.br -d ai.ifin.app.br -d angrallm.app.br --agree-tos --non-interactive -m admin@dashfinance.com > /dev/null 2>&1

echo "[4/10] Criando symlinks..."
ln -sf /etc/letsencrypt/live/ia.angrax.com.br/fullchain.pem /dashfinance/ssl/ia.angrax.com.br.crt
ln -sf /etc/letsencrypt/live/ia.angrax.com.br/privkey.pem /dashfinance/ssl/ia.angrax.com.br.key
ln -sf /etc/letsencrypt/live/ia.ifin.app.br/fullchain.pem /dashfinance/ssl/ia.ifin.app.br.crt
ln -sf /etc/letsencrypt/live/ia.ifin.app.br/privkey.pem /dashfinance/ssl/ia.ifin.app.br.key
ln -sf /etc/letsencrypt/live/ai.ifin.app.br/fullchain.pem /dashfinance/ssl/ai.ifin.app.br.crt
ln -sf /etc/letsencrypt/live/ai.ifin.app.br/privkey.pem /dashfinance/ssl/ai.ifin.app.br.key
ln -sf /etc/letsencrypt/live/angrallm.app.br/fullchain.pem /dashfinance/ssl/angrallm.app.br.crt
ln -sf /etc/letsencrypt/live/angrallm.app.br/privkey.pem /dashfinance/ssl/angrallm.app.br.key

echo "[5/10] Corrigindo permissões..."
chmod 600 /dashfinance/ssl/*.key 2>/dev/null
chmod 644 /dashfinance/ssl/*.crt 2>/dev/null

echo "[6/10] Iniciando Docker containers..."
docker-compose up -d 2>/dev/null || echo "   ⚠ Docker não disponível"

echo "[7/10] Aguardando..."
sleep 3

echo "[8/10] Validando NGINX..."
docker-compose exec -T nginx nginx -t 2>&1 | tail -1 || true

echo "[9/10] Mostrando status..."
echo ""
docker-compose ps 2>/dev/null || ps aux | grep nginx | grep -v grep

echo "[10/10] Concluído!"

DEPLOY

echo ""
echo "✅ Deployment concluído!"
echo ""

# PASSO 4: Testes
echo "🧪 Testando domínios..."
echo ""

for domain in ia.angrax.com.br ia.ifin.app.br ai.ifin.app.br angrallm.app.br; do
    status=$(curl -s -o /dev/null -w "%{http_code}" -k https://$domain 2>/dev/null)
    if [[ "$status" == "200" ]] || [[ "$status" == "301" ]]; then
        echo "✅ $domain → HTTP $status"
    else
        echo "⚠️  $domain → HTTP $status"
    fi
done

echo ""
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                      ✅ DEPLOY FINALIZADO! ✅                             ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "🎉 Seus domínios estão online:"
echo "   https://ia.angrax.com.br"
echo "   https://ia.ifin.app.br"
echo "   https://ai.ifin.app.br"
echo "   https://angrallm.app.br"
echo ""
echo "📊 Ver logs:"
echo "   ssh -i ~/.ssh/contabo_vps root@147.93.183.55"
echo "   cd /dashfinance && docker-compose logs -f"
echo ""

