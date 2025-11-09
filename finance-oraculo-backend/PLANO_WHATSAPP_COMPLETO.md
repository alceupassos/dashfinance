# 📱 PLANO DE IMPLEMENTAÇÃO - WhatsApp Finance Oráculo

**Sistema Base**: Finance Oráculo (BPO Financeiro)
**Stack WhatsApp**: Evolution API + N8N + Claude Agent Skills
**Status Backend**: ✅ 100% Completo (8 Edge Functions, 20+ tabelas)
**Status WhatsApp**: 🟡 Estrutura criada, implementação pendente

---

## 🎯 OBJETIVO

Transformar WhatsApp no **canal principal de interação** do Finance Oráculo, permitindo:

1. **Consultas instantâneas** via IA (saldo, runway, DRE, etc)
2. **Alertas proativos** (runway baixo, contas vencendo, metas)
3. **Relatórios sob demanda** (PDF enviado no chat)
4. **Onboarding zero fricção** (sem precisar abrir app)
5. **Multi-empresa** (1 número, N empresas isoladas por CNPJ)

**Diferencial Competitivo**: Cliente recebe respostas financeiras complexas em 2-3s via WhatsApp, sem login em sistema.

---

## 📊 CONTEXTO DO SISTEMA ATUAL

### Backend Existente

**Edge Functions Deployadas** (8):
- `sync-f360`, `sync-omie` - Sincronização ERP
- `analyze` - Análise financeira com Claude
- `export-excel` - Exportação de relatórios
- `upload-dre` - Upload manual DRE
- `whatsapp-bot` - Bot básico (a expandir)
- `send-scheduled-messages` - Mensagens agendadas
- `admin-users`, `admin-llm-config` - Gestão

**Tabelas Relevantes**:
- `clientes` - Empresas cadastradas
- `profiles` - Usuários (5 roles: admin, executivo, franqueado, cliente, viewer)
- `whatsapp_chat_sessions` - Sessões de conversa (phone + CNPJ)
- `whatsapp_conversations` - Mensagens individuais
- `whatsapp_scheduled` - Mensagens agendadas
- `whatsapp_templates` - Templates de mensagem
- `llm_usage` - Tracking de custos Claude
- `llm_models` - Modelos LLM configurados (Haiku 4.5, Sonnet 4.5, Opus 4.1)
- `daily_snapshots` - Snapshots diários de métricas
- `card_processing_queue` - Sistema de cards (18 cards disponíveis)

**Sistema de Cards** (Migration 010):
- 18 cards financeiros em 5 tiers
- Cache inteligente (TTL 15min-360min)
- Otimização via Claude Haiku 4.5
- API `/dashboard-smart` (POST)

**Agent Skills**:
- `financial-cards` - Acesso aos 18 cards financeiros

---

## 🏗️ ARQUITETURA PROPOSTA

```
┌──────────────────────────────────────────────────────────────┐
│                      USUÁRIO WHATSAPP                        │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ↓
┌──────────────────────────────────────────────────────────────┐
│                    EVOLUTION API                              │
│  - Gerencia conexão WhatsApp (QR Code)                       │
│  - Multi-instância (1 instância = 1 número)                  │
│  - Webhooks: messages.upsert, connection.update             │
└──────────────────────┬───────────────────────────────────────┘
                       │ webhook POST
                       ↓
┌──────────────────────────────────────────────────────────────┐
│                         N8N                                   │
│  Workflow 1: Message Router (webhook → processar)            │
│  Workflow 2: Proactive Alerts (cron 9h → enviar alertas)    │
│  Workflow 3: Report Generator (keyword → gerar PDF)          │
│  Workflow 4: Onboarding (CNPJ desconhecido → cadastrar)     │
│  Workflow 5: Admin Commands (/status, /sync, etc)           │
└──────────────────────┬───────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
┌───────────────┐ ┌────────────┐ ┌──────────────────┐
│   SUPABASE    │ │  CLAUDE    │ │ EDGE FUNCTIONS   │
│               │ │  SONNET    │ │                  │
│ - clientes    │ │  4.5       │ │ - dashboard-smart│
│ - profiles    │ │            │ │ - export-excel   │
│ - whatsapp_*  │ │ Agent Skill│ │ - whatsapp-agent │
│ - card_queue  │ │ financial- │ │ - analyze        │
│ - llm_usage   │ │ cards      │ │                  │
└───────────────┘ └────────────┘ └──────────────────┘
        │              │              │
        └──────────────┴──────────────┘
                       │
                       ↓
            Response formatada
                       │
                       ↓
┌──────────────────────────────────────────────────────────────┐
│                    EVOLUTION API                              │
│              (envia resposta via WhatsApp)                    │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ↓
┌──────────────────────────────────────────────────────────────┐
│                   USUÁRIO WHATSAPP                            │
│             (recebe resposta em 2-3s)                         │
└──────────────────────────────────────────────────────────────┘
```

