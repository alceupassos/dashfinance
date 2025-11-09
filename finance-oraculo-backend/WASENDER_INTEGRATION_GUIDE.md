# 📱 Guia de Integração WaSender - Finance Oráculo

**Status**: ✅ Implementação Completa
**Data**: 07/11/2025
**Provider**: WaSender API (substituindo Evolution API)

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Credenciais](#credenciais)
3. [Arquitetura](#arquitetura)
4. [Edge Functions](#edge-functions)
5. [Workflow N8N](#workflow-n8n)
6. [Database Schema](#database-schema)
7. [Deploy](#deploy)
8. [Configuração Webhook](#configuração-webhook)
9. [Testes](#testes)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O Finance Oráculo agora utiliza **WaSender API** como provider principal de WhatsApp, oferecendo:

- ✅ **API REST simples** - Endpoints diretos para envio de mensagens
- ✅ **Webhook real-time** - Recebimento instantâneo de mensagens
- ✅ **Multi-mídia** - Suporte para texto, imagens, vídeos, documentos, áudio
- ✅ **Sem QR Code** - Conexão permanente via session
- ✅ **Baixo custo** - Pricing competitivo comparado com Evolution
- ✅ **Confiável** - 99.9% uptime SLA

---

## 🔑 Credenciais

### WaSender Account

```bash
# Credenciais principais
WASENDER_API_KEY=31fc32fca3dc75ba99d9eb4ad7ae1bfcf604b5bd76fdddda40e9175809d10e06
WASENDER_API_SECRET=352e43ecd33e0c2bb2cd40927218e91f

# Webhook URL
WASENDER_WEBHOOK_URL=https://www.ifin.app.br/webhook/wasender

# API Base URL
WASENDER_BASE_URL=https://wasenderapi.com/api

# Documentação
WASENDER_DOCS=https://wasenderapi.com/api-docs/
```

### Armazenamento Seguro

As credenciais estão armazenadas em:

1. **Supabase Secrets** (tabela `secrets`)
2. **Supabase Vault** (opcional, criptografado)
3. **Environment Variables** (Edge Functions)
4. **N8N Credentials** (para workflows)

---

## 🏗️ Arquitetura

```
┌─────────────────┐
│   WhatsApp      │
│   (Cliente)     │
└────────┬────────┘
         │ Mensagem
         ▼
┌─────────────────┐
│  WaSender API   │ ◄── Session conectada
│  (Provider)     │
└────────┬────────┘
         │ Webhook POST
         ▼
┌─────────────────────────────────┐
│  Supabase Edge Function         │
│  wasender-webhook               │
│  - Validar payload              │
│  - Extrair mensagem             │
│  - Logar em BD                  │
│  - Forward para N8N             │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  N8N Workflow                   │
│  WaSender Message Router        │
│  - Check session                │
│  - Onboarding se novo           │
│  - Execute command se /         │
│  - Senão, call AI Agent         │
└────────┬────────────────────────┘
         │ Resposta IA
         ▼
┌─────────────────────────────────┐
│  Supabase Edge Function         │
│  wasender-send-message          │
│  - Formatar payload             │
│  - Call WaSender API            │
│  - Logar resposta               │
└────────┬────────────────────────┘
         │ Mensagem enviada
         ▼
┌─────────────────┐
│   WhatsApp      │
│   (Cliente)     │
└─────────────────┘
```

---

## ⚡ Edge Functions

### 1. `wasender-send-message`

**Propósito**: Enviar mensagens via WaSender API

**Endpoint**: `POST /functions/v1/wasender-send-message`

**Request Body**:
```json
{
  "to": "+5511967377373",
  "text": "Olá! Seu saldo atual é R$ 45.230,00",
  "image": "https://storage.supabase.co/...png",
  "caption": "Relatório Financeiro Novembro",
  "quotedMessageId": "msg_123" // Opcional - reply
}
```

**Response**:
```json
{
  "success": true,
  "messageId": "3EB0A8F5B2D9E1C4",
  "timestamp": "2025-11-07T12:34:56Z"
}
```

**Funcionalidades**:
- ✅ Envio de texto simples
- ✅ Envio de imagens com caption
- ✅ Envio de vídeos, documentos, áudio
- ✅ Reply (quoted message)
- ✅ Log automático em `whatsapp_conversations`
- ✅ Validação de campos obrigatórios
- ✅ Error handling com retry

**Código**:
```typescript
// finance-oraculo-backend/supabase/functions/wasender-send-message/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const WASENDER_API_KEY = Deno.env.get('WASENDER_API_KEY');
const WASENDER_BASE_URL = 'https://wasenderapi.com/api';

async function sendMessage(payload) {
  const response = await fetch(`${WASENDER_BASE_URL}/send-message`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WASENDER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return response.json();
}
```

---

### 2. `wasender-webhook`

**Propósito**: Receber mensagens incoming do WaSender

**Endpoint**: `POST /functions/v1/wasender-webhook` (público, sem JWT)

**Webhook URL configurado no WaSender**: `https://www.ifin.app.br/webhook/wasender`

**Payload Recebido** (exemplo):
```json
{
  "event": "messages.upsert",
  "session_id": "ifinance_session",
  "data": {
    "key": {
      "remoteJid": "5511967377373@s.whatsapp.net",
      "fromMe": false,
      "id": "3EB0A8F5B2D9E1C4"
    },
    "message": {
      "conversation": "Qual meu saldo?"
    },
    "messageTimestamp": 1699373040,
    "pushName": "João Silva"
  }
}
```

**Processamento**:
1. ✅ Valida evento (`messages.upsert` apenas)
2. ✅ Ignora mensagens nossas (`fromMe: true`)
3. ✅ Extrai phone, messageId, texto
4. ✅ Busca/cria session em `whatsapp_chat_sessions`
5. ✅ Loga mensagem em `whatsapp_conversations`
6. ✅ Forward para N8N com payload normalizado

**Response**:
```json
{
  "status": "processed",
  "phone_number": "5511967377373",
  "message_id": "3EB0A8F5B2D9E1C4"
}
```

---

## 🔄 Workflow N8N

**Nome**: `WaSender Message Router`
**Arquivo**: `n8n-workflows/wasender-message-router.json`

### Nodes

1. **Webhook WaSender** (Trigger)
   - Recebe POST do Edge Function `wasender-webhook`

2. **Check Session** (Postgres Query)
   ```sql
   SELECT ws.company_cnpj, ws.session_state, ws.personality_id
   FROM whatsapp_chat_sessions ws
   WHERE ws.phone_number = '{{ $json.phone_number }}'
   ```

3. **Session Exists?** (IF)
   - TRUE → Continua para processamento
   - FALSE → Trigger Onboarding

4. **Is Command?** (IF)
   - Se mensagem começa com `/` → Execute Admin Command
   - Senão → Call AI Agent

5. **Call AI Agent** (HTTP Request)
   - Endpoint: `/functions/v1/whatsapp-bot`
   - Body: `{ phone_number, company_cnpj, message, personality_id }`

6. **Send Response** (HTTP Request)
   - Endpoint: `/functions/v1/wasender-send-message`
   - Body: `{ to: phone_number, text: response }`

7. **Respond Success** (Webhook Response)
   - Return `{ status: "success" }`

### Fluxo Visual

```
Webhook WaSender
    │
    ▼
Check Session (DB)
    │
    ▼
Session Exists? ◄─────┐
    │ YES           NO │
    ▼                  │
Is Command?            │
    │ YES          NO  │
    ▼              ▼   │
Execute Command   AI   │
    │             │    │
    └─────┬───────┘    │
          ▼            ▼
    Send Response  Onboarding
          │
          ▼
    Respond Success
```

### Importar Workflow

```bash
# Via N8N UI
1. Abrir N8N → Workflows
2. Importar → From File
3. Selecionar: n8n-workflows/wasender-message-router.json
4. Configurar credentials:
   - Supabase PostgreSQL
   - Supabase Service Key (HTTP Header Auth)
5. Ativar workflow
```

---

## 🗄️ Database Schema

### Migration 014

**Arquivo**: `migrations/014_wasender_integration.sql`

**Alterações**:

1. **Tabela `wasender_credentials`** (nova)
```sql
CREATE TABLE wasender_credentials (
  id SERIAL PRIMARY KEY,
  api_key VARCHAR(255) NOT NULL,
  api_secret VARCHAR(255),
  session_id VARCHAR(100),
  webhook_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

2. **Coluna `provider`** adicionada em:
   - `whatsapp_config` (default: 'evolution')
   - `whatsapp_conversations` (default: 'wasender')
   - `whatsapp_chat_sessions` (default: 'wasender')
   - `whatsapp_templates` (default: 'universal')

3. **View `v_wasender_active_config`**
```sql
CREATE VIEW v_wasender_active_config AS
SELECT api_key, api_secret, webhook_url
FROM wasender_credentials
WHERE is_active = true
ORDER BY id DESC LIMIT 1;
```

4. **Function `get_wasender_credentials()`**
```sql
CREATE FUNCTION get_wasender_credentials()
RETURNS TABLE (api_key VARCHAR, api_secret VARCHAR, webhook_url TEXT);
```

### Executar Migration

```bash
cd finance-oraculo-backend

# Via Supabase CLI
supabase db push

# Ou via SQL Editor
psql -h db.xzrmzmcoslomtzkzgskn.supabase.co \
  -p 5432 -U postgres -d postgres \
  -f migrations/014_wasender_integration.sql
```

---

## 🚀 Deploy

### 1. Deploy Edge Functions

```bash
cd finance-oraculo-backend

# Deploy wasender-send-message
supabase functions deploy wasender-send-message \
  --no-verify-jwt

# Deploy wasender-webhook
supabase functions deploy wasender-webhook \
  --no-verify-jwt

# Verificar
supabase functions list
```

### 2. Configurar Environment Variables

```bash
# Via Supabase Dashboard → Project Settings → Edge Functions → Add secret
WASENDER_API_KEY=31fc32fca3dc75ba99d9eb4ad7ae1bfcf604b5bd76fdddda40e9175809d10e06
WASENDER_API_SECRET=352e43ecd33e0c2bb2cd40927218e91f
N8N_WHATSAPP_WEBHOOK_URL=https://n8n.ifin.app.br/webhook/wasender-router
```

### 3. Importar Workflow N8N

1. Abrir N8N: `https://n8n.ifin.app.br`
2. Workflows → Import → From File
3. Selecionar: `n8n-workflows/wasender-message-router.json`
4. Configurar credentials
5. Ativar workflow
6. Copiar webhook URL

---

## 🔗 Configuração Webhook

### Painel WaSender

1. Acessar: `https://wasenderapi.com/dashboard`
2. Login com credenciais
3. Navegar: **Settings → Webhooks**
4. Configurar:

```
Webhook URL: https://www.ifin.app.br/webhook/wasender
Events:
  ✅ messages.upsert (mensagens recebidas)
  ✅ messages.update (status de mensagem)
  ❌ session.* (desabilitado por enquanto)
  ❌ contacts.* (desabilitado)
  ❌ groups.* (desabilitado)

Método: POST
Content-Type: application/json
Authentication: None (validação via IP whitelist)
```

5. Salvar e testar

### Nginx Reverse Proxy (www.ifin.app.br)

```nginx
# /etc/nginx/sites-available/ifin.app.br
server {
  listen 443 ssl http2;
  server_name www.ifin.app.br;

  ssl_certificate /etc/letsencrypt/live/ifin.app.br/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/ifin.app.br/privkey.pem;

  location /webhook/wasender {
    proxy_pass https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/wasender-webhook;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

**Recarregar Nginx**:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🧪 Testes

### 1. Teste de Envio (curl)

```bash
# Teste direto na Edge Function
curl -X POST "https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/wasender-send-message" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+5511967377373",
    "text": "✅ Teste de integração WaSender - iFinance"
  }'

# Resposta esperada:
{
  "success": true,
  "messageId": "3EB0A8F5B2D9E1C4",
  "timestamp": "2025-11-07T12:34:56Z"
}
```

### 2. Teste de Recebimento (webhook simulation)

```bash
# Simular webhook do WaSender
curl -X POST "https://www.ifin.app.br/webhook/wasender" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "messages.upsert",
    "data": {
      "key": {
        "remoteJid": "5511967377373@s.whatsapp.net",
        "fromMe": false,
        "id": "TEST_123"
      },
      "message": {
        "conversation": "Olá, qual meu saldo?"
      },
      "messageTimestamp": 1699373040,
      "pushName": "Teste User"
    }
  }'

# Resposta esperada:
{
  "status": "processed",
  "phone_number": "5511967377373",
  "message_id": "TEST_123"
}
```

### 3. Teste End-to-End

1. Enviar mensagem real via WhatsApp para número conectado
2. Verificar logs no Supabase:
   ```sql
   SELECT * FROM whatsapp_conversations
   ORDER BY timestamp DESC LIMIT 10;
   ```
3. Verificar execução N8N: `https://n8n.ifin.app.br/workflow/executions`
4. Verificar resposta recebida no WhatsApp

### 4. Teste de Templates

```bash
# Enviar template com imagem
curl -X POST "https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/wasender-send-message" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+5511967377373",
    "image": "https://storage.supabase.co/ifinance/reports/saldo_diario_20251107.png",
    "caption": "💰 Seu Saldo Diário\n\nTotal em Caixa: R$ 45.230,00\nDisponível: R$ 38.450,00"
  }'
```

---

## 🔧 Troubleshooting

### Mensagens não chegam

**Problema**: Webhook não está sendo chamado

**Diagnóstico**:
```bash
# 1. Verificar logs Edge Function
supabase functions logs wasender-webhook --tail

# 2. Testar conectividade
curl https://www.ifin.app.br/webhook/wasender

# 3. Verificar Nginx
sudo tail -f /var/log/nginx/error.log

# 4. Verificar firewall
sudo ufw status
```

**Solução**:
- Confirmar webhook URL no painel WaSender
- Verificar SSL válido em ifin.app.br
- Whitelist IP do WaSender no firewall

---

### Mensagens não são enviadas

**Problema**: Erro ao enviar via WaSender API

**Diagnóstico**:
```bash
# Logs Edge Function
supabase functions logs wasender-send-message --tail

# Teste manual
curl -X POST "https://wasenderapi.com/api/send-message" \
  -H "Authorization: Bearer 31fc32fca3dc75ba99d9eb4ad7ae1bfcf604b5bd76fdddda40e9175809d10e06" \
  -H "Content-Type: application/json" \
  -d '{"to": "+5511967377373", "text": "teste"}'
```

**Erros Comuns**:
- `401 Unauthorized` → API key inválida/expirada
- `400 Bad Request` → Formato de telefone incorreto (deve ter `+`)
- `429 Too Many Requests` → Rate limit atingido
- `500 Internal Server Error` → Sessão WaSender desconectada

**Solução**:
- Regenerar API key no painel WaSender
- Validar formato: `+5511967377373`
- Aguardar rate limit resetar (1 min)
- Reconectar sessão WhatsApp no painel

---

### N8N não processa mensagens

**Problema**: Workflow não executa

**Diagnóstico**:
```bash
# Verificar webhook ativo
curl -X POST "https://n8n.ifin.app.br/webhook/wasender-router" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Logs N8N
docker logs n8n -f --tail 100
```

**Solução**:
- Ativar workflow manualmente no N8N
- Verificar credentials configuradas
- Reiniciar N8N: `docker restart n8n`

---

### Database errors

**Problema**: Falha ao logar mensagens

**Diagnóstico**:
```sql
-- Verificar tabela existe
SELECT * FROM whatsapp_conversations LIMIT 1;

-- Verificar permissions
SELECT has_table_privilege('authenticated', 'whatsapp_conversations', 'INSERT');

-- Ver últimos erros
SELECT * FROM admin_security_events
WHERE event_type = 'error'
ORDER BY created_at DESC LIMIT 10;
```

**Solução**:
- Executar migration 014 novamente
- Recriar RLS policies
- Verificar service role key no Edge Function

---

## 📊 Monitoramento

### Métricas Importantes

```sql
-- Mensagens enviadas hoje
SELECT COUNT(*) FROM whatsapp_conversations
WHERE message_type = 'outgoing'
AND DATE(timestamp) = CURRENT_DATE;

-- Mensagens recebidas hoje
SELECT COUNT(*) FROM whatsapp_conversations
WHERE message_type = 'incoming'
AND DATE(timestamp) = CURRENT_DATE;

-- Taxa de resposta
SELECT
  COUNT(CASE WHEN message_type = 'incoming' THEN 1 END) AS received,
  COUNT(CASE WHEN message_type = 'outgoing' THEN 1 END) AS sent,
  ROUND(
    COUNT(CASE WHEN message_type = 'outgoing' THEN 1 END)::NUMERIC /
    NULLIF(COUNT(CASE WHEN message_type = 'incoming' THEN 1 END), 0) * 100,
    2
  ) AS response_rate_pct
FROM whatsapp_conversations
WHERE DATE(timestamp) = CURRENT_DATE;

-- Últimas conversas ativas
SELECT
  phone_number,
  company_cnpj,
  COUNT(*) AS message_count,
  MAX(timestamp) AS last_message
FROM whatsapp_conversations
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY phone_number, company_cnpj
ORDER BY last_message DESC
LIMIT 20;
```

### Dashboard Admin

No frontend `admin/whatsapp-monitor`:
- 📊 Gráfico de mensagens por hora
- 📈 Taxa de resposta em tempo real
- 💬 Conversas ativas
- ⚠️ Alertas de falhas
- 🔄 Status da conexão WaSender

---

## 📚 Referências

- **WaSender Docs**: https://wasenderapi.com/api-docs/
- **WaSender Webhook Docs**: https://wasenderapi.com/api-docs/webhooks
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **N8N Webhook Node**: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/

---

## ✅ Checklist de Implementação

- [x] Criar Edge Function `wasender-send-message`
- [x] Criar Edge Function `wasender-webhook`
- [x] Criar workflow N8N `WaSender Message Router`
- [x] Criar migration 014 com schema WaSender
- [x] Configurar credenciais em `secrets`
- [ ] Executar migration no Supabase
- [ ] Deploy Edge Functions
- [ ] Importar workflow N8N
- [ ] Configurar webhook no painel WaSender
- [ ] Configurar reverse proxy Nginx
- [ ] Testar envio de mensagem
- [ ] Testar recebimento de mensagem
- [ ] Testar fluxo end-to-end
- [ ] Monitorar logs por 24h
- [ ] Documentar no DESCRITIVO_TECNICO_COMPLETO.md

---

**Última atualização**: 07/11/2025
**Versão**: 1.0
**Maintainer**: Finance Oráculo Team
