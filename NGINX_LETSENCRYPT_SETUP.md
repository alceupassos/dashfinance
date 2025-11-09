# 🔐 Let's Encrypt SSL Setup com Docker - DashFinance

## 📌 Visão Geral

Este guia mostra como configurar certificados SSL usando Let's Encrypt automaticamente com Certbot em Docker.

## 🏗️ Estrutura Alternativa com Certbot

Se você preferir gerenciar certificados automaticamente, use esta abordagem:

### docker-compose-letsencrypt.yml

```bash
ssh root@147.93.183.55 cat > /dashfinance/docker-compose-letsencrypt.yml << 'EOF'
version: '3.8'

services:
  # Certbot para gerenciar certificados Let's Encrypt
  certbot:
    image: certbot/certbot:latest
    container_name: dashfinance-certbot
    volumes:
      - ./letsencrypt:/etc/letsencrypt
      - ./ssl:/etc/nginx/ssl
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew --quiet; sleep 12h & wait $!; done'"
    restart: unless-stopped
    networks:
      - dashfinance-network

  # NGINX
  nginx:
    image: nginx:latest
    container_name: dashfinance-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./letsencrypt:/etc/letsencrypt:ro
      - nginx_logs:/var/log/nginx
    environment:
      - TZ=America/Sao_Paulo
    restart: unless-stopped
    depends_on:
      - certbot
    networks:
      - dashfinance-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    image: dashfinance-frontend:latest
    container_name: dashfinance-frontend
    ports:
      - "5173:5173"
    restart: unless-stopped
    networks:
      - dashfinance-network

  backend:
    image: dashfinance-backend:latest
    container_name: dashfinance-backend
    ports:
      - "3000:3000"
    restart: unless-stopped
    networks:
      - dashfinance-network

volumes:
  nginx_logs:

networks:
  dashfinance-network:
    driver: bridge
EOF
```

## 🚀 Passo a Passo com Let's Encrypt

### 1. SSH no Servidor

```bash
ssh root@147.93.183.55
cd /dashfinance
```

### 2. Criar Estrutura de Diretórios

```bash
mkdir -p /dashfinance/letsencrypt
mkdir -p /dashfinance/ssl
mkdir -p /dashfinance/logs
chmod 755 /dashfinance/letsencrypt
```

### 3. Instalar Certbot Localmente (antes de usar em Docker)

```bash
# Parar NGINX temporariamente (se estiver rodando)
docker-compose down

# Instalar certbot no sistema
apt-get update
apt-get install -y certbot python3-certbot-nginx

# Gerar certificados
certbot certonly --standalone \
  -d ia.angrax.com.br \
  -d ia.ifin.app.br \
  -d ai.ifin.app.br \
  -d angrallm.app.br \
  --agree-tos \
  -m seu-email@example.com

# Copiar certificados para o diretório correto
cp /etc/letsencrypt/live/ia.angrax.com.br/fullchain.pem /dashfinance/letsencrypt/ia.angrax.com.br.crt
cp /etc/letsencrypt/live/ia.angrax.com.br/privkey.pem /dashfinance/letsencrypt/ia.angrax.com.br.key

# Repetir para outros domínios
cp /etc/letsencrypt/live/ia.ifin.app.br/fullchain.pem /dashfinance/letsencrypt/ia.ifin.app.br.crt
cp /etc/letsencrypt/live/ia.ifin.app.br/privkey.pem /dashfinance/letsencrypt/ia.ifin.app.br.key

cp /etc/letsencrypt/live/ai.ifin.app.br/fullchain.pem /dashfinance/letsencrypt/ai.ifin.app.br.crt
cp /etc/letsencrypt/live/ai.ifin.app.br/privkey.pem /dashfinance/letsencrypt/ai.ifin.app.br.key

cp /etc/letsencrypt/live/angrallm.app.br/fullchain.pem /dashfinance/letsencrypt/angrallm.app.br.crt
cp /etc/letsencrypt/live/angrallm.app.br/privkey.pem /dashfinance/letsencrypt/angrallm.app.br.key

# Corrigir permissões
chmod 600 /dashfinance/letsencrypt/*.key
chmod 644 /dashfinance/letsencrypt/*.crt
```

### 4. Atualizar nginx.conf para Let's Encrypt

Atualize os caminhos no `nginx.conf`:

