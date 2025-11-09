# 🔐 Como Resolver Autenticação do Supabase

## ❌ Problema Atual

A autenticação do Supabase não está funcionando porque:
1. **`.env.local` não existe** ou está incompleto
2. **Variáveis de ambiente** não estão configuradas corretamente
3. **Cliente Supabase** não consegue se conectar ao backend

---

## ✅ SOLUÇÃO COMPLETA (3 Passos)

### PASSO 1: Criar o arquivo `.env.local`

```bash
cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-frontend

# Criar o arquivo
cat > .env.local << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://newczbjzzfkwwnpfmygm.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ld2N6Ymp6emZrd3ducGZteWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAzMDYzODUsImV4cCI6MjA0NTg4MjM4NX0.pK7gjVEPQ2QVAhH2QZuHLBx31SN7OQe1VFrVGaHr8So

# CORS Origins
NEXT_PUBLIC_CORS_ORIGINS=http://localhost:3000,http://localhost:3001
EOF
```

### PASSO 2: Verificar se o Supabase está instalado

```bash
cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-frontend

# Instalar dependências se necessário
npm install
```

### PASSO 3: Testar a autenticação

```bash
cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-frontend

# Iniciar servidor
npm run dev
```

Acesse: **http://localhost:3000/login**

Use estas credenciais:
```
Email:    admin@grupovosler.com.br
Senha:    admin123456
```

---

## 🔍 Verificar se Está Funcionando

### Teste 1: Variáveis de ambiente carregando

```bash
cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-frontend
npm run dev
```

No terminal, você deve ver:
```
✓ Ready in 2.5s
○ Compiling / ...
✓ Compiled / in 1.2s
```

**Sem** erros de:
- ❌ "Missing Supabase environment variables"
- ❌ "Module not found: @supabase/supabase-js"

### Teste 2: Login funcionando

1. Abra: http://localhost:3000/login
2. Digite email e senha
3. Clique em "Entrar"
4. Deve redirecionar para: http://localhost:3000/dashboard

### Teste 3: Console do navegador (F12)

Abra o **Console** do navegador e veja se **NÃO** aparece:
- ❌ "supabaseUrl is required"
- ❌ "supabaseKey is required"
- ❌ "Failed to fetch"

---

## 🚨 Troubleshooting

### Erro 1: "Missing Supabase environment variables"

**Causa:** O arquivo `.env.local` não existe ou está vazio.

**Solução:**
```bash
cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-frontend
ls -la .env.local
```

Se não existir, volte ao PASSO 1.

---

### Erro 2: "Module not found: @supabase/supabase-js"

**Causa:** Dependência não instalada.

**Solução:**
```bash
cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-frontend
npm install @supabase/supabase-js --save
npm run dev
```

---

### Erro 3: "Invalid login credentials"

**Causa:** Usuário não existe no banco Supabase.

**Solução:** Criar usuário admin:

1. Acesse: https://supabase.com/dashboard/project/newczbjzzfkwwnpfmygm/auth/users
2. Clique em **"Add User"**
3. Preencha:
   ```
   Email:    admin@grupovosler.com.br
   Password: admin123456
   ```
4. Clique em **"Create User"**
5. Tente fazer login novamente

---

### Erro 4: "Failed to fetch" ou "Network Error"

**Causa:** Supabase não está respondendo ou URL incorreta.

**Solução:**

1. Verifique se a URL está correta:
   ```bash
   grep SUPABASE_URL /Users/alceualvespasssosmac/dashfinance/finance-oraculo-frontend/.env.local
   ```

   Deve retornar:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://newczbjzzfkwwnpfmygm.supabase.co
   ```

2. Teste a URL do Supabase no navegador:
   ```
   https://newczbjzzfkwwnpfmygm.supabase.co
   ```

   Deve retornar:
   ```json
   {"message": "Ok"}
   ```

---

### Erro 5: "CORS policy" no console do navegador

**Causa:** Supabase bloqueando requisições do localhost.

**Solução:**

1. Acesse: https://supabase.com/dashboard/project/newczbjzzfkwwnpfmygm/settings/api
2. Vá em **"CORS Origins"**
3. Adicione:
   ```
   http://localhost:3000
   http://localhost:3001
   ```
4. Salve e teste novamente

---

## 📋 Checklist Final

Quando tudo estiver funcionando, você deve ter:

- [x] **.env.local** criado em `finance-oraculo-frontend/`
- [x] **npm run dev** sem erros
- [x] **http://localhost:3000/login** carrega
- [x] **Login com admin@grupovosler.com.br** funciona
- [x] **Dashboard** carrega após login
- [x] **Console do navegador (F12)** sem erros de Supabase

---

## 🎯 Próximos Passos

Depois que a autenticação estiver funcionando:

1. ✅ Testar as 5 telas principais
2. ✅ Verificar se o usuário está logado (ver nome no canto superior direito)
3. ✅ Testar logout (clicar no avatar → Sair)
4. ✅ Testar refresh da página (deve continuar logado)

---

**Status:** ⏳ Aguardando execução  
**Tempo estimado:** 5-10 minutos  
**Desenvolvido por:** Angra.io by Alceu Passos

