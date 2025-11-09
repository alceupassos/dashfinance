# 🔧 WaSender Webhook - Troubleshooting

**Última atualização**: 08/11/2025 06:12 UTC

---

## ✅ STATUS ATUAL

### O que está FUNCIONANDO

1. **Webhook Endpoint** ✅
   - URL: `https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/wasender-webhook`
   - Responde corretamente a requests POST
   - Validação de signature funcionando
   - Logging no banco de dados funcionando

2. **Configuração WaSender** ✅
   ```json
   {
     "webhook_enabled": true,
     "webhook_url": "https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/wasender-webhook",
     "webhook_secret": "a28f76b28012e51b75f2c72d0f8b4a2a",
     "webhook_events": [
       "messages.received",
       "messages.upsert",
       "messages.update",
       ... (21 eventos configurados)
     ],
     "read_incoming_messages": true,
     "log_messages": true
   }
   ```

3. **Teste Manual** ✅
   - Enviei webhook test via curl: **SUCESSO**
   - Mensagem apareceu no banco de dados
   - Timestamp: `2025-11-08 06:11:00`

4. **Envio de Mensagens** ✅
   - Edge Function `wasender-send-message` funcionando
   - API Key configurado corretamente
   - Mensagens sendo enviadas com sucesso

---

## ❌ PROBLEMA IDENTIFICADO

**Mensagens reais do WhatsApp NÃO estão disparando webhooks para nosso endpoint.**

### Evidências

1. **whatsapp_message_count: 2**
   - WaSender só registrou 2 mensagens (provavelmente testes via API)
   - Mensagens reais enviadas pelo WhatsApp não aparecem nesse contador

2. **Banco de dados sem mensagens reais**
   - Apenas 2 mensagens no banco:
     - Teste manual que enviei via curl
     - Teste anterior após corrigir trigger
   - Nenhuma mensagem real do WhatsApp do usuário

3. **Webhook test funciona, mensagens reais não**
   - Quando eu envio webhook test: ✅ funciona
   - Quando usuário envia mensagem real no WhatsApp: ❌ não chega

---

## 🔍 POSSÍVEIS CAUSAS

### 1. WhatsApp não está conectado corretamente
**Verificação**:
```bash
curl -X GET "https://www.wasenderapi.com/api/whatsapp-sessions" \
  -H "Authorization: Bearer 1720|kyiD05WamDYYPoolvpBEzvCszthWCNEJWl97DCMk78603a0d"
```

**Status atual**: `"status": "connected"` ✅

**Mas**: Verifique no painel WaSender se:
- QR Code foi escaneado recentemente
- Sessão mostra "online" ou "connected"
- Não há avisos de "session expired"

---

### 2. Mensagens estão sendo enviadas para o número errado
**Número da sessão**: `+5511967377373`

**IMPORTANTE**: As mensagens devem ser enviadas **PARA** esse número, não **DESTE** número.

Para receber webhooks, alguém precisa **ENVIAR** uma mensagem **PARA** o WhatsApp `+55 11 96737-7373`.

---

### 3. WaSender não está processando mensagens recebidas
**Configuração necessária**:
- ✅ `read_incoming_messages: true` (configurado)
- ✅ `log_messages: true` (configurado)
- ✅ `webhook_enabled: true` (configurado)

**Possível problema**:
- WaSender pode estar com delay no processamento
- Pode haver fila de mensagens
- Pode ter limite de rate para webhooks

---

### 4. Firewall/bloqueio do WaSender para Supabase
**Improvável**, pois:
- Webhook test funciona
- Supabase é um provedor conhecido
- Não há erros de conexão

---

### 5. Evento errado configurado
**Verificação**:
- Nossa Edge Function escuta: `messages.upsert`
- WaSender está enviando: `messages.received`, `messages.upsert`, etc.

**Status**: ✅ Correto

---

## 🎯 PRÓXIMAS AÇÕES RECOMENDADAS

