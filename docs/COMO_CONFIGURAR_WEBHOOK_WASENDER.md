# 🔧 Como Configurar Webhook WaSender - Guia Passo a Passo

**Data**: 08/11/2025
**Tempo estimado**: 5 minutos

---

## ⚠️ IMPORTANTE

Você precisa fazer isso **manualmente** no navegador. O Claude não consegue acessar o painel WaSender porque requer login.

---

## 📋 Passo a Passo Completo

### Passo 1: Acessar Painel WaSender

1. Abra seu navegador (Chrome, Firefox, Safari, etc)
2. Acesse: **https://wasenderapi.com/dashboard**
3. Faça login com suas credenciais WaSender

---

### Passo 2: Navegar até Webhooks

No painel, procure uma dessas opções no menu:
- **"Settings"** → **"Webhooks"**
- **"Configuration"** → **"Webhooks"**
- **"Webhooks"** (menu direto)
- **"Integrations"** → **"Webhooks"**

---

### Passo 3: Configurar Webhook

Preencha o formulário com estas informações:

#### Webhook URL (escolha uma opção)

**Opção 1** - Via domínio (recomendado se já configurou Nginx):
```
https://www.ifin.app.br/webhook/wasender
```

**Opção 2** - Direto no Supabase (funciona sempre):
```
https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/wasender-webhook
```

#### Events / Eventos

**MARQUE APENAS**:
- ✅ `messages.upsert`

**OU procure por**:
- ✅ "Message Received"
- ✅ "New Message"
- ✅ "Incoming Message"

**DESMARQUE TODOS OS OUTROS**:
- ❌ `messages.update`
- ❌ `session.*`
- ❌ `contacts.*`
- ❌ `groups.*`
- ❌ Qualquer outro evento

#### Configurações Adicionais

Se o painel pedir:
- **Method**: POST
- **Content-Type**: application/json
- **Authentication**: None (ou deixe em branco)
- **Active/Enabled**: ✅ YES / Ativado

---

### Passo 4: Salvar

1. Clique no botão **"Save"** / **"Salvar"** / **"Update"**
2. Aguarde confirmação de sucesso

---

### Passo 5: Testar Webhook

#### Teste 1: Enviar Mensagem

1. Pegue seu celular
2. Abra WhatsApp
3. Envie mensagem para o número conectado no WaSender:
   ```
   Olá, teste de webhook
   ```

#### Teste 2: Verificar Logs

Abra o terminal e execute:

```bash
supabase functions logs wasender-webhook --project-ref xzrmzmcoslomtzkzgskn
```

Você deve ver algo como:
```
📥 Received webhook: {
  "event": "messages.upsert",
  "data": {
    "key": {
      "remoteJid": "5511967377373@s.whatsapp.net",
      ...
    }
  }
}
```

#### Teste 3: Verificar Banco de Dados

Execute no terminal:

```bash
PGPASSWORD='B5b0dcf500@#' psql \
  -h db.xzrmzmcoslomtzkzgskn.supabase.co \
  -p 5432 -U postgres -d postgres \
  -c "SELECT phone_number, content, timestamp FROM whatsapp_conversations ORDER BY timestamp DESC LIMIT 5;"
```

Deve aparecer sua mensagem de teste.

---

## ✅ Confirmação de Sucesso

Se tudo funcionou, você verá:

1. ✅ Logs no terminal mostrando webhook recebido
2. ✅ Mensagem salva na tabela `whatsapp_conversations`
3. ✅ Status "OK" no painel WaSender

---

## 🐛 Troubleshooting

### Problema: "Webhook failed" ou erro 404

**Causa**: URL incorreta

**Solução**:
1. Verifique se copiou a URL corretamente (sem espaços)
2. Teste a URL diretamente no navegador:
   ```
   https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/wasender-webhook
   ```
   Deve retornar: `{"status":"ok","service":"wasender-webhook"}`

---

### Problema: Webhook não recebe mensagens

**Causa**: Evento errado selecionado

**Solução**:
1. Volte nas configurações do webhook
2. Certifique-se que **APENAS** `messages.upsert` está marcado
3. Desmarque todos os outros eventos
4. Salve novamente

---

### Problema: Logs não aparecem

**Causa**: Função não deployed ou sem permissão

**Solução**:
```bash
# Verificar se função existe
supabase functions list --project-ref xzrmzmcoslomtzkzgskn

# Deve aparecer:
# - wasender-webhook ✓
```

Se não aparecer, execute:
```bash
cd finance-oraculo-backend
supabase functions deploy wasender-webhook --no-verify-jwt --project-ref xzrmzmcoslomtzkzgskn
```

---

## 📱 Testar Comandos (Após Webhook Configurado)

Depois que o webhook estiver funcionando, teste os comandos:

### Comandos Básicos

Envie via WhatsApp para o número conectado:

```
/ajuda
```

Deve retornar lista de comandos.

```
/saldo
```

Deve retornar saldo atual (se tiver dados no banco).

```
/perfil
```

Deve retornar informações do seu perfil.

---

## 🔐 Segurança

### Recomendações

1. **Nunca compartilhe** a URL do webhook publicamente
2. **Monitore os logs** regularmente
3. **Revise eventos** - mantenha apenas `messages.upsert` ativo
4. **IP Whitelist** (se WaSender permitir):
   - Adicione IPs do Supabase para maior segurança

---

## 📊 Monitoramento

### Ver Mensagens em Tempo Real

Terminal 1 (Logs):
```bash
supabase functions logs wasender-webhook --project-ref xzrmzmcoslomtzkzgskn --tail
```

Terminal 2 (Banco):
```bash
watch -n 2 "PGPASSWORD='B5b0dcf500@#' psql -h db.xzrmzmcoslomtzkzgskn.supabase.co -p 5432 -U postgres -d postgres -c 'SELECT phone_number, LEFT(content, 50) as msg, timestamp FROM whatsapp_conversations ORDER BY timestamp DESC LIMIT 5;'"
```

---

## 🎯 Checklist Final

Antes de considerar concluído, verifique:

- [ ] Acessei painel WaSender
- [ ] Configurei webhook URL corretamente
- [ ] Marquei apenas evento `messages.upsert`
- [ ] Salvei configuração
- [ ] Testei enviando mensagem WhatsApp
- [ ] Vi logs no terminal
- [ ] Mensagem apareceu no banco de dados
- [ ] Testei comando `/ajuda` e funcionou

---

## 📞 Suporte

### URLs Importantes

- **WaSender Dashboard**: https://wasenderapi.com/dashboard
- **WaSender Docs**: https://wasenderapi.com/api-docs/webhooks
- **Supabase Functions**: https://supabase.com/dashboard/project/xzrmzmcoslomtzkzgskn/functions

### Credenciais WaSender

```
API Key: 31fc32fca3dc75ba99d9eb4ad7ae1bfcf604b5bd76fdddda40e9175809d10e06
API Secret: 352e43ecd33e0c2bb2cd40927218e91f
```

### Webhook URLs

**Opção 1** (via domínio):
```
https://www.ifin.app.br/webhook/wasender
```

**Opção 2** (direto):
```
https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/wasender-webhook
```

---

## 🎊 Próximos Passos (Após Webhook Configurado)

1. ✅ Testar todos os comandos
2. ✅ Importar workflow N8N (opcional)
3. ✅ Configurar Nginx proxy (opcional)
4. ✅ Treinar usuários nos comandos
5. ✅ Monitorar métricas de uso

---

**Última atualização**: 08/11/2025
**Maintainer**: Finance Oráculo Team
