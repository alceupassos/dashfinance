# ✅ Testes de Validação - NGINX DashFinance

## 🎯 Guia de Testes

Use este documento para validar que sua configuração NGINX está funcionando corretamente.

---

## 🔍 Teste 1: Verificação de DNS

### Objetivo
Confirmar que todos os domínios apontam para 147.93.183.55

### Comandos

```bash
# Testar cada domínio
nslookup ia.angrax.com.br
nslookup ia.ifin.app.br
nslookup ai.ifin.app.br
nslookup angrallm.app.br

# Ou usando dig (mais detalhado)
dig ia.angrax.com.br
dig ia.ifin.app.br
dig ai.ifin.app.br
dig angrallm.app.br

# Ou usando host
host ia.angrax.com.br 147.93.183.55
host ia.ifin.app.br 147.93.183.55
host ai.ifin.app.br 147.93.183.55
host angrallm.app.br 147.93.183.55
```

### Resultado Esperado
```
ia.angrax.com.br.       3600    IN      A       147.93.183.55
ia.ifin.app.br.         3600    IN      A       147.93.183.55
ai.ifin.app.br.         3600    IN      A       147.93.183.55
angrallm.app.br.        3600    IN      A       147.93.183.55
```

---

## 🔐 Teste 2: Verificação de SSL/TLS

### Objetivo
Confirmar que certificados SSL estão instalados e válidos

### Teste 2.1: Verificar Certificado

```bash
# Para cada domínio
echo | openssl s_client -servername ia.angrax.com.br -connect ia.angrax.com.br:443 2>/dev/null | openssl x509 -noout -text

# Abreviado
echo | openssl s_client -servername ia.angrax.com.br -connect ia.angrax.com.br:443 2>/dev/null | openssl x509 -noout -dates
```

### Resultado Esperado
```
notBefore=Nov  7 00:00:00 2024 GMT
notAfter=Nov  5 23:59:59 2025 GMT
```

### Teste 2.2: Validar Cadeia de Certificado

```bash
# Para Let's Encrypt
echo | openssl s_client -servername ia.angrax.com.br -connect ia.angrax.com.br:443 2>/dev/null | grep "Verify return code"
```

### Resultado Esperado
```
Verify return code: 0 (ok)
```

### Teste 2.3: Verificar Expiração

```bash
# Gera alerta se próximo da expiração
for domain in ia.angrax.com.br ia.ifin.app.br ai.ifin.app.br angrallm.app.br; do
  echo "=== $domain ==="
  echo | openssl s_client -servername $domain -connect $domain:443 2>/dev/null | \
    openssl x509 -noout -dates
done
```

---

## 🌐 Teste 3: Verificação de Conectividade

### Objetivo
Confirmar que NGINX está respondendo nas portas corretas

### Teste 3.1: HTTP (porta 80)

```bash
# Testar redirecionamento HTTP → HTTPS
curl -I http://ia.angrax.com.br
curl -I http://ia.ifin.app.br
curl -I http://ai.ifin.app.br
curl -I http://angrallm.app.br

# Resultado esperado:
# HTTP/1.1 301 Moved Permanently
# location: https://...
```

### Teste 3.2: HTTPS (porta 443) - Sem Validação

```bash
# Ignorar validação de certificado (útil para testes)
curl -k -I https://ia.angrax.com.br
curl -k -I https://ia.ifin.app.br
curl -k -I https://ai.ifin.app.br
curl -k -I https://angrallm.app.br

# Resultado esperado:
# HTTP/1.1 200 OK
```

### Teste 3.3: HTTPS (porta 443) - Com Validação

```bash
# Com validação completa de certificado
curl -I https://ia.angrax.com.br
curl -I https://ia.ifin.app.br
curl -I https://ai.ifin.app.br
curl -I https://angrallm.app.br

# Resultado esperado:
# HTTP/1.1 200 OK (sem erros de certificado)
```

---

## 📊 Teste 4: Verificação de Headers de Segurança

### Objetivo
Confirmar que headers de segurança estão sendo enviados

### Teste 4.1: Visualizar Headers

```bash
# Ver todos os headers
curl -I https://ia.angrax.com.br

# Resultado esperado deve incluir:
# Strict-Transport-Security: max-age=31536000; includeSubDomains
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
```

### Teste 4.2: Verificar HSTS

```bash
# Testar Strict-Transport-Security
curl -I https://ia.angrax.com.br | grep -i "strict-transport"

# Resultado esperado:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### Teste 4.3: Verificar X-Frame-Options

```bash
curl -I https://ia.angrax.com.br | grep -i "x-frame"

