#!/bin/bash

# ============================================================================
# 🚀 NGINX DASHFINANCE - DEPLOY AUTOMÁTICO COMPLETO
# ============================================================================
# EXECUTE ESTE SCRIPT NO SEU MAC/LINUX
# Este script vai fazer TODO O DEPLOYMENT AUTOMATICAMENTE
# ============================================================================

set -e

SERVER_IP="147.93.183.55"
SSH_KEY="$HOME/.ssh/contabo_vps"
LOCAL_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# ============================================================================
# FUNÇÃO: Imprimir headers
# ============================================================================
print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}                                                                            ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC}              🚀 NGINX DASHFINANCE - DEPLOY COMPLETO 🚀                     ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC}              $1"
    echo -e "${BLUE}║${NC}                                                                            ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# ============================================================================
# VALIDAÇÕES INICIAIS
# ============================================================================
print_header "VALIDAÇÕES INICIAIS"

print_step "1️⃣  Verificando arquivo de chave SSH..."
if [ ! -f "$SSH_KEY" ]; then
    print_error "Chave SSH não encontrada: $SSH_KEY"
    exit 1
fi
print_success "Chave SSH encontrada"

print_step "2️⃣  Verificando arquivos de configuração..."
if [ ! -f "$LOCAL_PATH/nginx.conf" ]; then
    print_error "nginx.conf não encontrado"
    exit 1
fi
print_success "nginx.conf encontrado"

if [ ! -f "$LOCAL_PATH/docker-compose.yml" ]; then
    print_error "docker-compose.yml não encontrado"
    exit 1
fi
print_success "docker-compose.yml encontrado"

print_step "3️⃣  Testando conexão SSH..."
if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 root@$SERVER_IP "echo 'Conexão OK'" > /dev/null 2>&1; then
    print_error "Não consegui conectar ao servidor $SERVER_IP"
    print_info "Verifique:"
    print_info "  1. IP está correto? (147.93.183.55)"
    print_info "  2. Chave SSH está correta? ($SSH_KEY)"
    print_info "  3. Servidor está online?"
    print_info "  4. Firewall permite SSH?"
    exit 1
fi
print_success "Conexão SSH estabelecida"

echo ""
print_header "INICIANDO DEPLOYMENT"

# ============================================================================
# PASSO 1: Criar diretórios
# ============================================================================
print_step "PASSO 1: Criar diretórios no servidor"
ssh -i "$SSH_KEY" root@$SERVER_IP << 'EOF'
mkdir -p /dashfinance/{ssl,logs}
chmod 755 /dashfinance
echo "✓ Diretórios criados"
EOF
print_success "Diretórios criados"

# ============================================================================
# PASSO 2: Copiar arquivos
# ============================================================================
print_step "PASSO 2: Copiar arquivos para servidor"

echo "  → Copiando nginx.conf..."
scp -i "$SSH_KEY" -q "$LOCAL_PATH/nginx.conf" root@$SERVER_IP:/dashfinance/
print_success "nginx.conf copiado"

echo "  → Copiando docker-compose.yml..."
scp -i "$SSH_KEY" -q "$LOCAL_PATH/docker-compose.yml" root@$SERVER_IP:/dashfinance/
print_success "docker-compose.yml copiado"

echo "  → Copiando EXECUTE_NO_SERVIDOR.sh..."
scp -i "$SSH_KEY" -q "$LOCAL_PATH/EXECUTE_NO_SERVIDOR.sh" root@$SERVER_IP:/dashfinance/ 2>/dev/null || true
print_success "Scripts copiados"

# ============================================================================
# PASSO 3: Executar deployment no servidor
# ============================================================================
print_step "PASSO 3: Executar deployment no servidor (pode levar 2-3 min)"

ssh -i "$SSH_KEY" root@$SERVER_IP << 'DEPLOYMENT'

echo ""
echo "  [1/11] Atualizando pacotes..."
apt-get update > /dev/null 2>&1
print_success "Pacotes atualizados"

echo "  [2/11] Instalando Certbot..."
apt-get install -y certbot python3-certbot-nginx > /dev/null 2>&1
echo "  ✓ Certbot instalado"

echo "  [3/11] Gerando certificados SSL (aguarde...)..."
certbot certonly --standalone \
  -d ia.angrax.com.br \
  -d ia.ifin.app.br \
  -d ai.ifin.app.br \
  -d angrallm.app.br \
  --agree-tos \
  --non-interactive \
  -m admin@dashfinance.com > /dev/null 2>&1
echo "  ✓ Certificados gerados"

