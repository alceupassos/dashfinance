## Outbound: Consumir Backend DashFinance no novo projeto

### 1. Variáveis de ambiente
- `NEXT_PUBLIC_SUPABASE_URL` → mesma URL do projeto `xzrmzmcoslomtzkzgskn`.
- `SUPABASE_SERVICE_ROLE_KEY` → usada no backend e na camada MCP para chamadas seguras.
- `APP_URL`/`NEXT_PUBLIC_APP_URL` → domínio do frontend que fará requests.

### 2. SDK/API client (filtragem e IA)
- Criar módulo `dashfinanceClient.ts` que exporte:
  ```ts
  export const getDashboardCards = (cnpj: string) => fetch(`${BASE}/dashboard-cards?cnpj=${cnpj}`, ...)
  export const getDreReport = (cnpj: string, period: string) => fetch(`${BASE}/relatorios-dre?...`)
  export const askOracle = (body: OraclePayload) => fetch(`${BASE}/oracle-response`, {...})
  ```
- Sempre inclua `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}` e `Content-Type: application/json`.

### 3. MCP/Agent (opcional)
- Reutilize scripts do `angra_eco/cursor-config` ou `mcp-remote` para rodar um agente que:
  1. Usa `SUPABASE_SERVICE_ROLE_KEY` e `app.encryption_key`.
  2. Chama `/sync-f360` quando necessário e coleta logs.
  3. Torna disponível um endpoint local (ex.: `/mcp/health`) para o dashboard.

### 4. Checkpoints de validação
1. `curl .../dre_entries?select=count()` confirma dados carregados.
2. `curl /dashboard-cards?cnpj=` e `/relatorios-dre` devem retornar JSON com valores.
3. `oracle-response` com `company_cnpj` e pergunta curta retorna `answer`.

### 5. Documentação
- Referencie `in.md` para entender quais secrets foram configurados no Supabase.
- Registre no novo projeto as URLs consumidas e as políticas de segurança (RLS/CORS).

### 6. Monitoramento
- Use `supabase functions logs` para acompanhar `/sync-f360` e `/scheduled-sync-erp`.
- Configure alertas (via MCP ou script) para erros `Wrong key or corrupt data`.
