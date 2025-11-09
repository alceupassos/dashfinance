# 📋 TAREFAS RESTANTES PARA O FRONTEND (CODEX)

## ✅ JÁ FEITO (80%)

```
✓ Dashboard com 12 cards
✓ Admin security panels
✓ Alertas dashboard
✓ Sidebar + topbar + auth
✓ Componentes UI
✓ Temas + tailwind
✓ Financeiro/configurações/taxas
✓ Autenticação com DEV bypass
✓ RLS e políticas de segurança
```

---

## ⏳ FALTAM FAZER (20%)

### 1️⃣ `/admin/tokens` - Criar e Gerenciar Tokens
**O que fazer:**
- Listar tokens existentes
- Criar novo token (5 caracteres alfanuméricos)
- Ativar/desativar tokens
- Copiar para clipboard
- Deletar token
- Ver histórico de ativações

**Dados necessários:**
```typescript
interface Token {
  id: string;
  token: string; // VOLPE1, ADRI5, etc
  empresa_id?: string;
  empresa_nome?: string;
  ativo: boolean;
  criado_em: string;
  ultimo_uso?: string;
  funcao: string; // "onboarding", "admin", etc
}
```

**Layout sugerido:**
```
┌─────────────────────────────────────────┐
│ 🔑 Gerenciador de Tokens               │
├─────────────────────────────────────────┤
│ [+ Novo Token]                          │
├─────────────────────────────────────────┤
│ VOLPE1  │ Grupo Volpe   │ Ativo  │ ⋯  │
│ ADRI5   │ Adri Limpeza  │ Ativo  │ ⋯  │
│ JES02   │ Jessica       │ Ativo  │ ⋯  │
│ TESTE1  │ -             │ Inativo│ ⋯  │
└─────────────────────────────────────────┘

Modal para criar:
- Gerar token aleatório (5 chars)
- Selecionar empresa
- Selecionar função
- Salvar
```

**Componentes necessários:**
- TokensGrid (lista + cards)
- TokenForm (criação)
- TokenActions (ativar/desativar/deletar)

---

### 2️⃣ `/empresas` - Listar Clientes
**O que fazer:**
- Listar empresas com filtros
- Buscar por nome/CNPJ
- Ver status
- Badges: F360, Omie, WhatsApp
- Link para detalhes

**Dados necessários:**
```typescript
interface Empresa {
  id: string;
  cnpj: string;
  nome_fantasia: string;
  razao_social: string;
  logo_url?: string;
  status: "ativo" | "inativo";
  integracao_f360: boolean;
  integracao_omie: boolean;
  whatsapp_ativo: boolean;
  saldo_atual?: number;
  inadimplencia?: number;
  ultimo_sync?: string;
}
```

**Layout sugerido:**
```
┌─────────────────────────────────────────┐
│ 🏢 Empresas                             │
├─────────────────────────────────────────┤
│ [Buscar...] [Filtro] [+ Nova]          │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ Logo │ Empresa                       │ │
│ │      │ CNPJ: 12.345.678/0001-00    │ │
│ │      │ Status: Ativo                │ │
│ │      │ F360 ✓ Omie ✓ WhatsApp ✓   │ │
│ │      │ Saldo: R$ 120.000            │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

### 3️⃣ `/grupos` - Agrupar Empresas
**O que fazer:**
- Listar grupos de empresas
- Mostrar empresas dentro do grupo
- Saldo consolidado do grupo
- Inadimplência consolidada
- Ações em grupo

**Dados necessários:**
```typescript
interface Grupo {
  id: string;
  nome: string;
  descricao?: string;
  empresas: Empresa[];
  saldo_total: number;
  inadimplencia_total: number;
  receita_total: number;
  criado_em: string;
}
```

---

### 4️⃣ `/relatorios/dre` - Demonstrativo de Resultado
**O que fazer:**
- Exibir DRE estruturado
- Gráficos de evolução
- Exportar Excel
- Filtro por período
- Comparação períodos

**Dados necessários:**
```typescript
interface DREEntry {
  id: string;
  empresa_id: string;
  periodo: string;
  receita_bruta: number;
  deducoes: number;
  receita_liquida: number;
  custos: number;
  lucro_bruto: number;
  despesas_operacionais: number;
  ebitda: number;
  depreciacacao: number;
  ebit: number;
  despesas_financeiras: number;
  receitas_financeiras: number;
  lucro_antes_ir: number;
  ir_csll: number;
  lucro_liquido: number;
}
```

---

### 5️⃣ `/relatorios/cashflow` - Fluxo de Caixa
**O que fazer:**
- Timeline de entradas/saídas
- Gráfico de saldo acumulado
- Previsão 7 dias
- Alertas de caixa crítico
- Exportar

---

### 6️⃣ `/relatorios/kpis` - Indicadores Chave
**O que fazer:**
- Dashboard de KPIs
- Margem operacional
- ROE, ROA
- Liquidez
- Comparativo vs meta
- Benchmark

---

### 7️⃣ `/relatorios/payables` - Contas a Pagar
**O que fazer:**
- Listar contas a pagar
- Filtro por vencimento
- Agrupado por fornecedor
- Status: Pendente/Pago
- Detalhes e histórico

---

### 8️⃣ `/relatorios/receivables` - Contas a Receber
**O que fazer:**
- Listar contas a receber
- Filtro por vencimento
- Agrupado por cliente
- Status: Pendente/Recebido
- Detalhes e histórico
- Cobranças relacionadas

---

### 9️⃣ `/whatsapp/conversations` - Conversas WhatsApp
**O que fazer:**
- Lista de conversas
- Chat com usuário
- Histórico de mensagens
- Enviar mensagem
- Sugestões de respostas IA

**Dados necessários:**
```typescript
interface WhatsAppConversation {
  id: string;
  numero: string;
  nome: string;
  ultima_mensagem: string;
  data_ultima: string;
  nao_lido: boolean;
  mensagens: Message[];
}

