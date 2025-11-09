# 🚀 Deploy Frontend no VPS (Sem Docker)

## 📋 Informações do Servidor

- **IP**: `147.93.183.55`
- **Usuário**: `root`
- **SSH Key**: `./ssh_key.txt`
- **Diretório**: `/dashfinance/frontend`
- **Porta**: `3000`
- **Domínio**: `dashboard.ifinance.app.br`

## ⚡ Deploy Automático (Recomendado)

```bash
./deploy-frontend-vps.sh
```

O script fará automaticamente:
1. ✅ Build local de produção
2. ✅ Upload para servidor
3. ✅ Instalação de dependências
4. ✅ Configuração PM2
5. ✅ Configuração Nginx
6. ✅ Inicialização da aplicação

**Tempo estimado**: 5-10 minutos

---

## 🔧 Deploy Manual (Passo a Passo)

### 1. Build Local

```bash
cd finance-oraculo-frontend
npm install
npm run build
cd ..
```

### 2. Preparar Servidor

```bash
ssh -i ssh_key.txt root@147.93.183.55

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Instalar PM2
npm install -g pm2

# Criar diretório
mkdir -p /dashfinance/frontend
```

### 3. Upload Arquivos

```bash
# No seu Mac
rsync -avz --delete \
  -e "ssh -i ssh_key.txt" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.next/cache' \
  finance-oraculo-frontend/ \
  root@147.93.183.55:/dashfinance/frontend/
```

### 4. Configurar no Servidor

```bash
ssh -i ssh_key.txt root@147.93.183.55

cd /dashfinance/frontend

# Instalar dependências
npm ci --only=production

# Criar arquivo .env.production
nano .env.production
```

Cole suas variáveis:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xzrmzmcoslomtzkzgskn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL=https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1
```

### 5. Configurar PM2

```bash
# Criar ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'dashfinance-frontend',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3000',
    cwd: '/dashfinance/frontend',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/dashfinance-error.log',
    out_file: '/var/log/dashfinance-out.log',
    autorestart: true,
    max_memory_restart: '1G'
  }]
}
EOF

# Iniciar
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 6. Configurar Nginx

```bash
# Criar configuração
cat > /etc/nginx/sites-available/dashfinance-frontend << 'EOF'
server {
    listen 80;
    server_name dashboard.ifinance.app.br ifinance.app.br;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Habilitar
ln -sf /etc/nginx/sites-available/dashfinance-frontend /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## 🧪 Testar

```bash
# No servidor
curl -I http://localhost:3000
curl -I http://147.93.183.55

# Do seu Mac
curl -I http://147.93.183.55
```

---

## 📊 Comandos PM2

```bash
# Ver status
pm2 status

# Ver logs em tempo real
pm2 logs dashfinance-frontend

# Reiniciar
pm2 restart dashfinance-frontend

# Parar
pm2 stop dashfinance-frontend

# Monitor
pm2 monit

# Ver métricas
pm2 show dashfinance-frontend
```

---

## 🔄 Atualizar Aplicação

### Método 1: Script Automático
```bash
./deploy-frontend-vps.sh
```

### Método 2: Manual
```bash
# Build local
cd finance-oraculo-frontend
npm run build
cd ..

# Upload
rsync -avz -e "ssh -i ssh_key.txt" \
  finance-oraculo-frontend/.next/ \
  root@147.93.183.55:/dashfinance/frontend/.next/

# Reiniciar no servidor
ssh -i ssh_key.txt root@147.93.183.55 "pm2 restart dashfinance-frontend"
```

---

## 🔐 Configurar SSL (Opcional)

```bash
ssh -i ssh_key.txt root@147.93.183.55

# Instalar certbot
apt-get install -y certbot python3-certbot-nginx

# Obter certificado (certifique-se que o domínio aponta para o IP)
certbot --nginx -d dashboard.ifinance.app.br

# Auto-renovação
certbot renew --dry-run
```

---

## 🐛 Troubleshooting

### Aplicação não inicia
```bash
# Ver logs
pm2 logs dashfinance-frontend --lines 100

# Verificar porta
netstat -tlnp | grep 3000

# Testar Next.js manualmente
cd /dashfinance/frontend
NODE_ENV=production npm start
```

### Nginx retorna 502
```bash
# Verificar se PM2 está rodando
pm2 status

# Verificar logs do Nginx
tail -f /var/log/nginx/error.log

# Reiniciar Nginx
systemctl restart nginx
```

### Erro de memória
```bash
# Aumentar limite no ecosystem.config.js
max_memory_restart: '2G'

# Reiniciar
pm2 restart dashfinance-frontend
```

---

## 📦 Estrutura no Servidor

```
/dashfinance/
├── frontend/
│   ├── .next/                 # Build
│   ├── public/                # Assets estáticos
│   ├── node_modules/          # Dependências
│   ├── package.json
│   ├── .env.production        # Variáveis de ambiente
│   └── ecosystem.config.js    # Config PM2
└── n8n/                      # N8N (já instalado)
```

---

## 🌐 URLs

- **Frontend**: http://dashboard.ifinance.app.br
- **API (Supabase)**: https://xzrmzmcoslomtzkzgskn.supabase.co
- **N8N**: http://147.93.183.55:8081

---

## 📝 Notas

- **PM2 roda em modo cluster** (2 instâncias) para alta disponibilidade
- **Logs** estão em `/var/log/dashfinance-*.log`
- **Auto-restart** configurado caso a aplicação caia
- **Nginx** atua como reverse proxy na porta 80

---

## 🆘 Suporte

Em caso de problemas:

1. Verificar logs: `pm2 logs dashfinance-frontend`
2. Verificar status: `pm2 status`
3. Verificar Nginx: `nginx -t`
4. Verificar porta: `netstat -tlnp | grep 3000`

---

**Pronto para deploy!** 🎉

