# 🚀 Checklist de Deployment - WhatsApp Oráculo

**Status**: ❌ Sistema 100% implementado no backend mas NÃO deployado ainda

## ✅ O que JÁ está pronto (Backend)

- ✅ Migration 010: Card System com 18 cards
- ✅ Migration 011: RAG de documentos (10 docs)
- ✅ Migration 012: Sistema de Personalidades (5 assistentes)
- ✅ Migration 013: RAG de conversas (10 exemplos públicos)
- ✅ Seeds: 38 response templates
- ✅ Edge Function: `whatsapp-send-templates` (código criado)
- ✅ Edge Function: `dashboard-smart` (código criado)
- ✅ N8N Workflow: `01-whatsapp-message-router.json` (JSON pronto)
- ✅ Documentação completa

## ❌ O que FALTA para funcionar

### 1. Deploy Edge Functions no Supabase

**Prioridade**: 🔴 CRÍTICA

```bash
# 1.1 Deploy whatsapp-send-templates
cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-backend
supabase functions deploy whatsapp-send-templates --no-verify-jwt

# 1.2 Configurar variáveis de ambiente
supabase secrets set \
  EVOLUTION_API_URL=http://147.93.183.55:8080 \
  EVOLUTION_API_KEY=D7BED4328F0C-4EA8-AD7A-08F72F6777E9 \
  EVOLUTION_INSTANCE=iFinance \
  OPENAI_API_KEY=<SUA_CHAVE>
```

**Variáveis necessárias**:
- `EVOLUTION_API_URL`: http://147.93.183.55:8080
- `EVOLUTION_API_KEY`: D7BED4328F0C-4EA8-AD7A-08F72F6777E9
- `EVOLUTION_INSTANCE`: iFinance
- `OPENAI_API_KEY`: Para gerar embeddings
- `SUPABASE_URL`: Auto-injetado
- `SUPABASE_SERVICE_ROLE_KEY`: Auto-injetado

---

### 2. Criar Edge Function: whatsapp-agent

**Prioridade**: 🔴 CRÍTICA

