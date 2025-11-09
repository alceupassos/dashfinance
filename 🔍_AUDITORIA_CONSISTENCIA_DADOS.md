# 🔍 AUDITORIA E CONSISTÊNCIA DE DADOS - FUNÇÕES IMPLEMENTADAS

> **Pergunta:** "E a auditoria de consistência de dados tem alguma função disso? ou funções?"
>
> **Resposta:** SIM! Tem várias funções e sistema completo de auditoria implementado! 🎯

---

## 📊 VISÃO GERAL

O sistema tem **3 CAMADAS DE AUDITORIA**:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  CAMADA 1: AUDITORIA DE SAÚDE DOS DADOS (v_audit_health)   │
│  └─ Verifica sincronização, atualização, dados válidos     │
│                                                             │
│  CAMADA 2: AUDITORIA DE INTEGRIDADE (audit_receipts)       │
│  └─ Valida documentos, detecta fraudes, duplicatas         │
│                                                             │
│  CAMADA 3: AUDITORIA DE CONFORMIDADE (audit_logs)          │
│  └─ Registra ações, rastreia mudanças, compliance          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🟢 CAMADA 1: AUDITORIA DE SAÚDE (v_audit_health)

### O QUE FAZ

Monitora a **saúde geral** dos dados sincronizados de F360 e Omie

### VIEW SQL

```sql
SELECT * FROM v_audit_health;
```

### RESPOSTA

```
cnpj            | source | last_success_at      | dre_rows_120d | cf_rows_120d | health
──────────────────────────────────────────────────────────────────────────────────────
00052912647000  | F360   | 2025-11-06 10:30:00  | 1500          | 800          | GREEN
00026888098000  | F360   | 2025-11-04 09:15:00  | 0             | 0            | RED
38152873000119  | Omie   | 2025-11-05 14:20:00  | 450           | 250          | YELLOW
```

### CÓDIGOS DE SAÚDE

| Status | Significado | Ação |
|--------|-------------|------|
| 🟢 GREEN | Sincronizado nas últimas 48h + dados presentes | Tudo OK |
| 🟡 YELLOW | Sincronizado há 2-7 dias | Verificar |
| 🔴 RED | Não sincronizado há 7+ dias OU sem dados há 120d | ALERTA! |

### MÉTRICAS MONITORADAS

```
✅ last_success_at      → Quando foi última sincronização bem-sucedida
✅ dre_rows_120d        → Quantidade de registros DRE nos últimos 120 dias
✅ cf_rows_120d         → Quantidade de registros Cashflow nos últimos 120 dias
✅ health               → Status consolidado (GREEN/YELLOW/RED)
✅ company_name         → Nome da empresa
✅ source               → F360 ou Omie
```

### QUANDO USAR

- Dashboard verificando saúde geral do sistema
- Alertas automáticos (n8n job) se status → RED
- Verificação de quais clientes estão atrasados na sincronização

---

## 🔴 CAMADA 2: AUDITORIA DE INTEGRIDADE (audit_receipts + audit_findings)

### TABELAS

#### 1. `audit_receipts` - Documentos Auditados

```sql
CREATE TABLE audit_receipts (
  id UUID PRIMARY KEY,
  empresa_id UUID NOT NULL,
  user_whatsapp VARCHAR(20),
  image_url TEXT,
  image_storage_path TEXT,
  document_type VARCHAR(50),        -- "boleto", "nota_fiscal", "recibo", "extrato"
  extracted_text TEXT,              -- Texto extraído via OCR
  structured_data JSONB,            -- Dados estruturados:
                                    -- {
                                    --   "amount": 1000.50,
                                    --   "date": "2025-11-05",
                                    --   "emitter": "Fornecedor XYZ",
                                    --   "description": "Compra de materiais"
                                    -- }
  suggested_accounts JSONB,         -- 3 sugestões de conta com % confiança:
                                    -- [
                                    --   {"conta": "6000", "descricao": "Combustível", "confianca": 0.92},
                                    --   {"conta": "6500", "descricao": "Despesa Operacional", "confianca": 0.78},
                                    --   {"conta": "6200", "descricao": "Reparo", "confianca": 0.65}
                                    -- ]
  validation_status VARCHAR(20),    -- "pending", "valid", "needs_review", "rejected"
  audit_status VARCHAR(20),         -- "clean", "warning", "fraud_alert"
  ocr_confidence DECIMAL(5,2),      -- Confiança OCR (0-100)
  is_duplicate BOOLEAN,             -- Detectou duplicata?
  duplicate_of_id UUID,             -- ID do documento original se duplicado
  fraud_indicators JSONB,           -- Indicadores de fraude
  compliance_checklist JSONB,       -- Resultado de verificações
  created_by_user UUID,
  created_at TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by_user UUID,
  final_account_id UUID,            -- Conta contábil final confirmada
  notes TEXT                        -- Anotações do auditor
);
```

