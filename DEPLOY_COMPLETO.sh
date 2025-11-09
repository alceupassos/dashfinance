#!/bin/bash

# ============================================================================
# SCRIPT DE DEPLOY COMPLETO - DashFinance NGINX
# COPIE E COLE ESTE COMANDO NO SEU TERMINAL
# ============================================================================

SERVER_IP="147.93.183.55"
LOCAL_PATH="/Users/alceualvespasssosmac/dashfinance"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           🚀 NGINX DashFinance - Deploy Completo 🚀           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Servidor: $SERVER_IP"
echo "Arquivos: $LOCAL_PATH"
echo ""

# PASSO 1: Copiar arquivos
echo "📤 PASSO 1: Copiar arquivos para servidor..."
ssh root@$SERVER_IP "mkdir -p /dashfinance/{ssl,logs}"
scp $LOCAL_PATH/nginx.conf root@$SERVER_IP:/dashfinance/
scp $LOCAL_PATH/docker-compose.yml root@$SERVER_IP:/dashfinance/
scp $LOCAL_PATH/EXECUTE_NO_SERVIDOR.sh root@$SERVER_IP:/dashfinance/
echo "✅ Arquivos copiados"
echo ""

# PASSO 2: Executar deployment no servidor
echo "⚙️  PASSO 2: Executando deployment no servidor..."
ssh root@$SERVER_IP << 'DEPLOY'
#!/bin/bash

cd /dashfinance

echo "  1. Criando diretórios..."
mkdir -p /dashfinance/{ssl,logs}
chmod 755 /dashfinance

echo "  2. Instalando Certbot..."
apt-get update > /dev/null 2>&1
apt-get install -y certbot > /dev/null 2>&1

echo "  3. Gerando certificados SSL..."
certbot certonly --standalone \
  -d ia.angrax.com.br \
  -d ia.ifin.app.br \
  -d ai.ifin.app.br \
  -d angrallm.app.br \
  --agree-tos \
  --non-interactive \
  -m admin@dashfinance.com

echo "  4. Criando symlinks para certificados..."
ln -sf /etc/letsencrypt/live/ia.angrax.com.br/fullchain.pem /dashfinance/ssl/ia.angrax.com.br.crt
ln -sf /etc/letsencrypt/live/ia.angrax.com.br/privkey.pem /dashfinance/ssl/ia.angrax.com.br.key
ln -sf /etc/letsencrypt/live/ia.ifin.app.br/fullchain.pem /dashfinance/ssl/ia.ifin.app.br.crt
ln -sf /etc/letsencrypt/live/ia.ifin.app.br/privkey.pem /dashfinance/ssl/ia.ifin.app.br.key
ln -sf /etc/letsencrypt/live/ai.ifin.app.br/fullchain.pem /dashfinance/ssl/ai.ifin.app.br.crt
ln -sf /etc/letsencrypt/live/ai.ifin.app.br/privkey.pem /dashfinance/ssl/ai.ifin.app.br.key
ln -sf /etc/letsencrypt/live/angrallm.app.br/fullchain.pem /dashfinance/ssl/angrallm.app.br.crt
ln -sf /etc/letsencrypt/live/angrallm.app.br/privkey.pem /dashfinance/ssl/angrallm.app.br.key

echo "  5. Corrigindo permissões..."
chmod 600 /dashfinance/ssl/*.key 2>/dev/null || true
chmod 644 /dashfinance/ssl/*.crt 2>/dev/null || true

echo "  6. Iniciando Docker containers..."
docker-compose up -d

echo "  7. Aguardando containers..."
sleep 3

echo "  8. Validando NGINX..."
docker-compose exec -T nginx nginx -t

echo "✅ DEPLOYMENT COMPLETO!"

DEPLOY

echo ""
echo "✅ PASSO 2 Concluído"
echo ""

# PASSO 3: Verificações
echo "🔍 PASSO 3: Verificando status..."
ssh root@$SERVER_IP << 'VERIFY'
echo ""
echo "Status dos containers:"
cd /dashfinance && docker-compose ps
echo ""
echo "Health check:"
curl -s https://ia.angrax.com.br/health 2>/dev/null || echo "Aguarde alguns segundos..."
echo ""
VERIFY

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                  ✅ DEPLOY CONCLUÍDO COM SUCESSO! ✅          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "🎯 Próximas verificações:"
echo ""
echo "1. Testar domínios:"
echo "   curl -I https://ia.angrax.com.br"
echo "   curl -I https://ia.ifin.app.br"
echo "   curl -I https://ai.ifin.app.br"
echo "   curl -I https://angrallm.app.br"
echo ""
echo "2. Ver logs em tempo real:"
echo "   ssh root@$SERVER_IP 'cd /dashfinance && docker-compose logs -f'"
echo ""
echo "3. Monitorar certificados:"
echo "   ssh root@$SERVER_IP 'certbot certificates'"
echo ""
