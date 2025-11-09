# 📋 Guia de Importação do Workflow N8N - Finance Oráculo

**Data:** 2025-01-06
**Status:** ✅ Pronto para Importação

---

## 🎯 O Que Você Vai Fazer

Importar o workflow completo de WhatsApp Bot com 32 nodes para automação de mensagens financeiras e respostas com IA.

**Arquivo:** `n8n-workflows/whatsapp-finance-bot.json`

---

## ✅ Pré-requisitos

1. **N8N instalado e rodando** (Cloud ou Self-hosted)
2. **Evolution API configurada** com instância `iFinance`
3. **Supabase Edge Functions deployadas** (já feito ✅)
4. **Credenciais Evolution API atualizadas** (já feito ✅)

---

## 📦 Informações do Workflow

- **Nome:** Finance Oráculo - WhatsApp Bot Completo
- **Nodes:** 32
- **Triggers:** 5
  - 1 Webhook (mensagens recebidas)
  - 4 Schedule Triggers (diário, semanal, mensal, cada 10min)
- **Integrações:** Supabase, Evolution API, HTTP Requests
- **Mensagens Automáticas:** 8 tipos

---

## 🔑 Credenciais Necessárias (4 no total)

### 1. PostgreSQL (Supabase)

**Nome da Credencial no N8N:** `Supabase PostgreSQL`

```
Host: db.xzrmzmcoslomtzkzgskn.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: B5b0dcf500@#
SSL: Enabled
```

### 2. Evolution API

**Nome da Credencial no N8N:** `Evolution API`

```
API URL: https://evolution-api.com
API Key: D7BED4328F0C-4EA8-AD7A-08F72F6777E9
Instance Name: iFinance
```

> **Nota:** Se sua Evolution API estiver em outro domínio, substitua a URL acima.

### 3. Supabase Anon Key

**Nome da Credencial no N8N:** `Supabase Anon Key`

```
API Key Type: Header Auth
Header Name: apikey
Header Value: <SEU_SUPABASE_ANON_KEY>
```

Para obter a Anon Key:
```bash
cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-backend
cat .env | grep SUPABASE_ANON_KEY
```

### 4. Supabase Service Role Key

**Nome da Credencial no N8N:** `Supabase Service Key`

```
API Key Type: Header Auth
Header Name: apikey
Header Value: <SEU_SUPABASE_SERVICE_ROLE_KEY>
```

Para obter a Service Key:
```bash
cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-backend
cat .env | grep SUPABASE_SERVICE_ROLE_KEY
```

---

## 📥 Passo a Passo da Importação

### 1. Acessar N8N

Abra seu N8N no navegador:
- **N8N Cloud:** https://app.n8n.cloud
- **Self-hosted:** http://localhost:5678 (ou seu domínio)

### 2. Criar Novo Workflow

1. Clique em **"New Workflow"** no menu superior
2. Clique no menu de ações (⋮) no canto superior direito
3. Selecione **"Import from File"**

### 3. Selecionar o Arquivo JSON

Navegue até:
```
/Users/alceualvespasssosmac/dashfinance/finance-oraculo-backend/n8n-workflows/whatsapp-finance-bot.json
```

Selecione o arquivo e clique em **"Open"** ou **"Import"**

### 4. Configurar Credenciais

Após importar, você verá avisos em vermelho nos nodes que precisam de credenciais. Para cada um:

#### a) Nodes PostgreSQL
1. Clique no node com aviso vermelho
2. No campo **"Credential to connect with"**, clique em **"Create New"**
3. Preencha com os dados do **PostgreSQL (Supabase)** acima
4. Clique em **"Save"**
5. Repita para todos os nodes PostgreSQL (cerca de 10 nodes)

#### b) Nodes Evolution API (HTTP Request)
1. Clique no node HTTP Request
2. Em **"Authentication"**, selecione **"Generic Credential Type"** → **"Header Auth"**
3. Clique em **"Create New"**
4. Preencha:
   - **Name:** Evolution API Key
   - **Header Name:** `apikey`
   - **Header Value:** `D7BED4328F0C-4EA8-AD7A-08F72F6777E9`
5. Clique em **"Save"**
6. Repita para todos os nodes de envio de mensagem (cerca de 15 nodes)

#### c) Nodes Supabase Edge Functions
1. Clique no node HTTP Request para Edge Function
2. Em **"Authentication"**, selecione **"Header Auth"**
3. Use a credencial **"Supabase Anon Key"** criada anteriormente
4. Repita para todos os nodes de Edge Functions (cerca de 5 nodes)

### 5. Configurar URLs dos Edge Functions

Verifique se as URLs dos nodes HTTP Request estão corretas:

```
Base URL: https://xzrmzmcoslomtzkzgskn.functions.supabase.co

Endpoints:
- /whatsapp-bot
- /send-scheduled-messages
- /sync-f360
- /sync-omie
- /analyze
```

### 6. Configurar Webhook URL (Importante!)

O workflow tem um node **"Webhook"** que recebe mensagens do WhatsApp.

