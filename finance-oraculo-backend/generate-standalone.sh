#!/bin/bash
set -e

echo "=========================================="
echo "Gerando funções standalone para deploy manual"
echo "=========================================="
echo ""

# Criar diretório standalone
mkdir -p standalone

# Ler o código comum
COMMON_CODE=$(cat functions/common/db.ts | sed 's/^export //')

echo "✅ Código comum lido"

# Função para gerar standalone
generate_standalone() {
    local FUNC_NAME=$1
    local INPUT_FILE="functions/${FUNC_NAME}/index.ts"
    local OUTPUT_FILE="standalone/${FUNC_NAME}.ts"

    echo "📝 Gerando ${FUNC_NAME}..."

    # Começar o arquivo
    cat > "$OUTPUT_FILE" << 'HEADER'
// ========================================
// FUNÇÃO STANDALONE - PRONTA PARA DEPLOY
// ========================================
// Copie todo este arquivo e cole na interface web do Supabase
// https://supabase.com/dashboard/project/xzrmzmcoslomtzkzgskn/functions

HEADER

    # Adicionar imports
    echo "import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';" >> "$OUTPUT_FILE"
    echo "import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"

    # Adicionar código comum (inline)
    echo "// ===== COMMON UTILITIES (INLINE) =====" >> "$OUTPUT_FILE"
    echo "$COMMON_CODE" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"

    # Adicionar código da função (sem o import do common)
    echo "// ===== ${FUNC_NAME^^} LOGIC =====" >> "$OUTPUT_FILE"
    cat "$INPUT_FILE" | grep -v "^import.*from.*common/db" | grep -v "^import { serve }" >> "$OUTPUT_FILE"

    echo "✅ ${FUNC_NAME}.ts criado"
}

# Gerar todas as funções
generate_standalone "sync-f360"
generate_standalone "sync-omie"
generate_standalone "analyze"
generate_standalone "export-excel"
generate_standalone "upload-dre"

echo ""
echo "=========================================="
echo "✅ Funções standalone geradas!"
echo "=========================================="
echo ""
echo "Arquivos criados em standalone/:"
ls -lh standalone/
echo ""
echo "Próximos passos:"
echo "1. Acesse: https://supabase.com/dashboard/project/xzrmzmcoslomtzkzgskn/functions"
echo "2. Para cada função, clique em 'Create a new function'"
echo "3. Copie e cole o conteúdo do arquivo standalone/*.ts correspondente"
echo "4. Configure os secrets conforme MIGRATION_SUCCESS.md"
echo ""
