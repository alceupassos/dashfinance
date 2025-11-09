# 🔑 CONFIGURAR SECRETS DO SUPABASE

## ✅ Credenciais WASender Confirmadas

**API Key que funciona:**
```
09cfee8bccee1f9319b3eae0cfec5b07a41b0819eb5fddffd73df2ff599df979
```

**URL da API:**
```
https://wasenderapi.com/api/send-message
```

**Número do WASender:**
```
5511967377373
```

---

## 📋 PASSO A PASSO

### 1. Acessar Supabase Dashboard

```bash
# Acesse: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/vault
```

### 2. Adicionar as Secrets

Vá em: **Settings → Vault → Secrets**

Adicione as seguintes secrets:

#### **WASENDER_API_KEY**
```
09cfee8bccee1f9319b3eae0cfec5b07a41b0819eb5fddffd73df2ff599df979
```

#### **WASENDER_API_URL**
```
https://wasenderapi.com/api/send-message
```

#### **WASENDER_PHONE_NUMBER**
```
5511967377373
```

---

### 3. Usar nas Edge Functions

```typescript
// Exemplo de uso:
const apiKey = Deno.env.get('WASENDER_API_KEY');
const apiUrl = Deno.env.get('WASENDER_API_URL');
const phoneNumber = Deno.env.get('WASENDER_PHONE_NUMBER');

const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: destinationPhone,
    text: message,
  }),
});
```

---

### 4. Atualizar Edge Functions que usam WASender

As seguintes Edge Functions precisam ser atualizadas/deployadas:

- ✅ `whatsapp-webhook`
- ✅ `whatsapp-onboarding-welcome`
- ✅ `whatsapp-ai-handler`
- ✅ `alert-processor`

---

## 🔄 Deploy das Edge Functions

```bash
cd finance-oraculo-backend

# Deploy de todas as Edge Functions
supabase functions deploy whatsapp-webhook
supabase functions deploy whatsapp-onboarding-welcome
supabase functions deploy whatsapp-ai-handler
supabase functions deploy alert-processor
```

---

## 📝 Formato Correto da API WASender

**✅ CORRETO:**
```json
{
  "to": "5511967377373",
  "text": "Mensagem aqui"
}
```

**❌ ERRADO:**
```json
{
  "phone": "5511967377373",  // ❌ Campo errado
  "message": "Mensagem aqui" // ❌ Campo errado
}
```

---

## ✅ Mensagem Enviada com Sucesso!

Jessica Kenupp recebeu a mensagem de boas-vindas:

```
🎉 BEM-VINDA AO DASHFINANCE, JESSICA!

📊 SEU ACESSO
🏢 5 empresas vinculadas
🔑 Token: VOLPE1
👤 Perfil: Master

📱 MENU RÁPIDO
1️⃣ Alertas
2️⃣ Saldo
3️⃣ DRE
4️⃣ Config

💬 CONVERSE COMIGO!
🤖 Powered by Claude Haiku 3.5
```

**Message ID:** `10421393`
**Status:** `in_progress` → Sendo entregue

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Adicionar secrets no Supabase (acima)
2. ✅ Deploy das Edge Functions
3. ✅ Configurar webhook no WASender:
   ```
   URL: https://YOUR_PROJECT_ID.supabase.co/functions/v1/whatsapp-webhook
   Method: POST
   ```
4. ✅ Testar envio de "VOLPE1" ou "VOLPE2" para 5511967377373

---

## 📚 Documentação WASender

https://wasenderapi.com/api-docs/webhooks/webhook-setup

---

_Configuração gerada em: 2025-11-09_

