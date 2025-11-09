# 🔧 SOLUÇÃO: Erro de @supabase/supabase-js

## ❌ Erro Encontrado

```
Build Error
Failed to compile
Module not found: Can't resolve '@supabase/supabase-js'
```

---

## ✅ SOLUÇÃO RÁPIDA (3 passos)

### PASSO 1: Abra terminal local

```bash
cd /Users/alceualvespasssosmac/dashfinance
```

### PASSO 2: Execute o script de fix

```bash
chmod +x FIX_INSTALACAO.sh
./FIX_INSTALACAO.sh
```

**Isso vai:**
- ✅ Limpar `node_modules` antigo
- ✅ Instalar TODAS as dependências
- ✅ Instalar `@supabase/supabase-js`
- ✅ Instalar `recharts` (para gráficos)

### PASSO 3: Rodar o servidor

```bash
cd finance-oraculo-frontend
npm run dev
```

---

## 🔍 O que aconteceu

O arquivo `lib/supabase.ts` importa:
```typescript
import { createClient } from '@supabase/supabase-js'
```

Mas o pacote **não estava instalado** em `node_modules`.

---

## 📋 Checklist

Depois que FIX_INSTALACAO.sh terminar:

- [ ] `node_modules/@supabase/supabase-js` existe
- [ ] `npm run build` não dá erro
- [ ] `npm run dev` inicia sem erros
- [ ] http://localhost:3000 carrega

---

## 🚨 Se ainda der erro

### Opção 1: Limpar cache do npm

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Opção 2: Verificar se @supabase está instalado

```bash
npm ls @supabase/supabase-js
```

Saída esperada:
```
finance-oraculo-frontend@0.1.0
└── @supabase/supabase-js@2.x.x
```

### Opção 3: Reinstalar apenas o Supabase

```bash
npm uninstall @supabase/supabase-js
npm install @supabase/supabase-js --save
```

---

## 🎯 Próximo Passo

Quando o servidor iniciar sem erros:

```
✅ npm run dev
✅ http://localhost:3000/login
✅ Testar as 5 telas
```

---

**Desenvolvido por:** Angra.io by Alceu Passos

