# 🚀 Deploy Seguro - DashFinance para VPS 147.93.183.55

## ✅ Tudo Pronto!

---

## 📋 Arquivos Criados

### 1. **dashfinance-frontend.tar.gz** (152MB)
- ✅ Compactado e pronto para enviar
- Contém: `.next`, `public`, `package.json`, `package-lock.json`

### 2. **deploy-vps-seguro.sh**
- ✅ Script de deploy manual
- Seguro: faz backup antes de atualizar
- Não toca no nginx

### 3. **.github/workflows/deploy-vps.yml**
- ✅ GitHub Actions para deploy automático
- Roda em push para main/develop
- Compila, compacta e envia para VPS

---

## 🚀 Como Fazer Deploy

### Opção 1: Deploy Manual (Recomendado para Primeira Vez)

```bash
cd /Users/alceualvespasssosmac/dashfinance
chmod +x deploy-vps-seguro.sh
./deploy-vps-seguro.sh
```

**O que faz:**
1. ✅ Verifica arquivo
2. ✅ Testa SSH
3. ✅ Faz backup
4. ✅ Para servidor Node (sem mexer nginx)
5. ✅ Upload arquivo
6. ✅ Extrai e instala
7. ✅ Inicia servidor
8. ✅ Verifica status

**Resultado:**
- 🌐 http://147.93.183.55:3000

---

### Opção 2: Deploy Automático (GitHub Actions)

**Passo 1: Adicionar SSH Key ao GitHub**

1. Acesse: https://github.com/seu-repo/settings/secrets/actions
2. Clique: "New repository secret"
3. Nome: `VPS_SSH_KEY`
4. Valor: Conteúdo de `/Users/alceualvespasssosmac/dashfinance/ssh_key.txt`
5. Salvar

**Passo 2: Push para main**

```bash
git add .
git commit -m "Deploy DashFinance"
git push origin main
```

**O que acontece:**
- ✅ GitHub Actions compila
- ✅ Compacta arquivo
- ✅ Envia para VPS
- ✅ Deploy automático
- ✅ Notifica resultado

---

## ⚠️ Segurança

### Nginx NÃO é tocado
- ✅ Servidor Node roda na porta 3000
- ✅ Nginx pode fazer proxy (se configurado)
- ✅ Backup automático antes de atualizar

### Backup
- Local: `/var/www/dashfinance-backup-TIMESTAMP`
- Reverter: `cp -r /var/www/dashfinance-backup-TIMESTAMP /var/www/dashfinance`

### Logs
- Local: `/var/log/dashfinance.log`
- Ver: `ssh -i ssh_key.txt root@147.93.183.55 "tail -f /var/log/dashfinance.log"`

---

## 🔍 Verificar Status

```bash
# SSH para VPS
ssh -i /Users/alceualvespasssosmac/dashfinance/ssh_key.txt root@147.93.183.55

# Ver processo
ps aux | grep 'npm run start'

# Ver logs
tail -f /var/log/dashfinance.log

# Ver porta
netstat -tlnp | grep 3000
```

---

## 📊 Checklist Final

- ✅ Build local testado
- ✅ Arquivo compactado (152MB)
- ✅ Script de deploy seguro criado
- ✅ GitHub Actions configurado
- ✅ Backup automático
- ✅ Nginx não será tocado
- ✅ Logs configurados
- ✅ SSH key encontrada

---

## 🎯 Próximas Ações

### Imediato:
```bash
./deploy-vps-seguro.sh
```

### Depois:
1. Testar em http://147.93.183.55:3000
2. Configurar nginx (se necessário)
3. Configurar SSL/HTTPS
4. Adicionar SSH key ao GitHub para CI/CD automático

---

## 🆘 Se der erro

### Reverter para backup:
```bash
ssh -i ssh_key.txt root@147.93.183.55 "rm -rf /var/www/dashfinance && cp -r /var/www/dashfinance-backup-TIMESTAMP /var/www/dashfinance"
```

### Ver logs de erro:
```bash
ssh -i ssh_key.txt root@147.93.183.55 "tail -50 /var/log/dashfinance.log"
```

### Reiniciar servidor:
```bash
ssh -i ssh_key.txt root@147.93.183.55 "pkill -f 'npm run start' && sleep 2 && cd /var/www/dashfinance && nohup npm run start > /var/log/dashfinance.log 2>&1 &"
```

---

## ✅ Status Final

| Item | Status |
|------|--------|
| Build Local | ✅ |
| Arquivo Compactado | ✅ |
| Script Deploy | ✅ |
| GitHub Actions | ✅ |
| SSH Configurado | ✅ |
| Backup Automático | ✅ |
| Nginx Seguro | ✅ |

---

**Status:** 🚀 **PRONTO PARA DEPLOY!**

Execute: `./deploy-vps-seguro.sh`

