# Plano de Melhorias dos Processos - Finance Oráculo

## Objetivo
Revisar e melhorar os processos implementados recentemente, corrigindo TODOs, implementando funcionalidades pendentes e otimizando fluxos automáticos.

## Problemas Identificados

### 1. Criptografia/Descriptografia de API Keys
- **Problema**: Várias Edge Functions têm TODOs para descriptografar API keys
- **Arquivos afetados**:
  - `analyze-whatsapp-sentiment/index.ts` (linha 54)
  - `yampi-create-invoice/index.ts` (linha 89)
  - `manage-integration-config/index.ts` (criptografa mas não descriptografa)

### 2. Embeddings RAG
- **Problema**: RAG não gera embeddings reais, apenas indexa texto
- **Arquivo**: `index-whatsapp-to-rag/index.ts` (linhas 65, 92)

### 3. Tracking de Uso
- **Problema**: Métricas não são atualizadas em tempo real (api_calls, llm_interactions sempre 0)
- **Arquivo**: `hooks/use-track-usage.ts`

### 4. Processo Automático WhatsApp → RAG
- **Problema**: Não há garantia de que todas as mensagens sejam analisadas e indexadas automaticamente

### 5. Integração com WhatsApp Bot
- **Problema**: O bot WhatsApp não chama automaticamente a análise de sentimento

## Plano de Execução

### Fase 1: Criptografia/Descriptografia de API Keys

#### 1.1 Criar função utilitária de descriptografia
- **Arquivo**: `finance-oraculo-backend/supabase/functions/_shared/decrypt.ts`
- **Ação**: Criar função reutilizável para descriptografar usando mesma chave de criptografia
- **Implementação**: Usar Web Crypto API com AES-GCM, mesma lógica de `manage-integration-config`

#### 1.2 Atualizar `analyze-whatsapp-sentiment`
- **Arquivo**: `finance-oraculo-backend/supabase/functions/analyze-whatsapp-sentiment/index.ts`
- **Ação**: Importar função de descriptografia e usar para descriptografar API key do Anthropic
- **Linha**: 54-55

#### 1.3 Atualizar `yampi-create-invoice`
- **Arquivo**: `finance-oraculo-backend/supabase/functions/yampi-create-invoice/index.ts`
- **Ação**: Descriptografar API key do Yampi antes de usar
- **Linha**: 89

#### 1.4 Criar função GET para descriptografar (admin only)
- **Arquivo**: `finance-oraculo-backend/supabase/functions/manage-integration-config/index.ts`
- **Ação**: Adicionar endpoint GET que descriptografa e retorna API key (apenas para admin, apenas para testes)

### Fase 2: Embeddings RAG

#### 2.1 Criar função de geração de embeddings
- **Arquivo**: `finance-oraculo-backend/supabase/functions/_shared/embeddings.ts`
- **Ação**: Criar função que gera embeddings usando OpenAI ou Anthropic
- **Implementação**: 
  - Usar OpenAI `text-embedding-ada-002` ou `text-embedding-3-small`
  - Ou usar Anthropic se tiver endpoint de embeddings
  - Retornar vetor de 1536 dimensões

#### 2.2 Atualizar `index-whatsapp-to-rag`
- **Arquivo**: `finance-oraculo-backend/supabase/functions/index-whatsapp-to-rag/index.ts`
- **Ação**: Chamar função de embeddings antes de indexar
- **Linhas**: 63-65, 92

#### 2.3 Atualizar `analyze-whatsapp-sentiment`
- **Arquivo**: `finance-oraculo-backend/supabase/functions/analyze-whatsapp-sentiment/index.ts`
- **Ação**: Gerar embedding ao indexar no RAG
- **Linha**: 161-172

#### 2.4 Verificar extensão pgvector
- **Arquivo**: `finance-oraculo-backend/migrations/016_user_usage_sentiment_rag.sql`
- **Ação**: Verificar se extensão vector está habilitada, adicionar se necessário
- **Comentário**: Linha 69 (CREATE EXTENSION IF NOT EXISTS vector)

### Fase 3: Tracking de Uso em Tempo Real

#### 3.1 Criar interceptor de API calls
- **Arquivo**: `finance-oraculo-frontend/lib/api-interceptor.ts`
- **Ação**: Criar interceptor que conta chamadas de API automaticamente
- **Implementação**: Usar fetch wrapper ou axios interceptor

#### 3.2 Atualizar hook `use-track-usage`
- **Arquivo**: `finance-oraculo-frontend/hooks/use-track-usage.ts`
- **Ação**: 
  - Conectar com interceptor de API
  - Adicionar tracking de LLM interactions
  - Salvar métricas periodicamente (a cada 30s ou ao mudar de página)

