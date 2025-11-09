# 📊 Sistema de Uso, Análise de Humor e RAG

## 📋 Visão Geral

Sistema completo para:
1. **Tracking de uso do sistema por usuário**
2. **Análise de humor/sentimento** das mensagens WhatsApp ao longo do tempo
3. **RAG (Retrieval Augmented Generation)** - Memória de todas as conversas WhatsApp por cliente

## 🎯 Funcionalidades

### 1. Tracking de Uso por Usuário

- **Sessões**: Início e fim de cada sessão
- **Páginas visitadas**: Rastreamento de navegação
- **Features usadas**: Quais funcionalidades foram utilizadas
- **API Calls**: Contagem de chamadas de API
- **LLM Interactions**: Uso de IA
- **WhatsApp Messages**: Mensagens enviadas/recebidas

**Dashboard**: `/admin/analytics/user-usage`

### 2. Análise de Humor/Sentimento

- **Sentiment Score**: -1 (muito negativo) a 1 (muito positivo)
- **Sentiment Label**: very_negative, negative, neutral, positive, very_positive
- **Tone**: formal, informal, friendly, angry, sad, excited, neutral
- **Emotion**: joy, sadness, anger, fear, surprise, disgust, neutral
- **Engagement Level**: low, medium, high, very_high
- **Response Urgency**: low, medium, high, critical

**Dashboard**: `/admin/analytics/mood-index`

### 3. RAG (Retrieval Augmented Generation)

- **Indexação Automática**: Todas as mensagens WhatsApp são indexadas
- **Memória por Cliente**: Cada cliente tem seu próprio RAG
- **Busca Semântica**: Preparado para embeddings vetoriais
- **Tópicos e Entidades**: Extração automática
- **Contexto**: Resumos de contexto por período

## 📊 Estrutura do Banco de Dados

### Tabelas Criadas

1. **user_system_usage** - Uso do sistema por usuário
   - Sessões, páginas, features, métricas

2. **whatsapp_sentiment_analysis** - Análise de sentimento
   - Score, label, tone, emotion, engagement, urgency

3. **mood_index_timeline** - Índice de humor agregado
   - Por dia/semana/mês
   - Tendências e distribuições

4. **rag_conversations** - Conversas indexadas no RAG
   - Embeddings vetoriais
   - Tópicos e entidades
   - Contexto

5. **rag_context_summaries** - Resumos de contexto
   - Diários, semanais, mensais
   - Insights principais

### Funções SQL

- `analyze_whatsapp_sentiment()` - Cria registro de análise
- `update_mood_index_daily()` - Atualiza índice diário
- `index_conversation_for_rag()` - Indexa conversa no RAG

## 🔄 Fluxo Automático

### 1. Mensagem WhatsApp Recebida

1. Mensagem chega → `whatsapp_conversations`
2. **Análise de Sentimento** → `analyze-whatsapp-sentiment` Edge Function
3. **Salvar Análise** → `whatsapp_sentiment_analysis`
4. **Atualizar Índice** → `mood_index_timeline`
5. **Indexar no RAG** → `rag_conversations`

### 2. Uso do Sistema

1. Usuário navega → Hook `useTrackUsage`
2. Páginas visitadas → `user_system_usage`
3. Features usadas → `user_system_usage`
4. API calls → Atualizado automaticamente
5. LLM interactions → Rastreado

### 3. Indexação RAG

1. **Automática**: Quando mensagem é analisada
2. **Batch**: Edge Function `index-whatsapp-to-rag` processa em lote
3. **Embeddings**: Preparado para OpenAI/Anthropic embeddings
4. **Busca**: Pronto para busca semântica vetorial

## 🎨 Dashboards Criados

### 1. Uso por Usuário (`/admin/analytics/user-usage`)

- Resumo de usuários ativos
- Total de sessões e horas
- Detalhamento por usuário
- Métricas de uso

### 2. Índice de Humor (`/admin/analytics/mood-index`)

- Média de sentimento
- Evolução ao longo do tempo
- Distribuição de sentimentos
- Tendências (melhorando/piorando/estável)

## 🔧 Edge Functions

### `analyze-whatsapp-sentiment`

- Analisa sentimento usando Claude
- Salva análise no banco
- Atualiza índice de humor
- Indexa no RAG automaticamente

### `index-whatsapp-to-rag`

- Processa mensagens não indexadas
- Gera embeddings (preparado)
- Extrai tópicos e entidades
- Indexa no RAG

## 💡 Exemplos de Uso

### Análise de Sentimento

```typescript
// Automático quando mensagem chega
POST /functions/v1/analyze-whatsapp-sentiment
{
  "message_text": "Estou muito satisfeito com o serviço!",
  "company_cnpj": "12345678000190",
  "phone_number": "5511999999999"
}

// Retorna:
{
  "sentiment_score": 0.85,
  "sentiment_label": "very_positive",
  "tone": "friendly",
  "emotion": "joy",
  "engagement_level": "high"
}
```

### Busca no RAG

```sql
-- Buscar conversas relacionadas a um tópico
SELECT * FROM rag_conversations
WHERE company_cnpj = '12345678000190'
  AND 'saldo' = ANY(topics)
ORDER BY message_timestamp DESC;
```

## 📈 Próximos Passos

1. **Embeddings Reais**: Integrar OpenAI/Anthropic para embeddings vetoriais
2. **Busca Semântica**: Implementar busca vetorial com pgvector
3. **Resumos Automáticos**: Gerar resumos de contexto periodicamente
4. **Alertas**: Notificar quando humor piora significativamente
5. **Recomendações**: Sugerir ações baseadas no humor do cliente

## 🔒 Segurança

- **RLS Policies**: Usuários veem apenas seus próprios dados
- **Admin Access**: Admin pode ver tudo
- **Criptografia**: Dados sensíveis protegidos
- **Auditoria**: Todas as análises são registradas

---

**📊 Sistema completo de uso, análise de humor e RAG implementado!**

