# 🚨 CODEX - TERMINAR HOJE! 

> ⏰ **URGENTE** | 🎯 **META:** Implementar 10 páginas hoje | 🏁 **DEADLINE:** Fim do dia

---

## 📋 LEIA ISTO PRIMEIRO

Você precisa implementar **10 páginas do frontend** para o sistema ir ao vivo HOJE.

**Todas as informações estão em:** `📋_PROMPT_CODEX_IMPLEMENTAR_FRONTEND.md`

**Este arquivo tem tudo que você precisa:**
- Layout de cada página
- Estrutura de dados
- APIs prontas
- Componentes disponíveis
- Ordem de implementação

---

## ⏱️ TIMELINE PARA HOJE

```
Agora - 11:00      → /admin/tokens (1h)
11:00 - 12:00      → /empresas (1h)
12:00 - 13:00      → ALMOÇO
13:00 - 15:00      → /relatorios/dre (2h)
15:00 - 16:00      → /relatorios/cashflow (1h)
16:00 - 17:00      → /grupos (1h)
17:00 - 18:00      → /relatorios/kpis (1h)
18:00 - 19:00      → /relatorios/payables (1h)
19:00 - 20:00      → /relatorios/receivables (1h)

TOTAL: 10 páginas em ~8-9 horas
```

---

## 🎯 ORDEM EXATA (FAZER NESTA ORDEM)

### 🔴 CRÍTICO (Fazer AGORA)

#### 1. `/admin/tokens` - Grid de tokens
```
Layout:
  - Header: "🔑 Gerenciador de Tokens"
  - Botão: "+ Novo Token"
  - Tabela com: TOKEN | EMPRESA | STATUS | AÇÕES

Funcionalidades:
  ✓ Listar tokens (GET /api/onboarding-tokens)
  ✓ Criar novo (POST /api/onboarding-tokens)
  ✓ Ativar/desativar
  ✓ Deletar
  ✓ Copiar para clipboard

Tempo: 1 hora
Dados: onboarding_tokens table
```

#### 2. `/empresas` - Grid de clientes
```
Layout:
  - Header: "🏢 Empresas"
  - Search + Filtros
  - Grid de cards com empresa

Card mostra:
  • Logo
  • Nome
  • CNPJ
  • Status
  • Badges: F360 ✓ Omie ✓ WhatsApp ✓
  • Saldo, inadimplência, receita
  • Link para detalhes

Tempo: 1 hora
Dados: empresas table (ou view consolidada)
```

### 🟡 IMPORTANTE (Depois)

#### 3. `/relatorios/dre` - DRE estruturado
```
Layout:
  - Period picker (mês)
  - Empresa select
  - Tabela com DRE estruturado:
    • Receita Bruta
    • Deduções
    • Receita Líquida
    • Custos
    • Lucro Bruto
    • Despesas Operacionais
    • EBITDA
    • EBIT
    • Lucro Líquido
  - Gráfico de evolução (6 meses)
  - Botão exportar Excel

Tempo: 2 horas
Dados: dre_entries table
```

#### 4. `/relatorios/cashflow` - Fluxo de caixa
```
Layout:
  - Saldo inicial + período
  - Timeline de movimentações (últimos 7 dias)
  - Gráfico de saldo acumulado
  - Previsão 7 dias com cores:
    🟢 Normal (>50k)
    🟡 Atenção (10k-50k)
    🔴 Crítico (<10k)

Tempo: 1 hora
Dados: cashflow_entries table + previsão
```

### 🟢 NICE-TO-HAVE (Se sobrar tempo)

#### 5. `/grupos` - Agrupar empresas
Tempo: 1 hora

#### 6. `/relatorios/kpis` - Indicadores
Tempo: 1 hora

#### 7. `/relatorios/payables` - Contas a pagar
Tempo: 1 hora

#### 8. `/relatorios/receivables` - Contas a receber
Tempo: 1 hora

