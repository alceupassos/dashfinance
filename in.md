## Inbound: Uso do backend do DashFinance

### Objetivo
- Reparar a ingestão F360 usando a nova chave `app.encryption_key`.
- Garantir que os syncs (`sync-f360` / `scheduled-sync-erp`) populam `dre_entries`/`cashflow_entries`.
- Documentar comandos úteis e dados necessários para o projeto consumidor.

### Passos
1. Validar no Vault do Supabase que o segredo `app.encryption_key` está presente.
2. Atualizar os tokens faltantes:
   ```sql
   SELECT set_config('app.encryption_key', 'Px8@zQ4#fU7!yW2', true);
   UPDATE integration_f360
   SET token_enc = pgp_sym_encrypt('<token_claro>', current_setting('app.encryption_key'))
   WHERE token_enc IS NULL;
   ```
3. Conferir descriptografia:
   ```sql
   SELECT id, pgp_sym_decrypt(token_enc, current_setting('app.encryption_key')) AS token
   FROM integration_f360
   LIMIT 1;
   ```
4. Rodar os syncs com a `SUPABASE_SERVICE_ROLE_KEY`:
   ```bash
   curl -X POST https://xzrmzmcoslomtzkzgskn.functions.supabase.co/sync-f360 \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
   curl -X POST https://xzrmzmcoslomtzkzgskn.functions.supabase.co/scheduled-sync-erp \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
   ```
5. Contar registros no Supabase:
   ```bash
   curl -H "Authorization: Bearer $KEY" .../dre_entries?select=count()&company_cnpj=eq.00026888098000
   ```
6. Testar APIs no novo projeto, garantindo que `dashboard-cards`, `relatorios-dre` e `oracle-response` respondem com dados reais.

