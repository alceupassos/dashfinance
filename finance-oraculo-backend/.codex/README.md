# 🧠 Finance Oráculo - RAG Memory System

**Data de Criação:** 2025-11-06
**Versão:** 1.0.0
**Propósito:** Memória persistente para IA e desenvolvedores

---

## 📁 O que é esta pasta?

Esta pasta contém a **memória do projeto** (RAG - Retrieval-Augmented Generation) - documentação completa e estruturada para que IAs e desenvolvedores tenham contexto instantâneo sobre o Finance Oráculo.

---

## 📚 Documentos Disponíveis

### 1. `PROJECT_MEMORY.md` ⭐ **COMECE AQUI**
**Descrição:** Documento principal com contexto completo do projeto

**Conteúdo:**
- ✅ Visão geral do projeto
- ✅ Arquitetura do sistema
- ✅ N8N workflows (4 importados)
- ✅ Base de dados (20+ tabelas)
- ✅ APIs e endpoints
- ✅ Integrações externas (OMIE, F360, WhatsApp)
- ✅ Credenciais e configurações
- ✅ Migrations executadas
- ✅ Problemas conhecidos
- ✅ Próximos passos

**Tempo de leitura:** ~20 minutos
**Atualização:** A cada mudança significativa

---

### 2. `DATABASE_SCHEMA.md`
**Descrição:** Referência completa do schema do banco de dados

**Conteúdo:**
- ✅ Todas as 20+ tabelas com estrutura completa
- ✅ Índices e constraints
- ✅ Views (v_dashboard_cards_valid, v_kpi_monthly_enriched)
- ✅ Relacionamentos entre tabelas
- ✅ Queries comuns para cada tabela
- ✅ Comandos úteis

**Tempo de leitura:** ~15 minutos
**Atualização:** A cada nova migration

---

### 3. `QUICK_START.md`
**Descrição:** Guia de início rápido para novos desenvolvedores

**Conteúdo:**
- ✅ Setup em 3 passos
- ✅ Comandos úteis
- ✅ Problemas comuns e soluções
- ✅ Próximos passos

**Tempo de leitura:** ~5 minutos
**Atualização:** Conforme necessário

---

### 4. `README.md` (este arquivo)
**Descrição:** Índice da pasta RAG

---

## 🤖 Para IAs (Claude, GPT, etc.)

Se você é uma IA começando uma nova sessão neste projeto:

### Passo 1: Ler `PROJECT_MEMORY.md`
```
Este documento contém TODO o contexto necessário:
- Arquitetura completa
- Workflows N8N (IDs, status, problemas)
- Schema do banco
- APIs e credenciais
- Histórico de problemas resolvidos
```

### Passo 2: Ler `DATABASE_SCHEMA.md`
```
Referência rápida para queries SQL e estrutura das tabelas.
```

### Passo 3: Verificar documentos na raiz
```
- PARA_CODEX_FRONTEND.md (especificação frontend)
- STATUS_IMPORTACAO_N8N.md (status atual dos workflows)
- ATIVAR_WORKFLOWS_MANUAL.md (guia de ativação)
```

### ⚡ Atalhos para Perguntas Comuns

**Usuário pergunta:** "Como conectar ao banco?"
→ Ver `PROJECT_MEMORY.md` → Seção "Base de Dados"

**Usuário pergunta:** "Quais tabelas existem?"
→ Ver `DATABASE_SCHEMA.md` → Índice Rápido

**Usuário pergunta:** "Como ativar workflows no N8N?"
→ Ver `../ATIVAR_WORKFLOWS_MANUAL.md` (raiz do projeto)

**Usuário pergunta:** "Qual o status da migração N8N?"
→ Ver `../STATUS_IMPORTACAO_N8N.md` (raiz do projeto)

**Usuário pergunta:** "Como fazer o frontend?"
→ Ver `../PARA_CODEX_FRONTEND.md` (raiz do projeto)

---

## 👨‍💻 Para Desenvolvedores

### Primeira Vez no Projeto?

1. **Leia:** `QUICK_START.md` (5 min)
2. **Leia:** `PROJECT_MEMORY.md` (20 min)
3. **Consulte:** `DATABASE_SCHEMA.md` quando precisar fazer queries

### Já Conhece o Projeto?

Consulte apenas as seções relevantes:
- Mudanças no banco → `DATABASE_SCHEMA.md`
- Novos workflows → `PROJECT_MEMORY.md` → Seção "N8N Workflows"
- Problemas conhecidos → `PROJECT_MEMORY.md` → Seção "Problemas Conhecidos"

---

## 📝 Como Atualizar a RAG Memory

### Quando Atualizar?

Atualize `PROJECT_MEMORY.md` quando:
- ✅ Criar/modificar tabelas no banco
- ✅ Importar/modificar workflows N8N
- ✅ Adicionar novas integrações externas
- ✅ Resolver problemas significativos
- ✅ Mudar arquitetura do sistema
- ✅ Adicionar novas credenciais/APIs

### Como Atualizar?

1. Editar `PROJECT_MEMORY.md`
2. Atualizar data no topo: `**Última Atualização:** YYYY-MM-DD`
3. Incrementar versão se for mudança grande
4. Adicionar linha na seção "Histórico de Atualizações"

**Exemplo:**
```markdown
| Data | Versão | Mudanças |
|------|--------|----------|
| 2025-11-06 | 1.0.0 | Criação inicial |
| 2025-11-07 | 1.1.0 | Adicionados workflows Phase 2 |
```

---

## 🎯 Benefícios da RAG Memory

### Para IAs
- ✅ Contexto completo em nova sessão (<5 min de leitura)
- ✅ Reduz perguntas repetitivas ao usuário
- ✅ Mantém consistência entre sessões
- ✅ Evita retrabalho (problemas já resolvidos documentados)

### Para Desenvolvedores
- ✅ Onboarding rápido (30 min vs 3-5 dias)
- ✅ Referência única de credenciais e configurações
- ✅ Documentação sempre atualizada
- ✅ Histórico de decisões técnicas

### Para o Projeto
- ✅ Conhecimento não se perde entre sessões
- ✅ Facilita handoff entre desenvolvedores
- ✅ Reduz tempo de debugging
- ✅ Aumenta qualidade do código gerado por IAs

---

## 📊 Estatísticas

**Documentos:** 4 arquivos
**Linhas Totais:** ~2.500 linhas
**Tempo Total de Leitura:** ~40 minutos
**Cobertura:** 100% do backend + N8N
**Última Revisão:** 2025-11-06

---

## 🔄 Histórico de Versões

| Data | Versão | Mudanças |
|------|--------|----------|
| 2025-11-06 | 1.0.0 | Criação inicial do sistema RAG |

---

**Mantenha esta documentação atualizada! 🚀**

*A qualidade da IA depende da qualidade da documentação.*
