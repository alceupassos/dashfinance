export type FeeType =
  | "boleto_emissao"
  | "boleto_recebimento"
  | "ted"
  | "pix"
  | "cartao_credito"
  | "cartao_debito"
  | "tarifa_manutencao";

export interface ContractFeeSummary {
  id: string;
  company_cnpj: string;
  banco_codigo: string;
  tipo: FeeType;
  taxa_percentual?: number;
  taxa_fixa?: number;
  vigencia_inicio: string;
  vigencia_fim?: string;
  ativo: boolean;
}

export interface ContractFeeDetail extends ContractFeeSummary {
  operadora?: string;
  bandeira?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export type AlertType =
  | "taxa_divergente"
  | "conciliacao_pendente"
  | "pagamento_nao_encontrado"
  | "valor_divergente"
  | "lancamento_orfao"
  | "saldo_divergente";

export type AlertPriority = "baixa" | "media" | "alta" | "critica";

export interface FinancialAlert {
  id: string;
  company_cnpj: string;
  tipo_alerta: AlertType;
  prioridade: AlertPriority;
  titulo: string;
  mensagem: string;
  status: "pendente" | "em_analise" | "resolvido" | "ignorado";
  created_at: string;
}

export interface BankStatementRow {
  id: string;
  data_movimento: string;
  tipo: "credito" | "debito";
  valor: number;
  descricao: string;
  conciliado: boolean;
  conciliacao_id?: string;
}

export const mockAlerts: FinancialAlert[] = [
  {
    id: "alert-1",
    company_cnpj: "12.345.678/0001-90",
    tipo_alerta: "taxa_divergente",
    prioridade: "alta",
    titulo: "Taxa PIX diverge de contrato",
    mensagem: "Banco cobrou 0.04% (contrato 0.032%)",
    status: "pendente",
    created_at: "2025-11-08T08:10:00"
  },
  {
    id: "alert-2",
    company_cnpj: "91.234.567/0001-10",
    tipo_alerta: "conciliacao_pendente",
    prioridade: "media",
    titulo: "Conciliação bancária em aberto",
    mensagem: "Extrato Itaú precisa vincular lançamento de R$4.200",
    status: "em_analise",
    created_at: "2025-11-07T15:20:00"
  }
];

export const mockStatements: BankStatementRow[] = [
  { id: "stmt-1", data_movimento: "2025-11-05", tipo: "debito", valor: 4890, descricao: "Pagamento fornecedores", conciliado: false },
  { id: "stmt-2", data_movimento: "2025-11-07", tipo: "credito", valor: 12300, descricao: "Recebimento cartão", conciliado: true, conciliacao_id: "conc-1" }
];

export interface DivergenceReport {
  id: string;
  tipo: string;
  company_cnpj: string;
  banco_codigo: string;
  esperado: number;
  cobrado: number;
  diferenca: number;
  percentual: number;
  status: "pendente" | "alerta" | "resolvido";
  updated_at: string;
}

export const mockDivergences: DivergenceReport[] = [
  {
    id: "div-1",
    tipo: "taxa_divergente",
    company_cnpj: "12.345.678/0001-90",
    banco_codigo: "033",
    esperado: 0.032,
    cobrado: 0.04,
    diferenca: 0.008,
    percentual: 25,
    status: "alerta",
    updated_at: "2025-11-08T10:30:00"
  },
  {
    id: "div-2",
    tipo: "saldo_divergente",
    company_cnpj: "91.234.567/0001-10",
    banco_codigo: "001",
    esperado: 5000,
    cobrado: 1200,
    diferenca: -3800,
    percentual: -76,
    status: "pendente",
    updated_at: "2025-11-08T07:45:00"
  }
];

export const feeTypeLabels: Record<FeeType, string> = {
  boleto_emissao: "Boleto emissão",
  boleto_recebimento: "Boleto recebimento",
  ted: "TED",
  pix: "PIX",
  cartao_credito: "Cartão crédito",
  cartao_debito: "Cartão débito",
  tarifa_manutencao: "Tarifa manutenção"
};

export const feeStatusBadge = (ativo: boolean) => (ativo ? "success" : "destructive");

export const mockFees: ContractFeeDetail[] = [
  {
    id: "fee-1",
    company_cnpj: "12.345.678/0001-90",
    banco_codigo: "001",
    tipo: "pix",
    taxa_percentual: 0.032,
    vigencia_inicio: "2025-01-01",
    ativo: true,
    observacoes: "Planilha de preços negociada para 2025.",
    created_at: "2025-01-02",
    updated_at: "2025-09-10"
  },
  {
    id: "fee-2",
    company_cnpj: "91.234.567/0001-10",
    banco_codigo: "033",
    tipo: "ted",
    taxa_fixa: 8.5,
    vigencia_inicio: "2024-06-01",
    vigencia_fim: "2025-10-30",
    ativo: false,
    observacoes: "Taxa em revisão para novo contrato.",
    created_at: "2024-05-20",
    updated_at: "2025-04-15"
  },
  {
    id: "fee-3",
    company_cnpj: "12.345.678/0001-90",
    banco_codigo: "104",
    tipo: "boleto_recebimento",
    taxa_percentual: 0.015,
    vigencia_inicio: "2025-07-01",
    ativo: true,
    operadora: "Bradesco",
    bandeira: "Bradesco",
    observacoes: "Inclusão de fee especial para 3º trimestre.",
    created_at: "2025-06-20",
    updated_at: "2025-07-02"
  }
];
