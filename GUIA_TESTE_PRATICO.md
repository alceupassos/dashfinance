# 🚀 GUIA PRÁTICO - Teste do Frontend com Dados Reais

## ✅ Pré-requisitos

- ✅ Node.js v24.7.0
- ✅ npm 11.5.2
- ✅ `.env.local` configurado com Supabase credentials
- ✅ 7 Edge Functions deployadas no Supabase
- ✅ Banco de dados com dados de teste

---

## 🎯 PASSO 1: Rodar Frontend em Desenvolvimento

```bash
cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-frontend

# Instalar dependências (se não tiver)
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

**Saída esperada:**
```
  ▲ Next.js 14.2.33
  - Local:        http://localhost:3000
  - Environments: .env.local

  ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

**Tempo:** ~30-60 segundos

---

## 🎯 PASSO 2: Fazer Login

1. Abrir no navegador: `http://localhost:3000`
2. Será redirecionado para: `http://localhost:3000/login`

**Credenciais:**
```
Email:    alceu@angrax.com.br
Senha:    DashFinance2024
```

**O que esperar:**
- ✅ Formulário de login carrega
- ✅ Validação de email/senha
- ✅ Redirecionamento para dashboard após sucesso
- ✅ Sem erros no console (F12)

---

## 🎯 PASSO 3: Testar 5 Rotas Críticas com Dados Reais

### ROTA 1: NOC Dashboard (Monitoramento)

**URL:** `http://localhost:3000/admin/security/noc`

**O que testar:**

```
✅ Card 1: API Status
   └─ Verifica: GET /health-check
   └─ Esperado: Número de requests (24h)
   └─ Exemplo: "1,234 requests"

✅ Card 2: Error Rate
   └─ Verifica: Porcentagem de erros
   └─ Esperado: 🟢 < 5% (verde)
   └─ Exemplo: "2.3% error rate"

✅ Card 3: System Health
   └─ Verifica: Status geral
   └─ Esperado: API ✅, DB ✅, Functions ✅
   └─ Status Badge: 🟢 HEALTHY ou 🟡 DEGRADED

✅ Card 4: LLM Usage
   └─ Verifica: Tokens hoje
   └─ Esperado: Número real ou 0 se nenhum uso
   └─ Exemplo: "125,000 tokens"
```

**Teste técnico:**

```bash
# No console do navegador (F12 → Console):
fetch('https://newczbjzzfkwwnpfmygm.supabase.co/functions/v1/health-check', {
  headers: {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN'
  }
}).then(r => r.json()).then(console.log)

# Saída esperada:
{
  "api": true,
  "database": true,
  "functions": { "decrypt-api-key": true, ... },
  "overall": true,
  "timestamp": "2025-11-09T..."
}
```

---

### ROTA 2: Invoices (Billing)

**URL:** `http://localhost:3000/admin/billing/invoices`

**O que testar:**

```
✅ Cabeçalho: "Invoices"
   └─ Descrição: "Gerenciar faturas do Yampi"

✅ Tabela com colunas:
   └─ ID Yampi (primeiras 8 chars)
   └─ CNPJ da empresa
   └─ Valor (USD) - em bold
   └─ Status (Pago/Pendente/Falhou) - com badge colorida
   └─ Período (data início até fim)
   └─ Tokens LLM
   └─ Criado em (data formatada)

✅ Dados da Yampi:
   └─ Se houver faturas: Tabela preenchida
   └─ Se vazio: "Nenhuma fatura encontrada"
```

**Teste técnico:**

```bash
# No console do navegador (F12 → Console):
fetch('https://newczbjzzfkwwnpfmygm.supabase.co/rest/v1/yampi_invoices', {
  headers: {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
    'apikey': 'YOUR_ANON_KEY'
  }
}).then(r => r.json()).then(console.log)

# Saída esperada (array de invoices):
[
  {
    "id": "uuid",
    "yampi_order_id": "order_123",
    "company_cnpj": "12345678000190",
    "total_amount_usd": 150.75,
    "status": "paid",
    "llm_tokens_used": 50000,
    "created_at": "2025-11-09T10:00:00Z"
  }
]
```

---

### ROTA 3: Analytics - Usage Detail (Gráficos)

**URL:** `http://localhost:3000/admin/analytics/usage-detail`

**O que testar:**

