# 🚀 Resource Wizard – Plano de Implementação

Objetivo: transformar os conceitos discutidos (setup packs, painel de recursos, orquestrador multi-LLM e front starter kit) em uma aplicação real, modular e acionável dentro do ecossistema atual.

---

## 1. Visão Geral

**Produto**: um “Resource Wizard” residente (pode rodar como app Next ou Electron/Tauri) que centraliza:
1. **Setup Packs** – habilita/disabilita conjuntos de configurações (MCP servers, UV, Fetch, etc.) com um clique.
2. **Painel de Recursos/Tokens** – monitora saldo por LLM/provider e controla uso em tempo real.
3. **Orquestrador de Prompts** – distribui tarefas automaticamente entre vários modelos de acordo com custo/velocidade/disponibilidade.
4. **Front Starter Kit** – provisiona stacks frontend padronizadas (Tailwind, shadcn/ui, Tremor, Recharts...) com layout amigável.

Cada módulo pode ser ativado individualmente, mas compartilha uma base comum de logging, RAG e controle de estados.

---

## 2. Jornada do Usuário

1. **Dashboard inicial** – cards para cada módulo com status (Enabled/Disabled), descrição e CTA.
2. **Setup Packs**
   - Seleciona “Enable MCP Pack” → wizard mostra checklist (deps, configs, testes).
   - Botões acionam scripts automatizados (instalação, patch de configs).
   - Logs em cards (resultado + links para docs).
3. **Painel de Recursos**
   - Barra fixa (ou modal) exibindo saldo de tokens por provider/modelo.
   - Alertas de limites e botões para pausar modelos.
   - Integração com Supabase/planilhas para persistir consumo.
4. **Orquestrador de Prompts**
   - Tela “Create Mission”: define nº de tarefas, prioridade (custo x performance), tempo máximo.
   - Wizard recomenda modelos, gera subprompts, aciona jobs paralelos.
   - Resultado aparece em tabela com download de logs + registro no RAG.
5. **Front Starter Kit**
   - Wizard de 3 passos: selecionar estilo → escolher libs → gerar template.
   - No background, scripts executam `npx` e configuram arquivos (Tailwind, shadcn, etc.).
   - Exibe progresso com UI amigável (cards, steps, gráficos).

---

## 3. Arquitetura

### Camadas
- **UI Orquestradora (Next.js ou Electron/Tauri)**: painel com os módulos e botões.
- **Engine de Execução**:
  - Scripts Node.js (ShellRunner) para rodar comandos e capturar logs.
  - Adaptadores para MCP, UV, Fetch (via configs YAML/JSON).
- **Registro & Memória**:
  - Supabase (pgvector) para RAG + logs.
  - `.codex/` para checkpoints quando offline.
- **Painel em Rust (opcional)**:
  - Aplicação em background (Tauri) alimentada por WebSocket/API para mostrar saldos em tempo real.

### Dependências principais
- Next.js + Tailwind + shadcn/ui + Tremor/Recharts (UI).
- Node scripts para automação (shelljs/execa).
- Rust/Tauri (monitor de tokens).
- Supabase (auth, storage, pgvector).

---

## 4. Fases / Milestones

| Fase | Entregas | Dependências |
|------|----------|--------------|
| **F1 – Fundação** | UI base no Next; módulo Setup Packs com 2 packs (MCP e UV); logging simples em `.codex`. | Reaproveitar infra atual |
| **F2 – Painel de Recursos** | Painel em Rust/Tauri (ou Next + WebSocket) com saldo por modelo; integração Supabase para consumo. | API keys LLM, Supabase |
| **F3 – Orquestrador** | Spec JSON para tarefas, runner multi-LLM com escolha automática, logs no RAG. | Fases anteriores, acesso LLM |
| **F4 – Front Starter Kit** | Wizard instalando Tailwind/shadcn/Tremor, pré-config de pastas e componentes base. | Scripts Node, templates |
| **F5 – UX avançada** | Botões enable/disable com animações, gráficos em tempo real, notificações. | Módulos anteriores estáveis |

Cada fase termina com checkpoint no RAG + doc de handoff.

---

## 5. Próximos Passos Imediatos
1. Criar pasta `resource-wizard/` (ou dentro do frontend atual) para abrigar a UI dos módulos.
2. Implementar **Setup Packs MVP**:
   - Definir lista inicial (ex.: MCP server, Fetch controller).
   - Escrever scripts de instalação/checagem e UI correspondente.
3. Especificar endpoints/queries para o painel de recursos (coletar tokens usados).
4. Documentar JSON spec para o orquestrador (campos: tarefa, modelo sugerido, custo estimado).

---

## 6. Observações
- Sempre que um módulo rodar uma ação, gravar no RAG (via Supabase e `.codex` fallback).
- UI deve evitar “terminal cru”: usar cards, progress bars e logs formatados.
- Deixar hooks para suportar novas bibliotecas ou providers no futuro (packs extensíveis).

---

> Este plano serve como blueprint para transformar o conceito em produto. Ao iniciar uma fase, detalhar tarefas no `.plan.md` e seguir o fluxo de RAG/checklist descrito em `SETUP_CONTROLLER.md`.