---

## 💬 CASOS DE USO DETALHADOS

### Caso 1: Consulta Simples (saldo)

**Input**: "Qual meu saldo?"

**Fluxo**:
1. Evolution recebe mensagem → webhook para N8N
2. N8N identifica phone `5511999887766`
3. Busca em `whatsapp_chat_sessions`: CNPJ = `12.345.678/0001-90`
4. Chama Claude com Agent Skill `financial-cards`
5. Claude identifica intenção: consultar saldo
6. Claude usa skill → POST `/dashboard-smart` com `cards: ["total_caixa", "disponivel"]`
7. Response em 450ms (cache hit em `saldo_f360`, `saldo_omie`)
8. Claude formata:
   ```
   💰 *Saldo Total*: R$ 150.350,00

   📊 Detalhamento:
   • F360: R$ 120.000,00
   • OMIE: R$ 30.350,00

   ✅ Disponível: R$ 95.200,00
   (após contas a pagar)
   ```
9. N8N envia via Evolution → WhatsApp
10. Log em `whatsapp_conversations` e `llm_usage`

**Tempo total**: ~2-3s

---

### Caso 2: Alerta Proativo (runway crítico)

**Trigger**: Cron diário 9h

**Fluxo**:
1. N8N Workflow 2 executa às 9h
2. Busca todas empresas ativas em `clientes`
3. Para cada empresa:
   - POST `/dashboard-smart` com `cards: ["runway"]`
   - Se `runway.value < 3`:
     - Busca phone em `whatsapp_chat_sessions.company_cnpj`
     - Gera mensagem:
       ```
       ⚠️ *Alerta Finance Oráculo*

       Empresa: {razao_social}
       Runway: {runway.value} meses

       📉 Situação crítica!

       Recomendações:
       1. Revisar despesas fixas
       2. Acelerar recebíveis
       3. Considerar aporte

       Ver detalhes: https://dash.ifin.app.br
       ```
     - Envia via Evolution
     - Log em `whatsapp_scheduled` e `llm_usage`

**Empresas impactadas**: ~10-20% (com runway crítico)

---

### Caso 3: Relatório Sob Demanda (DRE)

**Input**: "Manda o DRE de outubro"

**Fluxo**:
1. Evolution → N8N
2. Claude identifica:
   - Intenção: gerar relatório
   - Tipo: DRE
   - Período: outubro/2025
3. N8N chama Edge Function `/export-excel`:
   ```json
   {
     "cnpj": "12.345.678/0001-90",
     "tipo": "dre",
     "periodo": "2025-10-01"
   }
   ```
4. Edge Function:
   - Busca dados em `daily_snapshots` (outubro)
   - Gera Excel com XlsxPopulate
   - Upload para Storage Supabase
   - Retorna URL temporária (1h expira)