#### 3.3 Criar Edge Function para atualizar métricas
- **Arquivo**: `finance-oraculo-backend/supabase/functions/update-usage-metrics/index.ts`
- **Ação**: Endpoint para atualizar métricas incrementais sem criar nova sessão

### Fase 4: Processo Automático WhatsApp → Análise → RAG

#### 4.1 Atualizar webhook WhatsApp
- **Arquivo**: Verificar qual função recebe webhooks do WhatsApp
- **Ação**: Após salvar mensagem, chamar automaticamente `analyze-whatsapp-sentiment`
- **Implementação**: Chamada assíncrona (não bloquear resposta)

#### 4.2 Criar job pg_cron para indexação batch
- **Arquivo**: Nova migration `017_rag_indexing_job.sql`
- **Ação**: Criar job que roda a cada hora para indexar mensagens não indexadas
- **Implementação**: Chamar Edge Function `index-whatsapp-to-rag`

#### 4.3 Adicionar trigger SQL
- **Arquivo**: `finance-oraculo-backend/migrations/018_whatsapp_auto_analysis_trigger.sql`
- **Ação**: Trigger que chama análise de sentimento automaticamente ao inserir mensagem
- **Implementação**: Usar `pg_net` ou `http` extension para chamar Edge Function

### Fase 5: Melhorias de Performance e Confiabilidade

#### 5.1 Adicionar retry logic
- **Arquivos**: Todas as Edge Functions que chamam APIs externas
- **Ação**: Implementar retry com exponential backoff para chamadas de API

#### 5.2 Adicionar rate limiting
- **Arquivo**: `analyze-whatsapp-sentiment/index.ts`
- **Ação**: Limitar número de análises por minuto para evitar custos excessivos

#### 5.3 Melhorar tratamento de erros
- **Arquivos**: Todas as Edge Functions
- **Ação**: Logs mais detalhados, fallbacks apropriados

#### 5.4 Otimizar queries SQL
- **Arquivo**: `migrations/016_user_usage_sentiment_rag.sql`
- **Ação**: Revisar índices, adicionar índices faltantes se necessário

### Fase 6: Testes e Validação

#### 6.1 Criar script de teste end-to-end
- **Arquivo**: `scripts/test-whatsapp-rag-flow.sh`
- **Ação**: Script que testa fluxo completo: mensagem → análise → RAG

#### 6.2 Validar criptografia
- **Ação**: Testar que API keys são criptografadas e descriptografadas corretamente

#### 6.3 Validar embeddings
- **Ação**: Verificar que embeddings são gerados e armazenados corretamente

## Ordem de Execução Recomendada

1. **Fase 1** (Criptografia) - Crítico para segurança
2. **Fase 4** (Processo Automático) - Crítico para funcionalidade
3. **Fase 2** (Embeddings) - Importante para RAG funcionar bem
4. **Fase 3** (Tracking) - Melhoria de métricas
5. **Fase 5** (Performance) - Otimizações
6. **Fase 6** (Testes) - Validação final

## Arquivos a Criar/Modificar

### Novos Arquivos
- `finance-oraculo-backend/supabase/functions/_shared/decrypt.ts`
- `finance-oraculo-backend/supabase/functions/_shared/embeddings.ts`
- `finance-oraculo-frontend/lib/api-interceptor.ts`
- `finance-oraculo-backend/supabase/functions/update-usage-metrics/index.ts`
- `finance-oraculo-backend/migrations/017_rag_indexing_job.sql`
- `finance-oraculo-backend/migrations/018_whatsapp_auto_analysis_trigger.sql`
- `scripts/test-whatsapp-rag-flow.sh`

### Arquivos a Modificar
- `finance-oraculo-backend/supabase/functions/analyze-whatsapp-sentiment/index.ts`
- `finance-oraculo-backend/supabase/functions/index-whatsapp-to-rag/index.ts`
- `finance-oraculo-backend/supabase/functions/yampi-create-invoice/index.ts`
- `finance-oraculo-backend/supabase/functions/manage-integration-config/index.ts`
- `finance-oraculo-frontend/hooks/use-track-usage.ts`
- `finance-oraculo-backend/migrations/016_user_usage_sentiment_rag.sql`

## Estimativa de Tempo

- Fase 1: 2-3 horas
- Fase 2: 3-4 horas
- Fase 3: 2-3 horas
- Fase 4: 2-3 horas
- Fase 5: 2-3 horas
- Fase 6: 1-2 horas

**Total**: 12-18 horas

## Critérios de Sucesso

1. Todas as API keys são descriptografadas corretamente quando necessário
2. Embeddings são gerados e armazenados para todas as mensagens WhatsApp
3. Tracking de uso captura métricas em tempo real
4. Mensagens WhatsApp são automaticamente analisadas e indexadas no RAG
5. Processos são confiáveis e têm tratamento de erros adequado

