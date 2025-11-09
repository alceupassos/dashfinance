# 📱 Estratégia WhatsApp - Finance Oráculo

**Stack**: Evolution API + N8N + Claude (Agent Skills) + Supabase Edge Functions

---

## 🎯 Diferenciais Competitivos

1. **Consultas Instantâneas** - "Qual meu saldo?" → resposta em 2s
2. **Alertas Proativos** - Runway baixo, contas vencendo, metas batidas
3. **Relatórios por Demanda** - "Manda o DRE de outubro" → PDF no chat
4. **Onboarding Zero Fricção** - Cliente não precisa abrir app/site
5. **IA Conversacional** - Claude entende contexto, não é bot burro
6. **Multi-empresa** - Um número atende várias empresas (isolamento por CNPJ)

---

## 🏗️ Arquitetura

```
WhatsApp User
     ↓
Evolution API (webhook)
     ↓
N8N Workflow (orquestração)
     ↓
┌─────────────┬──────────────┬──────────────┐
│             │              │              │
Supabase      Claude AI      Edge Functions
(dados)       (inteligência) (processamento)
     ↓              ↓              ↓
Response formatada volta via N8N → Evolution → WhatsApp
```

### **Componentes**

1. **Evolution API** (https://evolution-api.com)
   - Gerencia conexão WhatsApp (QR Code, webhooks)
   - Multi-instância (1 instância = 1 número WhatsApp)
   - Webhooks para mensagens recebidas/enviadas

2. **N8N** (https://n8n.io)
   - Orquestração de workflows
   - Roteamento inteligente (admin vs usuário vs bot)
   - Rate limiting, retry, logging

3. **Claude 3.5 Sonnet** (via Anthropic API)
   - Processa linguagem natural
   - Usa Agent Skills para acessar dados financeiros
   - Gera respostas contextuais

4. **Supabase Edge Functions**
   - APIs de backend (já existentes)
   - Novas: `whatsapp-webhook`, `whatsapp-send`, `whatsapp-agent`

---

## 💬 Casos de Uso

### 1. Consultas Financeiras
**User**: "Qual meu saldo?"
**Bot**:
```
💰 *Saldo Total*: R$ 150.350,00

📊 Detalhamento:
• F360: R$ 120.000,00
• OMIE: R$ 30.350,00

✅ Disponível (após compromissos): R$ 95.200,00
🔴 Contas a pagar: R$ 55.150,00
```

### 2. Alertas Proativos
**Bot** (enviado automaticamente 9h):
```
⚠️ *Alerta de Runway*

Empresa: Acme Corp
Runway atual: 2.8 meses

📉 Situação crítica! Recomendações:
1. Revisar despesas fixas
2. Acelerar recebíveis
3. Considerar aporte

Ver detalhes: https://dash.ifin.app.br/runway
```

### 3. Relatórios Sob Demanda
**User**: "Manda o DRE de outubro"
**Bot**:
```
📊 Gerando DRE de Outubro/2025...

✅ Pronto! Segue o relatório:
📎 DRE_Outubro_2025.pdf (245 KB)

Resumo:
• Receitas: R$ 250.000
• Despesas: R$ 180.000
• Lucro: R$ 70.000 (28%)
```

### 4. Análise Comparativa
**User**: "Como estão as despesas vs mês passado?"
**Bot**:
```
📊 *Comparação Out/25 vs Set/25*

Despesas:
📈 +15% (R$ 180k vs R$ 156k)

Principais aumentos:
• Pessoal: +R$ 12k (+20%)
• Marketing: +R$ 8k (+50%)
• Infra: +R$ 4k (+10%)

💡 Marketing teve ROI de 3.2x
```

### 5. Comandos Administrativos
**Admin**: "/status sync-f360"
**Bot**:
```
🔄 *Status: Sync F360*

Última sync: há 2h
Status: ✅ OK
Transações: 1.247
Contas: 5

Próxima sync: em 1h (11:00)

Forçar sync agora: /sync-f360-now
```

---

## 🤖 Workflows N8N

### Workflow 1: Message Router
**Trigger**: Webhook Evolution (mensagem recebida)

```
Webhook Evolution
     ↓
[Extrair phone, message, timestamp]
     ↓
[Checar se é comando admin] → SIM → Admin Workflow
     ↓ NÃO
[Identificar empresa (CNPJ)] → NÃO ENCONTRADO → Onboarding
     ↓ ENCONTRADO
[Criar/atualizar session em whatsapp_chat_sessions]
     ↓
[Enviar para Claude Agent]
     ↓
[Formatar resposta]
     ↓
[Enviar via Evolution API]
     ↓
[Log em whatsapp_conversations]
```

### Workflow 2: Proactive Alerts
**Trigger**: Cron (diariamente 9h)

```
Cron Trigger (9:00 daily)
     ↓
[Buscar empresas ativas]
     ↓
[Para cada empresa]
     ↓
[Calcular runway via Edge Function]
     ↓
[runway < 3 meses?] → SIM → Gerar alerta
     ↓
[Buscar contato WhatsApp da empresa]
     ↓
[Enviar mensagem via Evolution]
     ↓
[Log em whatsapp_scheduled]
```

### Workflow 3: Report Generator
**Trigger**: Keyword detection ("manda", "gera", "DRE", "relatório")

```
User Message
     ↓
[Claude identifica: tipo de relatório + período]
     ↓
[Chamar Edge Function export-excel]
     ↓
[Receber URL do arquivo]
     ↓
[Baixar arquivo]
     ↓
[Enviar via Evolution API (document)]
     ↓
[Confirmar envio]
```

### Workflow 4: Onboarding
**Trigger**: Número não cadastrado

```
Mensagem de número desconhecido
     ↓
[Enviar]: "Olá! Para usar o Finance Oráculo, preciso do CNPJ da sua empresa."
     ↓
[Aguardar resposta]
     ↓
[Validar CNPJ] → INVÁLIDO → Retry
     ↓ VÁLIDO
[Verificar se CNPJ existe em clientes]
     ↓ EXISTE
[Criar entrada em whatsapp_chat_sessions]
     ↓
[Enviar]: "✅ Empresa cadastrada! Já pode me fazer perguntas."
```

---

## 🔌 Evolution API - Setup

### Instalação (Docker)
```bash
docker run -d \
  --name evolution-api \
  -p 8080:8080 \
  -e DATABASE_PROVIDER=postgresql \
  -e DATABASE_CONNECTION_URI="postgresql://postgres:senha@host:5432/evolution" \
  -e AUTHENTICATION_API_KEY="sua-api-key-super-secreta" \
  atendai/evolution-api:latest
```

### Criar Instância WhatsApp
```bash
curl -X POST http://localhost:8080/instance/create \
  -H "apikey: sua-api-key-super-secreta" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "finance-oraculo",
    "token": "token-webhook-n8n",
    "qrcode": true,
    "webhook": "https://seu-n8n.com/webhook/whatsapp",
    "webhookByEvents": true,
    "events": [
      "messages.upsert",
      "messages.update",
      "connection.update"
    ]
  }'
```

### Escanear QR Code
```bash
curl http://localhost:8080/instance/connect/finance-oraculo \
  -H "apikey: sua-api-key-super-secreta"
```

### Enviar Mensagem
```bash
curl -X POST http://localhost:8080/message/sendText/finance-oraculo \
  -H "apikey: sua-api-key-super-secreta" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "5511999887766",
    "text": "Olá! Seu saldo é R$ 150.000,00"
  }'
```

---

## 🧠 Agent Skill: WhatsApp Assistant

Skill que permite Claude processar perguntas via WhatsApp com acesso aos cards financeiros.

**Exemplo de prompt para Claude**:
```
Você é o assistente WhatsApp do Finance Oráculo.

Contexto:
- Empresa: Acme Corp (CNPJ: 12.345.678/0001-90)
- Contato: João Silva (5511999887766)
- Histórico: [últimas 5 mensagens]

Mensagem recebida: "Qual meu saldo?"

Use a skill 'financial-cards' para buscar os dados necessários e responda de forma:
1. Concisa (WhatsApp é mobile)
2. Formatada com emojis
3. Acionável (sugerir próximos passos se relevante)

Resposta:
```

---

## 📊 Edge Functions

### 1. `whatsapp-webhook` (recebe mensagens)
```typescript
serve(async (req) => {
  const { phone, message, timestamp, instanceName } = await req.json();

  // 1. Identificar empresa pelo phone
  const { data: session } = await supabase
    .from('whatsapp_chat_sessions')
    .select('company_cnpj')
    .eq('phone_number', phone)
    .single();

  if (!session) {
    // Trigger onboarding
    return json({ action: 'onboarding' });
  }

  // 2. Salvar mensagem
  await supabase.from('whatsapp_conversations').insert({
    phone_number: phone,
    message_type: 'text',
    message_text: message,
    direction: 'incoming',
    company_cnpj: session.company_cnpj
  });

  // 3. Processar com Claude (via N8N)
  return json({
    action: 'process_with_claude',
    company_cnpj: session.company_cnpj,
    message
  });
});
```

### 2. `whatsapp-send` (envia mensagens)
```typescript
serve(async (req) => {
  const { phone, message, media_url } = await req.json();

  // 1. Enviar via Evolution API
  const response = await fetch('http://evolution-api:8080/message/sendText/finance-oraculo', {
    method: 'POST',
    headers: {
      'apikey': Deno.env.get('EVOLUTION_API_KEY'),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ number: phone, text: message })
  });

  // 2. Log
  await supabase.from('whatsapp_conversations').insert({
    phone_number: phone,
    message_text: message,
    direction: 'outgoing',
    status: 'sent'
  });

  return json({ success: true });
});
```

### 3. `whatsapp-agent` (processamento IA)
```typescript
serve(async (req) => {
  const { company_cnpj, phone, message, history } = await req.json();

  // 1. Buscar contexto da empresa
  const { data: empresa } = await supabase
    .from('clientes')
    .select('razao_social, status')
    .eq('cnpj', company_cnpj)
    .single();

  // 2. Detectar intenção (consulta, alerta, relatório)
  const intention = detectIntention(message);

  // 3. Se consulta financeira, usar card system
  if (intention === 'financial_query') {
    const cards = detectRequiredCards(message); // Ex: ["saldo", "runway"]

    const cardResponse = await fetch('https://projeto.supabase.co/functions/v1/dashboard-smart', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({ cnpj: company_cnpj, cards })
    });

    const data = await cardResponse.json();

    // 4. Formatar resposta amigável
    const reply = formatWhatsAppResponse(data, message);

    return json({ reply });
  }

  // 5. Se comando admin, executar
  if (intention === 'admin_command') {
    const result = await executeAdminCommand(message);
    return json({ reply: result });
  }

  // 6. Fallback: Claude genérico
  const claudeResponse = await callClaude(message, history, empresa);
  return json({ reply: claudeResponse });
});
```

---

## 📋 Schemas de Banco

### `whatsapp_chat_sessions` (já existe)
```sql
CREATE TABLE whatsapp_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE,
  contact_name TEXT,
  company_cnpj TEXT REFERENCES clientes(cnpj),
  status TEXT DEFAULT 'active', -- active, paused, ended
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,
  tags TEXT[],
  assigned_to UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `whatsapp_conversations` (mensagens individuais)
```sql
-- Já existe, expandir:
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS direction TEXT; -- incoming, outgoing
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS status TEXT; -- sent, delivered, read, failed
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS company_cnpj TEXT;
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS media_type TEXT; -- image, document, audio
```

---

## 🚀 Implementação Faseada

### Fase 1 - Infra (Semana 1)
- [ ] Setup Evolution API (Docker)
- [ ] Setup N8N (Docker ou cloud)
- [ ] Conectar número WhatsApp (QR Code)
- [ ] Testar envio/recebimento básico

### Fase 2 - Workflows Básicos (Semana 2)
- [ ] Workflow: Message Router
- [ ] Workflow: Onboarding
- [ ] Edge Function: `whatsapp-webhook`
- [ ] Edge Function: `whatsapp-send`
- [ ] Testar fluxo completo

### Fase 3 - IA Integration (Semana 3)
- [ ] Agent Skill: `whatsapp-assistant`
- [ ] Edge Function: `whatsapp-agent`
- [ ] Integrar com card system
- [ ] Testar consultas financeiras

### Fase 4 - Automações (Semana 4)
- [ ] Workflow: Proactive Alerts (runway, vencimentos)
- [ ] Workflow: Report Generator
- [ ] Agendamento de mensagens
- [ ] Dashboard de métricas WhatsApp

### Fase 5 - Refinamento (Ongoing)
- [ ] Melhorar prompts Claude
- [ ] Adicionar mais tipos de relatórios
- [ ] Multi-idioma
- [ ] Analytics avançados

---

## 💰 Custos Estimados

| Componente | Custo Mensal | Observações |
|------------|--------------|-------------|
| Evolution API | Grátis (self-hosted) | VPS R$ 50-100/mês |
| N8N | Grátis (self-hosted) | Ou $20/mês cloud |
| Claude API | ~$10-50 | Depende de volume |
| Supabase | Incluído | Já pago |
| **TOTAL** | **R$ 100-300** | Altamente escalável |

---

## 📈 Métricas de Sucesso

1. **Tempo de resposta** < 5s (objetivo: 2s)
2. **Taxa de resolução** > 80% (sem intervenção humana)
3. **Satisfação** > 4.5/5.0
4. **Engajamento** > 30% dos clientes usam WhatsApp semanalmente
5. **Redução de suporte** -50% tickets via email/telefone

---

## 🔐 Segurança

1. **Autenticação**: Validar phone + CNPJ antes de retornar dados
2. **RLS**: Todas as queries respeitam company_cnpj
3. **Rate Limiting**: Max 10 msgs/min por número
4. **Sanitização**: Filtrar comandos SQL/code injection
5. **Logs**: Auditar todas as interações
6. **LGPD**: Opt-out via "/sair", deletar dados via "/deletar_dados"

---

**Next Step**: Implementar Fase 1 (setup Evolution + N8N)?