5. N8N baixa arquivo
6. N8N envia via Evolution (tipo: document):
   ```
   📊 *DRE Outubro/2025*

   ✅ Relatório gerado!

   Resumo:
   • Receitas: R$ 250.000
   • Despesas: R$ 180.000
   • Lucro: R$ 70.000 (28%)

   📎 [DRE_Outubro_2025.xlsx]
   ```
7. Cliente recebe arquivo + resumo

**Tempo**: ~5-8s (geração de Excel)

---

### Caso 4: Onboarding (Número Desconhecido)

**Input**: Mensagem de `5511988776655` (não cadastrado)

**Fluxo**:
1. Evolution → N8N
2. Busca em `whatsapp_chat_sessions` WHERE phone = `5511988776655`
3. Resultado: vazio
4. N8N → Workflow 4 (Onboarding):
   - Envia: "Olá! 👋 Para usar o Finance Oráculo, me informe o CNPJ da sua empresa."
   - Aguarda resposta
5. Usuário: "12.345.678/0001-90"
6. N8N valida CNPJ (formato + busca em `clientes`)
7. Se válido:
   - INSERT em `whatsapp_chat_sessions`:
     ```sql
     INSERT INTO whatsapp_chat_sessions (phone_number, company_cnpj, status, contact_name)
     VALUES ('5511988776655', '12.345.678/0001-90', 'active', 'Usuário');
     ```
   - Envia: "✅ Tudo certo! Agora você pode me fazer perguntas sobre a {razao_social}."
8. Se inválido:
   - Envia: "❌ CNPJ inválido ou não encontrado. Tente novamente ou entre em contato com suporte."

---

### Caso 5: Comando Admin

**Input**: "/status sync-f360" (de número admin)

**Fluxo**:
1. Evolution → N8N
2. N8N detecta comando admin (`/`)
3. Verifica se phone é admin:
   ```sql
   SELECT p.role FROM profiles p
   JOIN whatsapp_chat_sessions w ON w.company_cnpj = p.company_cnpj
   WHERE w.phone_number = '5511999887766' AND p.role = 'admin';
   ```
4. Se não admin: "❌ Comando não autorizado"
5. Se admin:
   - Parse comando: `sync-f360`
   - Busca última execução em `sync_logs`:
     ```sql
     SELECT status, last_sync, error_message
     FROM sync_logs
     WHERE source = 'f360'
     ORDER BY last_sync DESC LIMIT 1;
     ```
   - Formata resposta:
     ```
     🔄 *Status: Sync F360*

     Última sync: há 2h
     Status: ✅ OK
     Transações: 1.247
     Contas: 5

     Próxima sync: em 1h (11:00)

     Forçar agora: /sync-f360-now
     ```

**Comandos Admin Disponíveis**:
- `/status {sync-f360|sync-omie|cards}`
- `/sync-f360-now` - Força sync F360
- `/sync-omie-now` - Força sync OMIE
- `/cache-clear {cnpj}` - Limpa cache de cards
- `/stats` - Estatísticas gerais

---

## 🚀 IMPLEMENTAÇÃO FASEADA

### **FASE 1: INFRA (Semana 1)** ⏱️ 8-12h

**Objetivo**: Setup básico Evolution + N8N funcionando

**Tarefas**:

1. **Setup Evolution API** (3h)
   - [ ] Deploy Docker Evolution API
   - [ ] Conectar banco PostgreSQL (Supabase)
   - [ ] Gerar API key
   - [ ] Criar instância "finance-oraculo"
   - [ ] Escanear QR Code (conectar número)
   - [ ] Testar envio/recebimento básico

2. **Setup N8N** (2h)
   - [ ] Deploy Docker N8N (ou usar n8n.cloud)
   - [ ] Configurar webhook público (ngrok ou domínio)
   - [ ] Conectar Supabase (credentials)
   - [ ] Conectar Evolution API (credentials)

3. **Configurar Webhooks** (1h)
   - [ ] Evolution → N8N webhook URL
   - [ ] Testar evento `messages.upsert`
   - [ ] Validar payload recebido

