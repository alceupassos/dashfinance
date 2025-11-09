# 📋 PLANO FRONTEND - INTEGRAÇÃO AUDITORIA

> **Para:** Codex Backend (Frontend)  
> **Assunto:** Página de Auditoria - Layout, Rotas e Integração  
> **Status:** Pronto para implementação

---

## 🎯 RESUMO

Criamos uma **página web de Auditoria** (`docs/auditoria/index.html`) seguindo o design do DashFinance.

Agora você precisa:
1. Planeja onde colocar a página no frontend
2. Defina as rotas
3. Integre com os dados reais via APIs
4. Conecte os botões aos componentes

---

## 📄 PÁGINA CRIADA

**Arquivo:** `/docs/auditoria/index.html`

**O que tem:**
- ✅ Hero section com badge
- ✅ Stats com números (Documentos, Taxa Aprovação, Fraudes, Tempo)
- ✅ 3 Camadas de Auditoria em cards
- ✅ Dashboard de Saúde Geral (GREEN/YELLOW/RED)
- ✅ Fluxo de Processamento (6 passos)
- ✅ 6 Botões de ação principais
- ✅ Documentação e referência
- ✅ Design NEON (mesmo do landing page)

---

## 🗂️ ESTRUTURA SUGERIDA PARA FRONTEND

```
app/(app)/
├── audit/                          # Nova seção
│   ├── layout.tsx                  # Layout compartilhado
│   ├── page.tsx                    # Dashboard de auditoria
│   ├── review/
│   │   ├── page.tsx                # Revisor de documentos
│   │   └── [id]/page.tsx           # Detalhe do documento
│   ├── compliance/
│   │   └── page.tsx                # Relatório de conformidade
│   ├── upload/
│   │   └── page.tsx                # Upload de documentos
│   ├── reports/
│   │   └── page.tsx                # Relatório de auditoria
│   └── settings/
│       └── page.tsx                # Configurações de regras
```

---

## 🛣️ ROTAS SUGERIDAS

```typescript
// Routes da Auditoria
GET  /audit                          → Dashboard geral
GET  /audit/review                   → Lista de documentos
GET  /audit/review/:id               → Detalhe do documento
GET  /audit/compliance               → Relatório conformidade
GET  /audit/upload                   → Upload de documentos
GET  /audit/reports                  → Relatório de auditoria
GET  /audit/settings                 → Configurações
```

---

## 📊 DADOS A BUSCAR (APIs)

### 1. Dashboard Geral

```typescript
// GET /api/audit/health
// Retorna:
{
  documents_audited: 1245,
  approval_rate: 98.2,
  fraud_detected: 12,
  avg_time_sec: 2.3,
  
  // Health status
  green_companies: 12,
  yellow_companies: 3,
  red_companies: 1,
  
  // Gráfico de sincronização (últimos 30 dias)
  sync_timeline: [
    { date: "2025-11-01", syncs: 45, success_rate: 98.5 },
    { date: "2025-11-02", syncs: 52, success_rate: 97.8 },
    // ... 28 dias mais
  ]
}
```

### 2. Lista de Documentos

```typescript
// GET /api/audit/documents?page=1&limit=20&status=all
// Retorna:
{
  documents: [
    {
      id: "uuid",
      image_url: "https://...",
      document_type: "boleto",
      extracted_amount: 1500.00,
      extracted_date: "2025-11-05",
      supplier_cnpj: "01.234.567/0001-89",
      validation_status: "valid",
      audit_status: "clean",
      ocr_confidence: 0.91,
      suggested_accounts: [
        { account: "6000", description: "Combustível", confidence: 0.92 },
        { account: "6500", description: "Despesa Operacional", confidence: 0.78 },
        { account: "6200", description: "Reparo", confidence: 0.65 }
      ],
      created_at: "2025-11-05T14:30:00Z"
    },
    // ... mais documentos
  ],
  total: 1245,
  page: 1,
  limit: 20
}
```

### 3. Detalhe do Documento