interface Message {
  id: string;
  de: "usuario" | "bot";
  conteudo: string;
  timestamp: string;
  tipo: "texto" | "imagem" | "arquivo";
}
```

---

### 🔟 `/whatsapp/templates` - Templates de Mensagem
**O que fazer:**
- CRUD de templates
- Visualizar em tempo real
- Testar envio
- Variáveis dinâmicas {{empresa}}, {{valor}}, etc
- Categorias: Alerta, Boas-vindas, Cobrança, etc

---

## 🔄 FLUXOS DE INTEGRAÇÃO

### Fluxo 1: Criar Token → Ativar Usuário
```
1. Admin vai em `/admin/tokens`
2. Clica "+ Novo Token"
3. Sistema gera token (ex: VOLPE1)
4. Admin copia e compartilha com cliente
5. Cliente manda no WhatsApp: "VOLPE1"
6. Bot responde com menu de opções
7. Token ativado, empresa criada
```

### Fluxo 2: Ver Dados da Empresa
```
1. Admin vai em `/empresas`
2. Clica na empresa
3. Vai para `/empresas/[cnpj]`
4. Ver saldo, inadimplência, últimos sync
5. Pode editar integrações
```

### Fluxo 3: Gerar Relatório
```
1. Usuario vai em `/relatorios/dre`
2. Seleciona período
3. Seleciona empresa/grupo
4. Sistema busca dados de Supabase
5. Exibe DRE estruturado
6. Botão "Exportar Excel"
```

---

## 🛠️ TECNOLOGIAS

```typescript
// Componentes que existem
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

// Hooks disponíveis
import { useAuth } from '@/lib/auth';
import { useDashboardCards } from '@/lib/hooks/use-dashboard-cards';

// Tipos já existem
import type { Empresa, DREEntry, etc }

// Utils
import { formatters } from '@/lib/formatters';
import { api } from '@/lib/api';
```

---

## 📊 ESTRUTURA DE DADOS FINAL

**Tabelas que já existem:**
- auth.users (usuários)
- public.profiles (perfis)
- dre_entries (DRE)
- cashflow_entries (cashflow)
- integration_f360 (config F360)
- integration_omie (config Omie)
- contas_receber (A Receber)
- contas_pagar (A Pagar)
- onboarding_tokens (tokens de acesso)
- whatsapp_conversations (conversas)
- audit_documents (auditoria)

**Views que podem usar:**
- v_alertas_pendentes
- v_kpi_monthly
- v_kpi_monthly_enriched

---

## ✅ CHECKLIST

- [ ] `/admin/tokens` - 100%
- [ ] `/empresas` - 100%
- [ ] `/grupos` - 100%
- [ ] `/relatorios/dre` - 100%
- [ ] `/relatorios/cashflow` - 100%
- [ ] `/relatorios/kpis` - 100%
- [ ] `/relatorios/payables` - 100%
- [ ] `/relatorios/receivables` - 100%
- [ ] `/whatsapp/conversations` - 100%
- [ ] `/whatsapp/templates` - 100%
- [ ] Testes de integração
- [ ] Build final
- [ ] Deploy

---

## 🎯 PRIORIDADE

**Critical (fazer agora):**
1. `/admin/tokens`
2. `/empresas`

**Important (próxima semana):**
3. `/relatorios/dre`
4. `/whatsapp/conversations`

**Nice to have:**
5. Tudo o resto pode ir incrementando

---

## 📞 PERGUNTAS PARA CODEX

Quando for passar pro Codex, envie também:

1. **Quais dados vêm de cada API?**
   - F360: Saldo, DRE, Cashflow, Contas a Receber/Pagar
   - Omie: Faturamento, Custos
   - Supabase: Tudo arquivado + configs

2. **Formato de números?**
   - Valores: `toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})`
   - Percentuais: `toFixed(1) + '%'`

3. **Filtros por período?**
   - Usar `period-picker` existente
   - Retornar para período selecionado

4. **Exportar para Excel?**
   - Usar biblioteca: `npm install xlsx`
   - Botão no topo de cada tela de relatório

5. **Responsivo?**
   - Mobile first
   - Tailwind breakpoints

---

**🚀 Tudo documentado! Bora passar pro Codex fazer a mágica!**

