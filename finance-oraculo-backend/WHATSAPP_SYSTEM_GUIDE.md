# 📱 Sistema WhatsApp Finance Oráculo - Guia Completo

## 🎯 O Que Foi Implementado

Sistema completo de mensagens WhatsApp via Evolution API com:
- ✅ 16 tipos de mensagens automáticas financeiras
- ✅ Bot com IA (Claude Sonnet 4.5) para responder perguntas
- ✅ Filtro automático de perguntas não-financeiras
- ✅ Consulta em tempo real aos ERPs (F360/OMIE) quando dados não estão no Supabase
- ✅ Cache de respostas (1 hora de validade)
- ✅ Atualização de snapshots a cada hora
- ✅ Processamento de mensagens agendadas a cada 10 minutos
- ✅ N8N workflow completo pronto para importação

---

## 📊 Arquitetura do Sistema

```
┌─────────────────┐
│  Cliente        │
│  (WhatsApp)     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│   Evolution API         │
│   (WhatsApp Business)   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│       N8N Workflow      │
│  - Triggers (cron)      │
│  - Webhook (incoming)   │
│  - SQL Queries          │
│  - Message Formatting   │
└────────┬────────────────┘
         │
         ├──────────────────────┐
         │                      │
         ▼                      ▼
┌──────────────────┐   ┌────────────────────┐
│ Supabase Edge    │   │   Supabase         │
│ Functions        │   │   PostgreSQL       │
│                  │   │                    │
│ - whatsapp-bot   │◄──┤ - daily_snapshots  │
│ - send-scheduled │   │ - conversations    │
│                  │   │ - config           │
└────────┬─────────┘   └────────────────────┘
         │
         ▼
┌──────────────────────┐
│  APIs Externas       │
│  - F360 (transações) │
│  - OMIE (contas)     │
│  - Claude (IA)       │
└──────────────────────┘
```

---

## 🗄️ Estrutura do Banco de Dados

### Tabelas Criadas (Migration 002)

#### 1. `daily_snapshots`
Armazena snapshots diários de métricas financeiras:
```sql
- company_cnpj: CNPJ da empresa
- snapshot_date: Data do snapshot
- cash_balance: Saldo em caixa
- runway_days: Dias de runway
- revenue_mtd: Receita no mês até a data
- ebitda_mtd: EBITDA no mês até a data
- monthly_burn: Queima mensal de caixa
- available_for_payments: Disponível para pagamentos
- overdue_count: Quantidade de faturas vencidas
- overdue_amount: Valor total vencido
```

#### 2. `scheduled_messages`
Fila de mensagens a serem enviadas:
```sql
- company_cnpj: CNPJ da empresa
- phone_number: Telefone do destinatário
- message_type: Tipo (snapshot, overdue_alert, etc.)
- message_template: Template da mensagem
- message_data: Dados JSON para o template
- scheduled_for: Quando enviar
- status: pending | sent | failed
- sent_at: Timestamp de envio
- error_message: Mensagem de erro (se houver)
```

#### 3. `whatsapp_conversations`
Histórico completo de conversas:
```sql
- company_cnpj: CNPJ da empresa
- phone_number: Telefone
- message_direction: inbound | outbound
- message_text: Texto da mensagem
- response_text: Texto da resposta (se inbound)
- response_data: Dados da resposta (JSON)
- replied_at: Timestamp da resposta
```

#### 4. `client_notifications_config`
Configuração de notificações por cliente:
```sql
- company_cnpj: CNPJ da empresa
- phone_number: Telefone principal
- enabled: true | false
- message_types: Array de tipos habilitados
- timezone: Fuso horário (default: America/Sao_Paulo)
- preferred_time: Hora preferida (HH:MM)
```

#### 5. `ai_response_cache`
Cache de respostas da IA (1 hora):
```sql
- company_cnpj: CNPJ da empresa
- question_hash: Hash da pergunta
- question_text: Texto original
- answer_text: Resposta gerada
- source_data: Dados usados (JSON)
- cache_expires_at: Quando expira
```

### Views e Funções SQL

#### `v_pending_messages`
View que mostra mensagens pendentes prontas para envio:
```sql
SELECT * FROM v_pending_messages;
```

#### `fn_calculate_daily_snapshot(cnpj, date)`
Calcula e atualiza snapshot diário:
```sql
SELECT fn_calculate_daily_snapshot('00052912647000', CURRENT_DATE);
```

#### `fn_schedule_message(cnpj, phone, type, data, when)`
Agenda uma mensagem:
```sql
SELECT fn_schedule_message(
  '00052912647000',
  '5511999999999',
  'snapshot',
  '{"cash_balance": 50000}'::jsonb,
  NOW() + INTERVAL '1 hour'
);
```