#### 2. `audit_findings` - Descobertas de Auditoria

```sql
CREATE TABLE audit_findings (
  id UUID PRIMARY KEY,
  audit_receipt_id UUID NOT NULL,
  finding_type VARCHAR(50),        -- "inconsistency", "fraud", "duplicate", "policy_violation"
  severity VARCHAR(20),            -- "info", "warning", "critical"
  description TEXT,                -- Descrição da descoberta
  recommendation TEXT,             -- O que fazer
  evidence JSONB,                  -- Evidências
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  resolved_by_user UUID,
  created_at TIMESTAMP
);
```

### O QUE VALIDA

```typescript
// Validações implementadas:

1. INTEGRIDADE DO DOCUMENTO
   ✅ Documento é válido? (imagem, PDF, etc)
   ✅ Texto extraído com qualidade? (OCR confidence > 70%)
   ✅ Documento está completo? (tem todos os campos esperados)

2. DETECÇÃO DE DUPLICATAS
   ✅ Mesmo fornecedor + mesma data + valor similar?
   ✅ Mesmo CNPJ + mesma descrição?
   ✅ Documentos marcados como duplicados

3. VALIDAÇÃO CNPJ/CPF
   ✅ CNPJ do fornecedor é válido?
   ✅ CPF do assinante é válido?
   ✅ Formato correto?

4. LIMITES DE APROVAÇÃO
   ✅ Valor está dentro do limite?
   ✅ Requer aprovação? (para valores altos)
   ✅ É pagável agora ou é agendado?

5. DETECÇÃO DE ANOMALIAS
   ✅ Valor muito diferente do histórico?
   ✅ Fornecedor novo? (risco potencial)
   ✅ Data fora do padrão? (sábado/domingo/feriado?)

6. CONFORMIDADE
   ✅ Documento está com assinatura?
   ✅ Tem carimbo de protocolo?
   ✅ É de fornecedor cadastrado?
```

### EDGE FUNCTION: `audit-process-receipt`

#### Entrada
```json
{
  "image_url": "https://...",
  "empresa_id": "uuid",
  "user_whatsapp": "5524998567466",
  "contexto": "Recibo de compra de combustível para frota"
}
```

#### Processo (8 passos)

```
1️⃣ OCR + CLAUDE VISION
   └─ Extrai texto da imagem
   └─ Identifica tipo de documento
   └─ Extrai dados estruturados

2️⃣ VALIDAÇÃO INTEGRIDADE
   └─ Verifica se documento é válido
   └─ Checa OCR confidence
   └─ Valida estrutura

3️⃣ DETECÇÃO DUPLICATAS
   └─ Busca documentos similares (3 últimos meses)
   └─ Compara fornecedor + data + valor
   └─ Marca como duplicado se necessário

4️⃣ VALIDAÇÃO CNPJ/CPF
   └─ Valida formato CNPJ do fornecedor
   └─ Verifica contra lista de fraude (opcional)

5️⃣ CHECKLIST CONFORMIDADE
   └─ Tem assinatura?
   └─ Tem carimbo?
   └─ É de fornecedor cadastrado?

6️⃣ SUGESTÃO IA DE CONTA
   └─ Analisa descrição
   └─ Busca histórico similar
   └─ Valida contra padrão da empresa
   └─ Sugere 3 contas com % confiança

7️⃣ DETECÇÃO ANOMALIAS
   └─ Valor fora do padrão?
   └─ Fornecedor novo/suspeito?
   └─ Data anômala?

8️⃣ RESPOSTA ESTRUTURADA
   └─ Guarda em audit_receipts
   └─ Cria findings se houver alertas
   └─ Responde no WhatsApp com recomendação
```

