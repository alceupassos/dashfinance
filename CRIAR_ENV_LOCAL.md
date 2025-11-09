# 🔧 CONFIGURAR .env.local DO FRONTEND

## ⚠️ IMPORTANTE

O arquivo `.env.local` está no `.gitignore` por segurança. Você precisa criar manualmente.

---

## 📋 PASSOS

### 1. Abra o Terminal

```bash
cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-frontend
```

### 2. Crie o Arquivo .env.local

```bash
cat > .env.local << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://newczbjzzfkwwnpfmygm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ld2N6Ymp6emZrd3ducGZteWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NDE1NTAsImV4cCI6MjA3NzUxNzU1MH0.BvV6F8jlYZ3M9X4kL2pQ7R9sT1uW5vZ8aB3cD6eF7gH

# Optional - Service Role Key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ld2N6Ymp6emZrd3ducGZteWdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk0MTU1MCwiZXhwIjoyMDc3NTE3NTUwfQ.LxDfg_OPvWS_Yc7Z-H1M3K6pJqLWvPzXc8K_JvWXz0U

# Optional - For local development
NEXT_PUBLIC_FUNCTIONS_URL=https://newczbjzzfkwwnpfmygm.functions.supabase.co
EOF
```

### 3. Verifique se foi criado

```bash
cat .env.local
```

Deve aparecer algo assim:

```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://newczbjzzfkwwnpfmygm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
...
```

---

## ✅ PRONTO!

Agora o frontend pode:
1. Conectar ao Supabase
2. Fazer login com `alceu@angrax.com.br / ALceu322ie#`
3. Carregar dados dos 17 clientes
4. Tudo deve funcionar! 🚀

---

## 🚀 PRÓXIMO PASSO

### 4. Rodar o Frontend

```bash
npm run dev
```

Isso vai iniciar em `http://localhost:3000`

### 5. Fazer Login

- Email: `alceu@angrax.com.br`
- Senha: `ALceu322ie#`

---

## 🆘 SE AINDA DER ERRO

Se der erro, pode ser:
1. Node modules não instalados → `npm install`
2. Porta 3000 ocupada → `npm run dev -- -p 3001`
3. Cache do navegador → CTRL+SHIFT+DEL e limpar cache

---

## 📝 CREDENCIAIS

```
Projeto Supabase: newczbjzzfkwwnpfmygm

Admin Login:
  Email: alceu@angrax.com.br
  Senha: ALceu322ie#

WhatsApp Test:
  Número: 5511967377373
  Token: VOLPE1
```

