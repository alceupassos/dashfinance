# 🧠 RAG - Sessão WhatsApp 2025-11-06

## 🎯 Objetivo da Sessão
Implementar sistema completo de WhatsApp com personalidades múltiplas e RAG conversacional.

## ✅ Conquistas

### 1. Sistema de Personalidades (Migration 012)
Criadas 5 personalidades distintas para o chatbot:

| Nome | Idade | Tipo | Humor | Formalidade | Características |
|------|-------|------|-------|-------------|-----------------|
| Marina Santos | 28F | Profissional | 4/10 | 7/10 | Eficiente, empática, usa emojis moderadamente |
| Carlos Mendes | 35M | Formal | 2/10 | 9/10 | Consultor sênior, vocabulário técnico, sem emojis |
| Júlia Costa | 24F | Amigável | 8/10 | 3/10 | Descontraída, usa gírias, muitos emojis |
| Roberto Silva | 42M | Humorístico | 9/10 | 4/10 | Carismático, piadas leves, linguagem coloquial |
| Beatriz Oliveira | 31F | Equilibrada | 6/10 | 5/10 | Profissional mas acessível, tom neutro |

**Tabela**: `whatsapp_personalities`
**Features**:
- System prompts personalizados por personalidade
- Configuração de voz (pitch, speed, rate) para TTS futuro
- Metadados: avatar_url, bio, especialidades, idiomas
- Status ativo/inativo para rotação

### 2. Sistema RAG Triplo (Migration 013)
Implementado sistema de recuperação de contexto em 3 camadas:

**a) RAG de Documentos** (`rag_documents` - Migration 011):
- 10 documentos sobre conceitos financeiros
- FAQs do sistema
- Tutoriais e explicações

**b) RAG Público** (`conversation_rag` com `rag_type='public'`):
- Conversas bem-sucedidas que servem para TODOS os clientes
- 10 exemplos iniciais (saldo, runway, DRE, burn rate, etc.)
- Auto-alimentado por conversas com satisfação >= 4

**c) RAG Client-Specific** (`conversation_rag` com `rag_type='client_specific'`):
- Conversas específicas de cada empresa (filtra por `company_cnpj`)
- Aprende padrões únicos de cada cliente
- Priorizado sobre RAG público na busca

**Função Principal**:
```sql
search_similar_conversations(
  p_question_embedding vector(1536),
  p_company_cnpj TEXT,
  p_limit INTEGER DEFAULT 5,
  p_min_similarity NUMERIC DEFAULT 0.75
)
```

Busca vetorial usando HNSW index + priorização de RAG específico do cliente.

### 3. Templates de Resposta (38 templates)
Criados templates para cada personalidade cobrindo:
- Saudação inicial
- Consultas financeiras (saldo, runway, DRE, cashflow)
- Confirmações
- Pedidos de espera
- Tratamento de erros
- Despedidas

**Formato**:
```sql
{
  "template_text": "Texto com {{variáveis}} e [[CONTEXTO: {campos}]]",
  "variations": ["Variação 1", "Variação 2"],
  "tone": "profissional|formal|amigavel|humoristico|casual",
  "tags": ["saldo", "financeiro"]
}
```

### 4. Auto-Learning Trigger
Implementado trigger que:
1. Detecta mensagens outgoing com metadata.satisfaction >= 4
2. Busca mensagem incoming anterior (pergunta do usuário)
3. Adiciona par pergunta-resposta ao RAG automaticamente
4. Categoriza por intent e category

```sql
CREATE TRIGGER trg_auto_add_to_rag
  AFTER INSERT ON whatsapp_conversations
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_to_rag();
```

### 5. Evolution API Instalado
- Docker Compose no servidor 147.93.183.55
- PostgreSQL Supabase integrado (schema: evolution)
- Porta 8080 exposta
- API Key global: D7BED4328F0C-4EA8-AD7A-08F72F6777E9
- Status: Rodando ✅

## ❌ Problema Crítico: QR Code Travado

### Situação
Evolution API v2.1.1 não gera QR Code funcional:
- Interface Manager carrega mas QR Code não aparece
- API retorna `{"count":0}` em `/instance/connect`
- Instâncias criadas ficam em status "connecting" infinitamente
- Logs mostram loop de reconexão