#### Saída (WhatsApp)
```
✅ DOCUMENTO VALIDADO

📋 Tipo: Boleto Bancário
💰 Valor: R$ 1.500,00
📅 Data: 05/11/2025
👤 Fornecedor: Acme LTDA (CNPJ: 01.234.567/0001-89)
📝 Descrição: Compra de combustível

💡 SUGESTÃO DE CONTA:
   1️⃣ Combustível (6000)          - Confiança: 92%
   2️⃣ Despesa Operacional (6500)  - Confiança: 78%
   3️⃣ Reparo e Manutenção (6200)  - Confiança: 65%

✅ Confirmação: [Usar 6000] ou [Usar 6500] ou [Revisar]

⚠️ ATENÇÕES:
   - Primeiro documento deste fornecedor
   - Valor 15% acima da média histórica
```

### FUNÇÕES SQL ASSOCIADAS

```sql
-- Verificar integridade de dados sincronizados
SELECT * FROM fn_audit_data_integrity(
  p_empresa_id => '00052912647000',
  p_days_back => 30
);

-- Resultado: Erros encontrados, inconsistências, divergências

-- Detectar anomalias
SELECT * FROM fn_detect_anomalies(
  p_company_cnpj => '00052912647000',
  p_threshold => 0.20  -- 20% acima/abaixo da média
);

-- Validar conformidade
SELECT * FROM fn_compliance_check(
  p_audit_receipt_id => 'uuid'
);
```

---

## 📝 CAMADA 3: AUDITORIA DE CONFORMIDADE (audit_logs + audit_rules)

### TABELAS

#### 1. `audit_logs` - Registro de Ações

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  action VARCHAR(100),              -- "created_invoice", "modified_payment", "approved_document"
  entity_type VARCHAR(50),          -- "dre_entry", "payment", "receipt"
  entity_id UUID,
  old_values JSONB,                 -- Valores antes da mudança
  new_values JSONB,                 -- Valores depois da mudança
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP,
  
  -- Exemplo:
  -- user_id: abc123
  -- action: "modified_payment"
  -- entity_type: "dre_entry"
  -- old_values: {"amount": 1000, "status": "pending"}
  -- new_values: {"amount": 1100, "status": "approved"}
  -- ip_address: 192.168.1.1
  -- created_at: 2025-11-06 14:30:00
);
```

#### 2. `audit_rules` - Regras de Conformidade

```sql
CREATE TABLE audit_rules (
  id UUID PRIMARY KEY,
  rule_name VARCHAR(100),
  description TEXT,
  rule_type VARCHAR(50),            -- "transaction", "approval", "sync", "data_quality"
  condition_expression TEXT,        -- Expressão SQL ou lógica
  action_on_violation VARCHAR(50),  -- "alert", "block", "review"
  severity VARCHAR(20),             -- "info", "warning", "critical"
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP
);
```

### REGRAS PRÉ-CONFIGURADAS

```
1. LIMITE DE APROVAÇÃO
   IF transaction.amount > 10000
   THEN require_approval
   SEVERITY: warning

2. DUPLICATAS
   IF similarity(doc1, doc2) > 0.95
   THEN alert_fraud
   SEVERITY: critical

3. SINCRONIZAÇÃO
   IF last_sync > 48h
   THEN send_alert
   SEVERITY: warning

4. CONSISTÊNCIA F360 vs OMIE vs BANCO
   IF divergence(f360, omie) > 5%
   THEN review_required
   SEVERITY: critical

5. CONTAS NÃO RECONCILIADAS
   IF unreconciled_days > 30
   THEN block_operations
   SEVERITY: critical
