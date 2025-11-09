#!/bin/bash
# ==========================================
# DEPLOY FRONTEND - DASHFINANCE VPS
# ==========================================
# Servidor: 147.93.183.55
# Usuário: root
# Método: PM2 (sem Docker)
# ==========================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configurações
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER="root@147.93.183.55"
SSH_KEY="$SCRIPT_DIR/ssh_key.txt"
REMOTE_DIR="/dashfinance/frontend"
LOCAL_DIR="$SCRIPT_DIR/finance-oraculo-frontend"
APP_NAME="dashfinance-frontend"
PORT=3000
DOMAIN="www.ifin.app.br"

echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   DEPLOY FRONTEND - DASHFINANCE VPS   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

# 1. BUILD LOCAL
echo -e "${YELLOW}[1/7]${NC} Fazendo build de produção..."
cd "$LOCAL_DIR"

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "Instalando dependências..."
    npm install
fi

# Build
echo "Building..."
npm run build

echo -e "${GREEN}✓${NC} Build concluído"
echo ""

# 2. PREPARAR PACOTE
echo -e "${YELLOW}[2/7]${NC} Preparando pacote para deploy..."
cd ..

# Criar diretório temporário
rm -rf /tmp/dashfinance-deploy
mkdir -p /tmp/dashfinance-deploy

# Copiar apenas o necessário
cp -r "$LOCAL_DIR/.next" /tmp/dashfinance-deploy/
cp -r "$LOCAL_DIR/public" /tmp/dashfinance-deploy/
cp "$LOCAL_DIR/package.json" /tmp/dashfinance-deploy/
cp "$LOCAL_DIR/package-lock.json" /tmp/dashfinance-deploy/
cp "$LOCAL_DIR/next.config.mjs" /tmp/dashfinance-deploy/ 2>/dev/null || cp "$LOCAL_DIR/next.config.js" /tmp/dashfinance-deploy/ 2>/dev/null || echo "No next.config found"

# Copiar .env.local (renomear para .env.production)
if [ -f "$LOCAL_DIR/.env.local" ]; then
    cp "$LOCAL_DIR/.env.local" /tmp/dashfinance-deploy/.env.production
fi

echo -e "${GREEN}✓${NC} Pacote preparado em /tmp/dashfinance-deploy"
echo ""

# 3. CRIAR DIRETÓRIO NO SERVIDOR
echo -e "${YELLOW}[3/7]${NC} Preparando servidor..."
ssh -i "$SSH_KEY" "$SERVER" << 'EOF'
# Criar diretório
mkdir -p /dashfinance/frontend

# Instalar Node.js se não existir
if ! command -v node &> /dev/null; then
    echo "Instalando Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Instalar PM2 globalmente se não existir
if ! command -v pm2 &> /dev/null; then
    echo "Instalando PM2..."
    npm install -g pm2
fi

echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "PM2 version: $(pm2 -v)"
EOF

echo -e "${GREEN}✓${NC} Servidor preparado"
echo ""

# 4. UPLOAD DOS ARQUIVOS
echo -e "${YELLOW}[4/7]${NC} Enviando arquivos para o servidor..."

# Parar aplicação antiga se existir
ssh -i "$SSH_KEY" "$SERVER" "pm2 stop $APP_NAME 2>/dev/null || true"

# Fazer upload
rsync -avz --delete \
    -e "ssh -i $SSH_KEY" \
    /tmp/dashfinance-deploy/ \
    "$SERVER:$REMOTE_DIR/"

echo -e "${GREEN}✓${NC} Arquivos enviados"
echo ""

# 5. INSTALAR DEPENDÊNCIAS E CONFIGURAR
echo -e "${YELLOW}[5/7]${NC} Instalando dependências no servidor..."
ssh -i "$SSH_KEY" "$SERVER" << EOF
cd $REMOTE_DIR

# Instalar apenas dependências de produção
npm ci --only=production

# Criar arquivo ecosystem.config.js para PM2
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
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
}
EOFPM2

echo "ecosystem.config.js criado"
EOF

echo -e "${GREEN}✓${NC} Dependências instaladas"
echo ""

# 6. INICIAR APLICAÇÃO
echo -e "${YELLOW}[6/7]${NC} Iniciando aplicação..."
ssh -i "$SSH_KEY" "$SERVER" << EOF
cd $REMOTE_DIR

# Deletar PM2 anterior se existir
pm2 delete $APP_NAME 2>/dev/null || true

# Iniciar aplicação
pm2 start ecosystem.config.js

# Salvar configuração PM2
pm2 save

# Configurar PM2 para iniciar no boot
pm2 startup systemd -u root --hp /root 2>/dev/null || true

# Status
pm2 status
EOF

echo -e "${GREEN}✓${NC} Aplicação iniciada"
echo ""

# 7. CONFIGURAR NGINX
echo -e "${YELLOW}[7/7]${NC} Configurando Nginx..."
ssh -i "$SSH_KEY" "$SERVER" << 'EOF'
# Criar configuração Nginx
cat > /etc/nginx/sites-available/dashfinance-frontend << 'EOFNGINX'
server {
    listen 80;
    server_name www.ifin.app.br ifin.app.br;

    # Logs
    access_log /var/log/nginx/dashfinance-access.log;
    error_log /var/log/nginx/dashfinance-error.log;

    # Proxy para Next.js
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
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files optimization
    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 60m;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOFNGINX

# Habilitar site
ln -sf /etc/nginx/sites-available/dashfinance-frontend /etc/nginx/sites-enabled/

# Testar configuração
nginx -t

# Recarregar Nginx
systemctl reload nginx

echo "Nginx configurado"
EOF

echo -e "${GREEN}✓${NC} Nginx configurado"
echo ""

# RESUMO
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         DEPLOY CONCLUÍDO! 🚀           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "📍 URL: ${GREEN}http://$DOMAIN${NC}"
echo -e "📍 IP: ${GREEN}http://147.93.183.55${NC}"
echo -e "📂 Dir: ${GREEN}$REMOTE_DIR${NC}"
echo -e "⚙️  PM2: ${GREEN}pm2 status${NC}"
echo ""
echo "Comandos úteis no servidor:"
echo "  pm2 logs $APP_NAME       # Ver logs"
echo "  pm2 restart $APP_NAME    # Reiniciar"
echo "  pm2 stop $APP_NAME       # Parar"
echo "  pm2 monit                # Monitor"
echo ""
echo "Testar:"
echo "  curl -I http://147.93.183.55"
echo ""