```
✅ KPIs no topo (4 cards):
   └─ Total de Tokens (últimos 30d)
   └─ Custo Total (USD)
   └─ Requisições (total)
   └─ Custo por Token (por 1M tokens)

✅ Gráfico 1: Uso de Tokens por Dia
   └─ Tipo: Line chart
   └─ X-axis: Data (formato: DD/MM)
   └─ Y-axis: Tokens (número)
   └─ Linha 1: Tokens (azul #8884d8)
   └─ Linha 2: Custo USD (verde #82ca9d)

✅ Gráfico 2: Requisições por Dia
   └─ Tipo: Bar chart
   └─ X-axis: Data
   └─ Y-axis: Número de requisições
   └─ Barras: Azul (#8884d8)
```

**Teste técnico:**

```bash
# No console do navegador (F12 → Console):
fetch('https://newczbjzzfkwwnpfmygm.supabase.co/functions/v1/get-monitoring-metrics', {
  headers: {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN'
  }
}).then(r => r.json()).then(d => console.log(d.metrics.llm))

# Saída esperada:
{
  "total_tokens_24h": 250000,
  "total_cost_24h_usd": 75.50,
  "provider_breakdown": {
    "anthropic": 45.00,
    "openai": 30.50
  }
}
```

---

### ROTA 4: RAG Search (Busca Semântica)

**URL:** `http://localhost:3000/admin/rag/search`

**O que testar:**

```
✅ Input de busca:
   └─ Placeholder: "Buscar por palavra-chave..."
   └─ Botão: "Buscar"

✅ Teste 1: Buscar por "saldo"
   └─ Clicar no input
   └─ Digitar: "saldo"
   └─ Clicar "Buscar"
   └─ Esperado: Resultados em < 2 segundos

✅ Resultados (cada item):
   └─ Telefone + CNPJ
   └─ Texto da mensagem
   └─ Badge "XX% similar" (0-100%)
   └─ Tags com tópicos (ex: "saldo", "conta")
   └─ Timestamp formatado (PT-BR)

✅ Teste 2: Buscar por "pagamento"
   └─ Resultado com similaridade e tópicos
   └─ Badge verde ou amarela conforme score

✅ Teste 3: Buscar por "xyz123"
   └─ Esperado: "Nenhum resultado encontrado"
```

**Teste técnico:**

```bash
# No console do navegador (F12 → Console):
fetch('https://newczbjzzfkwwnpfmygm.supabase.co/rest/v1/rag_conversations?message_text=ilike.%25saldo%25&limit=5', {
  headers: {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
    'apikey': 'YOUR_ANON_KEY'
  }
}).then(r => r.json()).then(console.log)

# Saída esperada:
[
  {
    "id": "uuid",
    "message_text": "Qual o saldo da minha conta?",
    "sentiment_score": 0.2,
    "topics": ["saldo", "conta"],
    "created_at": "2025-11-09T10:00:00Z"
  }
]
```

---

### ROTA 5: N8N Workflows (Automação)

**URL:** `http://localhost:3000/admin/n8n/workflows`

**O que testar:**

```
✅ Cabeçalho: "N8N Workflows"
   └─ Descrição: "Gerenciar workflows de automação"

✅ Tabela com workflows:
   └─ Nome do workflow
   └─ Status (Ativo/Inativo)
   └─ Última execução (timestamp)
   └─ Próxima execução programada
   └─ Botão: Editar/Testar

✅ Workflow 1:
   └─ Nome: "WhatsApp → Sentiment → RAG Pipeline"
   └─ Status: Active
   └─ Trigger: Webhook (sob demanda)

✅ Workflow 2:
   └─ Nome: "Cobrança Automática Diária"
   └─ Status: Active (se N8N estiver configurado)
   └─ Trigger: Cron (18:00 UTC)

✅ Workflow 3:
   └─ Nome: "Relatório Diário de Sistema"
   └─ Status: Active (se N8N estiver configurado)
   └─ Trigger: Cron (09:00 UTC)
```

**Nota:** Se N8N não estiver rodando localmente, a página mostrará:
```
"Conectando ao N8N em http://localhost:5678..."
ou
"N8N não está disponível. Configure em admin/config"
```

---

## 📊 Verificação de Dados Reais

### Checklist de Validação

