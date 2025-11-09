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
  contexto?: string;
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { image_url, empresa_id, user_whatsapp, contexto } = (await req.json()) as AuditRequest;

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
  "confianca_ocr": 0.95
}`,
              },
            ],
          },
        ],
      }),
    });

    if (!ocrResponse.ok) {
      const error = await ocrResponse.text();
      console.error("OCR Error:", error);
      throw new Error(`OCR failed: ${error}`);
    }

    const ocrData = await ocrResponse.json();
    const ocrText = ocrData.content[0].text;
    const jsonMatch = ocrText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from OCR response");
    }
    const ocrJson = JSON.parse(jsonMatch[0]);

    console.log("✅ OCR concluído");

    // ==========================================
    // PASSO 2: VALIDAÇÃO DE INTEGRIDADE
    // ==========================================
    console.log("🔍 Validando integridade do documento...");

    const validacoes = {
      tem_cnpj_cpf: !!ocrJson.fornecedor?.cnpj_cpf,
      cnpj_cpf_valido: validarCNPJCPF(ocrJson.fornecedor?.cnpj_cpf),
      tem_valor: ocrJson.valor_total > 0,
      valor_razoavel: ocrJson.valor_total < 1000000,
      tem_data: !!ocrJson.data,
      data_valida: validarData(ocrJson.data),
      tem_descricao: ocrJson.descricao?.length > 5,
      ocr_confianca_alta: ocrJson.confianca_ocr > 0.8,
    };

    const integridade_score =
      (Object.values(validacoes).filter(Boolean).length /
        Object.values(validacoes).length) *
      100;

    console.log("✅ Integridade validada: " + integridade_score.toFixed(1) + "%");

    // ==========================================
    // PASSO 3: VERIFICAR DUPLICATAS
    // ==========================================
    console.log("🔄 Verificando duplicatas...");

    const duplicatas = await supabase
      .from("audit_documents")
      .select("id, valor_total, data")
      .eq("empresa_id", empresa_id)
      .eq("fornecedor_cnpj", ocrJson.fornecedor?.cnpj_cpf || "")
      .gte("data", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .lte(
        "data",
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      );

    const tem_duplicata =
      duplicatas.data &&
      duplicatas.data.some(
        (d) =>
          Math.abs(d.valor_total - ocrJson.valor_total) < 1 &&
          d.data === ocrJson.data
      );

    console.log(
      tem_duplicata
        ? "⚠️ Possível duplicata detectada!"
        : "✅ Sem duplicatas"
    );

    // ==========================================
    // PASSO 4: SUGERIR CONTA CONTÁBIL COM IA
    // ==========================================
    console.log("💡 Analisando melhor conta contábil...");

    const historico = await supabase
      .from("audit_documents")
      .select("conta_contabil_final, descricao")
      .eq("empresa_id", empresa_id)
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
${historico.data?.map((h) => `- ${h.descricao} → ${h.conta_contabil_final}`).join("\n") || "Sem histórico"}

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
    const sugestaoText = sugestaoData.content[0].text;
    const sugestaoMatch = sugestaoText.match(/\{[\s\S]*\}/);
    if (!sugestaoMatch) {
      throw new Error("Could not extract JSON from suggestion response");
    }
    const sugestaoJson = JSON.parse(sugestaoMatch[0]);

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
1. VALIDAÇÃO FORMAL
   - Documento tem CNPJ/CPF válido?
   - Números de série coerentes?
   - Data dentro do período fiscal?

2. VALIDAÇÃO CONTÁBIL
   - Valor total bate com parcelas?
   - Descrição clara e específica?
   - Não é lançamento duplicado?
   - Fornecedor é empresa conhecida?

3. DETECÇÃO DE ANOMALIAS
   - Valor atípico para categoria?
   - Padrão de gasto anormal?
   - Possível fraude/superfaturamento?

4. RISK ASSESSMENT
   - Risco financeiro: BAIXO, MÉDIO, ALTO
   - Risco de conformidade: BAIXO, MÉDIO, ALTO

RETORNE JSON:
{
  "validacoes": {
    "formal": "APROVADO|PENDÊNCIA|REJEITADO",
    "contabil": "APROVADO|PENDÊNCIA|REJEITADO"
  },
  "anomalias_detectadas": ["string"],
  "risk_assessment": {
    "nivel": "BAIXO|MÉDIO|ALTO"
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
    const auditText = auditData.content[0].text;
    const auditMatch = auditText.match(/\{[\s\S]*\}/);
    if (!auditMatch) {
      throw new Error("Could not extract JSON from audit response");
    }
    const auditJson = JSON.parse(auditMatch[0]);

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
        status:
          auditJson.risk_assessment.nivel === "ALTO"
            ? "PENDENTE_ANALISE"
            : "PROCESSADO",
        contexto_usuario: contexto,
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

    resposta += `📋 *Documento:* ${ocrJson.tipo_documento}\n`;
    resposta += `🏢 *Fornecedor:* ${ocrJson.fornecedor?.nome}\n`;
    resposta += `💵 *Valor:* R$ ${ocrJson.valor_total.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
    })}\n`;
    resposta += `📅 *Data:* ${new Date(ocrJson.data).toLocaleDateString("pt-BR")}\n`;
    resposta += `🔍 *Integridade:* ${integridade_score.toFixed(1)}%\n\n`;

    const statusIcon =
      auditJson.risk_assessment.nivel === "ALTO"
        ? "🔴"
        : auditJson.risk_assessment.nivel === "MÉDIO"
          ? "🟡"
          : "🟢";
    resposta += `${statusIcon} *RISCO:* ${auditJson.risk_assessment.nivel}\n`;

    resposta += "\n💡 *CONTAS SUGERIDAS:*\n";
    sugestaoJson.sugestoes.slice(0, 3).forEach((s: any, i: number) => {
      resposta += `${i + 1}. ${s.conta} - ${s.descricao} (${(s.confianca * 100).toFixed(0)}%)\n`;
    });

    if (auditJson.anomalias_detectadas?.length > 0) {
      resposta += "\n⚠️ *ANOMALIAS DETECTADAS:*\n";
      auditJson.anomalias_detectadas
        .slice(0, 3)
        .forEach((a: string) => {
          resposta += `• ${a}\n`;
        });
    }

    if (tem_duplicata) {
      resposta += "\n🔄 *ATENÇÃO:* Possível lançamento duplicado!\n";
    }

    if (auditJson.recomendacoes?.length > 0) {
      resposta += "\n📝 *RECOMENDAÇÕES:*\n";
      auditJson.recomendacoes.slice(0, 2).forEach((r: string) => {
        resposta += `• ${r}\n`;
      });
    }

    if (ocrJson.itens?.length > 0) {
      resposta += "\n📦 *ITENS:*\n";
      ocrJson.itens.slice(0, 3).forEach((item: any) => {
        resposta += `• ${item.descricao}: ${item.quantidade}x R$ ${item.valor_unitario.toFixed(2)}\n`;
      });
      if (ocrJson.itens.length > 3) {
        resposta += `• ... e mais ${ocrJson.itens.length - 3} itens\n`;
      }
    }

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
        erro: error instanceof Error ? error.message : String(error),
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
    return validarCPF(cleaned);
  } else if (cleaned.length === 14) {
    return validarCNPJ(cleaned);
  }

  return false;
}

function validarCPF(cpf: string): boolean {
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }

  let remainder = (sum * 10) % 11;
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
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  size = size + 1;
  numbers = cnpj.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
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

