# 🤖 CRIAR WORKFLOWS N8N - LISTA COMPLETA

## ✅ JÁ CRIADOS (5/20)

```
✅ 01_resumo_executivo_diario.json
✅ 02_detector_saldo_critico_realtime.json
✅ 03_previsao_caixa_7_dias.json
✅ 04_inadimplencia_realtime.json
✅ 05_analise_margem_cliente.json
```

---

## ⏳ FALTAM CRIAR (15/20)

### CRÍTICOS (fazer HOJE)

#### 06 - Impostos Vencendo
```json
Trigger: Diariamente 08:00
Lógica: 
  - Buscar impostos vencendo em 5 dias
  - Se vencer: ALERTA
  - Se vencido: CRÍTICO
Ação: Enviar WhatsApp + Dashboard
```

#### 07 - Custos Inesperados
```json
Trigger: Real-time (quando > R$ 500)
Lógica:
  - Custos sem categorização
  - Sugerir categoria
  - Aguardar confirmação
Ação: Enviar WhatsApp
```

#### 08 - Checklist Folha de Pagamento
```json
Trigger: 5 dias antes do vencimento
Lógica:
  - Confirmar saldo para folha
  - Listar funcionários
  - Se insuficiente: alerta
Ação: Enviar WhatsApp
```

#### 09 - Desvios Bancários
```json
Trigger: Diariamente 10:00
Lógica:
  - Comparar F360 vs Banco
  - Se > 2% divergência: alerta
  - Gerar relatório
Ação: Enviar WhatsApp + Email
```

#### 10 - Top 5 Devedores
```json
Trigger: Semanalmente segunda 14:00
Lógica:
  - Maiores contas vencidas
  - Maiores atrasadas
  - Sugestões de ação
Ação: Enviar WhatsApp
```

### IMPORTANTES (próxima semana)

#### 11 - Benchmarking Mensal
```json
Trigger: Último dia do mês 17:00
Lógica: Comparação vs mês anterior e mesmo mês ano passado
```

#### 12 - Cash Conversion Cycle
```json
Trigger: Semanalmente sexta
Lógica: Dias de recebimento vs pagamento
```

#### 13 - Fluxo Operacional vs Real
```json
Trigger: Diariamente
Lógica: O que F360 prevê vs o que realmente entrou
```

#### 14 - Alertas de Oportunidade
```json
Trigger: Diariamente
Lógica: Saldo alto, antecipações, descontos
```

#### 15 - Relatório Executivo 17:30
```json
Trigger: Diariamente 17:30
Lógica: Resumo em 1 página do que importa
```

### AVANÇADOS

#### 16 - Análise de Rentabilidade
```json
Trigger: Mensalmente
Lógica: ROE, ROA, ROIC por cliente
```

#### 17 - Previsão com ML
```json
Trigger: Semanalmente
Lógica: Tendências de vendas/custos
```

#### 18 - Detecção de Anomalias
```json
Trigger: Real-time
Lógica: Padrões anormais de gasto
```

#### 19 - Sincronização Multi-ERP
```json
Trigger: A cada 6h
Lógica: Validar dados entre F360 e Omie
```

#### 20 - Dashboard Atualizado
```json
Trigger: A cada 30 min
Lógica: Atualizar métricas do dashboard
```

---

## 🚀 COMO CRIAR RAPIDAMENTE

### Opção 1: Via N8N UI (Manual)
1. Abrir https://n8n.angrax.com.br
2. Novo workflow
3. Adicionar trigger + nodes
4. Ativar
5. Salvar

### Opção 2: Via API (Script)
```bash
# Usar script para importar JSONs
curl -X POST https://n8n.angrax.com.br/api/v1/workflows \
  -H "Authorization: Bearer $TOKEN" \
  -d @06_impostos_vencendo.json
```

### Opção 3: Priorizar
Se não conseguir em 1 dia:

**Hoje (CRÍTICOS):**
- 06 Impostos
- 07 Custos
- 08 Folha
- 09 Desvios
- 10 Top Devedores

**Próxima semana:**
- Rest

---

## 📋 TEMPLATE PADRÃO

Cada workflow deve ter:

```json
{
  "name": "NN - Nome Descritivo",
  "description": "O que faz",
  "trigger": {
    "type": "schedule",
    "when": "diariamente/semanalmente/real-time",
    "time": "HH:MM"
  },
  "nodes": [
    {
      "name": "Trigger",
      "type": "scheduleTrigger"
    },
    {
      "name": "Buscar Dados",
      "type": "httpRequest",
      "url": "{{ $env.SUPABASE_URL }}/..."
    },
    {
      "name": "Processar",
      "type": "code"
    },
    {
      "name": "Formatar",
      "type": "code"
    },
    {
      "name": "Enviar",
      "type": "httpRequest",
      "url": "https://wasenderapi.com/api/send-message"
    }
  ],
  "active": true
}
```

---

## ⚡ ORDEM DE PRIORIDADE

### HOJE (5h)
1. 06 - Impostos (30min)
2. 07 - Custos (30min)
3. 08 - Folha (30min)
4. 09 - Desvios (1h)
5. 10 - Top (30min)

**Total: 3.5h** (tá tranquilo)

### AMANHÃ (4h)
6. 11-15 (Importantes)

### PRÓXIMA SEMANA (3h)
16. 16-20 (Avançados)

---

## 🎯 META

**Ter os 20 workflows criados e ativos em 3 dias**

Depois será automático. Tudo rodando 24/7.

---

## 📞 SE PRECISAR TEMPLATE

Template completo de um workflow está em:
`04_inadimplencia_realtime.json`

É só copiar e adaptar!

---

**LET'S GO! 🚀 Vamos criar os 15 workflows que faltam!**

