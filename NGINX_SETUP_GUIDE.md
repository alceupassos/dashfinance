# Guia de Configuração NGINX - DashFinance

## 📋 Visão Geral

Este guia descreve como configurar e fazer o deploy do NGINX para os seguintes domínios apontando para **147.93.183.55**:

- `ia.angrax.com.br`
- `ia.ifin.app.br`
- `ai.ifin.app.br`
- `angrallm.app.br`

## 🏗️ Estrutura de Arquivos

```
dashfinance/
├── nginx.conf              # Configuração principal do NGINX
├── docker-compose.yml      # Orquestração de containers
├── ssl/                    # Diretório para certificados SSL (criar manualmente)
│   ├── ia.angrax.com.br.crt
│   ├── ia.angrax.com.br.key
│   ├── ia.ifin.app.br.crt
│   ├── ia.ifin.app.br.key
│   ├── ai.ifin.app.br.crt
│   ├── ai.ifin.app.br.key
│   ├── angrallm.app.br.crt
│   └── angrallm.app.br.key
└── NGINX_SETUP_GUIDE.md    # Este arquivo
```

## 🔐 Pré-requisitos

1. **Servidor Linux** com IP `147.93.183.55`
2. **Docker e Docker Compose** instalados
3. **Certificados SSL** para cada domínio (Let's Encrypt ou outro CA)
4. **Acesso SSH** ao servidor
5. **DNS** configurado para apontar todos os domínios para `147.93.183.55`

## 🔑 Configuração de Certificados SSL

### Opção 1: Usando Let's Encrypt (Recomendado)

```bash
# SSH no servidor
ssh root@147.93.183.55

# Instalar Certbot
apt-get update
apt-get install -y certbot python3-certbot-nginx

# Gerar certificados para cada domínio
certbot certonly --standalone \
  -d ia.angrax.com.br \
  -d ia.ifin.app.br \
  -d ai.ifin.app.br \
  -d angrallm.app.br

# Os certificados ficarão em: /etc/letsencrypt/live/[dominio]/
```

### Opção 2: Certificado Wildcard

Se todos os domínios compartilham um mesmo domínio pai, você pode usar um certificado wildcard.

## 🚀 Deployment no Servidor

### 1. Copiar arquivos para o servidor

```bash
# Do seu computador local
scp -r /Users/alceualvespasssosmac/dashfinance/nginx.conf root@147.93.183.55:/dashfinance/
scp -r /Users/alceualvespasssosmac/dashfinance/docker-compose.yml root@147.93.183.55:/dashfinance/
```

### 2. Criar estrutura de diretórios no servidor

```bash
ssh root@147.93.183.55

# Criar diretórios
mkdir -p /dashfinance/ssl
mkdir -p /dashfinance/logs

# Se usando Let's Encrypt, criar symlinks
ln -s /etc/letsencrypt/live/ia.angrax.com.br/fullchain.pem /dashfinance/ssl/ia.angrax.com.br.crt
ln -s /etc/letsencrypt/live/ia.angrax.com.br/privkey.pem /dashfinance/ssl/ia.angrax.com.br.key

# Repetir para outros domínios...
```

### 3. Iniciar containers

```bash
cd /dashfinance

# Construir imagens (se necessário)
# docker build -t dashfinance-frontend ./finance-oraculo-frontend
# docker build -t dashfinance-backend ./finance-oraculo-backend

# Iniciar serviços
docker-compose up -d

# Verificar status
docker-compose ps

# Ver logs
docker-compose logs -f nginx
```

### 4. Verificar configuração NGINX

```bash
# Entrar no container
docker exec -it dashfinance-nginx bash

# Testar configuração
nginx -t

# Recarregar configuração (sem reiniciar)
nginx -s reload
```

## ✅ Validação

### 1. Teste de conectividade HTTPS

```bash
# Testar cada domínio
curl -I https://ia.angrax.com.br
curl -I https://ia.ifin.app.br
curl -I https://ai.ifin.app.br
curl -I https://angrallm.app.br

# Verificar certificado
openssl s_client -connect ia.angrax.com.br:443
```

### 2. Teste de health check

```bash
curl -I http://147.93.183.55/health
```

### 3. Monitorar logs

```bash
# Terminal 1: NGINX access log
docker exec -f dashfinance-nginx tail -f /var/log/nginx/access.log

# Terminal 2: NGINX error log
docker exec -f dashfinance-nginx tail -f /var/log/nginx/error.log
```

## 🔄 Manutenção

### Renovação de Certificados Let's Encrypt

```bash
# Manual (a cada 3 meses)
ssh root@147.93.183.55
certbot renew --force-renewal

# Ou automatizar com cron
# Adicionar ao crontab
0 0 1 * * certbot renew && systemctl restart docker
```

### Atualizar configuração NGINX

```bash
# Editar nginx.conf localmente
nano nginx.conf

# Copiar para servidor
scp nginx.conf root@147.93.183.55:/dashfinance/

# Recarregar NGINX
ssh root@147.93.183.55 "cd /dashfinance && docker-compose exec -T nginx nginx -s reload"
```

### Backup de configuração

```bash
# Backup local
tar -czf nginx-backup-$(date +%Y%m%d).tar.gz nginx.conf ssl/

# Backup remoto
ssh root@147.93.183.55 "tar -czf /backups/nginx-$(date +%Y%m%d).tar.gz /dashfinance/"
```

## 🆘 Troubleshooting

### Erro: "connection refused" no health check

```bash
# Verificar se frontend/backend estão rodando
docker-compose ps

# Iniciar serviços ausentes
docker-compose up -d
```

### Erro: "SSL certificate problem"

```bash
# Verificar certificados
ls -la /dashfinance/ssl/

# Verificar permissões
chmod 600 /dashfinance/ssl/*.key
chmod 644 /dashfinance/ssl/*.crt

# Recarregar NGINX
docker exec dashfinance-nginx nginx -s reload
```

### Erro: "502 Bad Gateway"

```bash
# Verificar se backend está respondendo
docker exec dashfinance-backend curl http://localhost:3000/health

# Verificar logs do backend
docker-compose logs backend
```

### NGINX não inicia

```bash
# Validar sintaxe
docker exec dashfinance-nginx nginx -t

# Ver erros completos
docker-compose logs nginx
```

## 📊 Configuração de Upstream

A configuração atual usa:
- **Frontend**: localhost:5173 (Vite/React)
- **Backend**: localhost:3000 (Node.js/Express)

Para alterar, edite `nginx.conf`:

```nginx
upstream backend_api {
    server seu-backend-host:sua-porta;
}

upstream frontend_app {
    server seu-frontend-host:sua-porta;
}
```

## 🔒 Segurança

### Headers de Segurança

Já configurados em cada server block:
- HSTS (HTTP Strict Transport Security)
- X-Frame-Options (SAMEORIGIN)
- X-Content-Type-Options (nosniff)
- X-XSS-Protection

### Rate Limiting (Opcional)

Para adicionar rate limiting, edite `nginx.conf`:

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    proxy_pass http://backend_api;
}
```

## 📞 Suporte

Para questões específicas:
1. Verificar logs: `docker-compose logs -f`
2. Testar configuração: `docker exec dashfinance-nginx nginx -t`
3. Consultar documentação NGINX: https://nginx.org/en/docs/

## 📝 Checklist Final

- [ ] Domínios DNS apontam para 147.93.183.55
- [ ] Certificados SSL instalados em `/dashfinance/ssl/`
- [ ] docker-compose.yml copiado para servidor
- [ ] nginx.conf copiado para servidor
- [ ] Containers iniciados com `docker-compose up -d`
- [ ] HTTPS funcionando para todos os domínios
- [ ] Health check respondendo
- [ ] Logs sendo gerados corretamente
- [ ] Certificados configurados para renovação automática

