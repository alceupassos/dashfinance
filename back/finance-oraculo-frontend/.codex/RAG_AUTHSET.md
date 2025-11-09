# 🧠 RAG – AuthSet & Setup Wizard

## Contexto Macro
- **AuthSet**: app Vite/React focado em autenticação de proximidade (BLE/NFC) e UX minimalista, dev stack TypeScript + Vite.
- **Setup Wizard (Resource Packs)**: painel elegante (estilo Cursor Settings) para provisionar ambientes, packs MCP/UV/Fetch, painel de tokens e marketplace de templates.
- **Princípios visuais**: dark minimalista, cards arredondados, botões sutis, animações leves, auto-hide em docks e sidebars.

## Estado Atual (Nov/2025)
1. **Frontend principal (`finance-oraculo-frontend/`)**
   - Dashboard e setup controller documentados (ver `SETUP_CONTROLLER.md`, `RESOURCE_WIZARD_PLAN.md`).
   - Precisamos transformar o plano em UI real + componentes reutilizáveis.
2. **AuthSet (copiado para `dashfinance/authset/`)**
   - Estrutura Vite pronta (`App.tsx`, `components/`, `utils/`).
   - **Novidade**: `design-system.md` + `styles/theme.css` criados com tokens Angra.IO.
   - Telas Splash, Onboarding, Biometric, Home e Vault redesenhadas (cards “glass”, chip, btn-gradient, layout responsivo).
3. **SetAuto (`dashfinance/setauto/`)**
   - Novo projeto para catálogo/assinatura de templates e presets de setup.
   - Requer manifesto descrevendo produto + integração futura com marketplace.

## Pendências Prioritárias
| Item | Descrição | Status |
|------|-----------|--------|
| R1 | Implementar layout “Cursor Settings” no AuthSet (sidebar + cards + dock). | 🔄 |
| R2 | Conectar AuthSet a BLE/NFC blueprint (docs + hooks). | ⏳ |
| R3 | Especificar marketplace SetAuto (planos, partilha receita, uploads). | ⏳ |
| R4 | Configurar RAG incremental compartilhado (Supabase `codex_memory`). | 🔄 |
| R5 | Definir “BLE Trust Circle” (lista de IDs autorizados a dispensar 2FA). | ✅ spec |

## Próximas Ações
1. **AuthSet**: aplicar o mesmo estilo nas telas restantes (Assistant, AddCode, PasswordHealth) + integrar com API FastAPI.
2. **SetAuto**: escrever manifesto (`setauto/README.md`) com proposta de assinatura, fluxo de templates e API mínima. ✅ manifesto pronto; próximo passo é landing/UX.
3. **BLE Trust Circle**: cada usuário terá assinatura/assinantes vinculados a BLE IDs conhecidos. Quando X dispositivos estiverem próximos, AuthSet libera login sem solicitar OTP adicional.
4. **RAG Sync**: script `scripts/rag-sync.mjs` (pendente) para subir memórias a Supabase; até lá usar este arquivo + `SESSION_*`.
5. **Build check**: tentativa de `npm install` em `authset` falhou (sem acesso à registry). Repetir quando rede estiver disponível.

## Referências Rápidas
- Design guide: `finance-oraculo-frontend/.codex/SETUP_CONTROLLER.md`
- Plano wizard: `finance-oraculo-frontend/.codex/RESOURCE_WIZARD_PLAN.md`
- AuthSet fonte: `dashfinance/authset/`
- SetAuto base: `dashfinance/setauto/`
- Supabase AuthSet: `newczbjzzfkwwnpfmygm` (`https://newczbjzzfkwwnpfmygm.supabase.co`) – chaves em `authset-api/.env.example`

> Sempre registrar novos avanços nestes documentos + Supabase assim que tivermos acesso. Quando movermos projetos, manter caminhos dentro de `dashfinance/` para garantir integração com git/deploy. 
