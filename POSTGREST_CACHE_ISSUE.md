# PostgREST Schema Cache Issue

## Problema

A tabela `onboarding_tokens` existe no banco de dados (confirmado via SQL direto), mas o **PostgREST** (API REST do Supabase) não consegue vê-la devido ao cache de schema desatualizado.

## Evidências

```bash
# SQL direto funciona:
SELECT COUNT(*) FROM onboarding_tokens;
# Retorna: 17

# PostgREST falha:
GET /rest/v1/onboarding_tokens
# Retorna: "Could not find the table 'public.onboarding_tokens' in the schema cache"
```

## Soluções

### Opção 1: Aguardar (5-10 minutos)
O cache do PostgREST se atualiza automaticamente a cada 5-10 minutos.

### Opção 2: Recarregar o Schema (Recomendado)
Execute no SQL Editor do Supabase Dashboard:

```sql
NOTIFY pgrst, 'reload schema';
```

### Opção 3: Reiniciar o Projeto
No Supabase Dashboard:
1. Settings → General
2. Pause project
3. Resume project

### Opção 4: Usar RPC (Implementado)
Criamos a função `get_onboarding_tokens()` que bypassa o PostgREST:

```sql
SELECT * FROM get_onboarding_tokens(50);
```

A Edge Function `onboarding-tokens` já está configurada para usar esta RPC como fallback.

## Status Atual

✅ **Tabela existe**: 17 registros  
✅ **RPC criada**: `get_onboarding_tokens()`  
✅ **Edge Function atualizada**: Usa RPC como fallback  
❌ **PostgREST cache**: Desatualizado  

## Próximos Passos

1. Executar `NOTIFY pgrst, 'reload schema';` no SQL Editor
2. Aguardar 1-2 minutos
3. Testar novamente: `./REDEPLOY_ONBOARDING_TOKENS.sh`

## Referências

- [Supabase PostgREST Schema Cache](https://postgrest.org/en/stable/schema_cache.html)
- [Supabase Issue #8234](https://github.com/supabase/supabase/issues/8234)

