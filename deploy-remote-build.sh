#!/bin/bash
# ==========================================
# DEPLOY FRONTEND - BUILD REMOTO NO SERVIDOR
# ==========================================

set -e

# Configurações
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER="root@147.93.183.55"
SSH_KEY="$SCRIPT_DIR/ssh_key.txt"
REMOTE_DIR="/dashfinance/frontend"
LOCAL_DIR="$SCRIPT_DIR/finance-oraculo-frontend"
APP_NAME="dashfinance-frontend"
PORT=3000
DOMAIN="www.ifin.app.br"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   DEPLOY FRONTEND (BUILD REMOTO)      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

# 1. UPLOAD CÓDIGO FONTE
echo -e "${YELLOW}[1/5]${NC} Enviando código fonte..."
rsync -avz --delete \
  -e "ssh -i $SSH_KEY" \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.git' \
  --exclude='*.log' \
  "$LOCAL_DIR/" \
  "$SERVER:$REMOTE_DIR/"

echo -e "${GREEN}✓${NC} Código enviado"
echo ""

# 2. BUILD NO SERVIDOR
echo -e "${YELLOW}[2/5]${NC} Instalando dependências e fazendo build no servidor..."
ssh -i "$SSH_KEY" "$SERVER" << EOF
set -e
cd $REMOTE_DIR

# Instalar Node.js se necessário
if ! command -v node &> /dev/null; then
    echo "Instalando Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Instalar PM2 se necessário
if ! command -v pm2 &> /dev/null; then
    echo "Instalando PM2..."
    npm install -g pm2
fi

# Limpar node_modules antigo
echo "Limpando node_modules antigo..."
rm -rf node_modules .next

# Instalar dependências
echo "Instalando dependências..."
npm install

# Build
echo "Building..."
npm run build --if-present || NODE_ENV=production npx next build

echo "Build concluído!"
EOF

echo -e "${GREEN}✓${NC} Build concluído"
echo ""

# 3. CONFIGURAR PM2
echo -e "${YELLOW}[3/5]${NC} Configurando PM2..."
ssh -i "$SSH_KEY" "$SERVER" << EOF
cd $REMOTE_DIR

cat > ecosystem.config.js << 'EOFPM2'
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p $PORT',
    cwd: '$REMOTE_DIR',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: $PORT
    },
    error_file: '/var/log/dashfinance-error.log',
    out_file: '/var/log/dashfinance-out.log',
    autorestart: true,
    max_memory_restart: '1G'
  }]
}
EOFPM2

# Parar e iniciar
pm2 delete $APP_NAME 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 list
EOF

echo -e "${GREEN}✓${NC} PM2 configurado"
echo ""

# 4. CONFIGURAR NGINX
echo -e "${YELLOW}[4/5]${NC} Configurando Nginx..."
ssh -i "$SSH_KEY" "$SERVER" << 'EOF'
cat > /etc/nginx/sites-available/dashfinance-frontend << 'EOFNGINX'
server {
    listen 80;
    server_name www.ifin.app.br ifin.app.br;

    access_log /var/log/nginx/dashfinance-access.log;
    error_log /var/log/nginx/dashfinance-error.log;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOFNGINX

ln -sf /etc/nginx/sites-available/dashfinance-frontend /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
EOF

echo -e "${GREEN}✓${NC} Nginx configurado"
echo ""

# 5. TESTAR
echo -e "${YELLOW}[5/5]${NC} Testando..."
sleep 3
ssh -i "$SSH_KEY" "$SERVER" "curl -I http://localhost:3000 2>/dev/null | head -n 1" || echo "Aguardando inicialização..."

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         DEPLOY CONCLUÍDO! 🚀           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "📍 URL: ${GREEN}http://$DOMAIN${NC}"
echo -e "📍 IP: ${GREEN}http://147.93.183.55${NC}"
echo ""
echo "Comandos úteis:"
echo "  ssh -i ssh_key.txt root@147.93.183.55 'pm2 logs $APP_NAME'"
echo "  ssh -i ssh_key.txt root@147.93.183.55 'pm2 restart $APP_NAME'"
echo ""