---

## 🤖 Edge Functions

### 1. `whatsapp-bot` - Bot com IA

**URL:** `https://xzrmzmcoslomtzkzgskn.functions.supabase.co/whatsapp-bot`

**Funcionalidades:**
- ✅ Recebe perguntas via POST
- ✅ Filtra perguntas não-financeiras (retorna mensagem educativa)
- ✅ Busca contexto do cliente no Supabase
- ✅ Verifica cache de respostas (válido por 1 hora)
- ✅ Consulta F360/OMIE se dados não estão no Supabase ou pergunta é sobre "tempo real"
- ✅ Gera resposta com Claude Sonnet 4.5 (máx 3-4 linhas)
- ✅ Salva no cache e histórico de conversas

**Request:**
```json
POST /whatsapp-bot
{
  "phone": "5511999999999",
  "message": "Qual o saldo do meu caixa?",
  "cnpj": "00052912647000"
}
```

**Response:**
```json
{
  "success": true,
  "answer": "💰 Seu caixa atual está em **R$ 45.320,50**. Disponível para pagamentos hoje: **R$ 32.100,00**. Runway de **67 dias**. Situação confortável! ✅",
  "cached": false,
  "source": "supabase"
}
```

**Palavras-chave Financeiras (auto-detectadas):**
```
caixa, receita, despesa, custo, lucro, prejuízo, fatura, pagamento,
recebimento, vencimento, atraso, saldo, dre, fluxo, cash, ebitda,
margem, cliente, fornecedor, conta, banco, pagar, receber, dinheiro,
real, reais, r$, financeiro, orçamento, previsão, runway, kpi,
vendas, faturamento, inadimplência, cobrança, boleto, pix, nf, nota fiscal
```

**Consulta Automática a ERPs:**
Quando detecta:
- Palavras "tempo real", "hoje", "agora"
- Palavras "transação", "pagamento" → consulta F360
- Outras consultas financeiras sem dados → consulta OMIE
- Snapshot não existe no Supabase → força consulta

### 2. `send-scheduled-messages` - Processador de Mensagens

**URL:** `https://xzrmzmcoslomtzkzgskn.functions.supabase.co/send-scheduled-messages`

**Funcionalidades:**
- ✅ Busca até 50 mensagens pendentes (status='pending', scheduled_for <= NOW)
- ✅ Processa cada mensagem usando templates
- ✅ Envia via Evolution API
- ✅ Marca como 'sent' ou 'failed'
- ✅ Salva no histórico de conversas

**Request:**
```bash
POST /send-scheduled-messages
Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
```

**Response:**
```json
{
  "processed": 12,
  "success": 11,
  "failed": 1,
  "results": [
    {"id": "msg-123", "status": "success"},
    {"id": "msg-124", "status": "failed", "error": "Evolution API timeout"}
  ]
}
```

**Templates Implementados:**
1. `snapshot` - Snapshot diário (caixa, disponível, runway)
2. `overdue_alert` - Alerta de faturas vencidas
3. `payables_7d` - Pagamentos próximos 7 dias
4. `receivables_overdue` - Contas a receber atrasadas
5. `dre_monthly` - DRE mensal resumido
6. `kpi_weekly` - KPIs semanais (DSO, DPO, GM, CAC)
7. `runway_weekly` - Liquidez semanal
8. `weekly_summary` - Resumo semanal

---

## ⏰ Jobs Automatizados (pg_cron)

### Job 1: Atualização de Snapshots (a cada hora)
```sql
-- Cron: 0 * * * * (todo início de hora)
SELECT fn_calculate_daily_snapshot(company_cnpj, CURRENT_DATE)
FROM client_notifications_config
WHERE enabled = true;
```

### Job 2: Processar Mensagens Agendadas (a cada 10 min)
```sql
-- Cron: */10 * * * * (a cada 10 minutos)
SELECT net.http_post(
  url := 'https://xzrmzmcoslomtzkzgskn.functions.supabase.co/send-scheduled-messages',
  headers := '{"Authorization": "Bearer <SERVICE_KEY>"}'::jsonb,
  body := '{}'::jsonb
);
```

**Verificar status dos jobs:**
```sql
SELECT jobname, schedule, active, nodename
FROM cron.job
WHERE jobname IN ('update_snapshots_hourly', 'process_scheduled_messages_10min');
```

