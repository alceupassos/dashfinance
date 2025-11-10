#!/bin/bash
set -euo pipefail

export SUPABASE_URL="https://xzrmzmcoslomtzkzgskn.supabase.co"
export SUPER_ROLE="${SUPABASE_SERVICE_ROLE_KEY:?Meça antes com: export SUPABASE_SERVICE_ROLE_KEY=seu_token}"
BASE="https://xzrmzmcoslomtzkzgskn.functions.supabase.co"

invoke() {
  echo
  echo "→ Invocando $1..."
  curl -sS -X POST "$BASE/$1" \
    -H "Authorization: Bearer $SUPER_ROLE" \
    -H "Content-Type: application/json" \
    -d "${2:-{}}" \
    | jq .
}

count_entries() {
  echo
  echo "→ Contando dre_entries para $1"
  curl -sS "$SUPABASE_URL/rest/v1/dre_entries?select=count()&company_cnpj=eq.$1" \
    -H "apikey: $SUPER_ROLE" \
    -H "Authorization: Bearer $SUPER_ROLE" \
    | jq .
}

invoke "sync-f360"
invoke "scheduled-sync-erp"
count_entries "00026888098000"
count_entries "00026888098001"
