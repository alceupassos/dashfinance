#!/bin/bash

# ==========================================
# SETUP COMPLETO DO SERVIDOR VPS
# Configura PM2 + Nginx para produção
# ==========================================

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

SERVER="root@147.93.183.55"
SSH_KEY="./ssh_key.txt"
REMOTE_DIR="/dashfinance/frontend"
APP_NAME="dashfinance-frontend"
PORT=3000
DOMAIN="www.ifin.app.br"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    SETUP SERVIDOR VPS - PRODUÇÃO      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Verificar se SSH key existe
if [ ! -f "$SSH_KEY" ]; then
  echo -e "${RED}❌ Erro: SSH key não encontrada em $SSH_KEY${NC}"
  exit 1
fi

# Corrigir permissões da chave SSH
chmod 600 "$SSH_KEY"

echo -e "${YELLOW}🔑 Conectando ao servidor ${SERVER}...${NC}"
echo ""

# ==========================================
# ETAPA 1: CONFIGURAR PM2
# ==========================================

echo -e "${BLUE}═══ ETAPA 1: Configurar PM2 ═══${NC}"
echo ""

ssh -i "$SSH_KEY" "$SERVER" << 'ENDSSH'
set -e

# Cores para output remoto
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}1.1. Verificando Node.js e npm...${NC}"
node -v
npm -v

echo -e "${YELLOW}1.2. Instalando PM2 globalmente...${NC}"
npm install -g pm2 || echo "PM2 já instalado"

echo -e "${YELLOW}1.3. Parando processos antigos...${NC}"
pm2 delete dashfinance-frontend 2>/dev/null || echo "Nenhum processo antigo encontrado"

echo -e "${YELLOW}1.4. Iniciando aplicação com PM2...${NC}"
cd /dashfinance/frontend

# Verificar se o build existe
if [ ! -d ".next" ]; then
  echo "Build não encontrado. Execute deploy-remote-build.sh primeiro!"
  exit 1
fi

# Iniciar com PM2
pm2 start npm --name "dashfinance-frontend" -- start

echo -e "${YELLOW}1.5. Configurando PM2 para iniciar no boot...${NC}"
pm2 startup systemd -u root --hp /root || true
pm2 save

echo -e "${YELLOW}1.6. Status do PM2:${NC}"
pm2 list
pm2 info dashfinance-frontend

echo -e "${GREEN}✓ PM2 configurado com sucesso!${NC}"
echo ""

ENDSSH

# ==========================================
# ETAPA 2: CONFIGURAR NGINX
# ==========================================

echo -e "${BLUE}═══ ETAPA 2: Configurar Nginx ═══${NC}"
echo ""

ssh -i "$SSH_KEY" "$SERVER" << 'ENDSSH'
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}2.1. Verificando se Nginx está instalado...${NC}"
if ! command -v nginx &> /dev/null; then
  echo "Instalando Nginx..."
  apt update
  apt install -y nginx
else
  echo "Nginx já instalado"
fi

echo -e "${YELLOW}2.2. Criando configuração do site...${NC}"
cat > /etc/nginx/sites-available/dashfinance-frontend << 'EOF'
server {
    listen 80;
    server_name www.ifin.app.br ifin.app.br;

    # Logs
    access_log /var/log/nginx/dashfinance-access.log;
    error_log /var/log/nginx/dashfinance-error.log;

    # Aumentar limites para upload
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        
        # Headers padrão
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Cache
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Assets estáticos do Next.js
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=3600, immutable";
    }

    # Favicon e imagens
    location ~* \.(ico|jpg|jpeg|png|gif|svg|webp)$ {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=86400";
    }
}
EOF

echo -e "${YELLOW}2.3. Removendo configuração default (se existir)...${NC}"
rm -f /etc/nginx/sites-enabled/default

echo -e "${YELLOW}2.4. Ativando site...${NC}"
ln -sf /etc/nginx/sites-available/dashfinance-frontend /etc/nginx/sites-enabled/

echo -e "${YELLOW}2.5. Testando configuração do Nginx...${NC}"
nginx -t

echo -e "${YELLOW}2.6. Recarregando Nginx...${NC}"
systemctl reload nginx
systemctl status nginx --no-pager | head -10

echo -e "${GREEN}✓ Nginx configurado com sucesso!${NC}"
echo ""

ENDSSH

# ==========================================
# ETAPA 3: VERIFICAR SERVIÇOS
# ==========================================

echo -e "${BLUE}═══ ETAPA 3: Verificar Serviços ═══${NC}"
echo ""

ssh -i "$SSH_KEY" "$SERVER" << 'ENDSSH'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}3.1. Status do PM2:${NC}"
pm2 list

echo ""
echo -e "${YELLOW}3.2. Status do Nginx:${NC}"
systemctl status nginx --no-pager | head -5

echo ""
echo -e "${YELLOW}3.3. Testando conexão local:${NC}"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000 || echo "Erro ao conectar"

echo ""
echo -e "${YELLOW}3.4. Últimos logs do PM2:${NC}"
pm2 logs dashfinance-frontend --lines 20 --nostream

ENDSSH

# ==========================================
# RESUMO FINAL
# ==========================================

echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              SETUP CONCLUÍDO           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ PM2 configurado e rodando${NC}"
echo -e "${GREEN}✅ Nginx configurado como reverse proxy${NC}"
echo -e "${GREEN}✅ Aplicação acessível em: http://${DOMAIN}${NC}"
echo ""
echo -e "${YELLOW}📝 Próximos passos:${NC}"
echo "   1. Testar no navegador: http://${DOMAIN}"
echo "   2. Configurar SSL com Certbot (opcional):"
echo "      ssh -i $SSH_KEY $SERVER"
echo "      apt install certbot python3-certbot-nginx"
echo "      certbot --nginx -d www.ifin.app.br -d ifin.app.br"
echo ""
echo -e "${YELLOW}🔍 Comandos úteis:${NC}"
echo "   # Ver logs do PM2"
echo "   ssh -i $SSH_KEY $SERVER 'pm2 logs dashfinance-frontend'"
echo ""
echo "   # Ver logs do Nginx"
echo "   ssh -i $SSH_KEY $SERVER 'tail -f /var/log/nginx/dashfinance-error.log'"
echo ""
echo "   # Reiniciar aplicação"
echo "   ssh -i $SSH_KEY $SERVER 'pm2 restart dashfinance-frontend'"
echo ""
echo "   # Status dos serviços"
echo "   ssh -i $SSH_KEY $SERVER 'pm2 list && systemctl status nginx'"
echo ""

