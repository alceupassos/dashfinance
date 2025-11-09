# 🚀 Quick Start - Frontend Implementation

**Para o próximo desenvolvedor que vai trabalhar no frontend:**

---

## 📍 Você Está Aqui

```
✅ Backend 100% completo
✅ Database ready
✅ Edge Functions ready
✅ 13 testes passando
⏳ Frontend: 18 telas aguardando implementação
```

---

## 🎯 Ordem de Implementação Recomendada

### Semana 1: Segurança & Integrations (2 telas)
```bash
# Dias 1-2: NOC Dashboard
frontend/app/(app)/admin/security/noc/page.tsx

# Dias 3-4: Integrations Manager  
frontend/app/(app)/admin/config/integrations/page.tsx

# Componentes necessários:
frontend/components/metrics-card.tsx
frontend/components/status-badge.tsx
```

### Semana 2: Billing (6 telas)
```bash
# Dias 5-6
frontend/app/(app)/admin/billing/plans/page.tsx
frontend/app/(app)/admin/billing/subscriptions/page.tsx

# Dias 7-8
frontend/app/(app)/admin/billing/pricing/page.tsx
frontend/app/(app)/admin/billing/yampi-config/page.tsx

# Dias 9-10
frontend/app/(app)/admin/billing/invoices/page.tsx
frontend/app/(app)/billing/my-usage/page.tsx
```

### Semana 3: Analytics (4 telas)
```bash
# Dias 11-12
frontend/app/(app)/admin/analytics/user-usage/page.tsx
frontend/app/(app)/admin/analytics/usage-detail/[userId]/page.tsx

# Dias 13-14
frontend/app/(app)/admin/analytics/mood-index/page.tsx
frontend/app/(app)/admin/analytics/mood-index-timeline/[phone]/page.tsx

# Componentes:
frontend/components/timeline-chart.tsx
frontend/components/mood-indicator.tsx
```

### Semana 3 (cont): LLM & RAG (5 telas)
```bash
# Dias 15-16
frontend/app/(app)/admin/llm/costs-per-client/page.tsx
frontend/app/(app)/admin/llm/keys-per-client/page.tsx

# Dia 17
frontend/app/(app)/admin/llm/optimizer/page.tsx

# Dias 18-19
frontend/app/(app)/admin/rag/search/page.tsx
frontend/app/(app)/admin/rag/context/[clientCnpj]/page.tsx

# Componentes:
frontend/components/integration-form.tsx
frontend/components/rag-search-box.tsx
frontend/components/encryption-display.tsx
```

---

## 📚 Documentação Completa

```
📄 TAREFAS_FRONTEND_FINAL.md
   → Guia completo com:
   • Layout esperado para cada tela
   • API endpoints
   • Componentes necessários
   • Tipos TypeScript
   • Exemplos de dados

📄 DEPLOY_CONCLUIDO.md
   → Backend status e migrations

📄 RESUMO_EXECUTIVO_DEPLOY.md
   → Overview executivo
```

---

## 🔗 API Endpoints Disponíveis

### Segurança
```
GET  /functions/v1/get-live-metrics
GET  /functions/v1/get-security-dashboard
```

### Billing
```
GET  /rest/v1/service_plans
POST /rest/v1/service_plans
PUT  /rest/v1/service_plans/{id}

GET  /rest/v1/client_subscriptions
PUT  /rest/v1/client_subscriptions/{id}

GET  /rest/v1/yampi_invoices
```

### Analytics
```
GET  /rest/v1/user_usage_tracking
GET  /rest/v1/whatsapp_mood_index_daily
POST /functions/v1/get-usage-analytics
```

### LLM
```
GET  /rest/v1/v_llm_costs_per_client
POST /functions/v1/manage-client-llm-keys
```

### RAG
```
POST /functions/v1/search-rag
GET  /rest/v1/rag_context_summary
```

### Integrations
```
GET  /rest/v1/integration_configs
POST /functions/v1/manage-integration-config
```

---

## 💾 Database Schema (Pronto)

### Tables
```sql
-- Já criadas:
service_plans
client_subscriptions
yampi_invoices
yampi_invoice_items
llm_api_keys_per_client
integration_configs
integration_config_history
user_usage_tracking
llm_token_usage
whatsapp_conversations
whatsapp_sentiment_analysis
whatsapp_mood_index_daily
rag_conversations
rag_context_summary
whatsapp_processing_logs
whatsapp_conversation_state
```

### Views
```sql
v_llm_costs_per_client
v_whatsapp_processing_status
```

---

## 🛠️ Setup Inicial

```bash
# 1. Clone/Pull
git pull origin main

# 2. Instale deps
cd finance-oraculo-frontend
npm install

# 3. Verificar .env.local
# Deve ter:
# NEXT_PUBLIC_SUPABASE_URL=https://newczbjzzfkwwnpfmygm.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL=...

# 4. Rodar dev
npm run dev

# 5. Acessar
# http://localhost:3000
```

---

## 📦 Dependências Necessárias

```json
{
  "recharts": "^2.10.0",
  "date-fns": "^2.30.0",
  "lucide-react": "^0.263.0",
  "tailwindcss": "^3.3.0",
  "@supabase/supabase-js": "^2.38.0",
  "zustand": "^4.4.0"
}
```

---

## 🎨 Design System