**Ver últimas execuções:**
```sql
SELECT *
FROM cron.job_run_details
WHERE jobname IN ('update_snapshots_hourly', 'process_scheduled_messages_10min')
ORDER BY start_time DESC
LIMIT 20;
```

---

## 🔄 N8N Workflow

### Arquivo: `n8n-workflows/whatsapp-finance-bot.json`

**Como Importar:**
1. Abra N8N: http://localhost:5678 (ou seu servidor N8N)
2. Menu → **Workflows**
3. Clique em **Import from File**
4. Selecione `whatsapp-finance-bot.json`
5. Configure as credenciais (ver seção abaixo)

### Triggers Implementados

#### 1. **Daily 8AM Trigger** (Cron: 0 8 * * *)
Dispara diariamente às 8h:
- Snapshot diário
- Alerta de faturas vencidas
- Pagamentos próximos 7 dias
- Contas a receber atrasadas

#### 2. **Weekly Monday 8AM Trigger** (Cron: 0 8 * * 1)
Toda segunda-feira às 8h:
- KPIs semanais
- Liquidez semanal (runway)
- Resumo semanal

#### 3. **Monthly D+2 8AM Trigger** (Cron: 0 8 2 * *)
Todo dia 2 do mês às 8h:
- DRE mensal consolidado

#### 4. **Hourly Snapshot Update** (Cron: 0 * * * *)
A cada hora:
- Atualiza todos os snapshots
- Processa mensagens agendadas

#### 5. **WhatsApp Incoming Webhook**
Recebe mensagens do WhatsApp via Evolution API:
- URL: `https://n8n.seudominio.com/webhook/whatsapp-webhook`
- Parseia mensagem
- Identifica CNPJ pelo telefone
- Chama Edge Function `whatsapp-bot`
- Responde via Evolution API

### Credenciais N8N Necessárias

#### 1. **Supabase PostgreSQL** (ID: supabase-db)
```
Type: PostgreSQL
Host: db.xzrmzmcoslomtzkzgskn.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: B5b0dcf500@#
SSL: true
```

#### 2. **Evolution API Key** (ID: evolution-api-key)
```
Type: HTTP Header Auth
Header Name: apikey
Header Value: <SEU_EVOLUTION_API_KEY>
```

#### 3. **Supabase Anon Key** (ID: supabase-anon-key)
```
Type: HTTP Header Auth
Header Name: Authorization
Header Value: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.smtxh5O5vKzdLBK3GWVudfFQsNpwkzXgc1Qev2gIicI
```

#### 4. **Supabase Service Key** (ID: supabase-service-key)
```
Type: HTTP Header Auth
Header Name: Authorization
Header Value: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTc1MjYyMywiZXhwIjoyMDc3MzI4NjIzfQ.c2mPXYgSJWj0yAa81lQdCi2tE5fYBMSPXVaQ_7E53Oc
```

### Configurar Evolution API Webhook no N8N

No Evolution API, configure o webhook para:
```
URL: https://n8n.seudominio.com/webhook/whatsapp-webhook
Events: message.received
```

---

## 📱 16 Tipos de Mensagens Implementadas

### 1. **Snapshot Diário** (snapshot)
**Quando:** Diariamente às 8h
**Exemplo:**
```
📊 Snapshot Diário (06/01/2025)

💰 Caixa: R$ 45.320,50
✅ Disponível p/ pagar hoje: R$ 32.100,00
📅 Runway: 67 dias

Responda OK para confirmar saldo.
```

### 2. **Alerta de Vencidas** (overdue_alert)
**Quando:** Diariamente às 8h (se houver vencidas)
**Exemplo:**
```
⚠️ Faturas Vencidas

📋 Total: 5 faturas
💸 Valor: R$ 12.450,00
🏢 Top credores: Fornecedor A, Fornecedor B, Fornecedor C

Sugere pagamento parcial? (Sim/Não)
```

### 3. **Pagamentos 7 Dias** (payables_7d)
**Quando:** Diariamente às 8h
**Exemplo:**
```
📅 Próximos 7 Dias

💳 Pagamentos: 8
💰 Total: R$ 23.800,00
🎯 Sugestão: priorizar Folha, Impostos, Aluguel

Deseja agendar pagamentos?
```

### 4. **Contas a Receber Atrasadas** (receivables_overdue)
**Quando:** Diariamente às 8h (se houver atrasos)
**Exemplo:**
```
💰 Contas a Receber Atrasadas

👥 Clientes: 3
💸 Valor: R$ 8.900,00
🔝 Top devedores: Cliente X, Cliente Y

Iniciar cobrança automática? (Sim/Não)
```