```nginx
# ANTES (ou ignorar se já está correto):
ssl_certificate /etc/nginx/ssl/ia.angrax.com.br.crt;
ssl_certificate_key /etc/nginx/ssl/ia.angrax.com.br.key;

# DEPOIS (para Let's Encrypt em Docker):
ssl_certificate /etc/letsencrypt/live/ia.angrax.com.br/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/ia.angrax.com.br/privkey.pem;
```

### 5. Iniciar com Docker Compose

```bash
docker-compose -f docker-compose-letsencrypt.yml up -d

# Verificar status
docker-compose -f docker-compose-letsencrypt.yml ps

# Ver logs
docker-compose -f docker-compose-letsencrypt.yml logs -f
```

## 🔄 Renovação Automática

Com Certbot em Docker, os certificados são renovados automaticamente a cada 12 horas.

Para verificar renovação:

```bash
# Ver logs do Certbot
docker logs dashfinance-certbot

# Testar renovação (sem realmente renovar)
docker exec dashfinance-certbot certbot renew --dry-run
```

## 📝 Alternativa: Nginx-Proxy com SSL Automático

Se quiser algo ainda mais automatizado, considere usar `nginx-proxy` com `docker-letsencrypt-nginx-proxy-companion`:

```yaml
version: '3.8'

services:
  nginx-proxy:
    image: nginxproxy/nginx-proxy:latest
    container_name: nginx-proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./certs:/etc/nginx/certs
      - ./dhparam:/etc/nginx/dhparam
    environment:
      - DHPARAM_GENERATION=true
    networks:
      - dashfinance-network

  acme-companion:
    image: nginxproxy/acme-companion:latest
    container_name: nginx-proxy-acme
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./certs:/etc/nginx/certs
      - ./vhost:/etc/nginx/vhost.d
      - ./html:/usr/share/nginx/html
      - ./acme-state:/etc/acme.sh
    environment:
      - NGINX_PROXY_CONTAINER=nginx-proxy
      - DEFAULT_EMAIL=seu-email@example.com
    networks:
      - dashfinance-network
    depends_on:
      - nginx-proxy

  frontend:
    image: dashfinance-frontend:latest
    container_name: dashfinance-frontend
    environment:
      - VIRTUAL_HOST=ia.angrax.com.br,ia.ifin.app.br,ai.ifin.app.br,angrallm.app.br
      - LETSENCRYPT_HOST=ia.angrax.com.br,ia.ifin.app.br,ai.ifin.app.br,angrallm.app.br
    networks:
      - dashfinance-network

networks:
  dashfinance-network:
    driver: bridge
```

## 🔍 Verificações

```bash
# Verificar certificados
docker exec dashfinance-certbot certbot certificates

# Verificar validade
openssl x509 -in /dashfinance/letsencrypt/ia.angrax.com.br.crt -noout -dates

# Testar HTTPS
curl -v https://ia.angrax.com.br
```

## 🚨 Troubleshooting

### Erro: "certbot: error: unrecognized arguments"

```bash
# Usar wildcard em vez de múltiplos domínios
certbot certonly --standalone \
  -d "*.ifin.app.br" \
  --agree-tos \
  -m seu-email@example.com
```

### Erro: "Connection refused on port 80"

```bash
# Certbot precisa da porta 80 livre temporariamente
docker-compose stop
certbot certonly --standalone -d seu-dominio.com
docker-compose up -d
```

### Renovação não está funcionando

```bash
# Forçar renovação
docker exec dashfinance-certbot certbot renew --force-renewal

# Verificar logs
docker logs dashfinance-certbot | tail -50
```

## 📋 Checklist Let's Encrypt

- [ ] Portas 80 e 443 abertas no firewall
- [ ] Domínios apontando para o IP correto
- [ ] Certbot instalado e certificates gerados
- [ ] Certificados copiados para `/dashfinance/letsencrypt/`
- [ ] Permissões corretas (600 para .key, 644 para .crt)
- [ ] nginx.conf atualizado com caminhos Let's Encrypt
- [ ] Containers iniciados com sucesso
- [ ] HTTPS funcionando para todos os domínios
- [ ] Renovação automática testada

## 📚 Referências

- Let's Encrypt: https://letsencrypt.org/
- Certbot: https://certbot.eff.org/
- Nginx Proxy Letsencrypt: https://github.com/nginx-proxy/docker-letsencrypt-nginx-proxy-companion

