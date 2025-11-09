# Prompt Checklist • Codex Controller

Use esta lista antes de concluir qualquer entrega (prompt, layout, feature ou doc).

1. **Contexto carregado**
   - [ ] Consultei `SETUP_CONTROLLER.md` e o RAG da sessão.
   - [ ] Blueprint/templates atualizados (docs/PROMPTS/... se aplicável).

2. **Requisitos do usuário**
   - [ ] Todos os pontos listados pelo usuário foram endereçados (nenhum ignorado).
   - [ ] Dependências externas (API, Supabase, BLE etc.) consideradas ou sinalizadas.

3. **UX / Visual**
   - [ ] Cores/paleta seguem o sistema Angra.IO.
   - [ ] Tipografia/hierarquia respeitam o grid definido.
   - [ ] Contrastes e estados (hover/focus) ok.

4. **Código / Arquitetura**
   - [ ] Componentes reutilizam theme/global tokens.
   - [ ] Estados de carregamento/erro/vazio previstos.
   - [ ] Sem chaves sensíveis no código.

5. **RAG & Log**
   - [ ] Atualizei o RAG (`.codex/RAG_*.md` + Supabase quando disponível).
   - [ ] Pendências anotadas no `.plan.md` ou checklist.

> Marque cada item antes de enviar. Se algo não for aplicável, registre o motivo no RAG.
