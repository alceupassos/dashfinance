import { describe, expect, it } from "vitest";
import {
  normalizeConversationDetail,
  normalizeConversationSummary,
  normalizeFinancialAlertRow,
  normalizeGroupAliasRow,
  normalizeTemplate
} from "@/lib/api";

describe("Sample responses compatibility", () => {
  it("normalizes WhatsApp conversation summaries", () => {
    const sample = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      empresa_cnpj: "12.345.678/0001-90",
      contato_phone: "5511999999999",
      contato_nome: "João Silva",
      contato_tipo: "cliente",
      ultimaMensagem: "Oi, tudo bem?",
      ultimaMensagemEm: "2025-11-09T10:30:00Z",
      ativo: true,
      status: "ativo",
      totalMensagens: 15,
      naoLidas: 2,
      criadoEm: "2025-11-01T08:00:00Z",
      ultimaAtualizacao: "2025-11-09T10:30:00Z"
    };

    const normalized = normalizeConversationSummary(sample);

    expect(normalized).toMatchObject({
      id: sample.id,
      empresa_cnpj: sample.empresa_cnpj,
      contato_phone: sample.contato_phone,
      status: "ativo",
      totalMensagens: 15,
      ultimaMensagem: "Oi, tudo bem?"
    });
  });

  it("normalizes WhatsApp conversation detail with message history", () => {
    const sample = {
      success: true,
      data: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        empresa_cnpj: "12.345.678/0001-90",
        contato_phone: "5511999999999",
        contato_nome: "João Silva",
        contato_tipo: "cliente",
        ativo: true,
        status: "ativo",
        ultimaMensagem: "Oi, tudo bem?",
        ultimaMensagemEm: "2025-11-09T10:30:00Z",
        totalMensagens: 15,
        naoLidas: 2,
        criadoEm: "2025-11-01T08:00:00Z",
        ultimaAtualizacao: "2025-11-09T10:30:00Z",
        mensagens: [
          {
            id: "msg-uuid-1",
            textoEnviado: "Olá João, como vai?",
            textoRecebido: null,
            timestamp: "2025-11-09T10:00:00Z",
            tipo: "enviada",
            status: "entregue",
            templateUsada: null,
            variaveisUsadas: null
          },
          {
            id: "msg-uuid-2",
            textoEnviado: null,
            textoRecebido: "Oi, tudo certo!",
            timestamp: "2025-11-09T10:05:00Z",
            tipo: "recebida",
            status: "lida",
            templateUsada: null,
            variaveisUsadas: null
          },
          {
            id: "msg-uuid-3",
            textoEnviado: "Sua fatura de R$ 1.500 vence amanhã",
            textoRecebido: null,
            timestamp: "2025-11-09T10:30:00Z",
            tipo: "enviada",
            status: "entregue",
            templateUsada: "template-fatura",
            variaveisUsadas: {
              valor: "R$ 1.500",
              vencimento: "2025-11-10"
            }
          }
        ]
      }
    };

    const detail = normalizeConversationDetail(sample);
    expect(detail.id).toBe(sample.data.id);
    expect(detail.mensagens).toHaveLength(3);
    expect(detail.mensagens[1]).toMatchObject({
      id: "msg-uuid-2",
      tipo: "recebida",
      textoRecebido: "Oi, tudo certo!"
    });
  });

  it("normalizes WhatsApp template payload", () => {
    const sample = {
      success: true,
      data: {
        id: "template-001",
        nome: "Recebimento de Pagamento",
        descricao: "Confirma recebimento de pagamento",
        categoria: "financeiro",
        corpo: "Olá {{nome}}, seu pagamento de {{valor}} foi recebido em {{data}}",
        variaveisObrigatorias: ["nome", "valor", "data"],
        variaveisOpcionais: ["referencia"],
        status: "ativa",
        horaEnvioRecomendada: "09:00",
        empresaCnpj: "12.345.678/0001-90",
        criadoEm: "2025-11-01T08:00:00Z",
        ultimaAtualizacao: "2025-11-09T08:00:00Z"
      }
    };

    const template = normalizeTemplate(sample);
    expect(template).toMatchObject({
      id: "template-001",
      nome: "Recebimento de Pagamento",
      categoria: "financeiro",
      status: "ativa",
      variaveisObrigatorias: ["nome", "valor", "data"],
      variaveisOpcionais: ["referencia"]
    });
  });

  it("normalizes group alias response", () => {
    const sample = {
      success: true,
      data: {
        id: "group-001",
        label: "Clientes VIP",
        description: "Clientes com alto valor de receita",
        color: "#FFD700",
        icon: "star",
        members: [
          {
            id: "member-001",
            alias_id: "group-001",
            company_cnpj: "12.345.678/0001-90",
            company_name: "Empresa A LTDA",
            position: 1,
            integracao_f360: true,
            integracao_omie: false,
            whatsapp_ativo: true
          },
          {
            id: "member-002",
            alias_id: "group-001",
            company_cnpj: "98.765.432/0001-10",
            company_name: "Empresa B LTDA",
            position: 2,
            integracao_f360: false,
            integracao_omie: true,
            whatsapp_ativo: false
          }
        ]
      }
    };

    const group = normalizeGroupAliasRow(sample.data);
    expect(group.id).toBe("group-001");
    expect(group.members).toHaveLength(2);
    expect(group.members[0]).toMatchObject({
      company_cnpj: "12.345.678/0001-90",
      company_name: "Empresa A LTDA",
      position: 1
    });
  });

  it("normalizes financial alert payload", () => {
    const sample = {
      id: "alert-001",
      company_cnpj: "12.345.678/0001-90",
      tipo: "taxa_divergencia",
      prioridade: "alta",
      titulo: "Taxa de boleto divergente",
      descricao: "Taxa cobrada 0.50% acima do contratado",
      status: "resolvido",
      dados: {
        taxa_contratada: 1.5,
        taxa_cobrada: 2.0,
        diferenca: 0.5
      },
      resolucao_tipo: "corrigido",
      resolucao_observacoes: "Taxa corrigida no banco após contato",
      resolvido_por: "user-admin-123",
      created_at: "2025-11-09T08:00:00Z",
      resolved_at: "2025-11-09T11:00:00Z"
    };

    const alert = normalizeFinancialAlertRow(sample);
    expect(alert).toMatchObject({
      id: "alert-001",
      company_cnpj: "12.345.678/0001-90",
      titulo: "Taxa de boleto divergente",
      status: "resolvido",
      prioridade: "alta"
    });
  });
});