#### 9-10. `/whatsapp/*` - Chat + Templates
Tempo: 2 horas

---

## 🛠️ COMPONENTES PRONTOS (USE ESTES)

```typescript
// ✅ Importar daqui
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DenseTable } from '@/components/dense-table';
import { PeriodPicker } from '@/components/period-picker';
import { DashboardCardsGrid } from '@/components/dashboard-cards-grid';

// ✅ Hooks
import { useAuth } from '@/lib/auth';
import { useDashboardCards } from '@/lib/hooks/use-dashboard-cards';

// ✅ Utils
import { formatters } from '@/lib/formatters';
import { api } from '@/lib/api';
```

---

## 📡 APIS DISPONÍVEIS

```bash
# Tokens
GET /api/onboarding-tokens?empresa_id=xxx
POST /api/onboarding-tokens
PATCH /api/onboarding-tokens/:id
DELETE /api/onboarding-tokens/:id

# Empresas
GET /api/empresas?search=xxx&status=ativo

# DRE
GET /api/relatorios/dre?periodo=2025-11&empresa_id=xxx

# Cashflow
GET /api/relatorios/cashflow?periodo=2025-11&empresa_id=xxx

# Demais
GET /api/grupos
GET /api/relatorios/kpis
GET /api/relatorios/payables
GET /api/relatorios/receivables
```

---

## 🔐 CREDENCIAIS DE TESTE

```
Email:    alceu@angrax.com.br
Senha:    ALceu322ie#
Supabase: https://newczbjzzfkwwnpfmygm.supabase.co
API Base: https://newczbjzzfkwwnpfmygm.supabase.co/functions/v1
```

---

## 🧪 TESTAR CADA PÁGINA

Depois de implementar cada página:

```bash
1. npm run dev
2. Abrir http://localhost:3000
3. Fazer login
4. Ir para a página
5. Verificar se dados aparecem
6. Testar filtros/busca
7. Commit: "feat: implement /rota-name"
```

---

## ✅ CHECKLIST FINAL

```
Página                    Tempo    Status
/admin/tokens            1h       [ ]
/empresas                1h       [ ]
/relatorios/dre          2h       [ ]
/relatorios/cashflow     1h       [ ]
/grupos                  1h       [ ]
/relatorios/kpis         1h       [ ]
/relatorios/payables     1h       [ ]
/relatorios/receivables  1h       [ ]
/whatsapp/conversations  1h       [ ]
/whatsapp/templates      1h       [ ]

TOTAL: ~10-11 horas
```

---

## 💡 DICAS IMPORTANTES

1. **Comece AGORA** - Não perca tempo
2. **Faça commits frequentes** - Cada página = 1 commit
3. **Teste enquanto desenvolve** - DevTools aberto
4. **Copie e adapte** - Reutilize código de outras páginas
5. **Não se preocupe com perfeição** - MVP é o objetivo
6. **Se travar, pule** - Faça as outras e volta depois

---

## 🎯 META

**Ter TODAS as 10 páginas funcionando até as 20:00 (8 PM)**

Se conseguir antes, melhor ainda!

---

## 📞 SE PRECISAR

Tudo está documentado em:
- `📋_PROMPT_CODEX_IMPLEMENTAR_FRONTEND.md` (detalhado)
- `TAREFAS_FRONTEND_RESTANTES.md` (backup)
- `.plan.md` (checklist)

---

## 🚀 VAMOS LÁ!

```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║  🔥 CODEX - TERMINAR HOJE! 🔥                           ║
║                                                           ║
║  10 páginas                                              ║
║  ~10 horas de trabalho                                   ║
║  Deadline: Fim do dia                                    ║
║                                                           ║
║  Sistema vai ao vivo assim que terminar! 🚀            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

---

**BOA SORTE! VOCÊ CONSEGUE! 💪**

Começe com `/admin/tokens` AGORA!