4. **Testes Básicos** (2h)
   - [ ] Enviar mensagem manual → receber webhook
   - [ ] N8N responder "echo" via Evolution
   - [ ] Confirmar log em `whatsapp_conversations`

**Entregável**: Sistema envia/recebe mensagens WhatsApp via N8N

---

### **FASE 2: WORKFLOWS BÁSICOS (Semana 2)** ⏱️ 16-20h

**Objetivo**: Roteamento inteligente + onboarding

**Tarefas**:

1. **Workflow 1: Message Router** (6h)
   - [ ] Webhook recebe mensagem
   - [ ] Extrair `phone`, `message`, `timestamp`
   - [ ] Buscar em `whatsapp_chat_sessions` (GET CNPJ)
   - [ ] Se não encontrado → trigger Workflow 4 (Onboarding)
   - [ ] Se comando admin (`/`) → Workflow 5
   - [ ] Se mensagem normal → Workflow 6 (Processar com IA)
   - [ ] Log em `whatsapp_conversations`

2. **Workflow 4: Onboarding** (4h)
   - [ ] Detectar phone não cadastrado
   - [ ] Enviar: "Informe seu CNPJ"
   - [ ] Aguardar resposta (state management)
   - [ ] Validar CNPJ (formato + existência)
   - [ ] INSERT em `whatsapp_chat_sessions`
   - [ ] Enviar confirmação

3. **Edge Function: `whatsapp-webhook`** (3h)
   - [ ] Criar função em `/functions/whatsapp-webhook/index.ts`
   - [ ] Receber payload Evolution
   - [ ] Validar apikey
   - [ ] Salvar em `whatsapp_conversations`
   - [ ] Retornar action (onboarding/admin/process)

4. **Edge Function: `whatsapp-send`** (2h)
   - [ ] Criar função em `/functions/whatsapp-send/index.ts`
   - [ ] POST para Evolution `/message/sendText`
   - [ ] Suportar texto + documento + imagem
   - [ ] Log em `whatsapp_conversations`

5. **Testes Integrados** (3h)
   - [ ] Cenário: Novo número → onboarding completo
   - [ ] Cenário: Número conhecido → roteamento
   - [ ] Validar logs em banco

**Entregável**: Sistema completo de roteamento + onboarding

---

### **FASE 3: IA INTEGRATION (Semana 3)** ⏱️ 20-24h

**Objetivo**: Claude responde perguntas financeiras

**Tarefas**:

1. **Agent Skill: `whatsapp-assistant`** (4h)
   - [ ] Criar em `.claude/skills/whatsapp-assistant/SKILL.md`
   - [ ] Definir contexto (empresa, histórico, cards disponíveis)
   - [ ] Prompt engineering para respostas WhatsApp:
     - Concisas (máx 500 chars)
     - Emojis
     - Formatação mobile-friendly
   - [ ] Integrar com `financial-cards` skill

2. **Edge Function: `whatsapp-agent`** (8h)
   - [ ] Criar função em `/functions/whatsapp-agent/index.ts`
   - [ ] Receber: `company_cnpj`, `phone`, `message`, `history`
   - [ ] Detectar intenção (consulta/alerta/relatório/admin)
   - [ ] **Se consulta financeira**:
     - Mapear mensagem → cards necessários
     - POST `/dashboard-smart`
     - Formatar response amigável
   - [ ] **Se comando admin**:
     - Validar permissão (role = admin)
     - Executar comando
     - Retornar status
   - [ ] **Fallback**:
     - Chamar Claude genérico (Anthropic API)
     - Usar Agent Skill `whatsapp-assistant`
   - [ ] Log em `llm_usage`

3. **Workflow 6: Process Message (IA)** (4h)
   - [ ] Chamar Edge Function `whatsapp-agent`
   - [ ] Receber response formatada
   - [ ] Enviar via `whatsapp-send`
   - [ ] Atualizar `whatsapp_chat_sessions.last_message_at`

