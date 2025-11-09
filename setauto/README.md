# SetAuto – Biblioteca Viva de Setups

## Pitch
Plataforma onde devs alugam ou vendem seus “setup templates” (paletas, stacks, automações) e usuários aplicam com um clique. Tudo com a mesma estética premium do nosso Setup Wizard: dark minimalista, cards elegantes e instaladores em segundo plano.

## Como Funciona
1. **Profile & Preferences**: usuário loga, o app detecta stack atual e sugere presets baseados em histórico.
2. **Marketplace**: cada template tem preview visual, custo/assinatura e autores recebem % por uso.
3. **Installer Invisível**: ao ativar um template, o SetAuto roda scripts de provisionamento (Tailwind, shadcn, Tremor, libs de autenticação, etc.) em background e mostra apenas cards de progresso.
4. **Token Wallet**: painel integrado ao nosso monitor de recursos — comprar créditos, distribuir entre LLMs e templates.

## Roadmap
- **MVP**: listar templates próprios, aplicar em projeto local, salvar preferências.
- **Creators Portal**: permitir upload de presets, definir preço, acompanhar receita.
- **Sharing Layer**: QR codes / links mágicos para compartilhar sets completos.
- **Analytics**: exibir métricas de uso por template, stack favorita, feedback.

## Tech Stack Proposta
- Next.js 14 (App Router) + Tailwind + shadcn/ui (mesma base visual).
- Supabase (auth, storage, pgvector para recomendações).
- Scripts Node/Rust para provisionamento em background.
- Integração futura com painel BLE/NFC para aprovar compras/aplicações por proximidade.

> Objetivo: tornar o setup de ambientes algo tão simples quanto escolher um tema — bonito, rápido e monetizável para a comunidade.
