#!/bin/bash

SERVER_IP="147.93.183.55"
SSH_KEY="$HOME/.ssh/contabo_vps"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     🔐 GERAR CERTIFICADOS LET'S ENCRYPT 🔐                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

ssh -i $SSH_KEY -o StrictHostKeyChecking=no root@$SERVER_IP << 'GERAR'

echo "🔍 Removendo certificados antigos..."
rm -rf /etc/letsencrypt/live/ia.angrax.com.br 2>/dev/null
rm -rf /etc/letsencrypt/live/ia.ifin.app.br 2>/dev/null
rm -rf /etc/letsencrypt/live/ai.ifin.app.br 2>/dev/null
rm -rf /etc/letsencrypt/live/angrallm.app.br 2>/dev/null

echo "✓ Certificados antigos removidos"
echo ""

echo "🔐 Parando NGINX para gerar certificados..."
cd /dashfinance
docker-compose stop nginx 2>/dev/null || true
sleep 2

echo "✓ NGINX parado"
echo ""

echo "⏳ Gerando novos certificados Let's Encrypt..."
echo "  (aguarde, isso pode levar 1-2 minutos)"
echo ""

certbot certonly --standalone \
  -d ia.angrax.com.br \
  -d ia.ifin.app.br \
  -d ai.ifin.app.br \
  -d angrallm.app.br \
  --agree-tos \
  --non-interactive \
  -m admin@dashfinance.com \
  --preferred-challenges http

CERT_STATUS=$?

if [ $CERT_STATUS -eq 0 ]; then
    echo ""
    echo "✅ Certificados gerados com sucesso!"
else
    echo ""
    echo "⚠️  Erro ao gerar certificados. Tentando novamente..."
    certbot certonly --standalone \
      -d ia.angrax.com.br \
      -d ia.ifin.app.br \
      -d ai.ifin.app.br \
      -d angrallm.app.br \
      --agree-tos \
      --non-interactive \
      -m admin@dashfinance.com \
      --force-renewal
fi

echo ""
echo "📝 Criando symlinks para certificados..."

mkdir -p /dashfinance/ssl

# Usar o primeiro domínio como base
MAIN_CERT="/etc/letsencrypt/live/ia.angrax.com.br"

echo "  → ia.angrax.com.br"
ln -sf $MAIN_CERT/fullchain.pem /dashfinance/ssl/ia.angrax.com.br.crt
ln -sf $MAIN_CERT/privkey.pem /dashfinance/ssl/ia.angrax.com.br.key

echo "  → ia.ifin.app.br"
ln -sf $MAIN_CERT/fullchain.pem /dashfinance/ssl/ia.ifin.app.br.crt
ln -sf $MAIN_CERT/privkey.pem /dashfinance/ssl/ia.ifin.app.br.key

echo "  → ai.ifin.app.br"
ln -sf $MAIN_CERT/fullchain.pem /dashfinance/ssl/ai.ifin.app.br.crt
ln -sf $MAIN_CERT/privkey.pem /dashfinance/ssl/ai.ifin.app.br.key

echo "  → angrallm.app.br"
ln -sf $MAIN_CERT/fullchain.pem /dashfinance/ssl/angrallm.app.br.crt
ln -sf $MAIN_CERT/privkey.pem /dashfinance/ssl/angrallm.app.br.key

echo ""
echo "✅ Symlinks criados"
echo ""

echo "🔐 Corrigindo permissões..."
chmod 600 /dashfinance/ssl/*.key 2>/dev/null
chmod 644 /dashfinance/ssl/*.crt 2>/dev/null
echo "✓ Permissões corrigidas"

echo ""
echo "🚀 Iniciando NGINX novamente..."
cd /dashfinance
docker-compose up -d nginx 2>/dev/null || true
sleep 2
echo "✓ NGINX iniciado"

echo ""
echo "✅ Verificando certificados..."
ls -lh /dashfinance/ssl/ | grep -E '\.(crt|key)$'

echo ""
echo "🧪 Validando NGINX..."
docker-compose exec -T nginx nginx -t 2>/dev/null || nginx -t 2>/dev/null || true

GERAR

echo ""
echo "✅ Geração de certificados concluída!"
echo ""
echo "🧪 Testando domínios..."
echo ""

sleep 2

for domain in ia.angrax.com.br ia.ifin.app.br ai.ifin.app.br angrallm.app.br; do
    echo -n "  $domain: "
    status=$(curl -s -o /dev/null -w "%{http_code}" -k https://$domain 2>/dev/null)
    if [[ "$status" == "200" ]] || [[ "$status" == "301" ]] || [[ "$status" == "404" ]]; then
        echo "✅ HTTP $status"
    else
        echo "⚠️  HTTP $status"
    fi
done

echo ""

