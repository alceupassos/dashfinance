#!/bin/bash

SERVER_IP="147.93.183.55"
SSH_KEY="$HOME/.ssh/contabo_vps"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          🔍 DIAGNÓSTICO COMPLETO DO NGINX 🔍                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

ssh -i $SSH_KEY -o StrictHostKeyChecking=no root@$SERVER_IP << 'DIAG'

echo "📋 1. STATUS DOS CONTAINERS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd /dashfinance
docker-compose ps 2>/dev/null || echo "Docker compose não disponível"
echo ""

echo "📋 2. VERIFICAR NGINX RODANDO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ps aux | grep nginx | grep -v grep || echo "NGINX não está rodando!"
echo ""

echo "📋 3. VERIFICAR PORTAS ABERTAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
netstat -tlnp 2>/dev/null | grep -E ':(80|443)' || ss -tlnp 2>/dev/null | grep -E ':(80|443)' || echo "Porta não está aberta"
echo ""

echo "📋 4. CERTIFICADOS DISPONÍVEIS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Certificados em /dashfinance/ssl/:"
ls -lh /dashfinance/ssl/ 2>/dev/null | grep -E '\.(crt|key)$' || echo "Nenhum certificado encontrado"
echo ""

echo "Certificados em /etc/letsencrypt/live/:"
ls -la /etc/letsencrypt/live/ 2>/dev/null | tail -5 || echo "Nenhum certificado em letsencrypt"
echo ""

echo "📋 5. VALIDAR ARQUIVO NGINX"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker-compose exec -T nginx nginx -t 2>/dev/null || nginx -t 2>/dev/null || echo "Erro ao validar"
echo ""

echo "📋 6. LOGS DO NGINX (últimas 20 linhas)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker-compose logs --tail=20 nginx 2>/dev/null | tail -20 || tail -20 /var/log/nginx/error.log 2>/dev/null || echo "Nenhum log encontrado"
echo ""

echo "📋 7. TESTAR CONEXÃO LOCAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Testando localhost:80"
curl -s -I http://localhost 2>/dev/null || echo "❌ Porta 80 não responde"
echo ""

echo "📋 8. VERIFICAR ARQUIVOS NGINX"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "nginx.conf existe?"
ls -lh /dashfinance/nginx.conf 2>/dev/null || echo "❌ nginx.conf não encontrado"
echo ""

echo "docker-compose.yml existe?"
ls -lh /dashfinance/docker-compose.yml 2>/dev/null || echo "❌ docker-compose.yml não encontrado"
echo ""

echo "📋 9. INFORMAÇÕES DO SISTEMA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Docker versão:"
docker --version 2>/dev/null || echo "Docker não instalado"
echo ""

echo "Docker compose versão:"
docker-compose --version 2>/dev/null || echo "Docker compose não instalado"
echo ""

echo "Certbot versão:"
certbot --version 2>/dev/null || echo "Certbot não instalado"
echo ""

DIAG

echo ""
echo "✅ Diagnóstico concluído!"
echo ""
echo "📝 Próximas ações baseado no diagnóstico:"
echo "   1. Se NGINX não está rodando: /Users/alceualvespasssosmac/dashfinance/REINICIAR_NGINX.sh"
echo "   2. Se certificados faltam: /Users/alceualvespasssosmac/dashfinance/GERAR_CERTIFICADOS.sh"
echo "   3. Se Docker não funciona: verificar instalação do Docker"
echo ""