```
SEGURANÇA (NOC):
  ☐ Health check carrega em < 1s
  ☐ Status API: true/false
  ☐ Status Database: true/false
  ☐ Pelo menos 1 function status
  ☐ Overall status correto

BILLING (Invoices):
  ☐ Tabela carrega em < 2s
  ☐ Se houver dados: mínimo 1 linha
  ☐ CNPJ formatado corretamente
  ☐ Valores USD com 2 casas decimais
  ☐ Status com badge colorida

ANALYTICS (Usage):
  ☐ KPIs carregam
  ☐ Gráfico de linha renderiza
  ☐ Gráfico de barras renderiza
  ☐ Dados dos últimos 30 dias
  ☐ Tooltips funcionam ao passar mouse

RAG (Search):
  ☐ Input funciona
  ☐ Busca retorna resultados em < 2s
  ☐ Badges de similaridade aparecem
  ☐ Tópicos como tags aparecem
  ☐ Timestamps formatados em PT-BR

N8N (Workflows):
  ☐ Página carrega
  ☐ Lista workflows (se N8N conectado)
  ☐ Status de cada workflow
  ☐ Botões de ação funcionam
```

---

## 🔍 Troubleshooting

### Problema: "404 Not Found" em /admin/billing/invoices

**Solução:**
```bash
# Verificar se arquivo existe
ls -la finance-oraculo-frontend/app/\(app\)/admin/billing/invoices/page.tsx

# Se não existir, criar:
mkdir -p finance-oraculo-frontend/app/\(app\)/admin/billing/invoices
touch finance-oraculo-frontend/app/\(app\)/admin/billing/invoices/page.tsx
```

### Problema: "Credenciais inválidas" no login

**Solução:**
```bash
# Verificar .env.local existe
cat finance-oraculo-frontend/.env.local | grep NEXT_PUBLIC

# Se vazio, reconfigure com:
# NEXT_PUBLIC_SUPABASE_URL=https://newczbjzzfkwwnpfmygm.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

### Problema: Console mostra "Failed to load resource: 404"

**Verificar:**
```javascript
// F12 → Console:
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// Devem mostrar URLs, não undefined
```

### Problema: Gráficos não aparecem

**Solução:**
```bash
# Verificar se recharts está instalado
npm ls recharts

# Se não estiver:
npm install recharts
```

### Problema: "CORS error" no console

**Verificar:**
```javascript
// F12 → Network → vê a requisição bloqueada
// Problema: Supabase CORS precisa configurar origin

// Solução: Contatar Supabase ou configurar em:
// Dashboard → Settings → API → CORS
```

---

## 📈 Performance Esperada

| Rota | Carregamento | Interação | Gráficos |
|------|-------------|-----------|----------|
| /admin/security/noc | < 1s | Instant | N/A |
| /admin/billing/invoices | < 2s | Instant | N/A |
| /admin/analytics/usage-detail | < 3s | < 500ms | < 1s render |
| /admin/rag/search | < 1s | < 2s | N/A |
| /admin/n8n/workflows | < 2s | Instant | N/A |

---

## 🎯 Próximas Ações Após Teste

### Se Tudo OK ✅
```
1. ✅ Validar dados com cliente
2. ✅ Preparar N8N para deploy
3. ✅ Configurar triggers
4. ✅ Testar automações
```

### Se Houver Erros ❌
```
1. ❌ Verificar console (F12)
2. ❌ Verificar logs Supabase
3. ❌ Verificar Edge Functions
4. ❌ Verificar RLS policies
```

---

## 📞 Debug Avançado

### Ver todos os requests do Supabase

```javascript
// F12 → Console:
localStorage.setItem('supabase.debug', 'true')

// Recarregar página
location.reload()

// Logs aparecerão no console
```

### Ver tokens de autenticação

```javascript
// F12 → Console:
const { data: { session } } = await supabase.auth.getSession()
console.log(session?.access_token)
```

### Testar Edge Function diretamente

```bash
curl -X GET https://newczbjzzfkwwnpfmygm.supabase.co/functions/v1/health-check \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

---

## ✨ Conclusão

Se todos os testes passarem, você terá:

```
✅ Frontend 100% operacional
✅ Autenticação funcionando
✅ Dados reais carregando
✅ Integrações Supabase OK
✅ Sistema pronto para N8N
✅ Monitoramento ativo
```

**Desenvolvido por:** Angra.io by Alceu Passos  
**Data:** 09/11/2025  
**Versão:** 4.0