# Resultado esperado:
# X-Frame-Options: SAMEORIGIN
```

---

## 🏥 Teste 5: Health Check

### Objetivo
Verificar endpoint de health check

### Teste 5.1: Local (dentro do servidor)

```bash
ssh root@147.93.183.55 "curl http://localhost/health"

# Resultado esperado:
# healthy
```

### Teste 5.2: Via Domínio

```bash
curl https://ia.angrax.com.br/health
curl https://ia.ifin.app.br/health
curl https://ai.ifin.app.br/health
curl https://angrallm.app.br/health

# Resultado esperado:
# healthy
```

---

## 🐳 Teste 6: Containers Docker

### Objetivo
Verificar status dos containers

### Teste 6.1: Ver Status

```bash
ssh root@147.93.183.55 "cd /dashfinance && docker-compose ps"

# Resultado esperado:
# NAME                STATUS              PORTS
# dashfinance-nginx   Up                  0.0.0.0:80->80/tcp, :::80->80/tcp, 0.0.0.0:443->443/tcp
# dashfinance-frontend Up                5173/tcp
# dashfinance-backend  Up                3000/tcp
```

### Teste 6.2: Validar Sintaxe NGINX

```bash
ssh root@147.93.183.55 "docker exec dashfinance-nginx nginx -t"

# Resultado esperado:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Teste 6.3: Ver Logs

```bash
ssh root@147.93.183.55 "cd /dashfinance && docker-compose logs -f --tail=50 nginx"
```

---

## 📝 Teste 7: Verificação de Arquivos

### Objetivo
Confirmar que arquivos estão nos locais corretos

### Teste 7.1: Estrutura de Arquivos

```bash
ssh root@147.93.183.55 << 'EOF'
echo "=== Arquivos NGINX ==="
ls -la /dashfinance/nginx.conf
ls -la /dashfinance/docker-compose.yml

echo "=== Certificados SSL ==="
ls -la /dashfinance/ssl/

echo "=== Permissões ==="
stat /dashfinance/ssl/*.key | grep Access
stat /dashfinance/ssl/*.crt | grep Access
EOF

# Resultado esperado:
# *.key: 0600 (rw-------)
# *.crt: 0644 (rw-r--r--)
```

### Teste 7.2: Verificar Let's Encrypt (se aplicável)

```bash
ssh root@147.93.183.55 "certbot certificates"

# Resultado esperado:
# Found the following certs:
#   Certificate Name: ia.angrax.com.br
#   Domains: ia.angrax.com.br, ia.ifin.app.br, ai.ifin.app.br, angrallm.app.br
#   Expiry Date: 2025-11-05 23:59:59+00:00
```

---

## 🔄 Teste 8: Teste de Proxy

### Objetivo
Confirmar que proxy está funcionando corretamente

### Teste 8.1: Frontend Proxy

```bash
# Testar se está redirecionando para frontend
curl -L https://ia.angrax.com.br 2>/dev/null | head -20

# Deve conter HTML da aplicação frontend
```

### Teste 8.2: Backend Proxy

```bash
# Testar se está redirecionando para backend
curl -I https://ia.angrax.com.br/api/health

# Resultado esperado:
# HTTP/1.1 200 OK (ou similar, dependendo da API)
```

---

## 📊 Teste 9: Performance

### Objetivo
Medir tempo de resposta

### Teste 9.1: Latência

```bash
# Medir tempo total de conexão
curl -w "Total: %{time_total}s, Connect: %{time_connect}s, SSL: %{time_appconnect}s\n" \
  https://ia.angrax.com.br -o /dev/null -s

# Resultado esperado:
# Total: 0.5s (resposta rápida)
# Connect: 0.1s
# SSL: 0.2s
```

### Teste 9.2: Download Speed

```bash
# Medir velocidade de download
curl -w "@curl-format.txt" -o /dev/null -s https://ia.angrax.com.br

# Ou simples:
time curl https://ia.angrax.com.br -o /dev/null -s
```

---

## 🔐 Teste 10: Segurança

### Objetivo
Validar configurações de segurança

### Teste 10.1: SSL Labs (Online)

Visite: https://www.ssllabs.com/ssltest/analyze.html?d=ia.angrax.com.br

Resultado esperado: Grade A ou A+

### Teste 10.2: Verificar TLS Version

```bash
# Testar quais versões TLS estão habilitadas
openssl s_client -tls1_2 -connect ia.angrax.com.br:443 2>/dev/null | grep Protocol
openssl s_client -tls1_3 -connect ia.angrax.com.br:443 2>/dev/null | grep Protocol

# Não deve aceitar:
openssl s_client -ssl3 -connect ia.angrax.com.br:443 2>/dev/null  # Deve falhar
openssl s_client -tls1 -connect ia.angrax.com.br:443 2>/dev/null  # Deve falhar
openssl s_client -tls1_1 -connect ia.angrax.com.br:443 2>/dev/null # Deve falhar
```