### 5. **DRE Mensal** (dre_monthly)
**Quando:** Dia 2 de cada mês às 8h
**Exemplo:**
```
📊 DRE 12/2024

💵 Receita: R$ 280.500,00
💸 COGS: R$ 145.200,00
📈 EBITDA: R$ 65.300,00 (23.3%)

Deseja análise detalhada? (Sim/Não)
```

### 6. **KPIs Semanais** (kpi_weekly)
**Quando:** Toda segunda-feira às 8h
**Exemplo:**
```
📊 KPIs Semanais

⏱️ DSO: 42d
⏳ DPO: 38d
💹 Margem Bruta: 48.2%
💰 CAC: R$ 320,00

Todos os indicadores dentro da meta!
```

### 7. **Liquidez Semanal** (runway_weekly)
**Quando:** Toda segunda-feira às 8h
**Exemplo:**
```
✅ Liquidez Semanal

💰 Saldo: R$ 45.320,50
📉 Burn mensal: R$ 22.100,00
⏱️ Runway: 67 dias
📊 Status: Saudável
```

### 8. **Resumo Semanal** (weekly_summary)
**Quando:** Toda segunda-feira às 8h
**Exemplo:**
```
📊 Resumo Semana 1

📈 Caixa: +8.5%
📈 Receita: +12.3%
💰 Caixa atual: R$ 45.320,50
```

### 9-16. **Outros Templates**
(Implementados no código, basta configurar na tabela `client_notifications_config`)

---

## 🔧 Configuração Inicial

### 1. Configurar Evolution API

**Opção A: Evolution API Cloud**
1. Acesse https://evolution-api.com
2. Crie uma conta
3. Crie uma instância do WhatsApp
4. Copie a API Key e Instance ID

**Opção B: Evolution API Self-Hosted**
```bash
git clone https://github.com/EvolutionAPI/evolution-api
cd evolution-api
docker-compose up -d
```

### 2. Atualizar Secrets no Supabase

```bash
supabase secrets set \
  EVO_API_URL="https://evolution.seudominio.com" \
  EVO_API_KEY="sua_chave_evolution_api_aqui"
```

### 3. Configurar Clientes

```sql
-- Inserir configuração de cliente
INSERT INTO client_notifications_config (
  company_cnpj,
  phone_number,
  enabled,
  message_types,
  timezone,
  preferred_time
) VALUES (
  '00052912647000',
  '5511999999999',
  true,
  ARRAY['snapshot', 'overdue_alert', 'payables_7d', 'receivables_overdue', 'kpi_weekly', 'runway_weekly', 'weekly_summary', 'dre_monthly'],
  'America/Sao_Paulo',
  '08:00'
);
```

### 4. Importar Workflow N8N

1. Abra N8N
2. Import `n8n-workflows/whatsapp-finance-bot.json`
3. Configure as 4 credenciais (PostgreSQL, Evolution API, Supabase Anon, Supabase Service)
4. Ative o workflow

### 5. Configurar Webhook Evolution API

No Evolution API, configure:
```
Webhook URL: https://n8n.seudominio.com/webhook/whatsapp-webhook
Events: message.received
```

---

## 🧪 Testar o Sistema

### 1. Testar WhatsApp Bot (via curl)

```bash
# Pergunta financeira válida
curl -X POST https://xzrmzmcoslomtzkzgskn.functions.supabase.co/whatsapp-bot \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5511999999999",
    "message": "Qual o saldo do meu caixa?",
    "cnpj": "00052912647000"
  }'

# Pergunta não-financeira (deve rejeitar)
curl -X POST https://xzrmzmcoslomtzkzgskn.functions.supabase.co/whatsapp-bot \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5511999999999",
    "message": "Qual o clima hoje?",
    "cnpj": "00052912647000"
  }'
```

### 2. Testar Envio de Mensagens Agendadas

```bash
# Agendar mensagem de teste
curl -X POST https://xzrmzmcoslomtzkzgskn.functions.supabase.co/send-scheduled-messages \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
```

### 3. Enviar Mensagem Manual via SQL

```sql
-- Agendar snapshot para agora
SELECT fn_schedule_message(
  '00052912647000',
  '5511999999999',
  'snapshot',
  jsonb_build_object(
    'date', CURRENT_DATE::text,
    'cash_balance', '45320.50',
    'available_for_payments', '32100.00',
    'runway_days', 67
  ),
  NOW()
);

-- Processar imediatamente (via N8N ou Edge Function)
```

### 4. Testar Via WhatsApp