### Opção 1: Teste Controlado (RECOMENDADO)

1. **Confirme o número**:
   - Sessão WaSender: `+5511967377373`
   - Esse é o número que deve RECEBER mensagens

2. **Envie mensagem de teste**:
   - Use OUTRO telefone
   - Envie mensagem para: `+55 11 96737-7373`
   - Mensagem: "teste webhook"

3. **Aguarde 30 segundos**

4. **Verifique banco de dados**:
   ```sql
   SELECT created_at, phone_number, message_direction, message_text
   FROM whatsapp_conversations
   ORDER BY created_at DESC LIMIT 3;
   ```

5. **Verifique contador WaSender**:
   ```bash
   curl -X GET "https://www.wasenderapi.com/api/whatsapp-sessions" \
     -H "Authorization: Bearer 1720|kyiD05WamDYYPoolvpBEzvCszthWCNEJWl97DCMk78603a0d" \
     | grep whatsapp_message_count
   ```

---

### Opção 2: Verificar Logs WaSender

**No painel WaSender**:
1. Acesse: https://wasenderapi.com/dashboard
2. Vá em: Sessions > iFinance > Logs
3. Procure por:
   - Webhooks sent
   - Webhook failures
   - Message received logs

**Possíveis erros**:
- Timeout ao enviar webhook
- SSL/TLS error
- Rate limit exceeded
- Webhook response code != 200

---

### Opção 3: Testar com Webhook.site (Diagnóstico)

**Para isolar o problema**:

1. **Criar endpoint de teste**:
   - Acesse: https://webhook.site
   - Copie a URL única gerada

2. **Configurar no WaSender temporariamente**:
   ```bash
   # No painel WaSender, mude webhook_url para a URL do webhook.site
   ```

3. **Enviar mensagem de teste**:
   - Use outro telefone
   - Envie mensagem para +5511967377373

4. **Verificar webhook.site**:
   - Se aparecer lá: ✅ WaSender está enviando webhooks (problema é no nosso endpoint)
   - Se NÃO aparecer: ❌ WaSender não está processando mensagens recebidas

---

### Opção 4: Verificar Status da Sessão

**Possível problema: sessão expirada ou desconectada**

```bash
# Verificar status detalhado
curl -X GET "https://www.wasenderapi.com/api/whatsapp-sessions" \
  -H "Authorization: Bearer 1720|kyiD05WamDYYPoolvpBEzvCszthWCNEJWl97DCMk78603a0d" \
  | python3 -m json.tool
```

**Procure por**:
- `"status": "connected"` ✅
- `"status": "disconnected"` ❌
- `"status": "qr"` ❌ (precisa escanear QR Code novamente)

**Se desconectado**:
1. Acesse painel WaSender
2. Vá em Sessions > iFinance
3. Clique em "Restart Session"
4. Escaneie QR Code novamente

---

### Opção 5: Ativar Debug Logging

**Modificar Edge Function temporariamente**:

```typescript
// No arquivo: supabase/functions/wasender-webhook/index.ts
// Adicionar no início do handler:

serve(async (req: Request) => {
  // Log TUDO que chega
  console.log('🔔 WEBHOOK RECEIVED AT:', new Date().toISOString());
  console.log('📨 Headers:', JSON.stringify([...req.headers.entries()]));

  const body = await req.text();
  console.log('📦 Raw Body:', body);

  // ... resto do código
```

**Deploy**:
```bash
supabase functions deploy wasender-webhook
```

**Verificar logs** (se Supabase tiver interface de logs):
- Ver se webhooks estão chegando mas falhando silenciosamente

---

## 📊 DIAGNÓSTICO RÁPIDO

### Teste 1: Webhook está funcionando?
```bash
curl -X POST "https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/wasender-webhook" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: a28f76b28012e51b75f2c72d0f8b4a2a" \
  -d '{
    "event": "messages.upsert",
    "data": {
      "key": {
        "remoteJid": "5511999999999@s.whatsapp.net",
        "fromMe": false,
        "id": "TEST_ID"
      },
      "message": {"conversation": "teste"},
      "pushName": "Test"
    }
  }'
```