4. **Otimizações** (4h)
   - [ ] Cache de histórico (últimas 10 msgs em memória)
   - [ ] Rate limiting (10 msgs/min por phone)
   - [ ] Timeout 30s (fallback: "Processando...")
   - [ ] Retry lógica (3x antes de erro)

5. **Testes de IA** (4h)
   - [ ] "Qual meu saldo?" → resposta correta
   - [ ] "Quanto tenho de runway?" → cálculo correto
   - [ ] "Como estão as despesas?" → análise
   - [ ] "O que é EBITDA?" → resposta genérica (não financeira)
   - [ ] Medir latência (objetivo: <3s)

**Entregável**: WhatsApp com IA funcional respondendo consultas financeiras

---

### **FASE 4: AUTOMAÇÕES (Semana 4)** ⏱️ 12-16h

**Objetivo**: Alertas proativos + relatórios automáticos

**Tarefas**:

1. **Workflow 2: Proactive Alerts** (6h)
   - [ ] Trigger: Cron diário 9h
   - [ ] Buscar todas empresas ativas
   - [ ] Para cada empresa:
     - POST `/dashboard-smart` com `cards: ["runway", "burn_rate"]`
     - Se `runway < 3 meses`: enviar alerta
     - Se `contas_pagar` vencendo em 3 dias: enviar lembrete
   - [ ] Buscar phone em `whatsapp_chat_sessions`
   - [ ] Enviar via `whatsapp-send`
   - [ ] Log em `whatsapp_scheduled`

2. **Workflow 3: Report Generator** (4h)
   - [ ] Detectar keywords: "manda", "gera", "DRE", "relatório"
   - [ ] Claude identifica tipo + período
   - [ ] Chamar Edge Function `/export-excel`
   - [ ] Baixar arquivo gerado (URL temporária)
   - [ ] Enviar documento via Evolution
   - [ ] Confirmar recebimento

3. **Agendamento de Mensagens** (2h)
   - [ ] Tela admin agenda mensagem (via API futura)
   - [ ] INSERT em `whatsapp_scheduled`
   - [ ] Cron N8N verifica a cada 15min
   - [ ] Envia mensagens agendadas

4. **Testes Automações** (2h)
   - [ ] Forçar runway < 3 em empresa teste
   - [ ] Validar alerta enviado
   - [ ] Solicitar "Manda o DRE de outubro"
   - [ ] Confirmar PDF recebido

**Entregável**: Sistema completo de automações proativas

---

### **FASE 5: REFINAMENTO (Ongoing)** ⏱️ 8-12h

**Objetivo**: Melhorias contínuas

**Tarefas**:

1. **Dashboard de Métricas WhatsApp** (4h)
   - [ ] Criar view `v_whatsapp_metrics`:
     - Total de mensagens/dia
     - Taxa de resposta
     - Latência média
     - Cards mais consultados
     - Custos LLM por empresa
   - [ ] Tela frontend (para admin)

2. **Prompt Optimization** (2h)
   - [ ] A/B test prompts diferentes
   - [ ] Medir satisfação (thumbs up/down)
   - [ ] Ajustar temperatura Claude

3. **Multi-idioma** (2h)
   - [ ] Detectar idioma da mensagem
   - [ ] Responder no mesmo idioma

4. **Analytics Avançados** (2h)
   - [ ] Quais perguntas mais frequentes?
   - [ ] Quais empresas mais engajadas?
   - [ ] ROI WhatsApp vs outros canais

**Entregável**: Sistema otimizado e monitorado

---

## 📋 CHECKLIST DE SETUP

### Pré-requisitos

- [ ] Supabase projeto configurado (✅ já feito)
- [ ] Número WhatsApp Business (novo ou existente)
- [ ] Servidor para Evolution + N8N (VPS mínimo 2GB RAM)
- [ ] Domínio ou ngrok para webhooks
- [ ] API key Anthropic (Claude)