```

### FUNÇÕES ASSOCIADAS

```sql
-- Verificar conformidade com regras
SELECT * FROM fn_check_compliance_rules(
  p_audit_log_id => 'uuid'
);

-- Listar violações ativas
SELECT * FROM fn_get_compliance_violations(
  p_company_cnpj => '00052912647000',
  p_severity => 'critical'
);

-- Registrar ação de auditoria
SELECT * FROM fn_audit_log_action(
  p_user_id => 'uuid',
  p_action => 'modified_payment',
  p_entity_type => 'dre_entry',
  p_entity_id => 'uuid',
  p_old_values => '{"amount": 1000}',
  p_new_values => '{"amount": 1100}'
);
```

---

## 🔄 FLUXO COMPLETO DE AUDITORIA

### Exemplo Real: Recibo de Compra

```
CLIENTE via WhatsApp:
┌───────────────────────────────────┐
│ [Foto do recibo]                  │
│ Texto: "Compra de combustível"    │
└───────────────────────────────────┘
                ↓

WEBHOOK RECEBE:
┌───────────────────────────────────┐
│ image_url: "https://..."          │
│ empresa_id: "uuid"                │
│ user_whatsapp: "5524998567466"    │
│ contexto: "Combustível frota"     │
└───────────────────────────────────┘
                ↓

EDGE FUNCTION: audit-process-receipt
┌───────────────────────────────────┐
│ 1️⃣ OCR + Claude Vision           │
│    └─ Extrai: R$ 1.500, 05/11    │
│                                   │
│ 2️⃣ Valida integridade            │
│    └─ OCR confidence: 91% ✅     │
│                                   │
│ 3️⃣ Detecta duplicatas            │
│    └─ Não encontrou ✅           │
│                                   │
│ 4️⃣ Valida CNPJ                   │
│    └─ 01.234.567/0001-89 ✅     │
│                                   │
│ 5️⃣ Conformidade                  │
│    └─ Tem assinatura ✅          │
│    └─ Tem carimbo ✅             │
│                                   │
│ 6️⃣ Sugere conta (IA)             │
│    └─ Top 3:                     │
│       1. Combustível (92%)       │
│       2. Despesa Op (78%)        │
│       3. Reparo (65%)            │
│                                   │
│ 7️⃣ Detecta anomalias             │
│    └─ Valor 15% acima média ⚠️  │
│    └─ Fornecedor novo ⚠️         │
│                                   │
│ 8️⃣ Persiste dados                │
│    └─ Grava em audit_receipts    │
│    └─ Cria findings               │
│    └─ audit_status: "warning"    │
└───────────────────────────────────┘
                ↓

RESPOSTA NO WHATSAPP:
┌───────────────────────────────────┐
│ ✅ DOCUMENTO VALIDADO            │
│                                   │
│ 💰 R$ 1.500,00                   │
│ 📅 05/11/2025                     │
│ 👤 Acme LTDA                      │
│                                   │
│ 💡 Sugestão: Combustível (92%)   │
│                                   │
│ ⚠️ Atenção:                       │
│ • Valor 15% acima da média       │
│ • Fornecedor novo                │
│                                   │
│ [✅ Confirmar] [🔍 Revisar]      │
└───────────────────────────────────┘
                ↓

CLIENTE CONFIRMA:
┌───────────────────────────────────┐
│ Usuario: "Confirmar com conta 6000"
└───────────────────────────────────┘
                ↓

AUDIT LOG REGISTRA:
┌───────────────────────────────────┐
│ user_id: "uuid"                   │
│ action: "approved_receipt"        │
│ entity_type: "audit_receipt"      │
│ entity_id: "uuid"                 │
│ final_account: "6000"             │
│ validation_status: "valid"        │
│ created_at: "2025-11-06 14:30"   │
└───────────────────────────────────┘
                ↓

