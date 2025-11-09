#!/bin/bash

# ============================================================================
# 🚀 SCRIPT DE SETUP FINAL - EXECUTE NO SERVIDOR
# ============================================================================
# Execute no servidor: bash /root/SCRIPT_PARA_SERVIDOR.sh
# ============================================================================

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                            ║"
echo "║           🚀 SETUP FINAL NGINX DASHFINANCE - SERVIDOR 🚀                  ║"
echo "║                                                                            ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# PASSO 1: Preparar diretórios
# ============================================================================
echo "📁 PASSO 1: Preparando diretórios..."
mkdir -p ~/.ssh
mkdir -p /dashfinance/{ssl,logs}
chmod 700 ~/.ssh
chmod 755 /dashfinance
echo "✅ Diretórios prontos"
echo ""

# ============================================================================
# PASSO 2: Adicionar chave SSH para IA
# ============================================================================
echo "🔐 PASSO 2: Configurando acesso SSH para IA..."

# Chave pública da IA (será adicionada ao authorized_keys)
IA_SSH_KEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIK+DYvh6SEqVSp2r7XQBWAa7/hkESfsF3PH7TzKqEe7B ia-dashfinance@20251108"

# Adicionar chave se não existir
if grep -q "ia-dashfinance" ~/.ssh/authorized_keys 2>/dev/null; then
    echo "✓ Chave já existe"
else
    echo "$IA_SSH_KEY" >> ~/.ssh/authorized_keys
    echo "✓ Chave adicionada"
fi

chmod 600 ~/.ssh/authorized_keys
echo "✅ SSH configurado"
echo ""

# ============================================================================
# PASSO 3: Parar NGINX
# ============================================================================
echo "🛑 PASSO 3: Parando NGINX..."
systemctl stop nginx || true
sleep 1
echo "✅ NGINX parado"
echo ""

# ============================================================================
# PASSO 4: Gerar certificados Let's Encrypt
# ============================================================================
echo "🔐 PASSO 4: Gerando certificados Let's Encrypt..."

# Remover certificados antigos para nossos domínios
rm -rf /etc/letsencrypt/live/ia.angrax.com.br 2>/dev/null || true
rm -rf /etc/letsencrypt/live/ia.ifin.app.br 2>/dev/null || true
rm -rf /etc/letsencrypt/live/ai.ifin.app.br 2>/dev/null || true
rm -rf /etc/letsencrypt/live/angrallm.app.br 2>/dev/null || true

# Gerar novos certificados
certbot certonly --standalone \
  -d ia.angrax.com.br \
  -d ia.ifin.app.br \
  -d ai.ifin.app.br \
  -d angrallm.app.br \
  --agree-tos \
  --non-interactive \
  -m admin@dashfinance.com \
  --preferred-challenges http 2>&1 | tail -5

echo "✅ Certificados gerados"
echo ""

# ============================================================================
# PASSO 5: Criar arquivo de configuração NGINX
# ============================================================================
echo "⚙️  PASSO 5: Configurando NGINX..."

cat > /etc/nginx/sites-available/dashfinance << 'NGINX_CONFIG'
# HTTP redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ia.angrax.com.br ia.ifin.app.br ai.ifin.app.br angrallm.app.br;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# ia.angrax.com.br
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ia.angrax.com.br;
    
    ssl_certificate /etc/letsencrypt/live/ia.angrax.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ia.angrax.com.br/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}

# ia.ifin.app.br
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ia.ifin.app.br;
    
    ssl_certificate /etc/letsencrypt/live/ia.angrax.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ia.angrax.com.br/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}

# ai.ifin.app.br
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ai.ifin.app.br;
    
    ssl_certificate /etc/letsencrypt/live/ia.angrax.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ia.angrax.com.br/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}

# angrallm.app.br
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name angrallm.app.br;
    
    ssl_certificate /etc/letsencrypt/live/ia.angrax.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ia.angrax.com.br/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
NGINX_CONFIG

# Habilitar site
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/dashfinance /etc/nginx/sites-enabled/dashfinance

echo "✅ NGINX configurado"
echo ""

# ============================================================================
# PASSO 6: Validar configuração NGINX
# ============================================================================
echo "✔️  PASSO 6: Validando NGINX..."
nginx -t
echo "✅ Validação OK"
echo ""

# ============================================================================
# PASSO 7: Iniciar NGINX
# ============================================================================
echo "🚀 PASSO 7: Iniciando NGINX..."
systemctl start nginx
sleep 2
echo "✅ NGINX iniciado"
echo ""

# ============================================================================
# PASSO 8: Configurar renovação automática de certificados
# ============================================================================
echo "🔄 PASSO 8: Configurando renovação automática..."

# Criar script de renovação
cat > /usr/local/bin/renew-certs.sh << 'RENEW_SCRIPT'
#!/bin/bash
/usr/bin/certbot renew --quiet
/bin/systemctl reload nginx
RENEW_SCRIPT

chmod +x /usr/local/bin/renew-certs.sh

# Adicionar ao crontab
(crontab -l 2>/dev/null | grep -v "renew-certs"; echo "0 3 * * * /usr/local/bin/renew-certs.sh") | crontab - 2>/dev/null || true

echo "✅ Renovação automática configurada"
echo ""

# ============================================================================
# PASSO 9: Verificar status
# ============================================================================
echo "📊 PASSO 9: Status final..."
echo ""

echo "Certificados:"
ls -lh /etc/letsencrypt/live/ia.angrax.com.br/ | grep -E "(fullchain|privkey)"
echo ""

echo "NGINX Status:"
systemctl status nginx | head -3
echo ""

echo "Portas abertas:"
netstat -tlnp 2>/dev/null | grep -E ":(80|443)" || ss -tlnp 2>/dev/null | grep -E ":(80|443)"
echo ""

# ============================================================================
# RESULTADO FINAL
# ============================================================================
echo ""
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                            ║"
echo "║                   ✅ SETUP CONCLUÍDO COM SUCESSO! ✅                      ║"
echo "║                                                                            ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

echo "🎯 STATUS FINAL:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ NGINX rodando em 147.93.183.55"
echo "✅ Portas 80 e 443 abertas"
echo "✅ Certificados Let's Encrypt instalados"
echo "✅ 4 domínios configurados com proxy reverso"
echo "✅ SSL/TLS com segurança moderna"
echo "✅ Renovação automática ativa"
echo "✅ Acesso SSH para IA configurado"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔗 Domínios (após DNS estar correto):"
echo "   https://ia.angrax.com.br"
echo "   https://ia.ifin.app.br"
echo "   https://ai.ifin.app.br"
echo "   https://angrallm.app.br"
echo ""
echo "📋 Próximos passos:"
echo "   1. Garantir que DNS aponta corretamente para 147.93.183.55"
echo "   2. Testar: curl -I https://ia.angrax.com.br"
echo "   3. Monitorar logs: tail -f /var/log/nginx/error.log"
echo ""
echo "✨ Tudo pronto! 🚀"
echo ""