### Credenciais Necessárias

- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `ANTHROPIC_API_KEY`
- [ ] `EVOLUTION_API_KEY` (gerada após setup)
- [ ] `N8N_WEBHOOK_URL`

### Docker Compose (Evolution + N8N)

```yaml
version: '3.8'

services:
  evolution-api:
    image: atendai/evolution-api:latest
    container_name: evolution-api
    ports:
      - "8080:8080"
    environment:
      - DATABASE_PROVIDER=postgresql
      - DATABASE_CONNECTION_URI=postgresql://postgres:senha@supabase:5432/evolution
      - AUTHENTICATION_API_KEY=sua-chave-super-secreta
    restart: unless-stopped

  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=senha123
      - WEBHOOK_URL=https://seu-dominio.com
    volumes:
      - ./n8n_data:/home/node/.n8n
    restart: unless-stopped
```

---

## 💰 CUSTOS MENSAIS ESTIMADOS

| Item | Custo | Observações |
|------|-------|-------------|
| VPS (2GB RAM) | R$ 50-100 | DigitalOcean, Hetzner, etc |
| Domínio | R$ 40/ano | Opcional (pode usar ngrok free) |
| Evolution API | Grátis | Self-hosted |
| N8N | Grátis | Self-hosted |
| Claude API | R$ 50-200 | ~10k msgs/mês (R$ 0,005/msg) |
| WhatsApp Business | Grátis | Primeiras 1k conversas grátis/mês |
| **TOTAL** | **R$ 100-350/mês** | Escalável conforme uso |

---

## 📈 MÉTRICAS DE SUCESSO

| Métrica | Objetivo | Como Medir |
|---------|----------|------------|
| **Tempo de resposta** | < 3s | `whatsapp_conversations.created_at` - `received_at` |
| **Taxa de resolução** | > 80% | Mensagens sem escalação humana |
| **Satisfação** | > 4.5/5 | Thumbs up/down após resposta |
| **Engajamento** | > 30% | Clientes que usam WhatsApp semanalmente |
| **Redução suporte** | -50% | Tickets email/telefone |
| **Custo por interação** | < R$ 0,10 | `llm_usage.cost_usd` / msgs |

---

## 🔐 SEGURANÇA

1. **Autenticação**: Phone + CNPJ validados antes de retornar dados
2. **RLS**: Todas queries respeitam `company_cnpj`
3. **Rate Limiting**: 10 msgs/min por phone (N8N + Supabase)
4. **Sanitização**: Filtrar SQL injection, code injection
5. **Logs**: Auditoria completa em `whatsapp_conversations`
6. **LGPD**:
   - Opt-out via "/sair"
   - Deletar dados via "/deletar_dados"
   - Retention policy 90 dias (conversas)

---

## 🛠️ MANUTENÇÃO

### Monitoramento Diário
- [ ] Evolution API online? (health check)
- [ ] N8N workflows ativos?
- [ ] Taxa de erro < 5%?
- [ ] Latência média < 3s?

### Semanal
- [ ] Revisar logs de erro
- [ ] Analisar perguntas não respondidas
- [ ] Otimizar prompts Claude

### Mensal
- [ ] Revisar custos LLM
- [ ] A/B test novos prompts
- [ ] Adicionar novos cards/relatórios

---

## 📞 PRÓXIMOS PASSOS IMEDIATOS

1. **Aprovar plano** ✅
2. **Provisionar VPS** (recomendação: Hetzner 2GB RAM, €4/mês)
3. **Deploy Evolution + N8N** (via Docker Compose acima)
4. **Conectar número WhatsApp** (QR Code)
5. **Implementar Fase 1** (infra básica, 1-2 dias)

---

**Tempo total estimado**: 4-5 semanas (60-80h)
**Investimento**: R$ 100-350/mês
**ROI esperado**: 50% redução de suporte + 30% aumento de engajamento

**Dúvidas ou pronto para começar Fase 1?**
