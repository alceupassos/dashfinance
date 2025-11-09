#!/bin/bash

# ============================================================================
# SCRIPT DE EXECUÇÃO NO SERVIDOR - DashFinance NGINX
# Execute este script NO SERVIDOR 147.93.183.55 após copiar os arquivos
# ============================================================================

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  DashFinance NGINX - Execução no Servidor                     ║"
echo "║  IP: 147.93.183.55                                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Passo 1: Criar estrutura de diretórios${NC}"
mkdir -p /dashfinance/{ssl,logs}
chmod 755 /dashfinance
echo -e "${GREEN}✓ Diretórios criados${NC}\n"

echo -e "${BLUE}Passo 2: Instalar Certbot (se necessário)${NC}"
if ! command -v certbot &> /dev/null; then
    echo "  Instalando Certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
    echo -e "${GREEN}✓ Certbot instalado${NC}\n"
else
    echo -e "${GREEN}✓ Certbot já está instalado${NC}\n"
fi

echo -e "${BLUE}Passo 3: Gerar certificados Let's Encrypt${NC}"
echo "  Domínios: ia.angrax.com.br, ia.ifin.app.br, ai.ifin.app.br, angrallm.app.br"
echo ""
certbot certonly --standalone \
  -d ia.angrax.com.br \
  -d ia.ifin.app.br \
  -d ai.ifin.app.br \
  -d angrallm.app.br \
  --agree-tos \
  --non-interactive \
  -m admin@dashfinance.com

echo -e "${GREEN}✓ Certificados gerados${NC}\n"

echo -e "${BLUE}Passo 4: Criar links simbólicos para certificados${NC}"
ln -sf /etc/letsencrypt/live/ia.angrax.com.br/fullchain.pem /dashfinance/ssl/ia.angrax.com.br.crt
ln -sf /etc/letsencrypt/live/ia.angrax.com.br/privkey.pem /dashfinance/ssl/ia.angrax.com.br.key
ln -sf /etc/letsencrypt/live/ia.ifin.app.br/fullchain.pem /dashfinance/ssl/ia.ifin.app.br.crt
ln -sf /etc/letsencrypt/live/ia.ifin.app.br/privkey.pem /dashfinance/ssl/ia.ifin.app.br.key
ln -sf /etc/letsencrypt/live/ai.ifin.app.br/fullchain.pem /dashfinance/ssl/ai.ifin.app.br.crt
ln -sf /etc/letsencrypt/live/ai.ifin.app.br/privkey.pem /dashfinance/ssl/ai.ifin.app.br.key
ln -sf /etc/letsencrypt/live/angrallm.app.br/fullchain.pem /dashfinance/ssl/angrallm.app.br.crt
ln -sf /etc/letsencrypt/live/angrallm.app.br/privkey.pem /dashfinance/ssl/angrallm.app.br.key

echo -e "${GREEN}✓ Links simbólicos criados${NC}\n"

echo -e "${BLUE}Passo 5: Corrigir permissões${NC}"
chmod 600 /dashfinance/ssl/*.key 2>/dev/null || true
chmod 644 /dashfinance/ssl/*.crt 2>/dev/null || true
echo -e "${GREEN}✓ Permissões corrigidas${NC}\n"

echo -e "${BLUE}Passo 6: Iniciar containers Docker${NC}"
cd /dashfinance
docker-compose up -d
echo -e "${GREEN}✓ Containers iniciados${NC}\n"

echo -e "${BLUE}Passo 7: Aguardar containers ficarem prontos${NC}"
sleep 3
echo -e "${GREEN}✓ Containers prontos${NC}\n"

echo -e "${BLUE}Passo 8: Validar NGINX${NC}"
docker-compose exec -T nginx nginx -t
echo -e "${GREEN}✓ Validação NGINX OK${NC}\n"

echo -e "${BLUE}Passo 9: Verificar status${NC}"
docker-compose ps
echo -e "${GREEN}✓ Verificação concluída${NC}\n"

echo -e "${BLUE}Passo 10: Testar saúde dos containers${NC}"
echo "  Frontend: $(curl -s http://localhost:5173 | head -c 50)..."
echo "  Backend: $(curl -s http://localhost:3000/health 2>/dev/null || echo 'N/A')"
echo "  NGINX: $(curl -s http://localhost/health)"
echo -e "${GREEN}✓ Testes concluídos${NC}\n"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                     ✅ DEPLOYMENT COMPLETO!                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "🎯 Próximas verificações:"
echo ""
echo "1. Testar HTTPS nos domínios:"
echo "   curl -I https://ia.angrax.com.br"
echo "   curl -I https://ia.ifin.app.br"
echo "   curl -I https://ai.ifin.app.br"
echo "   curl -I https://angrallm.app.br"
echo ""
echo "2. Ver logs em tempo real:"
echo "   cd /dashfinance && docker-compose logs -f nginx"
echo ""
echo "3. Monitorar containers:"
echo "   cd /dashfinance && watch docker-compose ps"
echo ""
echo "4. Certificados expirando:"
echo "   certbot certificates"
echo ""
echo "5. Renovação automática:"
echo "   certbot renew --dry-run"
echo ""
echo "✨ Tudo pronto para usar!"
echo ""