1. Clique no node **"Webhook"** no início do workflow
2. Copie a **"Production URL"** gerada (algo como: `https://n8n.seudominio.com/webhook/whatsapp-bot-123abc`)
3. **Salve essa URL** - você vai precisar dela no próximo passo

### 7. Configurar Webhook na Evolution API

Agora você precisa dizer ao Evolution API para enviar mensagens para o N8N:

**Método 1: Via API REST**
```bash
curl -X POST https://evolution-api.com/instance/iFinance/webhook \
  -H "apikey: D7BED4328F0C-4EA8-AD7A-08F72F6777E9" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "url": "https://n8n.seudominio.com/webhook/whatsapp-bot-123abc",
    "events": ["messages.upsert"],
    "webhook_by_events": true
  }'
```

**Método 2: Via Interface Evolution API**
1. Acesse a interface da Evolution API
2. Vá em **Instâncias** → **iFinance** → **Webhooks**
3. Adicione um novo webhook:
   - **URL:** Cole a URL do webhook do N8N
   - **Events:** Selecione `messages.upsert`
   - **Enabled:** Sim

---

## 🧪 Testar o Workflow

### Teste 1: Ativar o Workflow
1. No N8N, clique no botão **"Active"** no canto superior direito para ativar o workflow
2. Certifique-se de que o status mudou para **"Active"** (verde)

### Teste 2: Enviar Mensagem de Teste

Envie uma mensagem WhatsApp para o número conectado na instância `iFinance`:

```
Qual o saldo do meu caixa?
```

**Esperado:**
- A mensagem deve aparecer no node Webhook do N8N
- O workflow deve processar e responder automaticamente
- Você deve receber uma resposta com dados financeiros reais

### Teste 3: Verificar Mensagens Automáticas

As mensagens automáticas rodam em horários específicos:

| Mensagem | Horário | Trigger Node |
|----------|---------|--------------|
| Snapshot Diário | 08:00 | Schedule Trigger (diário) |
| Alerta de Vencidas | 08:00 | Schedule Trigger (diário) |
| Pagamentos 7 Dias | 08:00 | Schedule Trigger (diário) |
| KPIs Semanais | Segunda 08:00 | Schedule Trigger (semanal) |
| DRE Mensal | Dia 2, 08:00 | Schedule Trigger (mensal) |

**Para testar agora:**
1. Clique com o botão direito no node **"Schedule Trigger - Diário"**
2. Selecione **"Execute Node"**
3. Isso vai simular o horário agendado e enviar as mensagens

### Teste 4: Verificar Logs no Supabase

Verifique se as mensagens estão sendo registradas:

```sql
-- Mensagens enviadas
SELECT * FROM whatsapp_messages
ORDER BY created_at DESC
LIMIT 10;

-- Conversas ativas
SELECT * FROM whatsapp_conversations
WHERE last_message_at >= NOW() - INTERVAL '1 hour';

-- Logs de LLM (respostas do bot)
SELECT * FROM llm_usage_logs
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🔧 Troubleshooting

### Problema 1: Webhook não recebe mensagens

**Sintomas:** Você envia mensagem no WhatsApp mas nada acontece no N8N

**Soluções:**
1. Verifique se o workflow está **Active** (verde)
2. Confirme que o webhook está configurado corretamente na Evolution API
3. Teste a URL do webhook manualmente:
```bash
curl -X POST https://n8n.seudominio.com/webhook/whatsapp-bot-123abc \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "key": {
        "remoteJid": "5511999999999@s.whatsapp.net"
      },
      "message": {
        "conversation": "teste"
      }
    }
  }'
```

### Problema 2: Credenciais inválidas

**Sintomas:** Nodes mostram erro de autenticação

**Soluções:**
1. Verifique se copiou as credenciais corretamente (sem espaços extras)
2. Teste a conexão PostgreSQL:
```bash
PGPASSWORD='B5b0dcf500@#' /opt/homebrew/opt/postgresql@15/bin/psql \
  -h db.xzrmzmcoslomtzkzgskn.supabase.co \
  -p 5432 -U postgres -d postgres \
  -c "SELECT 1;"
```
3. Teste a Evolution API:
```bash
curl https://evolution-api.com/instance/iFinance/connectionState \
  -H "apikey: D7BED4328F0C-4EA8-AD7A-08F72F6777E9"
```

### Problema 3: Bot não responde perguntas

**Sintomas:** Mensagem é recebida mas não há resposta

**Soluções:**
1. Verifique se a Edge Function `whatsapp-bot` está ativa:
```bash
curl -X POST https://xzrmzmcoslomtzkzgskn.functions.supabase.co/whatsapp-bot \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -d '{
    "phone": "5511999999999",
    "message": "Qual o saldo do meu caixa?",
    "cnpj": "00052912647000"
  }'