Envie mensagens do WhatsApp configurado:
```
Cliente: Qual o saldo do meu caixa?
Bot: 💰 Seu caixa atual está em **R$ 45.320,50**...

Cliente: Como está o clima?
Bot: ❌ Desculpe, só posso responder perguntas sobre **assuntos financeiros**...
```

---

## 📊 Monitoramento

### Ver Mensagens Pendentes
```sql
SELECT * FROM v_pending_messages;
```

### Ver Histórico de Conversas
```sql
SELECT
  phone_number,
  message_direction,
  message_text,
  response_text,
  created_at
FROM whatsapp_conversations
ORDER BY created_at DESC
LIMIT 50;
```

### Ver Cache de Respostas
```sql
SELECT
  company_cnpj,
  question_text,
  answer_text,
  cache_expires_at,
  created_at
FROM ai_response_cache
WHERE cache_expires_at > NOW()
ORDER BY created_at DESC;
```

### Ver Snapshots Diários
```sql
SELECT
  company_cnpj,
  snapshot_date,
  cash_balance,
  runway_days,
  available_for_payments
FROM daily_snapshots
ORDER BY snapshot_date DESC, company_cnpj
LIMIT 20;
```

### Ver Status dos Jobs
```sql
SELECT
  jobname,
  schedule,
  active,
  nodename
FROM cron.job
WHERE jobname LIKE '%snapshot%' OR jobname LIKE '%message%';
```

---

## 🔐 Segurança

### Validação de Telefone
Apenas telefones cadastrados em `client_notifications_config` podem:
- Receber mensagens automatizadas
- Fazer perguntas ao bot
- Ver dados da empresa

### Isolamento por CNPJ
- Cada telefone está associado a 1 CNPJ
- Bot só retorna dados do CNPJ associado
- Snapshots são isolados por company_cnpj

### Tokens Criptografados
- Tokens F360 e chaves OMIE armazenados com pgcrypto
- Descriptografados apenas nas Edge Functions
- Nunca expostos via API pública

---

## 🚀 Próximos Passos (Opcional)

### 1. Adicionar Mais Templates
- Alerta de baixo runway (<30 dias)
- Relatório de inadimplência
- Análise de margem por produto
- Forecast de fluxo de caixa

### 2. Melhorias no Bot
- Respostas com gráficos (via Quickchart.io)
- Comandos especiais (/saldo, /dre, /help)
- Multi-idioma
- Voz (via Whisper API)

### 3. Integrações Adicionais
- Exportar para Google Sheets
- Notificações Slack/Telegram
- Email reports
- Dashboard web

### 4. Analytics
- Métricas de uso do bot
- Tempo médio de resposta
- Perguntas mais comuns
- Taxa de satisfação

---

## 📞 Suporte

### Logs das Edge Functions
```bash
supabase functions logs whatsapp-bot --follow
supabase functions logs send-scheduled-messages --follow
```

### Dashboard Supabase
- Functions: https://supabase.com/dashboard/project/xzrmzmcoslomtzkzgskn/functions
- SQL Editor: https://supabase.com/dashboard/project/xzrmzmcoslomtzkzgskn/sql
- Logs: https://supabase.com/dashboard/project/xzrmzmcoslomtzkzgskn/logs

### Troubleshooting

**Mensagens não são enviadas:**
1. Verificar se Evolution API está online
2. Verificar secrets: `supabase secrets list`
3. Ver logs: `supabase functions logs send-scheduled-messages`
4. Verificar status dos jobs: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`

**Bot não responde:**
1. Verificar se telefone está cadastrado
2. Verificar ANTHROPIC_API_KEY
3. Ver logs: `supabase functions logs whatsapp-bot`
4. Testar via curl primeiro

**Consultas a ERP falham:**
1. Verificar tokens F360/OMIE descriptografam corretamente
2. Testar APIs diretamente
3. Verificar F360_API_BASE e OMIE_API_BASE

---

## ✅ Checklist de Deploy

- [x] Migration 002 executada (5 tabelas, 3 funções, 1 view)
- [x] Edge Functions deployadas (whatsapp-bot, send-scheduled-messages)
- [x] Secrets configurados (EVO_API_URL, EVO_API_KEY)
- [x] Jobs pg_cron criados (hourly snapshots, 10min message processing)
- [x] N8N workflow criado (whatsapp-finance-bot.json)
- [ ] Evolution API configurada com instância WhatsApp
- [ ] N8N workflow importado e credenciais configuradas
- [ ] Webhook Evolution API apontando para N8N
- [ ] Clientes configurados em client_notifications_config
- [ ] Teste end-to-end realizado

---

**Sistema desenvolvido com Claude Code**
Data: 2025-01-06