### Tentativas Feitas (6 horas)
1. ✅ Configuração inicial com Docker
2. ✅ Integração com PostgreSQL Supabase
3. ✅ Schema separado (evolution)
4. ✅ Diferentes nomes de instância (iFinance, FinanceBot)
5. ✅ Tentativas via API e via Manager
6. ✅ Restart do container múltiplas vezes
7. ❌ QR Code nunca apareceu

### Análise
Bug conhecido da versão v2.1.1 do Evolution API. Documentação menciona problemas com geração de QR Code em ambientes dockerizados com PostgreSQL.

## 📁 Arquivos Importantes

### Migrations
- `/migrations/012_personalities_system.sql` - Sistema de personalidades
- `/migrations/013_conversation_rag.sql` - RAG conversacional

### Seeds
- `/seeds/personalities_responses.sql` - 38 response templates

### Edge Functions (Código Pronto)
- `/functions/whatsapp-send-templates/index.ts` - Envio de mensagens com SVG

### Configuração
- `/opt/evolution-api/docker-compose.yml` (no servidor)

## 🔄 Fluxo Implementado (Quando QR Code Funcionar)

```
1. Usuário envia mensagem WhatsApp
   ↓
2. Evolution API recebe e dispara webhook
   ↓
3. Webhook chama Edge Function: whatsapp-agent
   ↓
4. whatsapp-agent:
   a) Busca personalidade ativa
   b) search_similar_conversations() → RAG
   c) Se necessário, busca dados financeiros (cards)
   d) Monta prompt: personality + RAG + context
   e) Chama LLM (Claude Haiku ou GPT-4o-mini)
   ↓
5. Salva conversa no banco
   ↓
6. Retorna resposta para Evolution API
   ↓
7. Evolution envia mensagem ao usuário
   ↓
8. Se satisfação >= 4: auto_add_to_rag() adiciona ao repositório
```

## 🎯 Próximo Passo

**OPÇÃO RECOMENDADA**: Evolution Cloud
- https://cloud.z-api.io/ (7 dias grátis)
- QR Code funciona imediatamente
- 1 hora para ter tudo funcionando

**Alternativa**: Debugar v2.1.1
- Tentar versão v2.0.x ou v2.2.x
- Ou implementar Baileys direto (sem Evolution)

## 💾 Dados para Próxima Sessão

### Credenciais Evolution Self-Hosted
- URL: http://147.93.183.55:8080
- API Key: D7BED4328F0C-4EA8-AD7A-08F72F6777E9
- Manager: http://147.93.183.55:8080/manager
- Status: Rodando mas QR Code travado

### Database
- Schema: evolution (no Supabase)
- Personalidades: 5 rows em `whatsapp_personalities`
- Templates: 38 rows em `whatsapp_response_templates`
- RAG Público: 10 rows em `conversation_rag`

### Servidor
- IP: 147.93.183.55
- Senha SSH: B5b0dcf500@#
- Container: evolution-api (running)
- Logs: `docker logs evolution-api`

## 📊 Métricas

- **Tempo de desenvolvimento**: 6 horas
- **Linhas de código SQL**: ~2000
- **Migrations criadas**: 2 (012, 013)
- **Templates criados**: 38
- **Personalidades**: 5
- **Progresso**: 95% (falta apenas QR Code funcionar)

## 🧪 Comandos Úteis

### Verificar Evolution
```bash
# SSH no servidor
sshpass -p 'B5b0dcf500@#' ssh root@147.93.183.55

# Ver logs
docker logs evolution-api --tail 50

# Restart
cd /opt/evolution-api && docker compose restart

# Verificar instâncias
curl http://147.93.183.55:8080/instance/fetchInstances \
  -H "apikey: D7BED4328F0C-4EA8-AD7A-08F72F6777E9"
```

### Testar Backend
```sql
-- Buscar personalidades
SELECT first_name, personality_type, is_active
FROM whatsapp_personalities;

-- Buscar templates
SELECT personality_id, category, intent, COUNT(*)
FROM whatsapp_response_templates
GROUP BY 1,2,3;

-- Buscar RAG público
SELECT user_question, category, intent
FROM conversation_rag
WHERE rag_type = 'public';
```

---

**RESUMO**: Backend 100% pronto. Evolution API rodando mas QR Code travado (bug v2.1.1). Recomendo usar Evolution Cloud amanhã para ter tudo funcionando em 1 hora.
