# Como Configurar APP_KMS no Supabase

## Via Dashboard (Recomendado)

1. **Acesse o Dashboard:**
   - https://supabase.com/dashboard/project/xzrmzmcoslomtzkzgskn
   - Ou: https://supabase.com/dashboard/project/xzrmzmcoslomtzkzgskn/settings/functions

2. **Navegue até Edge Functions:**
   - No menu lateral esquerdo, clique em **"Edge Functions"**
   - Clique na aba **"Secrets"** (ou **"Settings"** → **"Secrets"**)

3. **Adicione o Secret:**
   - Clique em **"Add new secret"** ou **"New secret"**
   - **Key:** `APP_KMS`
   - **Value:** `fA1fjdgMF6HHzBmrlLI+MsuRDUukBqHAADZVu+xxAFw=`
   - Clique em **"Save"** ou **"Add"**

## Via CLI (Alternativa)

Se você conseguir vincular o projeto:

```bash
# Vincular ao projeto (se ainda não fez)
supabase link --project-ref xzrmzmcoslomtzkzgskn

# Configurar o secret
supabase secrets set APP_KMS='fA1fjdgMF6HHzBmrlLI+MsuRDUukBqHAADZVu+xxAFw='
```

## Verificar se foi Configurado

Após configurar, teste a sincronização:

```bash
./scripts/invoke-sync-f360.sh
```

Se funcionar, você verá `"status": "success"` nos resultados.

## Nota Importante

- O secret `APP_KMS` deve ser **exatamente** a mesma chave usada para criptografar os tokens
- Esta chave é usada tanto na importação quanto na descriptografia
- Mantenha esta chave segura e não a compartilhe publicamente