### Cores
```
Primary: #3B82F6 (Blue)
Success: #10B981 (Green)  
Warning: #F59E0B (Yellow)
Error: #EF4444 (Red)
Neutral: #6B7280 (Gray)
```

### Status Badges
```
🟢 Active/Healthy
🟡 Warning/Pending
🔴 Error/Inactive
⚪ Neutral/Unknown
```

### Sentiment Colors
```
🔴 Very Negative: #DC2626
🟠 Negative: #F97316
🟡 Neutral: #EAB308
🟢 Positive: #84CC16
🟢 Very Positive: #22C55E
```

---

## 🧩 Componentes Reutilizáveis

### `metrics-card.tsx`
```tsx
<MetricsCard
  title="API Health"
  value="99.98%"
  status="healthy"
  trend="+0.5%"
/>
```

### `status-badge.tsx`
```tsx
<StatusBadge status="active" label="Active" />
<StatusBadge status="error" label="Failed" />
```

### `integration-form.tsx`
```tsx
<IntegrationForm
  integration="Yampi"
  onSubmit={handleSave}
/>
```

### `timeline-chart.tsx`
```tsx
<TimelineChart
  data={moodData}
  height={300}
/>
```

### `mood-indicator.tsx`
```tsx
<MoodIndicator score={0.75} />
```

---

## 🧪 Testando

```bash
# Testar auth
npm run test:auth

# Testar segurança
npm run security:all

# Testar build
npm run build

# Ver lint
npm run lint

# Preview
npm run preview
```

---

## 📱 Exemplo de Tela Simples

```tsx
// app/(app)/admin/billing/plans/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MetricsCard, StatusBadge } from '@/components'

interface ServicePlan {
  id: string
  plan_name: string
  base_price_usd: number
  included_tokens: number
}

export default function PlansPage() {
  const [plans, setPlans] = useState<ServicePlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from('service_plans')
        .select('*')
        .order('base_price_usd')

      if (!error) setPlans(data || [])
      setLoading(false)
    }

    fetchPlans()
  }, [])

  if (loading) return <div>Carregando...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Planos de Serviço</h1>
      
      <div className="grid grid-cols-3 gap-4">
        {plans.map((plan) => (
          <MetricsCard
            key={plan.id}
            title={plan.plan_name}
            value={`$${plan.base_price_usd}`}
            status="active"
          />
        ))}
      </div>
    </div>
  )
}
```

---

## 🔐 Handling Encrypted Data

```tsx
// Components/encryption-display.tsx
export function EncryptedDisplay({ value }: { value: string }) {
  const [show, setShow] = useState(false)
  
  return (
    <div className="flex items-center gap-2">
      <code className="font-mono text-sm">
        {show ? value : value.slice(0, 6) + '●●●●●●●●'}
      </code>
      <button onClick={() => setShow(!show)}>
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}
```

---

## 📊 Charts Example (Recharts)

```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'

export function MoodChart({ data }) {
  return (
    <LineChart width={600} height={300} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis />
      <Line 
        type="monotone" 
        dataKey="sentiment" 
        stroke="#3B82F6" 
      />
    </LineChart>
  )
}
```

---

## 🚨 Common Pitfalls

❌ Não fazer:
- Usar SERVICE_ROLE_KEY no frontend
- Armazenar API keys em plain text
- Fazer queries sem RLS checks
- Sem tratamento de erro
- Sem loading states

✅ Fazer:
- Usar apenas ANON_KEY
- Criptografar tudo no backend
- Confiar em RLS policies
- Try/catch em tudo
- Sempre ter loading e error states

---

## 📞 Referências Rápidas

```bash
# Supabase CLI
supabase functions deploy [function-name]
supabase db pull
supabase db push
supabase secrets list

# Next.js
npm run dev        # Dev server
npm run build      # Build
npm run start      # Production
npm run lint       # Lint check

# Git
git add .
git commit -m "message"
git push origin main
```

---

## ✅ Checklist Antes de Cada Commit

- [ ] Testes passam: `npm run test:auth`
- [ ] Lint limpo: `npm run lint`
- [ ] Build funciona: `npm run build`
- [ ] Sem console.log em produção
- [ ] Types exportados corretamente
- [ ] Mensagem de commit clara
- [ ] Push para main

---

## 🎯 Meta Final

```
Completar as 18 telas em 10-14 dias
Resultado: Sistema 100% pronto para produção
Status final: 🟢 LIVE
```

---

## 📝 Dúvidas Frequentes

**P: Onde encontro os dados de teste?**
A: `TAREFAS_FRONTEND_FINAL.md` tem exemplos de dados para cada tela

**P: Como testar sem backend?**
A: Use mock data com Supabase local: `supabase start`

**P: Posso modificar as tabelas do backend?**
A: Não! Tudo já está pronto. Se precisar, crie uma nova migration

**P: Como adicionar nova integração?**
A: Adicionar em `integration_configs` table via `/admin/config/integrations`

---

## 🏁 Próximo Desenvolvedor

Bem-vindo! Você tem:
- ✅ Backend 100% pronto
- ✅ Database schema completo
- ✅ 13 testes passando
- ✅ Documentação detalhada
- ✅ 18 telas especificadas

**Tempo estimado: 10-14 dias**

**Boa sorte! 🚀**

---

*Desenvolvido por: Angra.io by Alceu Passos*
*Versão Histórica: Lançamento de SaaS 100% no ar em 1 semana*
*Última atualização: 09/11/2025*

