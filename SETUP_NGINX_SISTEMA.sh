#!/bin/bash

SERVER_IP="147.93.183.55"
SSH_KEY="$HOME/.ssh/contabo_vps"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     🚀 SETUP NGINX DO SISTEMA 🚀                              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

ssh -i $SSH_KEY -o StrictHostKeyChecking=no root@$SERVER_IP << 'SETUP'

echo "[1/10] Parando NGINX..."
systemctl stop nginx
sleep 1
echo "✓ NGINX parado"

echo "[2/10] Removendo certificados antigos para nossos domínios..."
rm -rf /etc/letsencrypt/live/ia.angrax.com.br 2>/dev/null
rm -rf /etc/letsencrypt/live/ia.ifin.app.br 2>/dev/null
rm -rf /etc/letsencrypt/live/ai.ifin.app.br 2>/dev/null
rm -rf /etc/letsencrypt/live/angrallm.app.br 2>/dev/null
echo "✓ Certificados antigos removidos"

echo "[3/10] Gerando novos certificados Let's Encrypt..."
certbot certonly --standalone \
  -d ia.angrax.com.br \
  -d ia.ifin.app.br \
  -d ai.ifin.app.br \
  -d angrallm.app.br \
  --agree-tos \
  --non-interactive \
  -m admin@dashfinance.com \
  --preferred-challenges http > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✓ Certificados gerados com sucesso"
else
    echo "⚠️  Erro ao gerar, tentando com force-renewal..."
    certbot certonly --standalone \
      -d ia.angrax.com.br \
      -d ia.ifin.app.br \
      -d ai.ifin.app.br \
      -d angrallm.app.br \
      --agree-tos \
      --non-interactive \
      -m admin@dashfinance.com \
      --force-renewal > /dev/null 2>&1
fi

echo "[4/10] Criando diretório /etc/nginx/sites-available..."
mkdir -p /etc/nginx/sites-available
echo "✓ Diretório criado"

echo "[5/10] Configurando NGINX para os 4 domínios..."

# Criar arquivo de configuração
cat > /etc/nginx/sites-available/dashfinance << 'NGINX_CONF'
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
NGINX_CONF

echo "✓ Arquivo de configuração criado"

echo "[6/10] Habilitando site..."
cd /etc/nginx/sites-enabled
rm -f default
ln -sf /etc/nginx/sites-available/dashfinance ./dashfinance
echo "✓ Site habilitado"

echo "[7/10] Testando configuração NGINX..."
nginx -t
echo "✓ Configuração válida"

echo "[8/10] Iniciando NGINX..."
systemctl start nginx
sleep 1
echo "✓ NGINX iniciado"

echo "[9/10] Habilitando renovação automática de certificados..."
# Criar script de renovação
cat > /usr/local/bin/renew-certs.sh << 'RENEW'
#!/bin/bash
certbot renew --quiet
systemctl reload nginx
RENEW
chmod +x /usr/local/bin/renew-certs.sh

# Adicionar ao crontab
(crontab -l 2>/dev/null | grep -v "renew-certs"; echo "0 3 * * * /usr/local/bin/renew-certs.sh") | crontab -
echo "✓ Renovação automática configurada"

echo "[10/10] Verificando status..."
systemctl status nginx | head -3
echo ""

SETUP

echo ""
echo "✅ Setup do NGINX concluído!"
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

