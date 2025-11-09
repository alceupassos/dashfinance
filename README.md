# 💼 Dashboard Finance - iFinance Oráculo

Sistema de gestão financeira com IA integrada, automações N8N e analytics em tempo real.

---

## 🚀 Quick Start

### 1. Deploy Edge Functions (Supabase)

```bash
# Login e configuração inicial
supabase login
cd finance-oraculo-backend
supabase link --project-ref xzrmzmcoslomtzkzgskn

# Deploy de todas as funções
cd ..
./deploy-all-functions.sh

# Testar
./test-all-edge-functions.sh
```

📖 **Documentação completa:** [DEPLOY_EDGE_FUNCTIONS.md](./DEPLOY_EDGE_FUNCTIONS.md)

---

### 2. Deploy Frontend (VPS)

```bash
# Build remoto no servidor
./deploy-remote-build.sh

# Configurar PM2 + Nginx
./setup-server-production.sh
```

**Servidor:** root@147.93.183.55  
**Domínio:** www.ifin.app.br

---

---

## 🔐 Autenticação & Autorização

> ⚠️ **ANTES DE ADICIONAR NOVOS USUÁRIOS OU APIs, LEIA ISTO:**

📖 **Referência Rápida**: [AUTH_IMPLEMENTATION_GUIDE.md](./AUTH_IMPLEMENTATION_GUIDE.md)
📚 **Documentação Completa**: [docs/AUTH_SOLUTION_EXPLAINED.md](./docs/AUTH_SOLUTION_EXPLAINED.md)

### Arquitetura em 3 Níveis
1. **Supabase Auth**: JWT + password hash
2. **Custom Users Table**: roles (admin, cliente, franqueado) + multi-tenant
3. **Row Level Security**: proteção de dados no banco

### Checklist Rápido
- [ ] Criar tabela `users` com FK para `auth.users`
- [ ] Adicionar coluna `role` e `company_cnpj`
- [ ] Criar funções PL/pgSQL: `user_has_permission()`, `user_has_company_access()`
- [ ] Habilitar RLS e criar policies
- [ ] Edge Function para gerenciar usuários
- [ ] Validar JWT em toda requisição
- [ ] Registrar audit log

---

## 📂 Estrutura do Projeto

```
dashfinance/
├── finance-oraculo-frontend/     # Next.js 14 + React + Tailwind
├── finance-oraculo-backend/      # Supabase Edge Functions
│   └── supabase/functions/       # 69 Edge Functions
├── deploy-all-functions.sh       # Deploy Edge Functions
├── test-all-edge-functions.sh    # Testes automatizados
├── deploy-remote-build.sh        # Build no servidor remoto
├── setup-server-production.sh    # Setup PM2 + Nginx
└── DEPLOY_EDGE_FUNCTIONS.md      # Guia completo
```

---

## 🛠️ Scripts Disponíveis

| Script | Descrição | Uso |
|--------|-----------|-----|
| `deploy-all-functions.sh` | Deploy de Edge Functions no Supabase | `./deploy-all-functions.sh` |
| `test-all-edge-functions.sh` | Testa todas as Edge Functions | `./test-all-edge-functions.sh` |
| `deploy-remote-build.sh` | Build do frontend no servidor VPS | `./deploy-remote-build.sh` |
| `setup-server-production.sh` | Configura PM2 + Nginx no VPS | `./setup-server-production.sh` |

### Opções Avançadas

```bash
# Deploy apenas funções TIER 1 (críticas)
./deploy-all-functions.sh --tier 1

# Testar apenas TIER 2
./test-all-edge-functions.sh --tier 2

# Output JSON para CI/CD
./test-all-edge-functions.sh --output json

# Dry-run (sem fazer deploy)
./deploy-all-functions.sh --dry-run
```

---

## 📊 Dashboard MCP

O dashboard MCP (`/admin/mcp-dashboard`) monitora 3 sistemas:

1. **Federated MCP (N8N)** - Workflows de automação
2. **Supabase Infra MCP** - Métricas de infraestrutura
3. **Automation Runs MCP** - Logs de execuções

📖 **Configuração:** [DEPLOY_EDGE_FUNCTIONS.md](./DEPLOY_EDGE_FUNCTIONS.md#configuração-dos-mcps)

---

## 🔐 Variáveis de Ambiente

### Frontend (`finance-oraculo-frontend/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xzrmzmcoslomtzkzgskn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL=https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1
```

### Backend (Supabase Secrets)

```bash
supabase secrets set OPENAI_API_KEY=sk-proj-...
supabase secrets set N8N_URL=https://seu-n8n.com
supabase secrets set N8N_API_KEY=sua-api-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
```

---

## 🧪 Testes

### Testar Edge Functions

```bash
# Todas as funções
./test-all-edge-functions.sh

# Apenas críticas (TIER 1)
./test-all-edge-functions.sh --tier 1

# Com output JSON
./test-all-edge-functions.sh --output json > results.json
```

### Testar Frontend Local

```bash
cd finance-oraculo-frontend
npm run dev
# Acesse: http://localhost:3000
```

### Testar Produção

```bash
# Via curl
curl -I https://www.ifin.app.br

# Ver logs do servidor
ssh -i ssh_key.txt root@147.93.183.55 'pm2 logs dashfinance-frontend'
```

---

## 📈 Status Atual

| Componente | Status | Descrição |
|------------|--------|-----------|
| Edge Functions | ⚠️ 0/69 deployadas | Usar `deploy-all-functions.sh` |
| Frontend Build | ✅ Funcional | Build de produção OK |
| Frontend Deploy | ✅ Configurado | VPS: www.ifin.app.br |
| PM2 | ⏳ Pendente | Usar `setup-server-production.sh` |
| Nginx | ⏳ Pendente | Usar `setup-server-production.sh` |
| SSL (HTTPS) | ⏳ Pendente | Certbot (opcional) |

📊 **Status detalhado:** [STATUS_PROJETO.md](./STATUS_PROJETO.md)

---

## 🔗 Links Úteis

- **Repositório:** https://github.com/alceupassos/dashfinance
- **Supabase Dashboard:** https://supabase.com/dashboard/project/xzrmzmcoslomtzkzgskn
- **Produção:** https://www.ifin.app.br
- **Servidor VPS:** 147.93.183.55

---

## 📚 Documentação

- [DEPLOY_EDGE_FUNCTIONS.md](./DEPLOY_EDGE_FUNCTIONS.md) - Deploy e configuração de Edge Functions
- [STATUS_PROJETO.md](./STATUS_PROJETO.md) - Status detalhado e próximos passos

---

## 🆘 Troubleshooting

### Edge Function retorna 404

```bash
# Verificar se foi deployada
supabase functions list

# Deploy
supabase functions deploy <nome-funcao>
```

### Frontend não carrega

```bash
# Ver logs do PM2
ssh -i ssh_key.txt root@147.93.183.55 'pm2 logs dashfinance-frontend'

# Reiniciar
ssh -i ssh_key.txt root@147.93.183.55 'pm2 restart dashfinance-frontend'
```

### Erro de autenticação Supabase

```bash
# Verificar variáveis no .env.local
cat finance-oraculo-frontend/.env.local

# Verificar no navegador (F12 > Console)
# Deve mostrar: [supabase-browser] Client created successfully
```

---

## 👥 Contribuindo

1. Clone o repositório
2. Crie uma branch: `git checkout -b feature/nova-feature`
3. Commit: `git commit -m 'feat: adiciona nova feature'`
4. Push: `git push origin feature/nova-feature`
5. Abra um Pull Request

---

## 📄 Licença

Proprietário - iFinance © 2025

---

**✨ Desenvolvido com Next.js, Supabase e muito ☕**