```typescript
// GET /api/audit/documents/:id
// Retorna:
{
  id: "uuid",
  image_url: "https://...",
  image_storage_path: "audit/doc-123.jpg",
  document_type: "boleto",
  extracted_text: "Boleto de cobrança...",
  structured_data: {
    amount: 1500.00,
    date: "2025-11-05",
    emitter: "Acme LTDA",
    description: "Combustível"
  },
  suggested_accounts: [...],
  validation_status: "valid",
  audit_status: "clean",
  ocr_confidence: 0.91,
  is_duplicate: false,
  fraud_indicators: [],
  compliance_checklist: {
    has_signature: true,
    has_stamp: true,
    supplier_registered: true,
    valid_cnpj: true
  },
  notes: "Documento validado sem problemas",
  created_at: "2025-11-05T14:30:00Z",
  created_by: {
    id: "user-uuid",
    name: "Jessica Kenupp",
    email: "jessica@example.com"
  }
}
```

### 4. Conformidade

```typescript
// GET /api/audit/compliance?severity=all
// Retorna:
{
  violations: [
    {
      id: "uuid",
      audit_receipt_id: "uuid",
      finding_type: "duplicate",
      severity: "critical",
      description: "Documento duplicado encontrado",
      recommendation: "Revisar com BPO",
      evidence: { similar_document_id: "uuid" },
      resolved: false,
      created_at: "2025-11-05T14:30:00Z"
    },
    // ... mais violações
  ],
  rules: [
    {
      id: "uuid",
      rule_name: "Limite de Aprovação",
      description: "Transações > 10k requerem aprovação",
      is_active: true
    },
    // ... mais regras
  ]
}
```

### 5. Health Status

```typescript
// GET /api/audit/health/companies
// Retorna:
{
  companies: [
    {
      cnpj: "00052912647000",
      company_name: "Empresa A LTDA",
      source: "F360",
      last_success_at: "2025-11-06T10:30:00Z",
      dre_rows_120d: 1500,
      cf_rows_120d: 800,
      health: "GREEN"
    },
    {
      cnpj: "00026888098000",
      company_name: "Empresa B LTDA",
      source: "F360",
      last_success_at: "2025-11-04T09:15:00Z",
      dre_rows_120d: 0,
      cf_rows_120d: 0,
      health: "RED"
    },
    // ... mais empresas
  ]
}
```

---

## 🎨 COMPONENTES A REUTILIZAR

```typescript
// Já existentes no projeto:
✅ Card component
✅ Badge component
✅ Button (primário, secundário, danger)
✅ GrafanaLineChart (para gráficos)
✅ DenseTable (para listas)
✅ HealthStatus (para indicadores GREEN/YELLOW/RED)
✅ Stat card (números grandes)

// Criar:
☐ AuditImageViewer (para visualizar documentos)
☐ AccountSuggestion (para sugerir contas)
☐ ComplianceChecklistItem (para checklist)
☐ FindingAlert (para descobertas de auditoria)
```

---

## 🔧 INTEGRAÇÃO COM APIS

### Exemplo: Página Dashboard

```typescript
// app/(app)/audit/page.tsx

import { useState, useEffect } from 'react';
import { Card, Badge, Button } from '@/components/ui';

export default function AuditDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Buscar dados do dashboard
    fetch('/api/audit/health')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="container">
      {/* Stats */}
      <div className="stats-row">
        <StatCard 
          title="Documentos" 
          value={data.documents_audited} 
          subtitle="Auditados"
        />
        <StatCard 
          title="Taxa Aprovação" 
          value={`${data.approval_rate}%`} 
          subtitle="Validados"
        />
        {/* ... mais stats ... */}
      </div>

      {/* Health Status */}
      <Card>
        <div className="health-status">
          <HealthDot status="green" /> 
          {data.green_companies} empresas OK
        </div>
        {/* ... mostra YELLOW e RED ... */}
      </Card>

      {/* Action Buttons */}
      <div className="action-buttons">
        <ActionButton 
          icon="📊" 
          title="Dashboard" 
          onClick={() => router.push('/audit')}
        />
        <ActionButton 
          icon="🔍" 
          title="Revisar Docs" 
          onClick={() => router.push('/audit/review')}
        />
        {/* ... mais botões ... */}
      </div>
    </div>
  );
}
```

---

## 📋 CHECKLIST PARA IMPLEMENTAÇÃO

