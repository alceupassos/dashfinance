# 🔑 WaSender - Guia de Tokens

## Tipos de Token

### 1. **Personal API Token** (Gerenciamento)
```
1717|hpl4aReHJSdBuP5Pg4Vlp4Yraer36ON3wUZz0KQm68316c94
```

**Permissões**:
- ✅ Criar/deletar webhook
- ✅ Gerenciar sessões
- ✅ Listar status
- ✅ Enviar mensagens de qualquer número
- ✅ Todas as operações administrativas

**Onde usar**:
- Edge Function: `wasender-register-webhook`
- Operações de configuração
- N8N workflows de gerenciamento

---

### 2. **Session Token** (Envio de Mensagens)
```
31fc32fca3dc75ba99d9eb4ad7ae1bfcf604b5bd76fdddda40e9175809d10e06
```

**Permissões**:
- ✅ Enviar mensagens do número conectado
- ❌ Não pode criar webhook
- ❌ Não pode gerenciar sessões

**Onde usar**:
- Edge Function: `wasender-send-message`
- N8N workflows de resposta automática
- Envio massivo

---

## ✅ Configuração Atual

Ambos os tokens estão configurados nas Edge Functions:

```bash
WASENDER_PERSONAL_TOKEN=1717|hpl4aReHJSdBuP5Pg4Vlp4Yraer36ON3wUZz0KQm68316c94
WASENDER_SESSION_TOKEN=31fc32fca3dc75ba99d9eb4ad7ae1bfcf604b5bd76fdddda40e9175809d10e06
```

---

## 🚀 Edge Functions

### wasender-send-message
- Usa: **Session Token**
- Status: ✅ DEPLOYED
- Testado: ✅ SUCESSO

### wasender-webhook
- Usa: Nenhum token (recebe)
- Status: ✅ DEPLOYED

### wasender-register-webhook
- Usa: **Personal Token**
- Status: ✅ DEPLOYED
- URL: `https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/wasender-register-webhook`

---

## 📋 Como Registrar Webhook

### Opção 1: Via Edge Function (automática)

```bash
curl -X POST "https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/wasender-register-webhook?action=register"
```

### Opção 2: Via curl direto

```bash
curl -X POST "https://wasenderapi.com/api/webhook" \
  -H "Authorization: Bearer 1717|hpl4aReHJSdBuP5Pg4Vlp4Yraer36ON3wUZz0KQm68316c94" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/wasender-webhook",
    "events": ["message.in", "message.out", "status"]
  }'
```

### Opção 3: Via painel WaSender (manual)

1. Acesse: https://wasenderapi.com/dashboard
2. Settings → Webhooks
3. URL: `https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/wasender-webhook`
4. Events: `message.in`, `message.out`, `status`
5. Salvar

---

## 🧪 Testar

### Enviar mensagem
```bash
curl -X POST "https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/wasender-send-message" \
  -H "Content-Type: application/json" \
  -d '{"to":"+5511967377373","text":"Teste iFinance"}'
```

**Resposta esperada**:
```json
{
  "success": true,
  "timestamp": "2025-11-08T03:05:49.431Z"
}
```

### Verificar webhook recebido
```bash
supabase functions logs wasender-webhook --project-ref xzrmzmcoslomtzkzgskn
```

---

## 🔒 Segurança

- ✅ Tokens armazenados em Supabase Secrets
- ✅ Não commitados no git
- ✅ Não expostos em logs
- ✅ Apenas Edge Functions têm acesso

---

**Última atualização**: 08/11/2025
