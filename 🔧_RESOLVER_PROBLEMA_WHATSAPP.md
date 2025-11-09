# 🔧 RESOLVER PROBLEMA - NADA ACONTECEU

## ❌ PROBLEMA IDENTIFICADO

**Status dos tokens:** Ainda em `pending`  
**Mensagens recebidas:** Nenhuma  
**Conclusão:** O sistema não está recebendo as mensagens do WASender

---

## 🔍 POSSÍVEIS CAUSAS

### 1. ⚠️ WEBHOOK DO WASENDER NÃO CONFIGURADO
**Mais provável!** O WASender não sabe para onde enviar as mensagens.

### 2. Edge Functions não deployadas
As funções que processam as mensagens podem não estar ativas.

### 3. WASender não está conectado
A instância do WASender pode estar desconectada.

### 4. Número errado
O número pode estar incorreto ou não vinculado ao WASender.

---

## ✅ SOLUÇÃO PASSO A PASSO

### PASSO 1: VERIFICAR EDGE FUNCTIONS

Verifique se as Edge Functions estão deployadas:

```bash
# Listar functions deployadas
supabase functions list

# Deve aparecer:
# - whatsapp-onboarding-welcome
# - whatsapp-ai-handler
# - whatsapp-webhook (se existir)
```

**Se NÃO estiverem deployadas:**
```bash
cd finance-oraculo-backend

# Deploy das functions necessárias
supabase functions deploy whatsapp-onboarding-welcome
supabase functions deploy whatsapp-ai-handler
```

---

### PASSO 2: CONFIGURAR WEBHOOK DO WASENDER ⚡

**ESTE É O PASSO MAIS IMPORTANTE!**

O WASender precisa saber para onde enviar as mensagens recebidas.

#### A) Obter URL da Edge Function

A URL será algo como:
```
https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/whatsapp-webhook
```

Ou se você tiver a função `whatsapp-onboarding-welcome`:
```
https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/whatsapp-onboarding-welcome
```

#### B) Configurar no WASender

**Opção 1: Via Dashboard WASender**
1. Acesse o dashboard do WASender
2. Vá em Settings → Webhooks
3. Cole a URL da Edge Function
4. Método: POST
5. Salve

**Opção 2: Via API WASender**
```bash
curl -X POST https://api.wasender.com/v1/webhook \
  -H "Authorization: Bearer SEU_TOKEN_WASENDER" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/whatsapp-onboarding-welcome",
    "events": ["message.received"]
  }'
```

---

### PASSO 3: CRIAR EDGE FUNCTION PARA RECEBER WEBHOOK

Se ainda não existe, vamos criar uma Edge Function que recebe do WASender:

```typescript
// supabase/functions/whatsapp-webhook/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const webhook = await req.json();
    
    console.log('📥 Webhook recebido:', webhook);

    // Extrair dados do WASender
    const phone = webhook.from || webhook.phone || webhook.number;
    const message = webhook.body || webhook.message || webhook.text;

    if (!phone || !message) {
      console.error('❌ Dados incompletos:', { phone, message });
      return new Response('Missing data', { status: 400 });
    }

    console.log(`📱 Mensagem de ${phone}: ${message}`);

    // Verificar se é um token (5 caracteres alfanuméricos)
    const tokenRegex = /^[A-Z0-9]{5}$/i;
    if (tokenRegex.test(message.trim())) {
      const token = message.trim().toUpperCase();
      
      // Chamar função de onboarding
      const onboardingUrl = `${supabaseUrl}/functions/v1/whatsapp-onboarding-welcome`;
      const response = await fetch(onboardingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ token, phone }),
      });

      const result = await response.json();
      console.log('✅ Onboarding result:', result);

      // Enviar resposta via WASender
      if (result.success && result.message) {
        // Aqui você enviaria a mensagem de volta via WASender API
        // Por enquanto, só logamos
        console.log('📤 Enviando:', result.message);
      }
    } else {
      // Processar com IA
      console.log('🤖 Processando com IA:', message);
      // Chamar whatsapp-ai-handler
    }

    return new Response('ok', { status: 200 });

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

**Deploy:**
```bash
supabase functions deploy whatsapp-webhook
```

---

### PASSO 4: TESTAR MANUALMENTE

Teste enviando uma requisição direta:

```bash
# Testar Edge Function diretamente
curl -X POST https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/whatsapp-onboarding-welcome \
  -H "Authorization: Bearer SUA_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "VLP1A",
    "phone": "+5511967377373"
  }'
```

Se funcionar, significa que o problema é no webhook do WASender.

---

### PASSO 5: VERIFICAR LOGS

```bash
# Ver logs da Edge Function
supabase functions logs whatsapp-onboarding-welcome --tail

# Ou pelo dashboard:
# Supabase Dashboard → Edge Functions → whatsapp-onboarding-welcome → Logs
```

---

## 🚨 SOLUÇÃO RÁPIDA (TESTE MANUAL)

**Se você não conseguir configurar o webhook agora, teste manualmente:**

```sql
-- Simular ativação manual do token VLP1A
UPDATE onboarding_tokens 
SET 
  status = 'activated',
  activated_at = now(),
  activated_by_phone = '+5511967377373'
WHERE token = 'VLP1A';

-- Criar usuário manualmente
INSERT INTO users (nome, telefone_whatsapp, email)
VALUES ('Diretor Grupo Volpe', '+5511967377373', 'diretor@grupovolpe.com.br')
RETURNING id;

-- Com o ID retornado, criar sessão
INSERT INTO whatsapp_sessions (phone, user_id, current_menu)
VALUES ('+5511967377373', 'ID_DO_USUARIO_AQUI', 'main');

-- Vincular empresas
INSERT INTO user_companies (user_id, company_cnpj, company_name, grupo_empresarial)
SELECT 
  'ID_DO_USUARIO_AQUI',
  cnpj,
  cliente_nome,
  'Grupo Volpe'
FROM integration_f360
WHERE grupo_empresarial = 'Grupo Volpe';
```

---

## 📋 CHECKLIST DE VERIFICAÇÃO

- [ ] Edge Functions deployadas?
- [ ] Webhook WASender configurado?
- [ ] URL do webhook está correta?
- [ ] WASender está conectado/ativo?
- [ ] Número +5511967377373 está correto?
- [ ] ANTHROPIC_API_KEY configurada?
- [ ] Logs das Edge Functions mostram algo?

---

## 🎯 PRÓXIMA AÇÃO IMEDIATA

**O QUE FAZER AGORA:**

1. **Liste as Edge Functions:**
   ```bash
   supabase functions list
   ```

2. **Se não estiverem deployadas, faça o deploy:**
   ```bash
   cd finance-oraculo-backend
   supabase functions deploy whatsapp-webhook
   supabase functions deploy whatsapp-onboarding-welcome
   ```

3. **Configure o webhook no WASender** apontando para:
   ```
   https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/whatsapp-webhook
   ```

4. **Teste novamente** enviando o token

---

## 🆘 AINDA NÃO FUNCIONA?

Me diga:
1. As Edge Functions estão deployadas? (liste com `supabase functions list`)
2. O webhook está configurado no WASender?
3. Qual URL você configurou no webhook?
4. O que aparece nos logs? (`supabase functions logs whatsapp-webhook --tail`)

---

**💡 DICA:** O problema mais comum é o webhook não estar configurado! 

Configura o webhook do WASender primeiro e me avisa o resultado! 🚀