### Teste 10.3: Verificar Ciphers

```bash
# Listar ciphers suportados
openssl s_client -connect ia.angrax.com.br:443 -cipher 'HIGH' 2>/dev/null | grep Cipher

# Resultado esperado: Ciphers modernos
```

---

## 📋 Script Automático de Testes

Salve como `test-nginx.sh`:

```bash
#!/bin/bash

echo "=== DashFinance NGINX Tests ==="
echo ""

DOMAINS=("ia.angrax.com.br" "ia.ifin.app.br" "ai.ifin.app.br" "angrallm.app.br")
IP="147.93.183.55"

# Teste 1: DNS
echo "1️⃣  DNS Resolution"
for domain in "${DOMAINS[@]}"; do
    result=$(dig +short $domain)
    if [[ "$result" == "$IP" ]]; then
        echo "   ✅ $domain → $IP"
    else
        echo "   ❌ $domain → $result (esperado: $IP)"
    fi
done
echo ""

# Teste 2: HTTP Redirect
echo "2️⃣  HTTP Redirect"
for domain in "${DOMAINS[@]}"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" http://$domain)
    if [[ "$status" == "301" ]] || [[ "$status" == "307" ]]; then
        echo "   ✅ $domain → 301 Redirect"
    else
        echo "   ❌ $domain → $status"
    fi
done
echo ""

# Teste 3: HTTPS Connection
echo "3️⃣  HTTPS Connection"
for domain in "${DOMAINS[@]}"; do
    if curl -s -I https://$domain 2>/dev/null | grep -q "200\|301"; then
        echo "   ✅ $domain → HTTPS OK"
    else
        echo "   ❌ $domain → HTTPS Failed"
    fi
done
echo ""

# Teste 4: Health Check
echo "4️⃣  Health Check"
for domain in "${DOMAINS[@]}"; do
    health=$(curl -s https://$domain/health 2>/dev/null)
    if [[ "$health" == "healthy"* ]]; then
        echo "   ✅ $domain/health → $health"
    else
        echo "   ⚠️  $domain/health → $health"
    fi
done
echo ""

# Teste 5: SSL Certificate
echo "5️⃣  SSL Certificate"
for domain in "${DOMAINS[@]}"; do
    expiry=$(echo | openssl s_client -servername $domain -connect $domain:443 2>/dev/null | \
             openssl x509 -noout -dates 2>/dev/null | grep notAfter)
    if [[ -n "$expiry" ]]; then
        echo "   ✅ $domain → $expiry"
    else
        echo "   ❌ $domain → Certificate not found"
    fi
done
echo ""

# Teste 6: Security Headers
echo "6️⃣  Security Headers"
for domain in "${DOMAINS[@]}"; do
    hsts=$(curl -s -I https://$domain 2>/dev/null | grep -i "strict-transport")
    if [[ -n "$hsts" ]]; then
        echo "   ✅ $domain → HSTS Enabled"
    else
        echo "   ❌ $domain → HSTS Missing"
    fi
done
echo ""

echo "=== Tests Complete ==="
```

**Usar:**
```bash
chmod +x test-nginx.sh
./test-nginx.sh
```

---

## ✨ Checklist de Validação

- [ ] DNS resolve todos os 4 domínios para 147.93.183.55
- [ ] HTTP (porta 80) redireciona para HTTPS
- [ ] HTTPS (porta 443) responde com sucesso
- [ ] Certificados SSL são válidos
- [ ] Headers de segurança presentes
- [ ] Health check respondendo
- [ ] Containers Docker rodando
- [ ] Proxy funcionando (frontend + backend)
- [ ] Logs sendo gerados
- [ ] Performance aceitável (<1s resposta)

---

## 🎯 Resultado Final

Se todos os testes passarem ✅, sua configuração NGINX está:

```
✅ DNS correto
✅ SSL/TLS funcionando
✅ HTTPS habilitado
✅ Proxy configurado
✅ Segurança validada
✅ Performance OK
✅ Pronto para produção!
```

---

## 📞 Próximos Passos

Se algum teste falhar, consulte:
- `NGINX_SETUP_GUIDE.md` → Troubleshooting
- `NGINX_LETSENCRYPT_SETUP.md` → Se using Let's Encrypt
- `deploy-nginx.sh status` → Ver status atual

Boa sorte! 🚀

