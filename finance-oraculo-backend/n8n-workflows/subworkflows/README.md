# 🧩 Subworkflows Modulares N8N - Finance Oráculo

## 📋 Visão Geral

Este diretório contém **subworkflows modulares e reutilizáveis** para o sistema Finance Oráculo.

Cada subworkflow é uma peça independente que pode ser usada em múltiplos workflows principais, promovendo:
- ✅ **Reutilização de código**
- ✅ **Manutenção centralizada**
- ✅ **Organização com Edit Frames**
- ✅ **Escalabilidade**

---

## 🗂️ Subworkflows Disponíveis

### 1. `supabase-get-companies.json`
**Função:** Buscar lista de empresas ativas no Supabase

**Inputs:**
- `status` (opcional): Status das empresas (default: 'active')
- `limit` (opcional): Limite de resultados

**Outputs:**
- `companies`: Array de empresas com CNPJ, nome, configurações

**Uso:**
- Mensagens automáticas (buscar quem vai receber)
- Dashboard de empresas
- Relatórios

---

### 2. `supabase-get-conversation-context.json`
**Função:** Buscar context window completo de uma conversa (120 mensagens + resumos)

**Inputs:**
- `conversation_id`: UUID da conversa
- `limit` (opcional): Limite de mensagens (default: 120)

**Outputs:**
- `summaries`: Array de resumos anteriores
- `messages`: Array das últimas mensagens
- `total_messages`: Total de mensagens na conversa

**Uso:**
- WhatsApp Bot (memória longa)
- Análise de conversas
- Geração de resumos

---

### 3. `llm-route-optimal-model.json`
**Função:** Escolher modelo LLM ideal baseado na complexidade da pergunta

**Inputs:**
- `question`: Texto da pergunta
- `requires_reasoning` (opcional): Boolean
- `requires_calculation` (opcional): Boolean

**Outputs:**
- `model_name`: Nome do modelo escolhido
- `model_id`: UUID do modelo
- `rule_matched`: Regra que foi aplicada
- `estimated_tokens`: Tokens estimados
- `cost_estimate`: Custo estimado

**Uso:**
- WhatsApp Bot (escolha inteligente de modelo)
- Análise de custos
- Qualquer função que use LLM

---

### 4. `evolution-send-message.json`
**Função:** Enviar mensagem via Evolution API com retry e tratamento de erros

**Inputs:**
- `phone`: Número do telefone (formato internacional)
- `message`: Texto da mensagem (suporta Markdown)
- `instance`: Nome da instância Evolution (default: 'iFinance')

**Outputs:**
- `success`: Boolean
- `message_id`: ID da mensagem enviada
- `error`: Mensagem de erro (se houver)

**Uso:**
- Envio de qualquer mensagem WhatsApp
- Mensagens automáticas
- Bot de respostas

---

### 5. `supabase-log-conversation.json`
**Função:** Registrar mensagem no histórico de conversação com analytics

**Inputs:**
- `conversation_id`: UUID da conversa
- `phone`: Telefone do usuário
- `cnpj`: CNPJ da empresa
- `role`: 'user' | 'assistant' | 'system'
- `content`: Conteúdo da mensagem
- `metadata` (opcional): Metadados adicionais
- `llm_model` (opcional): Modelo usado
- `cost_usd` (opcional): Custo da operação

**Outputs:**
- `message_id`: UUID da mensagem criada
- `context_size`: Quantidade de mensagens no contexto atual

**Uso:**
- WhatsApp Bot (salvar histórico)
- Auditoria de conversas
- Analytics

---

### 6. `supabase-get-financial-context.json`
**Função:** Buscar contexto financeiro completo de uma empresa

**Inputs:**
- `cnpj`: CNPJ da empresa

**Outputs:**
- `snapshot`: Snapshot diário mais recente
- `dre`: DRE dos últimos 3 meses
- `kpis`: KPIs atuais
- `pending_invoices`: Faturas pendentes

**Uso:**
- WhatsApp Bot (responder perguntas)
- Geração de relatórios
- Análise financeira

---

### 7. `llm-generate-response.json`
**Função:** Gerar resposta com LLM (suporta OpenAI e Anthropic)

**Inputs:**
- `model_name`: Nome do modelo
- `system_prompt`: Prompt do sistema
- `user_message`: Mensagem do usuário
- `conversation_history` (opcional): Array de mensagens anteriores
- `max_tokens` (opcional): Limite de tokens (default: 300)

**Outputs:**
- `answer`: Resposta gerada
- `tokens_input`: Tokens de entrada
- `tokens_output`: Tokens de saída
- `cost_usd`: Custo da operação
- `model_used`: Modelo utilizado

**Uso:**
- WhatsApp Bot
- Geração de resumos
- Análise de DRE
- Qualquer resposta com IA

---

### 8. `format-markdown-for-whatsapp.json`
**Função:** Formatar texto Markdown para WhatsApp (negrito, itálico, etc.)

**Inputs:**
- `text`: Texto com formatação Markdown

**Outputs:**
- `formatted_text`: Texto formatado para WhatsApp

**Conversões:**
- `**negrito**` → `*negrito*`
- `__sublinhado__` → `_sublinhado_`
- ` código ` → ` código `
- `[link](url)` → `link (url)`

**Uso:**
- Antes de enviar qualquer mensagem WhatsApp
- Formatação automática de respostas do bot