DADOS PRONTOS PARA CONTABILIDADE:
┌───────────────────────────────────┐
│ Conta: 6000 (Combustível)         │
│ Valor: R$ 1.500,00               │
│ Data: 05/11/2025                  │
│ Fornecedor: Acme LTDA             │
│ Status: Aprovado                  │
│ Auditor: Jessica Kenupp           │
└───────────────────────────────────┘
```

---

## 📊 DASHBOARD DE AUDITORIA (Futuro no Frontend)

### O que mostrar em `/audit/dashboard`

```
┌─────────────────────────────────────────────┐
│ DASHBOARD AUDITORIA                         │
├─────────────────────────────────────────────┤
│                                             │
│ 📊 SAÚDE GERAL                              │
│ ├─ 🟢 GREEN: 12 empresas OK                │
│ ├─ 🟡 YELLOW: 3 empresas com atenção      │
│ └─ 🔴 RED: 1 empresa crítica                │
│                                             │
│ 📋 DOCUMENTOS AUDITADOS HOJE                │
│ ├─ ✅ Aprovados: 24                         │
│ ├─ ⚠️ Revisão: 3                            │
│ ├─ ❌ Rejeitados: 1                         │
│ └─ ⏳ Pendentes: 5                          │
│                                             │
│ 🚨 DESCOBERTAS CRÍTICAS                     │
│ ├─ Possível fraude: 1                       │
│ ├─ Duplicatas: 2                            │
│ └─ Conformidade: 5                          │
│                                             │
│ 🔍 ÚLTIMAS AÇÕES DE AUDITORIA               │
│ └─ [Lista de últimas 10 ações]              │
│                                             │
└─────────────────────────────────────────────┘
```

---

## ✅ FUNCIONALIDADES IMPLEMENTADAS

| Feature | Status | Descrição |
|---------|--------|-----------|
| Auditoria Saúde | ✅ | View `v_audit_health` |
| Processamento OCR | ✅ | Edge Function `audit-process-receipt` |
| Detecção Duplicatas | ✅ | Função SQL integrada |
| Validação CNPJ | ✅ | Função SQL validadora |
| Sugestão IA Conta | ✅ | Claude IA para sugerir contas |
| Compliance Checklist | ✅ | Verificações automáticas |
| Detecção Fraude | ✅ | Indicadores de anomalia |
| Audit Logs | ✅ | Tabela `audit_logs` |
| Audit Findings | ✅ | Tabela `audit_findings` |
| Audit Rules | ✅ | Tabela `audit_rules` com pré-configuradas |
| Consistency Check | ✅ | Funções para validar sincronização |
| Relatório Auditoria | ⏳ | Para dashboard frontend |

---

## 🚀 PRÓXIMOS PASSOS

### Para Implementar no Frontend

1. **Dashboard Auditoria** (`/audit/dashboard`)
   - Mostra saúde geral com status GREEN/YELLOW/RED
   - Lista documentos auditados
   - Mostra descobertas críticas
   - Ações recentes de auditoria

2. **Revisor de Documentos** (`/audit/review/:id`)
   - Mostra imagem do documento
   - Dados extraídos
   - Sugestões de conta
   - Campos para aprovar/rejeitar
   - Notas do auditor

3. **Relatório de Conformidade** (`/audit/compliance`)
   - Violações de regras
   - Histórico de resoluções
   - Exportar para relatório

4. **Gerenciador de Regras** (`/admin/audit-rules`)
   - Criar/editar regras de conformidade
   - Ativar/desativar regras
   - Configurar severidade

---

## 📌 RESUMO

**SIM! A auditoria de consistência de dados tem:**

✅ **1 View** (`v_audit_health`) - Monitora saúde geral  
✅ **3 Tabelas** (audit_receipts, audit_findings, audit_logs, audit_rules)  
✅ **1 Edge Function** (`audit-process-receipt`) - Processa e valida documentos  
✅ **5+ Funções SQL** - Validação, detecção fraude, conformidade  
✅ **8 Validações** - Integridade, duplicatas, CNPJ, conformidade, anomalias, IA  
✅ **Pronto para Frontend** - Dashboard de auditoria planejado

**Tudo integrado e funcionando! 🎉**