**Esperado**: `{"status":"processed","phone_number":"5511999999999","message_id":"TEST_ID"}`

✅ **PASSOU** - Endpoint funcionando

---

### Teste 2: WaSender está conectado?
```bash
curl -s -X GET "https://www.wasenderapi.com/api/whatsapp-sessions" \
  -H "Authorization: Bearer 1720|kyiD05WamDYYPoolvpBEzvCszthWCNEJWl97DCMk78603a0d" \
  | grep -E '"status"|"webhook_enabled"'
```

**Esperado**:
```
"status": "connected",
"webhook_enabled": true,
```

✅ **PASSOU** - Sessão conectada e webhook habilitado

---

### Teste 3: Mensagem real foi recebida pelo WaSender?
```bash
# Envie mensagem real do WhatsApp para +5511967377373
# Aguarde 10 segundos
# Execute:

curl -s -X GET "https://www.wasenderapi.com/api/whatsapp-sessions" \
  -H "Authorization: Bearer 1720|kyiD05WamDYYPoolvpBEzvCszthWCNEJWl97DCMk78603a0d" \
  | grep whatsapp_message_count
```

**Antes**: `"whatsapp_message_count": 2`
**Depois de enviar mensagem**: Deveria aumentar para 3

❓ **PENDENTE** - Necessita teste com mensagem real

---

## 🚨 ERROS CONHECIDOS

### Erro: "Webhook signature is missing"
**Causa**: Campo `webhook_secret` não configurado no WaSender
**Solução**: ✅ JÁ RESOLVIDO - Secret configurado: `a28f76b28012e51b75f2c72d0f8b4a2a`

### Erro: "Invalid webhook signature"
**Causa**: Secret configurado diferente do enviado no header
**Solução**: ✅ JÁ VERIFICADO - Secret correto em ambos os lados

### Erro: Database insert fails silently
**Causa**: Trigger `auto_add_to_rag()` estava usando nomes de campos antigos
**Solução**: ✅ JÁ CORRIGIDO - Trigger atualizado para usar `message_direction` e `message_data`

---

## 💡 RECOMENDAÇÃO FINAL

**TESTE OPÇÃO 3 (webhook.site)** para determinar se:

1. **WaSender está enviando webhooks mas nosso endpoint tem problema** ➜ Investigar Edge Function
2. **WaSender NÃO está enviando webhooks** ➜ Problema na configuração ou na sessão WaSender

---

## 📞 SUPORTE WASENDER

Se após todos os testes o problema persistir:

**Contato**:
- Dashboard: https://wasenderapi.com/dashboard
- Email: support@wasenderapi.com (verificar no painel)
- Chat: Disponível no dashboard (canto inferior direito)

**Informações para fornecer**:
- Session ID: `29664`
- Session Name: `iFinance`
- Phone: `+5511967377373`
- Issue: "Webhooks não estão sendo enviados para mensagens recebidas, mas webhook test funciona"
- Webhook URL: `https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/wasender-webhook`

---

## 📝 CHECKLIST DE VERIFICAÇÃO

- [x] Webhook endpoint criado e funcionando
- [x] Signature validation implementada
- [x] Database logging funcionando
- [x] WaSender session connected
- [x] Webhook URL configurado no WaSender
- [x] Webhook secret configurado
- [x] Webhook events incluem messages.upsert
- [x] read_incoming_messages = true
- [x] log_messages = true
- [x] Teste manual com curl funciona
- [ ] **Mensagem real do WhatsApp dispara webhook** ⬅️ **PROBLEMA AQUI**

---

**Próximo passo**: Enviar mensagem real do WhatsApp e verificar se `whatsapp_message_count` aumenta
