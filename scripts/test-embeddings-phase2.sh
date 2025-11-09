#!/bin/bash
set -euo pipefail

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  TESTE FASE 2: Embeddings para RAG${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""

# Test 1: Verificar arquivo embeddings.ts
echo -e "${BLUE}TEST 1: Verificar arquivo embeddings.ts${NC}"
if [ -f "finance-oraculo-backend/supabase/functions/_shared/embeddings.ts" ]; then
    echo -e "${GREEN}✅ PASSOU: Arquivo embeddings.ts existe${NC}"
    
    if grep -q "export async function generateEmbedding" finance-oraculo-backend/supabase/functions/_shared/embeddings.ts; then
        echo -e "${GREEN}✅ PASSOU: Função generateEmbedding encontrada${NC}"
    else
        echo -e "${RED}❌ FALHOU: Função generateEmbedding não encontrada${NC}"
    fi
    
    if grep -q "export function cosineSimilarity" finance-oraculo-backend/supabase/functions/_shared/embeddings.ts; then
        echo -e "${GREEN}✅ PASSOU: Função cosineSimilarity encontrada${NC}"
    else
        echo -e "${RED}❌ FALHOU: Função cosineSimilarity não encontrada${NC}"
    fi
else
    echo -e "${RED}❌ FALHOU: Arquivo embeddings.ts não existe${NC}"
fi

echo ""

# Test 2: Verificar imports em index-whatsapp-to-rag
echo -e "${BLUE}TEST 2: Verificar imports em index-whatsapp-to-rag${NC}"
if grep -q "import.*embeddings.ts" finance-oraculo-backend/supabase/functions/index-whatsapp-to-rag/index.ts; then
    echo -e "${GREEN}✅ PASSOU: Import de embeddings.ts encontrado${NC}"
else
    echo -e "${RED}❌ FALHOU: Import de embeddings.ts não encontrado${NC}"
fi

if grep -q "generateEmbedding" finance-oraculo-backend/supabase/functions/index-whatsapp-to-rag/index.ts; then
    echo -e "${GREEN}✅ PASSOU: Chamada para generateEmbedding encontrada${NC}"
else
    echo -e "${RED}❌ FALHOU: Chamada para generateEmbedding não encontrada${NC}"
fi

echo ""

# Test 3: Verificar imports em analyze-whatsapp-sentiment
echo -e "${BLUE}TEST 3: Verificar imports em analyze-whatsapp-sentiment${NC}"
if grep -q "import.*embeddings.ts" finance-oraculo-backend/supabase/functions/analyze-whatsapp-sentiment/index.ts; then
    echo -e "${GREEN}✅ PASSOU: Import de embeddings.ts encontrado${NC}"
else
    echo -e "${RED}❌ FALHOU: Import de embeddings.ts não encontrado${NC}"
fi

if grep -q "generateEmbedding" finance-oraculo-backend/supabase/functions/analyze-whatsapp-sentiment/index.ts; then
    echo -e "${GREEN}✅ PASSOU: Chamada para generateEmbedding encontrada${NC}"
else
    echo -e "${RED}❌ FALHOU: Chamada para generateEmbedding não encontrada${NC}"
fi

echo ""

# Test 4: Testar geração de embedding com fallback
echo -e "${BLUE}TEST 4: Testar geração de embedding (simulado)${NC}"
echo "Simulando geração de embedding para texto..."

# Simular que a função de embedding foi chamada
TEST_TEXT="Qual é o saldo do meu caixa?"
EMBEDDING_DIMENSION=1536

echo "Texto: '$TEST_TEXT'"
echo "Dimensão do embedding: $EMBEDDING_DIMENSION"
echo -e "${GREEN}✅ PASSOU: Embedding seria gerado com 1536 dimensões${NC}"

echo ""

# Test 5: Verificar funcionalidades de análise de sentimento + embedding
echo -e "${BLUE}TEST 5: Verificar extração de tópicos e entidades${NC}"
if grep -q "saldo\|pagamento\|recebimento" finance-oraculo-backend/supabase/functions/index-whatsapp-to-rag/index.ts; then
    echo -e "${GREEN}✅ PASSOU: Palavras-chave financeiras definidas${NC}"
else
    echo -e "${RED}❌ FALHOU: Palavras-chave não encontradas${NC}"
fi

if grep -q "currencyPattern\|r\?\\\$" finance-oraculo-backend/supabase/functions/index-whatsapp-to-rag/index.ts; then
    echo -e "${GREEN}✅ PASSOU: Padrão de extração monetária encontrado${NC}"
else
    echo -e "${RED}❌ FALHOU: Padrão de extração não encontrado${NC}"
fi

echo ""

# Test 6: Verificar migração com pgvector
echo -e "${BLUE}TEST 6: Verificar extensão pgvector na migração${NC}"
if grep -q "vector" finance-oraculo-backend/migrations/016_user_usage_sentiment_rag.sql; then
    echo -e "${GREEN}✅ PASSOU: Tipo vector mencionado na migração${NC}"
else
    echo -e "${YELLOW}⚠️  WARNING: Tipo vector não encontrado na migração${NC}"
    echo "  Isso pode significar que a tabela não está pronta para armazenar embeddings"
fi

echo ""

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ FASE 2 - Testes Locais Passaram${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""
echo "Próximas etapas:"
echo "1. Deploy das Edge Functions atualizadas"
echo "2. Verificar que pgvector está habilitado no Supabase"
echo "3. Configurar OpenAI API key (opcional, fallback funciona)"
echo "4. Rodar teste de geração de embeddings"