```typescript
// functions/whatsapp-agent/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { phone_number, message, company_cnpj } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 1. Buscar personalidade ativa
  const { data: personality } = await supabase
    .from('whatsapp_personalities')
    .select('*, whatsapp_response_templates(*)')
    .eq('is_active', true)
    .limit(1)
    .single()

  // 2. Classificar intenção da mensagem
  const intent = await classifyIntent(message)

  // 3. Buscar RAG similar (client_specific + public)
  const { data: similarConvs } = await supabase.rpc('search_similar_conversations', {
    p_question_embedding: await generateEmbedding(message),
    p_company_cnpj: company_cnpj,
    p_limit: 3,
    p_min_similarity: 0.75
  })

  // 4. Buscar dados financeiros (cards) se necessário
  let context = {}
  if (['saldo', 'runway', 'burnrate'].includes(intent)) {
    const cardsNeeded = intentToCards(intent)
    const { data: cardData } = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/dashboard-smart`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cnpj: company_cnpj,
        cards: cardsNeeded
      })
    }).then(r => r.json())
    context = cardData.cards
  }

  // 5. Montar prompt com personalidade + RAG + contexto
  const systemPrompt = personality.system_prompt
  const ragContext = similarConvs.map(c => `Q: ${c.user_question}\nA: ${c.bot_response}`).join('\n\n')

  // 6. Chamar LLM (Claude Haiku ou GPT-4o-mini)
  const response = await callLLM({
    system: systemPrompt,
    user: message,
    rag: ragContext,
    context: context
  })

  // 7. Salvar conversa no banco
  await supabase.from('whatsapp_conversations').insert({
    phone_number,
    company_cnpj,
    direction: 'incoming',
    message_text: message
  })

  await supabase.from('whatsapp_conversations').insert({
    phone_number,
    company_cnpj,
    direction: 'outgoing',
    message_text: response,
    metadata: { personality_id: personality.id, intent, context }
  })

  return new Response(JSON.stringify({ response }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

**Deploy**:
```bash
supabase functions deploy whatsapp-agent --no-verify-jwt
```

---

### 3. Criar Edge Function: generate-embeddings

**Prioridade**: 🟡 ALTA

```typescript
// functions/generate-embeddings/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 1. Buscar response templates sem embeddings
  const { data: templates } = await supabase
    .from('whatsapp_response_templates')
    .select('*')
    .is('template_embedding', null)

  // 2. Gerar embeddings via OpenAI
  for (const template of templates || []) {
    const embedding = await generateOpenAIEmbedding(template.template_text)
    await supabase
      .from('whatsapp_response_templates')
      .update({ template_embedding: embedding })
      .eq('id', template.id)
  }

  // 3. Buscar conversation_rag sem embeddings
  const { data: convs } = await supabase
    .from('conversation_rag')
    .select('*')
    .is('question_embedding', null)

  for (const conv of convs || []) {
    const qEmb = await generateOpenAIEmbedding(conv.user_question)
    const rEmb = await generateOpenAIEmbedding(conv.bot_response)
    await supabase
      .from('conversation_rag')
      .update({
        question_embedding: qEmb,
        response_embedding: rEmb
      })
      .eq('id', conv.id)
  }

  return new Response(JSON.stringify({
    templates_updated: templates?.length || 0,
    conversations_updated: convs?.length || 0
  }))
})

async function generateOpenAIEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text
    })
  })
  const data = await response.json()
  return data.data[0].embedding
}
```

**Deploy**:
```bash
supabase functions deploy generate-embeddings --no-verify-jwt
```

---

### 4. Criar Storage Bucket para Mídia

**Prioridade**: 🟡 ALTA

```sql
-- Executar no SQL Editor do Supabase
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'whatsapp-media',
  'whatsapp-media',
  true,
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'audio/mpeg', 'audio/ogg']
);

-- Policies para upload
CREATE POLICY "Allow service role to upload"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'whatsapp-media');

CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'whatsapp-media');
```

---

### 5. Importar N8N Workflow

**Prioridade**: 🟡 ALTA

**Passos**:
1. Acessar N8N: http://seu-n8n.com
2. Workflows > Import from File
3. Selecionar: `n8n-workflows/01-whatsapp-message-router.json`
4. Configurar credenciais:
   - **Supabase PostgreSQL**: Host, Port, Database, User, Password
   - **Evolution API**: HTTP Header Auth (`apikey: D7BED4328F0C-4EA8-AD7A-08F72F6777E9`)
   - **Supabase API**: Service Role Key
5. Ativar workflow
6. Copiar URL do webhook (node "Webhook Evolution")

---

### 6. Configurar Webhook no Evolution API

**Prioridade**: 🟡 ALTA

```bash
# Configurar webhook via API
curl -X POST http://147.93.183.55:8080/webhook/set/iFinance \
  -H "apikey: D7BED4328F0C-4EA8-AD7A-08F72F6777E9" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://seu-n8n.com/webhook/evolution-messages",
    "events": [
      "messages.upsert",
      "messages.update",
      "connection.update"
    ],
    "webhook_by_events": true
  }'
```

---

### 7. Popular Dados Reais de Empresa

**Prioridade**: 🟢 MÉDIA

```sql
-- 1. Verificar empresa ativa
SELECT cnpj, razao_social, status FROM clientes WHERE status = 'Ativo' LIMIT 1;

-- 2. Sincronizar dados F360/OMIE
-- Opção A: Manualmente via SQL
INSERT INTO card_processing_queue (company_cnpj, card_type, status, computed_data)
VALUES
  ('12.345.678/0001-90', 'total_caixa', 'completed', '{"value": 150000.00}'::jsonb),
  ('12.345.678/0001-90', 'disponivel', 'completed', '{"value": 95000.00}'::jsonb),
  ('12.345.678/0001-90', 'runway', 'completed', '{"meses": 6.5, "status": "ok"}'::jsonb);

-- Opção B: Trigger sync via Edge Function
-- POST /functions/v1/sync-f360 (precisa criar)
```

---

### 8. Gerar Embeddings (Executar uma vez)

**Prioridade**: 🟢 MÉDIA

```bash
# Chamar função para popular embeddings
curl -X POST https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/generate-embeddings \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json"
```

---

### 9. Testar Envio de Mensagem

**Prioridade**: 🟢 BAIXA (só após 1-4)

```bash
# Testar envio manual
curl -X POST https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/whatsapp-send-templates \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "5511999999999",
    "company_cnpj": "12.345.678/0001-90"
  }'
```

---

### 10. Configurar Envio Automático (Cron)

**Prioridade**: 🟢 BAIXA

**Opção A: N8N Schedule Trigger**
- Adicionar node "Schedule Trigger" (every 10 minutes)
- Conectar a HTTP Request para `whatsapp-send-templates`

**Opção B: pg_cron**
```sql
SELECT cron.schedule(
  'send-whatsapp-templates',
  '*/10 * * * *', -- A cada 10 minutos
  $$
  SELECT net.http_post(
    url := 'https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/whatsapp-send-templates',
    headers := '{"Authorization": "Bearer <KEY>"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

---

## 🎯 Ordem Recomendada de Execução

1. ✅ **STEP 1**: Deploy `whatsapp-send-templates` (testar envio básico)
2. ✅ **STEP 2**: Criar storage bucket
3. ✅ **STEP 3**: Criar e deployar `generate-embeddings`
4. ✅ **STEP 4**: Executar geração de embeddings
5. ✅ **STEP 5**: Criar e deployar `whatsapp-agent`
6. ✅ **STEP 6**: Importar workflow N8N
7. ✅ **STEP 7**: Configurar webhook Evolution API
8. ✅ **STEP 8**: Popular dados reais (ou forçar sync)
9. ✅ **STEP 9**: Teste end-to-end (enviar msg → receber resposta)
10. ✅ **STEP 10**: Configurar cron de envio automático

---

## 📊 Status Atual

| Componente | Status | Próximo Passo |
|------------|--------|---------------|
| Database Schema | ✅ 100% | - |
| Edge Functions (código) | ✅ 100% | Deploy no Supabase |
| Edge Functions (deploy) | ❌ 0% | `supabase functions deploy` |
| N8N Workflow | ✅ JSON pronto | Importar e configurar |
| Evolution Webhook | ❌ 0% | Configurar via API |
| Embeddings | ❌ 0% | Executar `generate-embeddings` |
| Dados Reais | ❌ 0% | Sync F360/OMIE ou INSERT manual |
| Teste E2E | ❌ 0% | Enviar msg e validar resposta |

---

## 🔥 Resposta à Pergunta do Usuário

> "voce pode rodar as mensagens agora na instancia ativa e mandar as 38 mensagens com dados reais de uma empresa?"

**Resposta**: ❌ NÃO, ainda não. O backend está 100% pronto mas falta deployment (Steps 1-8 acima).

> "e o oráculo vai responder a perguntas que a pessoa fizer nessa instancia?"

**Resposta**: ✅ SIM, mas só depois do deployment. O sistema está preparado para responder com:
- Busca de RAG client-specific + público
- Dados financeiros via card system
- Personalidade customizada
- Contexto enriquecido

> "isso está já feito no n8n? ou evo?"

**Resposta**:
- ✅ N8N: Workflow JSON criado mas NÃO importado ainda
- ✅ Evolution API: Instância "iFinance" está ativa mas webhook NÃO configurado ainda
- ❌ Integração: Não está funcionando ainda

---

## ⏱️ Tempo Estimado para Deploy Completo

- Step 1-4: ~30 minutos
- Step 5: ~45 minutos (criar whatsapp-agent)
- Step 6-7: ~15 minutos
- Step 8: ~10 minutos
- Step 9-10: ~20 minutos

**Total**: ~2 horas

---

## 🚦 Começar Agora?

Próximo comando a executar:

```bash
cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-backend
supabase functions deploy whatsapp-send-templates --no-verify-jwt
```