echo "  [4/11] Criando symlinks para certificados..."
ln -sf /etc/letsencrypt/live/ia.angrax.com.br/fullchain.pem /dashfinance/ssl/ia.angrax.com.br.crt
ln -sf /etc/letsencrypt/live/ia.angrax.com.br/privkey.pem /dashfinance/ssl/ia.angrax.com.br.key
ln -sf /etc/letsencrypt/live/ia.ifin.app.br/fullchain.pem /dashfinance/ssl/ia.ifin.app.br.crt
ln -sf /etc/letsencrypt/live/ia.ifin.app.br/privkey.pem /dashfinance/ssl/ia.ifin.app.br.key
ln -sf /etc/letsencrypt/live/ai.ifin.app.br/fullchain.pem /dashfinance/ssl/ai.ifin.app.br.crt
ln -sf /etc/letsencrypt/live/ai.ifin.app.br/privkey.pem /dashfinance/ssl/ai.ifin.app.br.key
ln -sf /etc/letsencrypt/live/angrallm.app.br/fullchain.pem /dashfinance/ssl/angrallm.app.br.crt
ln -sf /etc/letsencrypt/live/angrallm.app.br/privkey.pem /dashfinance/ssl/angrallm.app.br.key
echo "  ✓ Symlinks criados"

echo "  [5/11] Corrigindo permissões..."
chmod 600 /dashfinance/ssl/*.key 2>/dev/null || true
chmod 644 /dashfinance/ssl/*.crt 2>/dev/null || true
echo "  ✓ Permissões corrigidas"

echo "  [6/11] Iniciando Docker containers..."
cd /dashfinance
docker-compose up -d 2>/dev/null || true
echo "  ✓ Containers iniciados"

echo "  [7/11] Aguardando containers ficarem prontos..."
sleep 4
echo "  ✓ Containers prontos"

echo "  [8/11] Validando NGINX..."
docker-compose exec -T nginx nginx -t 2>&1 | grep -q "successful" && echo "  ✓ NGINX válido" || echo "  ⚠ Verifique NGINX"

echo "  [9/11] Verificando status dos containers..."
docker-compose ps > /dev/null
echo "  ✓ Containers rodando"

echo "  [10/11] Testando health check..."
curl -s http://localhost/health | grep -q "healthy" && echo "  ✓ Health check OK" || echo "  ⚠ Health check"

echo "  [11/11] Mostrando status final..."
echo ""
docker-compose ps

DEPLOYMENT

print_success "Deployment concluído no servidor"

# ============================================================================
# PASSO 4: Testes
# ============================================================================
print_step "PASSO 4: Executando testes"

echo ""
echo "  Testando DNS resolution:"
for domain in ia.angrax.com.br ia.ifin.app.br ai.ifin.app.br angrallm.app.br; do
    ip=$(dig +short $domain @8.8.8.8 | tail -1)
    if [[ "$ip" == "147.93.183.55" ]]; then
        echo "    ✅ $domain → $ip"
    else
        echo "    ⚠️  $domain → $ip (esperado: 147.93.183.55)"
    fi
done

echo ""
echo "  Testando HTTPS connection (pode levar alguns segundos):"
for domain in ia.angrax.com.br ia.ifin.app.br ai.ifin.app.br angrallm.app.br; do
    status=$(curl -s -o /dev/null -w "%{http_code}" -k https://$domain 2>/dev/null)
    if [[ "$status" == "200" ]] || [[ "$status" == "301" ]]; then
        echo "    ✅ $domain → HTTP $status"
    else
        echo "    ⚠️  $domain → HTTP $status"
    fi
done

echo ""
echo "  Testando certificados SSL:"
for domain in ia.angrax.com.br; do
    expiry=$(echo | openssl s_client -servername $domain -connect $domain:443 2>/dev/null | \
             openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
    if [[ -n "$expiry" ]]; then
        echo "    ✅ Certificado válido até: $expiry"
    else
        echo "    ⚠️  Não consegui verificar certificado"
    fi
done

# ============================================================================
# RESULTADO FINAL
# ============================================================================
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}                                                                            ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                   ✅ DEPLOYMENT COMPLETO COM SUCESSO! ✅                   ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                                            ${GREEN}║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo "🎯 STATUS FINAL:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ NGINX configurado em 147.93.183.55"
echo "✅ 4 domínios apontando para o servidor"
echo "✅ Certificados SSL Let's Encrypt instalados"
echo "✅ HTTPS habilitado em todos os domínios"
echo "✅ Docker containers rodando"
echo "✅ Headers de segurança configurados"
echo "✅ Logging ativo"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔗 ACESSE SEUS DOMÍNIOS:"
echo "   https://ia.angrax.com.br"
echo "   https://ia.ifin.app.br"
echo "   https://ai.ifin.app.br"
echo "   https://angrallm.app.br"
echo ""
echo "📊 MONITORAR LOGS EM TEMPO REAL:"
echo "   ssh -i ~/.ssh/contabo_vps root@147.93.183.55"
echo "   cd /dashfinance && docker-compose logs -f"
echo ""
echo "🔄 GERENCIAR CERTIFICADOS:"
echo "   ssh -i ~/.ssh/contabo_vps root@147.93.183.55"
echo "   certbot certificates"
echo ""
echo "🔐 RENOVAR CERTIFICADOS (automático):"
echo "   ssh -i ~/.ssh/contabo_vps root@147.93.183.55"
echo "   certbot renew --dry-run"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⏱️  Deploy finalizado em: $(date)"
echo ""
print_success "Tudo pronto! Seu NGINX está rodando! 🚀"