---

## 🎯 Como Usar os Subworkflows

### Método 1: Chamar como Execute Workflow

No N8N, use o node **"Execute Workflow"**:

```
1. Arraste "Execute Workflow" para o canvas
2. Em "Source", selecione "Database"
3. Em "Workflow", selecione o subworkflow desejado
4. Preencha os campos de input
5. Conecte ao próximo node
```

### Método 2: Copiar e Colar Nodes

Para workflows mais simples, você pode:

```
1. Abra o arquivo JSON do subworkflow
2. Copie os nodes desejados
3. Cole no seu workflow principal
4. Organize dentro de um Edit Frame
```

---

## 📐 Organização com Edit Frames

Todos os subworkflows usam **Edit Frames** para organização visual:

```
┌─────────────────────────────────────┐
│  📦 Frame: Buscar Empresas          │
│                                     │
│  [PostgreSQL] → [Set] → [IF]       │
│                                     │
└─────────────────────────────────────┘
```

**Benefícios:**
- Visual limpo e organizado
- Fácil de entender o fluxo
- Agrupa nodes relacionados
- Permite comentários e documentação

---

## 🔄 Workflow Principal Atualizado

O workflow principal (`whatsapp-finance-bot-v2.json`) usa TODOS esses subworkflows e está organizado em **Edit Frames**:

### Frames Principais:

1. **📥 Input**: Recepção de mensagem do webhook
2. **🏢 Company Lookup**: Buscar empresa por CNPJ
3. **💬 Conversation**: Obter ou criar conversa
4. **📚 Context**: Buscar context window (120 mensagens)
5. **🤖 LLM Routing**: Escolher modelo ideal
6. **💰 Financial Data**: Buscar dados financeiros
7. **✨ AI Response**: Gerar resposta com IA
8. **📤 Send Message**: Enviar via Evolution API
9. **💾 Save to DB**: Salvar no histórico
10. **📊 Analytics**: Atualizar métricas

---

## 🚀 Deploy dos Subworkflows

### Passo 1: Importar Todos os Subworkflows

```bash
# No N8N, vá em Workflows → Import from File
# Importe cada arquivo JSON da pasta subworkflows/
```

### Passo 2: Configurar Credenciais

Todos os subworkflows compartilham as mesmas credenciais:
- Supabase PostgreSQL
- Supabase Anon Key
- Evolution API Key
- OpenAI API Key
- Anthropic API Key

### Passo 3: Testar Cada Subworkflow

Execute manualmente cada subworkflow com dados de teste para garantir que funciona.

### Passo 4: Importar Workflow Principal

Importe `whatsapp-finance-bot-v2.json` que usa todos os subworkflows.

---

## 📊 Comparação: Antes vs Depois

| Aspecto | Workflow Antigo | Workflow Novo (Modular) |
|---------|-----------------|-------------------------|
| **Nodes** | 32 nodes em um único workflow | 8 subworkflows + 1 principal (15 nodes) |
| **Manutenção** | Difícil (tudo em um lugar) | Fácil (módulos independentes) |
| **Reutilização** | Nenhuma | Alta (subworkflows usados múltiplas vezes) |
| **Organização** | Confusa após expansão | Limpa com Edit Frames |
| **Testabilidade** | Difícil testar partes isoladas | Fácil (testar subworkflow individual) |
| **Escalabilidade** | Limitada | Alta (adicionar novos subworkflows) |
| **Memória Longa** | Não tinha | ✅ 120 mensagens + resumos |
| **Roteamento LLM** | Fixo (Claude Sonnet) | ✅ Inteligente (barato vs complexo) |
| **Formatação Markdown** | Não tinha | ✅ Markdown em todas as respostas |

---

## 🎨 Cores dos Edit Frames (Padronização)

Para manter consistência visual, use estas cores:

- 🟦 **Input/Trigger**: Azul (`#3B82F6`)
- 🟩 **Database Query**: Verde (`#10B981`)
- 🟨 **LLM/AI**: Amarelo (`#F59E0B`)
- 🟪 **External API**: Roxo (`#8B5CF6`)
- 🟧 **Output/Send**: Laranja (`#F97316`)
- 🟥 **Error Handling**: Vermelho (`#EF4444`)
- ⬜ **Logic/Transform**: Cinza (`#6B7280`)

---

## 💡 Exemplos de Uso

### Exemplo 1: Enviar Mensagem Simples

```
Trigger → [Evolution Send Message] → Done
```

### Exemplo 2: Bot com Memória

```
Webhook → [Get Conversation Context] → [LLM Generate Response] → [Evolution Send Message] → [Log Conversation]
```

### Exemplo 3: Mensagem Automática

```
Schedule → [Get Companies] → [Get Financial Context] → [Format Message] → [Evolution Send Message]
```

---

## 📝 Próximas Melhorias

- [ ] Subworkflow para **gerar resumos automáticos** (quando context > 120)
- [ ] Subworkflow para **consultar F360/OMIE** em tempo real
- [ ] Subworkflow para **geração de relatórios** (DRE, Cashflow)
- [ ] Subworkflow para **análise de sentimento** das conversas
- [ ] Subworkflow para **detecção de intenção** (o que o usuário quer)

---

**Status:** ✅ Pronto para Uso
**Última atualização:** 2025-01-06
