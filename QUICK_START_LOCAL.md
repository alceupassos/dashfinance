# 🚀 Quick Start Local - Smoke Tests

> Execute estes scripts no seu **terminal local** (não no Cursor)

---

## 📋 Requisitos

- [x] Node.js 18+ (`node --version`)
- [x] npm (`npm --version`)
- [x] Git
- [x] Curl (para testes de API)

---

## 🎯 3 Scripts para Rodar

### 1️⃣ **Smoke Test Completo** (5 min)
```bash
cd /Users/alceualvespasssosmac/dashfinance
chmod +x LOCAL_SMOKE_TEST.sh
./LOCAL_SMOKE_TEST.sh
```

**O que testa:**
- ✅ Ambiente (npm, curl, node)
- ✅ Dependencies do frontend
- ✅ Edge Functions respondendo (6 testes)
- ✅ Build do frontend
- ✅ Todas 10 páginas de painel existem

**Resultado esperado:**
```
✅ Edge Functions: 6/6 respondendo
✅ Páginas: 10/10 encontradas
✅ Build: OK
```

---

### 2️⃣ **Rodar Frontend em Dev** (Contínuo)
```bash
cd /Users/alceualvespasssosmac/dashfinance
chmod +x RUN_FRONTEND.sh
./RUN_FRONTEND.sh
```

**O que faz:**
- Instala dependências (se necessário)
- Inicia servidor Next.js em http://localhost:3000
- Auto-reload em cada alteração

**Navegue para testar:**
- http://localhost:3000/admin/tokens
- http://localhost:3000/relatorios/dre
- http://localhost:3000/empresas
- http://localhost:3000/relatorios/kpis
- etc...

---

### 3️⃣ **Testar APIs** (5 min)
```bash
cd /Users/alceualvespasssosmac/dashfinance
chmod +x TEST_APIS.sh
./TEST_APIS.sh
```

**O que testa:**
- ✅ 11 Edge Functions
- ✅ Respostas HTTP 200/201
- ✅ Dados retornados

**Resultado esperado:**
```
✅ Passaram: 11/11
❌ Falharam: 0/11
📊 Taxa de sucesso: 100%
```

---

## 📊 Dados de Teste Disponíveis

### Empresas Populadas
- **F360**: 17 empresas (Volpe, Dex, AAS, Acqua, Individuais)
- **OMIE**: 7 empresas (Mana Poke, Med Solutions, BRX, etc)
- **Total**: 24 empresas

### Tokens de Onboarding
- 17 tokens (VOL01-05, DEX01-02, AAS01, AGS01, ACQ01-02, etc)
- Todos com status "pending"
- Com WhatsApp links para teste

### Dados Financeiros
- 15 registros DRE (receita/despesa)
- Pronto para testar relatórios

---

## 🔗 URLs dos Painéis

Com o frontend rodando em `npm run dev`:

| Painel | URL | Dados |
|--------|-----|-------|
| Tokens | http://localhost:3000/admin/tokens | 17 tokens |
| Empresas | http://localhost:3000/empresas | 24 empresas |
| DRE | http://localhost:3000/relatorios/dre | 15 entradas |
| Cashflow | http://localhost:3000/relatorios/cashflow | 0 (opcional) |
| Grupos | http://localhost:3000/grupos | configurável |
| KPIs | http://localhost:3000/relatorios/kpis | calculados |
| A Pagar | http://localhost:3000/relatorios/payables | do DRE |
| A Receber | http://localhost:3000/relatorios/receivables | do DRE |
| Conversas | http://localhost:3000/whatsapp/conversations | (vazio) |
| Templates | http://localhost:3000/whatsapp/templates | (vazio) |

---

## 🧪 Fluxo Recomendado de Testes

### 1. Setup Inicial (5 min)
```bash
# Terminal 1
./LOCAL_SMOKE_TEST.sh
# Resultado: ✅ TUDO OK
```

### 2. Testar APIs (5 min)
```bash
# Terminal 2
./TEST_APIS.sh
# Resultado: 11/11 respondendo
```

### 3. Rodar Frontend (Contínuo)
```bash
# Terminal 3
./RUN_FRONTEND.sh
# Resultado: http://localhost:3000
```

### 4. Navegar e Testar (Manual)
1. Abra http://localhost:3000
2. Clique em cada painel
3. Valide que os dados aparecem
4. Teste filtros e paginação

---

## ✅ Checklist de Validação

- [ ] `./LOCAL_SMOKE_TEST.sh` passa 100%
- [ ] `./TEST_APIS.sh` passa 100%
- [ ] Frontend inicia sem erros
- [ ] /admin/tokens lista 17 tokens
- [ ] /empresas lista 24 empresas
- [ ] /relatorios/dre mostra dados
- [ ] /relatorios/kpis calcula KPIs
- [ ] /whatsapp/templates funciona
- [ ] /whatsapp/conversations funciona

---

## 🐛 Troubleshooting

### Erro: "npm not found"
```bash
# Instale Node.js via:
# https://nodejs.org/ (recomendado)
# ou
brew install node  # se tem homebrew
```

### Erro: "Supabase connection failed"
```bash
# Verifique internet
# Verifique URL e ANON_KEY nos scripts
# Verifique Supabase status: https://status.supabase.com
```

### Erro: "Port 3000 already in use"
```bash
# Use outra porta:
PORT=3001 npm run dev

# Ou mate o processo:
lsof -ti:3000 | xargs kill -9
```

### Build failing
```bash
# Limpe cache:
rm -rf node_modules .next
npm install --legacy-peer-deps
npm run build
```

---

## 📚 Documentação Completa

Para detalhes técnicos, veja:
- `AUTH_IMPLEMENTATION_GUIDE.md` - Como autenticação funciona
- `docs/AUTH_SOLUTION_EXPLAINED.md` - Docs completa
- `TEST_RESULTS.md` - Resultados dos testes estruturais

---

## 🎯 Próximas Fases

Após validar com os scripts:

1. **Testes de Integração**
   - Login real
   - CRUD de recursos
   - Validações

2. **Testes de Autenticação**
   - Criar usuário (POST /admin-users)
   - Login (POST /auth/sign-in)
   - Verificar roles e permissões

3. **Testes de Performance**
   - Latência das APIs
   - Tamanho das respostas
   - Cache de dados

4. **Deploy para Staging**
   - Validar em ambiente staging
   - Testes de carga
   - Pronto para produção

---

## 💡 Dicas

- **Auto-refresh**: O frontend recarrega automaticamente quando você salva um arquivo
- **Console**: Abra DevTools (F12) para ver logs e erros
- **Network**: Verifique aba Network para ver chamadas às APIs
- **Dados**: Use `/admin/tokens` para verificar dados do seed

---

**Versão**: 1.0  
**Data**: 2025-11-09  
**Status**: ✅ Pronto para testes locais

