# Relatório: Correção de Edge Functions

**Data:** 2025-11-09  
**Status:** ✅ **CONCLUÍDO**

---

## Resumo Executivo

Todas as Edge Functions foram corrigidas para resolver erros de schema que causavam retorno de 404. As principais correções incluíram:

1. **Criação de tabelas de grupos** (`group_aliases`, `group_alias_members`)
2. **Correção de nomes de tabelas** (grupos → group_aliases)
3. **Remoção de dependências de tabelas inexistentes**
4. **Ajuste de nomes de campos** para match com schema real

---

## Fase 1: Criação de Tabelas

### Tabelas Criadas

#### 1. `group_aliases`
```sql
CREATE TABLE group_aliases (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  color TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 2. `group_alias_members`
```sql
CREATE TABLE group_alias_members (
  id TEXT PRIMARY KEY,
  alias_id TEXT REFERENCES group_aliases(id) ON DELETE CASCADE,
  company_cnpj TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Dados Populados

✅ **5 grupos criados:**
- Grupo Volpe (5 empresas)
- Health Plast (2 empresas)
- Grupo Acqua (2 empresas)
- Grupo AAS (2 empresas)
- Grupo Dex (2 empresas)

✅ **Total: 13 empresas vinculadas a grupos**

---

## Fase 2: Correções nas Edge Functions

### 1. onboarding-tokens ✅
**Arquivo:** `supabase/functions/onboarding-tokens/index.ts`

**Erros corrigidos:**
- ❌ JOIN com tabela inexistente `empresa`
- ❌ Campo `criado_em` (correto: `created_at`)

**Mudanças:**
```typescript
// ANTES:
.select('*, empresa:empresa_id(id, nome_fantasia)')
.order('criado_em', { ascending: false })

// DEPOIS:
.select('*')
.order('created_at', { ascending: false })
```

---

### 2. empresas-list ✅
**Arquivo:** `supabase/functions/empresas-list/index.ts`

**Erros corrigidos:**
- ❌ Consulta tabela inexistente `grupos`
- ❌ Consulta tabelas inexistentes `contas_receber`, `daily_snapshots`

**Mudanças:**
- Substituiu consulta a `grupos` por busca em `integration_f360` + `integration_omie`
- Removeu consultas a tabelas inexistentes
- Simplificou enriquecimento para usar apenas dados disponíveis

**Novo comportamento:**
```typescript
// Busca empresas de F360 e OMIE
const f360Empresas = await supabase.from('integration_f360').select(...)
const omieEmpresas = await supabase.from('integration_omie').select(...)

// Combina e enriquece com DRE + WhatsApp
const empresasEnriquecidas = await Promise.all(
  empresas.map(async (empresa) => {
    // Busca receita do mês
    const dreEntries = await supabase.from('dre_entries')...
    // Verifica WhatsApp ativo
    const whatsappToken = await supabase.from('onboarding_tokens')...
    return { ...empresa, receita_mes, whatsapp_ativo }
  })
)
```

---

### 3. relatorios-dre ✅
**Arquivo:** `supabase/functions/relatorios-dre/index.ts`

**Erros corrigidos:**
- ❌ Consulta tabela inexistente `grupos`
- ❌ Aceitava `empresa_id` (não existe mais)

**Mudanças:**
```typescript
// ANTES:
const empresaId = url.searchParams.get('empresa_id');
const cnpj = url.searchParams.get('cnpj');
if (!empresaId && !cnpj) { error }
// Buscar empresa em 'grupos'

// DEPOIS:
const cnpj = url.searchParams.get('cnpj') || url.searchParams.get('company_cnpj');
if (!cnpj) { error }
const companyCnpj = cnpj;
```

---

### 4. relatorios-cashflow ✅
**Arquivo:** `supabase/functions/relatorios-cashflow/index.ts`

**Erros corrigidos:**
- ❌ Consulta tabelas inexistentes: `grupos`, `daily_snapshots`, `contas_pagar`, `contas_receber`

**Mudanças:**
- Removeu lookup de empresa em `grupos`
- Calcula saldo inicial a partir de `cashflow_entries` anteriores
- Removeu previsão 7 dias (dependia de contas a pagar/receber)

**Novo cálculo de saldo:**
```typescript
// Calcular saldo inicial baseado em cashflow entries anteriores
const { data: entriesAnteriores } = await supabase
  .from('cashflow_entries')
  .select('kind, amount')
  .eq('company_cnpj', companyCnpj)
  .lt('date', `${periodo}-01`);

const saldoInicial = (entriesAnteriores || []).reduce((acc, e) => {
  return acc + (e.kind === 'in' ? e.amount : -e.amount);
}, 0);
```

---

### 5. relatorios-kpis ✅
**Arquivo:** `supabase/functions/relatorios-kpis/index.ts`

**Erros corrigidos:**
- ❌ Consulta tabela inexistente `financial_kpi_monthly`

**Mudanças:**
- Calcula KPIs dinamicamente a partir de `dre_entries`
- Agrupa por mês e calcula métricas derivadas

**Novo cálculo:**
```typescript
// Buscar DRE entries dos últimos N meses
const dreEntries = await supabase
  .from('dre_entries')
  .select('date, nature, amount')
  .eq('company_cnpj', companyCnpj)
  .gte('date', dataInicioStr);

// Agrupar por mês
const kpisPorMes = new Map();
dreEntries.forEach(entry => {
  const month = entry.date.slice(0, 7);
  // Acumular receita, custos, despesas, outras
});

// Calcular métricas derivadas
const entries = Array.from(kpisPorMes.values()).map(kpi => ({
  month: kpi.month,
  receita: kpi.receita,
  custos: kpi.custos,
  ebitda: kpi.receita - kpi.custos - kpi.despesas,
  margem_bruta: kpi.receita !== 0 ? (kpi.receita - kpi.custos) / kpi.receita : 0,
  margem_liquida: kpi.receita !== 0 ? ebitda / kpi.receita : 0,
  lucro_bruto: kpi.receita - kpi.custos,
}));
```

---

### 6. whatsapp-conversations ✅
**Arquivo:** `supabase/functions/whatsapp-conversations/index.ts`

**Erros corrigidos:**
- ❌ Campo inexistente `ultimaMensagemEm`
- ❌ Campo `empresa_cnpj` (correto: `company_cnpj`)

**Mudanças:**
```typescript
// ANTES:
.order("ultimaMensagemEm", { ascending: false })
.eq("empresa_cnpj", empresaCnpj)

// DEPOIS:
.order("updated_at", { ascending: false })
.eq("company_cnpj", empresaCnpj)
```

---

### 7. group-aliases-create ✅
**Arquivo:** `supabase/functions/group-aliases-create/index.ts`

**Erros corrigidos:**
- ❌ JOIN com tabela inexistente `clientes`

**Mudanças:**
- Removeu JOIN com `clientes`
- Busca dados de `integration_f360` e `integration_omie` separadamente por CNPJ
- Enriquece cada membro com dados de integrações

**Novo enriquecimento:**
```typescript
const membersFormatted = await Promise.all(
  membersData.map(async (m) => {
    // Buscar em F360
    const { data: f360 } = await supabase
      .from("integration_f360")
      .select("cliente_nome")
      .eq("cnpj", m.company_cnpj)
      .maybeSingle();

    // Buscar em OMIE
    const { data: omie } = await supabase
      .from("integration_omie")
      .select("cliente_nome")
      .eq("cnpj", m.company_cnpj)
      .maybeSingle();

    // Verificar WhatsApp
    const { data: whatsapp } = await supabase
      .from("onboarding_tokens")
      .select("id")
      .eq("company_cnpj", m.company_cnpj)
      .eq("status", "activated")
      .maybeSingle();

    return {
      id: m.id,
      alias_id: grupo.id,
      company_cnpj: m.company_cnpj,
      company_name: f360?.cliente_nome || omie?.cliente_nome || "Unknown",
      position: m.position,
      integracao_f360: !!f360,
      integracao_omie: !!omie,
      whatsapp_ativo: !!whatsapp,
    };
  })
);
```

---

## Próximos Passos

### 1. Redeploy das Funções ⏳

Execute o script criado:

```bash
cd /Users/alceualvespasssosmac/dashfinance
chmod +x REDEPLOY_ALL_FIXED_FUNCTIONS.sh
./REDEPLOY_ALL_FIXED_FUNCTIONS.sh
```

### 2. Testes ⏳

Após o redeploy, teste cada função:

```bash
# Teste empresas-list
curl -X GET \
  "https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/empresas-list" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json"

# Teste relatorios-dre
curl -X GET \
  "https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/relatorios-dre?cnpj=12345678000190&periodo=2025-01" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json"

# Teste relatorios-kpis
curl -X GET \
  "https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/relatorios-kpis?company_cnpj=12345678000190" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json"

# Teste whatsapp-conversations
curl -X GET \
  "https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/whatsapp-conversations" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json"
```

### 3. Validação Frontend ⏳

Teste os painéis:
- http://localhost:3000/empresas (deve listar 24 empresas)
- http://localhost:3000/grupos (deve listar 5 grupos)
- http://localhost:3000/relatorios/dre (deve mostrar DRE)
- http://localhost:3000/relatorios/cashflow (deve mostrar cashflow)
- http://localhost:3000/relatorios/kpis (deve calcular KPIs)
- http://localhost:3000/whatsapp/conversations (deve listar conversas)

---

## Resumo das Correções

| Função | Erro Principal | Status |
|--------|---------------|--------|
| onboarding-tokens | JOIN com tabela inexistente | ✅ Corrigido |
| empresas-list | Tabela `grupos` inexistente | ✅ Corrigido |
| relatorios-dre | Tabela `grupos` inexistente | ✅ Corrigido |
| relatorios-cashflow | Múltiplas tabelas inexistentes | ✅ Corrigido |
| relatorios-kpis | Tabela `financial_kpi_monthly` inexistente | ✅ Corrigido |
| whatsapp-conversations | Campos com nomes incorretos | ✅ Corrigido |
| group-aliases-create | JOIN com tabela inexistente | ✅ Corrigido |

---

## Tabelas Criadas

| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| group_aliases | 5 | Grupos empresariais |
| group_alias_members | 13 | Empresas vinculadas a grupos |

---

## Dados Disponíveis (Confirmados)

| Tabela | Registros |
|--------|-----------|
| integration_f360 | 17 |
| integration_omie | 7 |
| dre_entries | 299 |
| cashflow_entries | 284 |
| whatsapp_conversations | 85 |
| financial_alerts | 51 |
| user_companies | 24 |
| onboarding_tokens | 17 |
| group_aliases | 5 |
| group_alias_members | 13 |

---

**Status Final:** ✅ **TODAS AS CORREÇÕES APLICADAS**  
**Próximo passo:** Redeploy das funções

---

**Gerado em:** 2025-11-09  
**Executado por:** AI Assistant  
**Projeto:** DashFinance - Oráculo Financeiro