```
2. Verifique os logs da Edge Function no Supabase Dashboard
3. Confirme que o CNPJ existe na tabela `companies`

### Problema 4: Mensagens automáticas não enviam

**Sintomas:** Horário agendado passa mas mensagens não são enviadas

**Soluções:**
1. Execute manualmente o node de Schedule para testar
2. Verifique se há empresas ativas:
```sql
SELECT * FROM companies WHERE status = 'active';
```
3. Verifique se há configurações WhatsApp:
```sql
SELECT * FROM whatsapp_config WHERE is_active = true;
```
4. Verifique se os números estão corretos no formato internacional (+55...)

---

## 📊 Monitoramento

### Via N8N

1. **Executions:** Vá em **Executions** no menu lateral para ver histórico de execuções
2. **Logs:** Clique em cada execução para ver o fluxo completo
3. **Errors:** Filtre por **"Error"** para ver apenas falhas

### Via Supabase

```sql
-- Mensagens enviadas hoje
SELECT
  COUNT(*) as total,
  message_type,
  status
FROM whatsapp_messages
WHERE created_at::date = CURRENT_DATE
GROUP BY message_type, status;

-- Taxa de sucesso do bot hoje
SELECT
  COUNT(*) as total_requests,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
  ROUND(SUM(CASE WHEN success THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 2) as success_rate
FROM llm_usage_logs
WHERE created_at::date = CURRENT_DATE;

-- Custos de LLM hoje
SELECT
  SUM(cost_usd) as total_cost_usd,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens
FROM llm_usage_logs
WHERE created_at::date = CURRENT_DATE;
```

---

## 🎨 Personalização (Opcional)

### Alterar Horários das Mensagens Automáticas

1. Clique no node **"Schedule Trigger"**
2. Modifique o campo **"Cron Expression"**

**Exemplos:**
- `0 8 * * *` = Todo dia às 8h
- `0 8 * * 1` = Toda segunda às 8h
- `0 8 2 * *` = Dia 2 de cada mês às 8h
- `*/10 * * * *` = A cada 10 minutos

### Adicionar Novo Tipo de Mensagem Automática

1. Duplique um dos flows existentes (ex: Snapshot Diário)
2. Modifique o node **"Set Message Type"** para um novo tipo
3. Adicione o novo tipo na tabela `message_types`:
```sql
INSERT INTO message_types (type_key, display_name, is_active)
VALUES ('meu_novo_tipo', 'Meu Novo Tipo', true);
```

### Personalizar Respostas do Bot

As respostas são geradas pela Edge Function `whatsapp-bot`. Para personalizar:

1. Edite o arquivo `/Users/alceualvespasssosmac/dashfinance/finance-oraculo-backend/supabase/functions/whatsapp-bot/index.ts`
2. Modifique a seção de prompts do Claude
3. Redeploy a function:
```bash
cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-backend
supabase functions deploy whatsapp-bot
```

---

## 📝 Checklist Final

Antes de considerar a importação completa, verifique:

- [ ] N8N está acessível e funcionando
- [ ] Workflow foi importado com sucesso (32 nodes visíveis)
- [ ] 4 credenciais foram criadas e testadas:
  - [ ] PostgreSQL (Supabase)
  - [ ] Evolution API
  - [ ] Supabase Anon Key
  - [ ] Supabase Service Key
- [ ] Webhook URL foi copiada do N8N
- [ ] Webhook foi configurado na Evolution API
- [ ] Workflow está ativo (status verde)
- [ ] Teste de mensagem funcionou (recebeu resposta do bot)
- [ ] Mensagem automática de teste funcionou
- [ ] Logs do Supabase mostram mensagens sendo registradas

---

## 🚀 Conclusão

Com todos os passos acima concluídos, seu sistema WhatsApp Bot está **100% operacional**!

**O que você tem agora:**
- ✅ Bot responde perguntas financeiras automaticamente com IA
- ✅ 8 tipos de mensagens automáticas enviadas em horários agendados
- ✅ Filtro de perguntas não-financeiras (40+ keywords)
- ✅ Consulta F360/OMIE em tempo real quando necessário
- ✅ Cache de 1 hora para reduzir custos de IA
- ✅ Tracking completo de conversas e custos

**Recursos Adicionais:**
- [WHATSAPP_SYSTEM_GUIDE.md](WHATSAPP_SYSTEM_GUIDE.md) - Guia completo do sistema (15 páginas)
- [RELATORIO_FINAL_WHATSAPP.md](RELATORIO_FINAL_WHATSAPP.md) - Relatório detalhado
- [RESUMO_EXECUTIVO.md](RESUMO_EXECUTIVO.md) - Visão geral do projeto

---

## 💬 Suporte

Se encontrar problemas:

1. Verifique os logs do N8N (Executions)
2. Verifique os logs das Edge Functions no Supabase
3. Consulte a documentação da Evolution API
4. Execute as queries SQL de troubleshooting acima

**Documentação Externa:**
- N8N: https://docs.n8n.io
- Evolution API: https://doc.evolution-api.com
- Supabase: https://supabase.com/docs

---

**Status:** ✅ **PRONTO PARA PRODUÇÃO**
**Última atualização:** 2025-01-06