### Fase 1: Estrutura (2h)
- [ ] Criar layout `/audit/layout.tsx`
- [ ] Criar página dashboard `/audit/page.tsx`
- [ ] Implementar rotas secundárias
- [ ] Componentes base

### Fase 2: Dashboard Geral (2h)
- [ ] Buscar dados via `/api/audit/health`
- [ ] Renderizar stats cards
- [ ] Renderizar health status (GREEN/YELLOW/RED)
- [ ] Gráfico de sincronização
- [ ] Action buttons

### Fase 3: Revisor de Documentos (3h)
- [ ] Página lista `/audit/review`
- [ ] Buscar documentos via `/api/audit/documents`
- [ ] Filtros (status, data, tipo)
- [ ] Tabela com documentos
- [ ] Paginação

### Fase 4: Detalhe de Documento (3h)
- [ ] Página detalhe `/audit/review/[id]`
- [ ] Visualizador de imagem
- [ ] Dados extraídos
- [ ] Sugestões de conta (3 opções)
- [ ] Botões aprovar/revisar

### Fase 5: Conformidade (2h)
- [ ] Página `/audit/compliance`
- [ ] Lista de violações
- [ ] Lista de regras
- [ ] Histórico resoluções
- [ ] Exportar relatório

### Fase 6: Upload & Settings (2h)
- [ ] Página upload `/audit/upload`
- [ ] Drag & drop de documentos
- [ ] Página settings `/audit/settings`
- [ ] Gerenciar regras

### Fase 7: Testes & Polish (2h)
- [ ] Testes E2E
- [ ] Responsividade
- [ ] Performance
- [ ] Acessibilidade

**Total estimado: 16 horas**

---

## 🎯 PRÓXIMOS PASSOS

### Para o Frontend (Codex)

1. **Leia a documentação:**
   - `🔍_AUDITORIA_CONSISTENCIA_DADOS.md` - Entenda o sistema

2. **Planeje a estrutura:**
   - Defina exatamente onde vai ficar (qual seção do menu)
   - Defina as rotas
   - Crie os componentes base

3. **Implemente o dashboard:**
   - Comece pela página principal
   - Integre com `/api/audit/health`
   - Teste com dados reais

4. **Implemente as sub-páginas:**
   - Review de documentos
   - Detalhe de documento
   - Conformidade
   - Upload
   - Settings

5. **Teste tudo:**
   - Responsividade
   - Performance
   - Integração com APIs

---

## 📁 ARQUIVOS RELACIONADOS

| Arquivo | Descrição |
|---------|-----------|
| `docs/auditoria/index.html` | Página web pronta |
| `🔍_AUDITORIA_CONSISTENCIA_DADOS.md` | Documentação completa |
| `finance-oraculo-frontend/.plan.md` | Plano geral |

---

## 💡 SUGESTÕES

### Layout Recomendado

```
┌─────────────────────────────────┐
│ NAVBAR + SIDEBAR                │
├─────────────────────────────────┤
│ /audit                          │
│ ├─ Dashboard (Principal)        │
│ ├─ Documentos                   │
│ │  ├─ Review                    │
│ │  ├─ [ID] Detail              │
│ │  └─ Upload                    │
│ ├─ Conformidade                 │
│ ├─ Relatórios                   │
│ └─ Configurações                │
└─────────────────────────────────┘
```

### Menu Sugerido (Sidebar)

```
🔍 AUDITORIA
├─ 📊 Dashboard
├─ 📋 Documentos
│  ├─ Revisar
│  └─ Upload
├─ ⚖️ Conformidade
├─ 📈 Relatórios
└─ ⚙️ Configurações
```

---

## ✅ RESULTADO ESPERADO

Quando terminar, o usuário terá:

✅ Dashboard de auditoria visual e intuitivo  
✅ Revisor de documentos integrado  
✅ Sugestões IA de contas funcionando  
✅ Status de sincronização em tempo real  
✅ Relatório de conformidade completo  
✅ Upload de documentos funcional  
✅ Configurações de regras gerenciáveis  

**Tudo integrado com o backend de auditoria! 🎉**

---

**Pronto para Codex implementar! 🚀**

