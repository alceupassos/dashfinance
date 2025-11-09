# 🔧 Como Registrar Webhook WaSender - Guia Final

## ⚠️ Situação

O WaSender removeu a interface de Webhooks do painel e agora só permite via API. Porém, a API está retornando **"Webhook signature is missing"**.

---

## ✅ 3 OPÇÕES DE SOLUÇÃO

### Opção 1: Entrar em Contato com Suporte WaSender (RECOMENDADO)

O erro "Webhook signature is missing" significa que a API mudou e precisa de um campo adicional que não está documentado.

**Ação**:
1. Acesse: https://wasenderapi.com/contact
2. Pergunte: "Como registro webhook via API? Qual o campo 'signature' necessário?"
3. Ou pergunte no chat de suporte do painel

---

### Opção 2: Usar Sistema sem Webhook (FUNCIONA AGORA)

**Você JÁ PODE enviar mensagens!** ✅

O webhook só é necessário para **RECEBER** mensagens. Mas você pode usar o sistema em **modo push-only**:

**O que funciona SEM webhook:**
- ✅ Enviar mensagens via API
- ✅ Enviar comandos programados
- ✅ Automações agendadas
- ✅ Notificações push

**O que NÃO funciona sem webhook:**
- ❌ Receber mensagens dos clientes
- ❌ Comandos interativos (`/saldo`, `/dre`)
- ❌ Chat bidirecional

**Como usar**:
```bash
# Enviar mensagem funciona perfeitamente
curl -X POST "https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/wasender-send-message" \
  -H "Content-Type: application/json" \
  -d '{"to":"+5511967377373","text":"Relatorio DRE disponivel"}'
```

---

### Opção 3: Alternativa Técnica - Polling (WORKAROUND)

Se não conseguir registrar webhook, pode usar **polling** (consultar mensagens periodicamente).

**Edge Function de Polling** (criar):

```typescript
// supabase/functions/wasender-poll-messages/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const WASENDER_PERSONAL_TOKEN = Deno.env.get('WASENDER_PERSONAL_TOKEN');

serve(async (req: Request) => {
  // Consultar mensagens não lidas
  const response = await fetch('https://wasenderapi.com/api/messages?status=unread', {
    headers: {
      'Authorization': `Bearer ${WASENDER_PERSONAL_TOKEN}`
    }
  });

  const messages = await response.json();

  // Processar cada mensagem
  for (const msg of messages) {
    // Chamar whatsapp-admin-commands
    await fetch('https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/whatsapp-admin-commands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone_number: msg.from,
        company_cnpj: msg.cnpj,
        command: msg.text
      })
    });
  }

  return new Response(JSON.stringify({ processed: messages.length }));
});
```

**Cron Job** (N8N):
- Executar a cada 1 minuto
- Chamar `/wasender-poll-messages`

---

## 📊 Status Atual

### ✅ Funcionando
- Envio de mensagens
- Session Token configurado
- Personal Token configurado
- 3 Edge Functions deployed
- Migration 014 executada

### ⏳ Pendente
- Registro de webhook (bloqueado por API)

---

## 🎯 Recomendação

**USE OPÇÃO 2** (modo push-only) enquanto não resolve o webhook:

1. ✅ Envie relatórios automáticos
2. ✅ Envie alertas programados
3. ✅ Envie notificações de DRE
4. ⏳ Aguarde resposta do suporte WaSender sobre signature

---

## 📞 Contato WaSender

- **Website**: https://wasenderapi.com
- **Suporte**: https://wasenderapi.com/contact
- **Documentação**: https://wasenderapi.com/api-docs
- **Email**: (verificar no painel)

**Pergunta para fazer**:
> "Olá, estou tentando registrar webhook via POST /api/webhook mas retorna 'Webhook signature is missing'. Qual campo adicional preciso enviar? Documentação atualizada disponível?"

---

## 🚀 Próximos Passos

1. **Agora**: Use sistema em modo push-only (envio funciona!)
2. **Curto prazo**: Contate suporte WaSender sobre signature
3. **Alternativa**: Implemente polling se webhook não resolver

---

**Última atualização**: 08/11/2025 03:15 UTC
