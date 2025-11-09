# 🔗 CONFIGURAR WEBHOOK WASENDER

## 🎯 OBJETIVO

Configurar o WASender para enviar todas as mensagens recebidas dos clientes para nossa Edge Function `whatsapp-webhook`.

---

## 📋 PASSO A PASSO

### 1. Acessar Painel WASender

1. Acesse https://wasender.com (ou seu painel)
2. Faça login
3. Vá em **Instâncias** ou **Instances**

### 2. Selecionar Instância

1. Clique na instância que você conectou ao WhatsApp Business
2. Vá em **Configurações** ou **Settings**
3. Procure por **Webhooks** ou **WebHooks**

### 3. Configurar Webhook URL

**URL do Webhook:**
```
https://SEU-PROJETO.supabase.co/functions/v1/whatsapp-webhook
```

**Substitua `SEU-PROJETO` pelo ID do seu projeto Supabase.**

**Exemplo:**
```
https://xyzabc123.supabase.co/functions/v1/whatsapp-webhook
```

### 4. Configurar Eventos

Marque os seguintes eventos:
- ✅ **Message Received** (Mensagem Recebida)
- ✅ **Message Read** (Mensagem Lida) - opcional
- ⬜ **Message Sent** (não necessário)
- ⬜ **Message Status** (não necessário)

### 5. Headers (se necessário)

Alguns provedores WASender pedem headers. Configure:

```
Content-Type: application/json
```

### 6. Testar Webhook

WASender geralmente tem um botão "Testar" ou "Test":

1. Clique em **Test Webhook**
2. Deve aparecer ✅ sucesso
3. Se der erro, verifique a URL

---

## 🧪 TESTAR FUNCIONAMENTO

### Teste 1: Mandar Mensagem

1. Envie uma mensagem qualquer para o WhatsApp Business
2. Vá no Supabase > Functions > Logs
3. Deve aparecer: `📥 Mensagem de +5511999999999: "teste"`

### Teste 2: Ativar Token

1. Envie um dos tokens de onboarding: `VOL01`
2. Sistema deve responder automaticamente
3. Verificar no banco:

```sql
select * from whatsapp_messages order by created_at desc limit 5;
select * from whatsapp_sessions order by created_at desc limit 5;
```

### Teste 3: Menu Interativo

1. Cliente manda: `1`
2. Sistema responde com "Alertas Ativos"
3. Cliente manda: `0`
4. Sistema responde com "Menu Principal"

---

## 📊 FORMATO DO WEBHOOK (WASender)

O WASender envia dados neste formato:

```json
{
  "number": "5511999999999",
  "text": "VOL01",
  "messageId": "3EB0123456789ABCDEF",
  "timestamp": "2024-11-08T12:34:56.789Z",
  "from": "5511999999999@c.us",
  "instanceId": "sua-instancia",
  "type": "text"
}
```

Nossa Edge Function processa:
- `number` → telefone do cliente
- `text` → mensagem enviada
- `messageId` → ID da mensagem (para log)

---

## 🔍 MONITORAMENTO

### Ver Logs em Tempo Real

```bash
# Via Supabase CLI
supabase functions logs whatsapp-webhook --tail
```

### Ver Mensagens no Banco

```sql
-- Últimas 10 mensagens
select 
  phone,
  direction,
  message_text,
  created_at
from whatsapp_messages
order by created_at desc
limit 10;
```

### Ver Sessões Ativas

```sql
-- Sessões ativas nas últimas 24h
select 
  phone,
  current_menu,
  last_message_at,
  extract(epoch from (now() - last_message_at)) / 60 as minutos_atras
from whatsapp_sessions
where last_message_at > now() - interval '24 hours'
order by last_message_at desc;
```

---

## 🐛 TROUBLESHOOTING

### Webhook não está sendo chamado

**Verificar:**
1. URL está correta?
2. Edge Function está deployed?
3. Eventos marcados no WASender?
4. Instância está conectada ao WhatsApp?

**Testar manualmente:**
```bash
curl -X POST https://SEU-PROJETO.supabase.co/functions/v1/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "number": "5511999999999",
    "text": "VOL01",
    "messageId": "test123",
    "timestamp": "2024-11-08T12:00:00Z"
  }'
```

### Sistema não responde

**Verificar:**
1. `wasender_config` está configurado?
   ```sql
   select * from wasender_config;
   ```

2. Workspace ID do usuário existe?
   ```sql
   select id, workspace_id from users limit 1;
   ```

3. Logs da função:
   - Supabase Dashboard > Functions > whatsapp-webhook > Logs

### Mensagem chega mas não processa

**Verificar:**
1. Token existe e está ativo?
   ```sql
   select * from onboarding_tokens where token = 'VOL01';
   ```

2. Sessão foi criada?
   ```sql
   select * from whatsapp_sessions where phone = '+5511999999999';
   ```

3. Ver mensagens no log:
   ```sql
   select * from whatsapp_messages 
   where phone = '+5511999999999' 
   order by created_at desc;
   ```

---

## ⚙️ CONFIGURAÇÕES AVANÇADAS

### Retry em Caso de Falha

No WASender, configure:
- **Max Retries:** 3
- **Retry Interval:** 30 segundos

### Timeout

- **Connection Timeout:** 10 segundos
- **Read Timeout:** 30 segundos

### Rate Limiting

Se o WASender suportar, configure:
- **Max Requests:** 100 por minuto

---

## 📞 SUPORTE WASENDER

Se tiver problemas com o WASender:

1. **Documentação:** https://wasender.com/docs
2. **Suporte:** suporte@wasender.com
3. **Chat:** Geralmente tem chat no painel

---

## 🎯 CHECKLIST FINAL

Antes de ir para produção:

- [ ] Webhook configurado no WASender
- [ ] URL da Edge Function correta
- [ ] Eventos "Message Received" marcado
- [ ] Teste enviando mensagem funcionou
- [ ] Teste ativando token funcionou
- [ ] Menu interativo funcionando
- [ ] Logs sendo gravados no banco
- [ ] Monitoramento configurado
- [ ] Número WhatsApp real configurado (trocar 5511999998888)
- [ ] Criptografia de tokens habilitada (produção)

---

## 📱 FLUXO COMPLETO

```
Cliente → WhatsApp Business
    ↓
WASender (recebe mensagem)
    ↓
Webhook POST → Supabase Edge Function
    ↓
whatsapp-webhook processa:
  - Salva no banco (whatsapp_messages)
  - Identifica comando (TOKEN, número, etc)
  - Executa ação (onboarding, menu, etc)
  - Responde via WASender
    ↓
Cliente recebe resposta automaticamente
```

---

**Data:** 08/11/2025  
**Status:** ✅ Pronto para configurar  
**Versão:** 1.0

🔗 **Configure o webhook e o sistema estará 100% funcional!**

