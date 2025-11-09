# ⚡ Finance Oráculo - Quick Start Guide

**Para:** Desenvolvedores que estão começando no projeto
**Tempo estimado:** 10-15 minutos

---

## 🎯 O que é Finance Oráculo?

Plataforma SaaS de gestão financeira para franquias e PMEs:
- Dashboard financeiro consolidado
- Bot WhatsApp com IA
- Sync automático com ERPs (OMIE, F360)
- Alertas e relatórios inteligentes

---

## 📂 Estrutura do Projeto

```
finance-oraculo-backend/
├── .codex/                    # 🧠 RAG Memory (LEIA ISTO PRIMEIRO!)
│   ├── PROJECT_MEMORY.md      # Documento principal (contexto completo)
│   ├── DATABASE_SCHEMA.md     # Schema do banco de dados
│   └── QUICK_START.md         # Este arquivo
│
├── migrations/                # SQL migrations
│   ├── 007_dashboard_cards.sql
│   └── 008_erp_sync_tables.sql
│
├── n8n-workflows/             # Workflows N8N (JSON)
│   ├── whatsapp-bot-v3-ultra-optimized.json
│   ├── dashboard-cards-processor.json
│   ├── erp-sync-omie-intelligent.json
│   └── erp-sync-f360-intelligent.json
│
├── PARA_CODEX_FRONTEND.md     # Especificação do frontend
├── STATUS_IMPORTACAO_N8N.md   # Status da migração N8N
└── ATIVAR_WORKFLOWS_MANUAL.md # Guia de ativação dos workflows
```

---

## 🚀 Setup Rápido (3 Passos)

### 1. Conectar ao Banco de Dados

```bash
# PostgreSQL (Supabase)
PGPASSWORD='B5b0dcf500@#' psql \
  -h db.xzrmzmcoslomtzkzgskn.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres
```

### 2. Acessar N8N

```
URL: https://n8n.angrax.com.br
Workflows ativos: 4 (Phase 1)
```

### 3. Ler a Documentação RAG

```bash
# Leia PRIMEIRO este arquivo:
open .codex/PROJECT_MEMORY.md

# Depois leia o schema do banco:
open .codex/DATABASE_SCHEMA.md
```

---

## 📊 Comandos Úteis

### Verificar Tabelas
```sql
-- Listar todas as tabelas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;

-- Ver estrutura de uma tabela
\d nome_da_tabela
```

### Ver Dashboard Cards
```sql
SELECT card_type, card_data->>'formatted' as valor
FROM v_dashboard_cards_valid
WHERE company_cnpj = '00.000.000/0001-00';
```

### Ver Logs de Sync
```sql
SELECT provider, status, records_synced, synced_at
FROM sync_logs
ORDER BY synced_at DESC
LIMIT 10;
```

---

## ⚠️ Problemas Comuns

### 1. "column status does not exist"
**Causa:** A view `clients` não tem coluna `status`
**Solução:** Use `WHERE sync_enabled = true` ao invés de `WHERE status = 'active'`

### 2. N8N "self-signed certificate in certificate chain"
**Causa:** Supabase usa certificado SSL não reconhecido
**Solução:** Ativar "Ignore SSL Issues" na credencial PostgreSQL do N8N

### 3. Workflows não executam
**Causa:** Credencial PostgreSQL no N8N incorreta
**Solução:** Verificar senha `B5b0dcf500@#` e SSL settings

---

## 📖 Próximos Passos

1. ✅ Ler `.codex/PROJECT_MEMORY.md` (contexto completo)
2. ✅ Ler `.codex/DATABASE_SCHEMA.md` (schema do banco)
3. ✅ Acessar N8N e ver workflows
4. ✅ Executar queries de teste no PostgreSQL
5. ✅ Ler `PARA_CODEX_FRONTEND.md` (se for trabalhar no frontend)

---

## 🆘 Precisa de Ajuda?

Consulte os seguintes arquivos na ordem:
1. `.codex/PROJECT_MEMORY.md` - Contexto geral do projeto
2. `.codex/DATABASE_SCHEMA.md` - Schema do banco
3. `STATUS_IMPORTACAO_N8N.md` - Status dos workflows
4. `ATIVAR_WORKFLOWS_MANUAL.md` - Ativação manual de workflows

---

**Tempo de leitura:** ~30 minutos para ler toda a documentação RAG
**Produtividade:** 10x maior após leitura completa!
