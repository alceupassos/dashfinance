# 🔍 SISTEMA AUDITORIA SENIOR + OCR + IA INTELIGENTE

## 🏗️ ARQUITETURA COMPLETA

```
┌──────────────────────────────────────────────────────────┐
│                 WHATSAPP (Entrada)                        │
├──────────────────────────────────────────────────────────┤
│ Foto Recibo / Nota Fiscal / Extrato / Anotação           │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│            WEBHOOK WHATSAPP (n8n/Function)                │
├──────────────────────────────────────────────────────────┤
│ Recebe foto + contexto                                    │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│                  OCR + IA (Claude)                        │
├──────────────────────────────────────────────────────────┤
│ 1. Extrai texto da imagem (OCR)                          │
│ 2. Identifica tipo de documento                          │
│ 3. Extrai dados estruturados                             │
│ 4. Classifica conta contábil                             │
│ 5. Detecta anomalias/fraudes                             │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│            ANÁLISE AUDITORIA SENIOR                       │
├──────────────────────────────────────────────────────────┤
│ 1. Validar integridade do documento                      │
│ 2. Verificar duplicatas                                  │
│ 3. Conferir limites de aprovação                         │
│ 4. Validar CNPJ/CPF                                      │
│ 5. Checklist de conformidade                             │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│         SUGESTÃO INTELIGENTE DE CONTA                     │
├──────────────────────────────────────────────────────────┤
│ 1. Analisar descrição                                    │
│ 2. Buscar histórico similar                              │
│ 3. Validar contra padrão de empresa                      │
│ 4. Sugerir 3 contas top (com % confiança)                │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│        RESPOSTA ESTRUTURADA NO WHATSAPP                   │
├──────────────────────────────────────────────────────────┤
│ ✓ Documento validado                                     │
│ 💡 Sugestões de conta                                    │
│ ⚠️ Alertas (se houver)                                    │
│ 📊 Resumo dos dados                                       │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│          GUARDAR NO SUPABASE + HISTÓRICO                  │
├──────────────────────────────────────────────────────────┤
│ • Documento original (storage)                           │
│ • Dados estruturados                                     │
│ • Análise auditoria                                      │
│ • Sugestões IA                                           │
│ • Timestamp + user                                       │
└──────────────────────────────────────────────────────────┘
```

---

## 1️⃣ EDGE FUNCTION: PROCESSAR FOTO + OCR

### `finance-oraculo-backend/supabase/functions/audit-process-receipt/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface AuditRequest {
  image_url: string;
  empresa_id: string;
  user_whatsapp: string;
  contexto?: string; // Anotação adicional do usuário
}

serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const { image_url, empresa_id, user_whatsapp, contexto } = await req.json() as AuditRequest;

    console.log("1️⃣ Iniciando processamento de recibo...");

    // ==========================================
    // PASSO 1: OCR COM CLAUDE VISION
    // ==========================================
    console.log("📸 Extraindo texto da imagem com OCR...");

    const ocrResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "url",
                  url: image_url,
                },
              },
              {
                type: "text",
                text: `Analise esta imagem como AUDITOR SENIOR em Contabilidade e Finanças.

EXTRAIA:
1. Tipo de documento (Recibo, NF, Extrato, Cupom, Boleto, etc)
2. CNPJ/CPF (se houver)
3. Razão Social/Nome do fornecedor
4. Data do documento
5. Valor total
6. Descrição dos itens/serviços
7. Números de série/autenticação
8. Dados bancários (se houver)
9. Observações importantes

Retorne em JSON estruturado:
{
  "tipo_documento": "string",
  "fornecedor": {
    "nome": "string",
    "cnpj_cpf": "string"
  },
  "data": "YYYY-MM-DD",
  "valor_total": number,
  "descricao": "string",
  "itens": [
    {"descricao": "string", "quantidade": number, "valor_unitario": number, "valor_total": number}
  ],
  "serie_autenticacao": "string",
  "dados_bancarios": "string",
  "observacoes": "string",
  "confianca_ocr": number
}`,
              },
            ],
          },
        ],
      }),
    });

    if (!ocrResponse.ok) {
      throw new Error(`OCR failed: ${await ocrResponse.text()}`);
    }

    const ocrData = await ocrResponse.json();
    const ocrJson = JSON.parse(
      ocrData.content[0].text.match(/\{[\s\S]*\}/)[0]
    );

    console.log("✅ OCR concluído");
    console.log("Dados extraídos:", JSON.stringify(ocrJson, null, 2));

    // ==========================================
    // PASSO 2: VALIDAÇÃO DE INTEGRIDADE
    // ==========================================
    console.log("🔍 Validando integridade do documento...");

    const validacoes = {
      tem_cnpj_cpf: !!ocrJson.fornecedor?.cnpj_cpf,
      cnpj_cpf_valido: validarCNPJCPF(ocrJson.fornecedor?.cnpj_cpf),
      tem_valor: ocrJson.valor_total > 0,
      valor_razoavel: ocrJson.valor_total < 1000000, // Limite arbitrário
      tem_data: !!ocrJson.data,
      data_valida: validarData(ocrJson.data),
      tem_descricao: ocrJson.descricao?.length > 5,
      ocr_confianca_alta: ocrJson.confianca_ocr > 0.85,
    };

    const integridade_score = (
      Object.values(validacoes).filter(Boolean).length /
      Object.values(validacoes).length
    ) * 100;

    console.log("✅ Integridade validada: " + integridade_score.toFixed(1) + "%");

    // ==========================================
    // PASSO 3: VERIFICAR DUPLICATAS
    // ==========================================
    console.log("🔄 Verificando duplicatas...");

    const duplicatas = await supabase
      .from("audit_documents")
      .select("id, valor_total, data")
      .eq("empresa_id", empresa_id)
      .eq("fornecedor_cnpj", ocrJson.fornecedor?.cnpj_cpf)
      .gte("data", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .lte("data", new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());

    const tem_duplicata =
      duplicatas.data &&
      duplicatas.data.some(
        (d) =>
          Math.abs(d.valor_total - ocrJson.valor_total) < 1 &&
          d.data === ocrJson.data
      );

    console.log(tem_duplicata ? "⚠️ Possível duplicata detectada!" : "✅ Sem duplicatas");

    // ==========================================
    // PASSO 4: SUGERIR CONTA CONTÁBIL COM IA
    // ==========================================
    console.log("💡 Analisando melhor conta contábil...");

    // Buscar histórico similar
    const historico = await supabase
      .from("audit_documents")
      .select("conta_contabil, descricao")
      .eq("empresa_id", empresa_id)
      .textSearch("descricao", ocrJson.descricao.split(" ").slice(0, 3).join(" | "))
      .limit(10);

    const sugestaoResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `Como AUDITOR SENIOR, analise este documento e sugira contas contábeis.

DOCUMENTO:
- Tipo: ${ocrJson.tipo_documento}
- Fornecedor: ${ocrJson.fornecedor?.nome}
- Descrição: ${ocrJson.descricao}
- Valor: R$ ${ocrJson.valor_total}

HISTÓRICO SIMILAR DA EMPRESA:
${historico.data?.map((h) => `- ${h.descricao} → ${h.conta_contabil}`).join("\n") || "Sem histórico"}

PLANO DE CONTAS PADRÃO:
1001 - Caixa
1010 - Banco Conta Corrente
1100 - Aplicações Financeiras
2001 - Fornecedores
2010 - Contas a Pagar
3001 - Receita de Vendas
3010 - Receita de Serviços
4001 - Custos de Produto
4010 - Custos de Serviço
5001 - Despesas Operacionais
5010 - Despesas com Pessoal
5020 - Despesas com Viagens
5030 - Despesas de Comunicação
6001 - Despesas Financeiras
7001 - Outros

RETORNE JSON:
{
  "sugestoes": [
    {"conta": "string", "descricao": "string", "confianca": 0.95},
    {"conta": "string", "descricao": "string", "confianca": 0.80},
    {"conta": "string", "descricao": "string", "confianca": 0.65}
  ],
  "justificativa": "string"
}`,
          },
        ],
      }),
    });

    if (!sugestaoResponse.ok) {
      throw new Error(`Sugestão failed: ${await sugestaoResponse.text()}`);
    }

    const sugestaoData = await sugestaoResponse.json();
    const sugestaoJson = JSON.parse(
      sugestaoData.content[0].text.match(/\{[\s\S]*\}/)[0]
    );

    console.log("✅ Sugestões geradas");

    // ==========================================
    // PASSO 5: ANÁLISE AUDITORIA COMPLETA
    // ==========================================
    console.log("🔐 Executando análise auditoria completa...");

    const auditResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content: `Como AUDITOR SENIOR INDEPENDENTE, faça auditoria deste documento:

DOCUMENTO PROCESSADO:
${JSON.stringify(ocrJson, null, 2)}

CHECKLIST DE AUDITORIA:
1. ✓ VALIDAÇÃO FORMAL
   - Documento tem CNPJ/CPF válido?
   - Números de série coerentes?
   - Assinatura/autenticação presente?
   - Data dentro do período fiscal?

2. ✓ VALIDAÇÃO CONTÁBIL
   - Valor total bate com parcelas?
   - Descrição clara e específica?
   - Não é lançamento duplicado?
   - Fornecedor é empresa conhecida?

3. ✓ VALIDAÇÃO COMPLIANCE
   - Fornecedor ativo na receita?
   - Documento tem retenção de IR/INSS?
   - Forma de pagamento apropriada?
   - Autorização necessária foi obtida?

4. ✓ DETECÇÃO DE ANOMALIAS
   - Valor atípico para categoria?
   - Padrão de gasto anormal?
   - Possível fraude/superfaturamento?
   - Relacionada com política anti-corrupção?

5. ✓ RISK ASSESSMENT
   - Risco financeiro
   - Risco de conformidade
   - Risco reputacional

RETORNE JSON:
{
  "validacoes_formais": {
    "status": "APROVADO|PENDÊNCIA|REJEITADO",
    "detalhes": "string"
  },
  "validacoes_contabeis": {
    "status": "APROVADO|PENDÊNCIA|REJEITADO",
    "detalhes": "string"
  },
  "validacoes_compliance": {
    "status": "APROVADO|PENDÊNCIA|REJEITADO",
    "detalhes": "string"
  },
  "anomalias_detectadas": ["string"],
  "risk_assessment": {
    "nivel": "BAIXO|MÉDIO|ALTO",
    "riscos": ["string"]
  },
  "parecer_final": "string",
  "recomendacoes": ["string"]
}`,
          },
        ],
      }),
    });

    if (!auditResponse.ok) {
      throw new Error(`Audit analysis failed: ${await auditResponse.text()}`);
    }

    const auditData = await auditResponse.json();
    const auditJson = JSON.parse(
      auditData.content[0].text.match(/\{[\s\S]*\}/)[0]
    );

    console.log("✅ Análise auditoria concluída");

    // ==========================================
    // PASSO 6: SALVAR TUDO NO BANCO
    // ==========================================
    console.log("💾 Salvando análise no banco de dados...");

    const { data: savedDoc, error: saveError } = await supabase
      .from("audit_documents")
      .insert({
        empresa_id,
        user_whatsapp,
        tipo_documento: ocrJson.tipo_documento,
        fornecedor_nome: ocrJson.fornecedor?.nome,
        fornecedor_cnpj: ocrJson.fornecedor?.cnpj_cpf,
        data: ocrJson.data,
        valor_total: ocrJson.valor_total,
        descricao: ocrJson.descricao,
        imagem_url: image_url,
        ocr_dados: ocrJson,
        validacoes: validacoes,
        integridade_score,
        tem_duplicata,
        sugestoes_conta: sugestaoJson.sugestoes,
        audit_checklist: auditJson,
        status: auditJson.risk_assessment.nivel === "ALTO" ? "PENDENTE_ANALISE" : "PROCESSADO",
        contexto_usuario: contexto,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) throw saveError;

    console.log("✅ Documento salvo com ID:", savedDoc.id);

    // ==========================================
    // PASSO 7: MONTAR RESPOSTA PARA WHATSAPP
    // ==========================================
    console.log("📨 Montando resposta estruturada...");

    let resposta = "✅ *ANÁLISE CONCLUÍDA*\n\n";

    // Cabeçalho
    resposta += `📋 *Documento:* ${ocrJson.tipo_documento}\n`;
    resposta += `🏢 *Fornecedor:* ${ocrJson.fornecedor?.nome}\n`;
    resposta += `💵 *Valor:* R$ ${ocrJson.valor_total.toLocaleString("pt-BR", {minimumFractionDigits: 2})}\n`;
    resposta += `📅 *Data:* ${new Date(ocrJson.data).toLocaleDateString("pt-BR")}\n`;
    resposta += `🔍 *Integridade:* ${integridade_score.toFixed(1)}%\n\n`;

    // Status
    const statusIcon =
      auditJson.risk_assessment.nivel === "ALTO"
        ? "🔴"
        : auditJson.risk_assessment.nivel === "MÉDIO"
          ? "🟡"
          : "🟢";
    resposta += `${statusIcon} *RISCO:* ${auditJson.risk_assessment.nivel}\n`;

    // Sugestões de conta
    resposta += "\n💡 *CONTAS SUGERIDAS:*\n";
    sugestaoJson.sugestoes.slice(0, 3).forEach((s: any, i: number) => {
      resposta += `${i + 1}. ${s.conta} - ${s.descricao} (${(s.confianca * 100).toFixed(0)}%)\n`;
    });

    // Alertas se houver
    if (auditJson.anomalias_detectadas?.length > 0) {
      resposta += "\n⚠️ *ANOMALIAS DETECTADAS:*\n";
      auditJson.anomalias_detectadas
        .slice(0, 3)
        .forEach((a: string) => {
          resposta += `• ${a}\n`;
        });
    }

    // Duplicata
    if (tem_duplicata) {
      resposta += "\n🔄 *ATENÇÃO:* Possível lançamento duplicado!\n";
    }

    // Recomendações
    if (auditJson.recomendacoes?.length > 0) {
      resposta += "\n📝 *RECOMENDAÇÕES:*\n";
      auditJson.recomendacoes.slice(0, 2).forEach((r: string) => {
        resposta += `• ${r}\n`;
      });
    }

    // Resumo dos itens
    if (ocrJson.itens?.length > 0) {
      resposta += "\n📦 *ITENS:*\n";
      ocrJson.itens.slice(0, 3).forEach((item: any) => {
        resposta += `• ${item.descricao}: ${item.quantidade}x R$ ${item.valor_unitario.toFixed(2)}\n`;
      });
      if (ocrJson.itens.length > 3) {
        resposta += `• ... e mais ${ocrJson.itens.length - 3} itens\n`;
      }
    }

    // Call to action
    resposta += "\n➡️ *PRÓXIMOS PASSOS:*\n";
    resposta += "1. Revisar sugestões de conta\n";
    resposta += "2. Confirmar: /confirmar [número da conta]\n";
    resposta += "3. Ou rejeitar: /rejeitar\n";

    console.log("✅ Resposta pronta");

    return new Response(
      JSON.stringify({
        sucesso: true,
        document_id: savedDoc.id,
        resposta_whatsapp: resposta,
        dados_auditoria: {
          integridade_score,
          tem_duplicata,
          risk_level: auditJson.risk_assessment.nivel,
          status: savedDoc.status,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Erro:", error);
    return new Response(
      JSON.stringify({
        sucesso: false,
        erro: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function validarCNPJCPF(cnpj_cpf: string | null | undefined): boolean {
  if (!cnpj_cpf) return false;

  const cleaned = cnpj_cpf.replace(/\D/g, "");

  if (cleaned.length === 11) {
    // CPF
    return validarCPF(cleaned);
  } else if (cleaned.length === 14) {
    // CNPJ
    return validarCNPJ(cleaned);
  }

  return false;
}

function validarCPF(cpf: string): boolean {
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(10, 11))) return false;

  return true;
}

function validarCNPJ(cnpj: string): boolean {
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  let size = cnpj.length - 2;
  let numbers = cnpj.substring(0, size);
  let digits = cnpj.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += numbers.charAt(size - i) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  size = size + 1;
  numbers = cnpj.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += numbers.charAt(size - i) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}

function validarData(data: string): boolean {
  const date = new Date(data);
  return date instanceof Date && !isNaN(date.getTime());
}
```

---

## 2️⃣ TABELAS SUPABASE

```sql
-- Tabela para armazenar documentos auditados
CREATE TABLE audit_documents (
  id BIGSERIAL PRIMARY KEY,
  empresa_id UUID NOT NULL,
  user_whatsapp TEXT NOT NULL,
  tipo_documento TEXT,
  fornecedor_nome TEXT,
  fornecedor_cnpj TEXT,
  data DATE,
  valor_total NUMERIC,
  descricao TEXT,
  imagem_url TEXT,
  
  -- Dados do OCR
  ocr_dados JSONB,
  
  -- Validações
  validacoes JSONB,
  integridade_score NUMERIC,
  tem_duplicata BOOLEAN DEFAULT FALSE,
  
  -- Sugestões IA
  sugestoes_conta JSONB,
  conta_contabil_final TEXT,
  
  -- Análise Auditoria
  audit_checklist JSONB,
  status TEXT DEFAULT 'PROCESSADO', -- PROCESSADO, PENDENTE_ANALISE, APROVADO, REJEITADO
  
  -- Contexto
  contexto_usuario TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_audit_empresa ON audit_documents(empresa_id);
CREATE INDEX idx_audit_cnpj ON audit_documents(fornecedor_cnpj);
CREATE INDEX idx_audit_data ON audit_documents(data);
CREATE INDEX idx_audit_status ON audit_documents(status);

-- Tabela para histórico de alterações
CREATE TABLE audit_documents_log (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT REFERENCES audit_documents(id),
  acao TEXT,
  dados_anteriores JSONB,
  dados_novos JSONB,
  user_whatsapp TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela para padrões de lançamento (histórico)
CREATE TABLE audit_lancamento_patterns (
  id BIGSERIAL PRIMARY KEY,
  empresa_id UUID NOT NULL,
  palavra_chave TEXT,
  conta_contabil TEXT,
  frequencia INT DEFAULT 1,
  confianca NUMERIC DEFAULT 0.5,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índice para busca
CREATE INDEX idx_pattern_empresa_palavra ON audit_lancamento_patterns(empresa_id, palavra_chave);
```

---

## 3️⃣ N8N WORKFLOW: INTEGRAÇÃO WHATSAPP

```json
{
  "name": "Audit Receipt Processor - WhatsApp Integration",
  "nodes": [
    {
      "name": "WhatsApp Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "whatsapp/audit-receipt",
        "method": "POST"
      }
    },
    {
      "name": "Extrai URL da Foto",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "const msg = $input.all()[0].json; return [{ json: { image_url: msg.media_url, numero: msg.from, contexto: msg.text } }];"
      }
    },
    {
      "name": "Chamar Edge Function Auditoria",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://newczbjzzfkwwnpfmygm.supabase.co/functions/v1/audit-process-receipt",
        "method": "POST",
        "bodyParameters": {
          "image_url": "{{ $node['Extrai URL da Foto'].json.image_url }}",
          "empresa_id": "{{ $json.empresa_id }}",
          "user_whatsapp": "{{ $node['Extrai URL da Foto'].json.numero }}",
          "contexto": "{{ $node['Extrai URL da Foto'].json.contexto }}"
        }
      }
    },
    {
      "name": "Enviar Resposta WhatsApp",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://wasenderapi.com/api/send-message",
        "method": "POST",
        "body": {
          "to": "{{ $node['Extrai URL da Foto'].json.numero }}",
          "text": "{{ $node['Chamar Edge Function Auditoria'].json.resposta_whatsapp }}"
        }
      }
    },
    {
      "name": "Guardar na Base",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "method": "insert",
        "table": "automation_runs",
        "data": {
          "automation_type": "audit_receipt",
          "resultado": "{{ $node['Chamar Edge Function Auditoria'].json }}",
          "status": "success"
        }
      }
    }
  ]
}
```

---

## 4️⃣ FUNÇÕES COMPLEMENTARES

### A) Confirmar Lançamento
```typescript
serve(async (req) => {
  const { document_id, conta_contabil, numero_whatsapp } = await req.json();

  // Atualizar documento
  await supabase
    .from("audit_documents")
    .update({
      conta_contabil_final: conta_contabil,
      status: "APROVADO",
      updated_at: new Date().toISOString(),
    })
    .eq("id", document_id);

  // Inserir padrão de lançamento
  const doc = await supabase
    .from("audit_documents")
    .select("*")
    .eq("id", document_id)
    .single();

  await supabase
    .from("audit_lancamento_patterns")
    .insert({
      empresa_id: doc.data.empresa_id,
      palavra_chave: doc.data.descricao.split(" ")[0],
      conta_contabil,
      confianca: 0.9,
    });

  return new Response(JSON.stringify({ sucesso: true }));
});
```

### B) Gerar Relatório Auditoria
```typescript
serve(async (req) => {
  const { empresa_id, data_inicio, data_fim } = await req.json();

  const docs = await supabase
    .from("audit_documents")
    .select("*")
    .eq("empresa_id", empresa_id)
    .gte("created_at", data_inicio)
    .lte("created_at", data_fim);

  const relatorio = {
    periodo: `${data_inicio} a ${data_fim}`,
    total_documentos: docs.data.length,
    valor_total: docs.data.reduce((sum, d) => sum + d.valor_total, 0),
    documentos_aprovados: docs.data.filter(d => d.status === "APROVADO").length,
    documentos_pendentes: docs.data.filter(d => d.status === "PENDENTE_ANALISE").length,
    risco_detectado: docs.data.filter(d => d.audit_checklist?.risk_assessment?.nivel === "ALTO").length,
    integridade_media: docs.data.reduce((sum, d) => sum + d.integridade_score, 0) / docs.data.length,
  };

  return new Response(JSON.stringify(relatorio));
});
```

---

## 5️⃣ FLUXO USUÁRIO

```
👤 USUÁRIO: Tira foto do recibo
    ↓
📱 WhatsApp: Envia foto + "Recibo do Uber"
    ↓
🔗 Webhook: Recebe e dispara workflow N8N
    ↓
🤖 Edge Function: 
   1. OCR extrai dados
   2. Valida integridade
   3. Busca duplicatas
   4. Sugere 3 contas (com IA)
   5. Faz auditoria completa
   6. Salva no banco
    ↓
📨 WhatsApp: Retorna
   ✅ ANÁLISE CONCLUÍDA
   🏢 Fornecedor: Uber do Brasil
   💵 Valor: R$ 45,50
   📅 Data: 09/11/2025
   🔍 Integridade: 98%
   
   💡 CONTAS SUGERIDAS:
   1. 5020 - Despesas com Viagens (95%)
   2. 5030 - Despesas de Transporte (80%)
   3. 5001 - Despesas Operacionais (65%)
   
   ➡️ Confirmar: /confirmar 5020
    ↓
👤 USUÁRIO: Digita "/confirmar 5020"
    ↓
🔄 Edge Function: Atualiza documento e padrão
    ↓
📨 WhatsApp: Confirma
   ✅ Lançamento confirmado em 5020
   📊 Próximo padrão: Uber → Despesas com Viagens
```

---

## 6️⃣ COMAND
OS WHATSAPP

```
/recibo          → Enviar foto de recibo
/relatorio       → Relatório de auditoria do período
/padroes         → Ver padrões de lançamento
/rejeitar        → Rejeitar análise
/confirmar <n>   → Confirmar lançamento
/pendentes       → Ver documentos pendentes
/duplicatas      → Ver possíveis duplicatas
/export          → Exportar relatório
```

---

## 7️⃣ BENEFÍCIOS

✅ **Automatização Total**
- OCR automático
- Análise sem intervenção
- Sugestões inteligentes

✅ **Auditoria Robusta**
- Validação formal
- Análise contábil
- Compliance checking

✅ **Inteligência**
- Aprende com histórico
- Detecta anomalias
- Previne fraudes

✅ **Conformidade**
- Rastreia tudo
- Histórico completo
- Pronto para auditoria

✅ **Rápido**
- 30 segundos por documento
- Direto do WhatsApp
- Sem paperwork

---

## 🎯 IMPLEMENTAÇÃO

### Fase 1 (Agora)
- [x] Edge Function audit-process-receipt
- [x] Tabelas Supabase
- [x] N8N Workflow

### Fase 2 (Próxima semana)
- [ ] Testar com Jessica
- [ ] Ajustar prompts
- [ ] Refinar sugestões

### Fase 3 (Semana 3)
- [ ] Expandir para todos clientes
- [ ] Dashboard de auditoria
- [ ] Relatórios automáticos

---

**Sistema pronto para transformar a auditoria financeira em algo automático, inteligente e auditável!** 🚀

