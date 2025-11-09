# 🧩 Setup Controller – Codex Orquestrador

Documento base para inicializar sessões de trabalho com o Codex, garantindo fidelidade total às instruções, checkpoints de memória e uso de subprompts em LLMs auxiliares.

---

## 1. Objetivo
- **Codex = orquestrador**: mantém visão global, aplica regras e valida entregas críticas.
- **Subprompts = executores táticos**: modelos leves/baratos cuidam de blocos repetitivos.
- **Memória incremental**: cada avanço gera registro imediato no RAG/DB para evitar perda em travamentos.

---

## 2. Regras Obrigatórias de Código & Processo
1. **Blueprint congelado**: toda especificação ou prompt complexo vai para `docs/PROMPTS/<nome>.md`. Nenhum resumo on-the-fly.
2. **Checklist antes de entregar**:
   - 🎯 Requisitos de negócio cobertos?
   - 🧱 Componentes seguem design system?
   - 🧪 Estados (loading/erro/vazio) implementados?
   - 🧾 Logs e RAG atualizados?
3. **Comentários mínimos**: apenas em trechos não triviais, explicando propósito.
4. **Tokens sensíveis**: nunca nos sources; usar `.env.local` ou secrets do Supabase.
5. **Deploy seguro**: backup antes de cada release e verificação de build (Next `.next/server` + `.next/static`).

---

## 3. RAG Incremental (Obrigatório em TODO checkpoint)
| Etapa | Ação | Destino |
|-------|------|---------|
| Após cada sub-entrega (ex.: página concluída, deploy, script pronto) | Gerar resumo curto (contexto, arquivos tocados, pendências) | `./.codex/SESSION_<data>.md` **e** base vetorial |
| Falha/erro relevante | Registrar root cause + tentativa | mesmo fluxo |
| Encerramento | Sumário consolidado + próximos passos | idem |

### Vetor DB sugerido
Supabase `pgvector` (mesmo projeto `xzrmzmcoslomtzkzgskn`):
```sql
create table if not exists codex_memory (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  scope text,            -- ex.: frontend/deploy
  summary text,
  embedding vector(1536) -- OpenAI ada-002 ou equivalente
);
```
Inserção:
```bash
curl -X POST https://xzrmzmcoslomtzkzgskn.functions.supabase.co/codex-memory \
  -H "Authorization: Bearer <service_role>" \
  -H "Content-Type: application/json" \
  -d '{ "scope":"frontend/deploy", "summary":"...texto...", "embedding":[...float...] }'
```
> Quando não houver acesso ao serviço, salvar em `./.codex/RAG_QUEUE.md` para inserção posterior.

---

## 4. Prompt Blueprint + Check Agent
1. **Blueprint**: cada prompt longo ganha um template em `docs/PROMPTS/`.
2. **Check Agent**:
   - Arquivo `./.codex/PROMPT_CHECKLIST.md` com itens obrigatórios (dados, tom, seções, gráficos etc.).
   - Antes de enviar, marcar ✅/❌ e anexar ao RAG incremental.
3. **Automação opcional**: script `scripts/checklist.mjs prompt.md checklist.md` que valida campos “{{...}}” preenchidos.

---

## 5. Subprompts e LLMs auxiliares
### Fluxo
1. Codex define *task spec* mínima → salva em `scripts/subprompts/tasks/<id>.json`.
2. Chama runner (`node scripts/subprompts/run.mjs --task tasks/<id>.json --model haiku`) para executar modelos rápidos (Claude Haiku, GPT-4o mini, etc.).
3. Resultado volta para Codex, que faz QA e integração.

### Boas práticas
- Contexto máximo 400-600 tokens.
- Sempre incluir formato esperado (ex.: snippet TSX, JSON, checklist).
- Registrar no RAG qual tarefa foi terceirizada e qual modelo respondeu.

---

## 6. Persistência & Onboarding
1. **Este arquivo** deve ser lido por qualquer agente antes de agir (`.codex/SETUP_CONTROLLER.md`).
2. **Checklists**:
   - `./.codex/PROMPT_CHECKLIST.md`
   - `./.codex/RAG_QUEUE.md` (pendências de inserção no DB)
3. **Início de sessão**:
   - Ler `./.codex/SESSION_<data>.md` mais recente.
   - Carregar últimas entradas da tabela `codex_memory` (quando online).
4. **Failsafe**: sempre que for detectado freeze/timeout, fazer dump imediato do estado atual em `SESSION...` + `RAG_QUEUE`.

---

## 7. Próximos Passos Automáveis
- Script `scripts/rag-sync.mjs` para pegar pendências do `RAG_QUEUE` e subir para Supabase.
- Hook Git (pre-commit) lembrando de atualizar checklist antes de pushar prompts.
- PM2 task para rodar `rag-sync` diariamente.

---

> **Resumo**: Codex comanda, registra cada passo e delega o que for repetitivo para LLMs baratas. Nada é entregue sem checklist e sem gravação imediata na memória vetorial. Este setup deve ser seguido em toda sessão nova.
