# 🚀 Quick Start - NGINX Setup DashFinance

## 📍 Resumo Rápido

Você precisa apontar 4 domínios para o IP **147.93.183.55**:

```
ia.angrax.com.br     → 147.93.183.55
ia.ifin.app.br       → 147.93.183.55
ai.ifin.app.br       → 147.93.183.55
angrallm.app.br      → 147.93.183.55
```

## ✅ Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `nginx.conf` | Configuração principal do NGINX com todos os 4 domínios |
| `docker-compose.yml` | Orquestração de containers (NGINX + Frontend + Backend) |
| `deploy-nginx.sh` | Script automático de deployment |
| `NGINX_SETUP_GUIDE.md` | Guia completo com passo-a-passo |
| `NGINX_QUICK_START.md` | Este arquivo |

## ⚡ 3 Passos Para Deploy

### 1️⃣ Preparar Certificados SSL

```bash
# SSH no servidor
ssh root@147.93.183.55

# Instalar Certbot
apt-get update && apt-get install -y certbot

# Gerar certificados (escolha uma opção)
# OPÇÃO A: Certificados individuais
certbot certonly --standalone \
  -d ia.angrax.com.br \
  -d ia.ifin.app.br \
  -d ai.ifin.app.br \
  -d angrallm.app.br

# Certificados estarão em: /etc/letsencrypt/live/[dominio]/
```

### 2️⃣ Copiar Arquivos e Setup

```bash
# Do seu computador local
chmod +x /Users/alceualvespasssosmac/dashfinance/deploy-nginx.sh

# Executar script de deployment (interativo)
/Users/alceualvespasssosmac/dashfinance/deploy-nginx.sh

# OU executar via linha de comando
/Users/alceualvespasssosmac/dashfinance/deploy-nginx.sh deploy
```

### 3️⃣ Verificar Status

```bash
# Testar domínios
curl -I https://ia.angrax.com.br
curl -I https://ia.ifin.app.br
curl -I https://ai.ifin.app.br
curl -I https://angrallm.app.br

# SSH e verificar containers
ssh root@147.93.183.55 "cd /dashfinance && docker-compose ps"
```

## 📋 DNS Configuration (Seu Registrador)

Para cada domínio no seu registrador de DNS, adicione um registro A:

```
Domain: ia.angrax.com.br
Type: A
Value: 147.93.183.55
TTL: 3600

Domain: ia.ifin.app.br
Type: A
Value: 147.93.183.55
TTL: 3600

Domain: ai.ifin.app.br
Type: A
Value: 147.93.183.55
TTL: 3600

Domain: angrallm.app.br
Type: A
Value: 147.93.183.55
TTL: 3600
```

## 🔧 Configuração NGINX

### Estrutura de Arquivos no Servidor

```
/dashfinance/
├── nginx.conf              # Configuração (já está configurada)
├── docker-compose.yml      # Containers
├── ssl/                    # Certificados SSL
│   ├── ia.angrax.com.br.crt
│   ├── ia.angrax.com.br.key
│   ├── ia.ifin.app.br.crt
│   ├── ia.ifin.app.br.key
│   ├── ai.ifin.app.br.crt
│   ├── ai.ifin.app.br.key
│   ├── angrallm.app.br.crt
│   └── angrallm.app.br.key
└── logs/                   # Logs do NGINX
```

### Como o NGINX Funciona

```
Cliente (HTTPS) 
    ↓
NGINX (porta 443)
    ├─→ / → Frontend (localhost:5173)
    └─→ /api/ → Backend (localhost:3000)
```

## 🔍 Verificações Rápidas

```bash
# Entrar no servidor
ssh root@147.93.183.55

# Ver status dos containers
cd /dashfinance && docker-compose ps

# Ver logs do NGINX
docker-compose logs -f nginx

# Testar configuração
docker-compose exec nginx nginx -t

# Ver certificados instalados
ls -la /dashfinance/ssl/
```

## ⚠️ Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| "Connection refused" | Verificar se containers estão rodando: `docker-compose ps` |
| "SSL certificate problem" | Verificar se certificados estão em `/dashfinance/ssl/` com permissões corretas |
| "502 Bad Gateway" | Frontend/Backend não estão rodando: `docker-compose up -d` |
| "nginx test failed" | Editar `nginx.conf` e verificar sintaxe |

## 📞 Comandos Úteis

```bash
# Parar tudo
docker-compose stop

# Reiniciar NGINX apenas
docker-compose restart nginx

# Ver logs em tempo real
docker-compose logs -f

# Atualizar configuração NGINX
# 1. Editar nginx.conf localmente
# 2. Copiar para servidor
# 3. Executar: docker-compose exec nginx nginx -s reload
```

## 🔐 Segurança

Já configurado no `nginx.conf`:
- ✅ HTTPS forçado (HTTP 301 redirect)
- ✅ TLS 1.2 + 1.3 apenas
- ✅ Headers de segurança (HSTS, X-Frame-Options, etc)
- ✅ Logging de acesso e erro

## 📚 Documentação Completa

Para configurações avançadas, customizações e troubleshooting detalhado:
👉 Veja: `NGINX_SETUP_GUIDE.md`

## ✨ Próximos Passos

1. ✅ Criar certificados SSL (Let's Encrypt)
2. ✅ Rodar script de deployment
3. ✅ Verificar domínios com HTTPS
4. ✅ Configurar renovação automática de certificados
5. ✅ Monitorar logs e performance

---

**Tudo pronto?** Execute:
```bash
/Users/alceualvespasssosmac/dashfinance/deploy-nginx.sh deploy
```

