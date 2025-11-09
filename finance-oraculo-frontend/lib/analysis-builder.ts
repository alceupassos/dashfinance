import { DashboardMetricsResponse, KpiMonthlyResponse, ProfileResponse } from "@/lib/api";
import { AnalysisStyle } from "@/store/use-dashboard-store";
import { formatCurrency, formatPercent } from "@/lib/formatters";

export type ReportStatus = "ok" | "warning" | "critical";

export interface AnalysisBuilderInput {
  profile?: ProfileResponse | null;
  kpi?: KpiMonthlyResponse | null;
  metrics?: DashboardMetricsResponse | null;
  analyzeOutput?: { sections?: any[] } | null;
  period: { from: string; to: string };
  target: { type: "cnpj" | "alias"; value: string };
  style: AnalysisStyle;
}

export interface AnalysisHeaderCard {
  label: string;
  value: string;
  help?: string;
}

export interface AnalysisHeader {
  title: string;
  subtitle: string;
  score: {
    value: number;
    status: ReportStatus;
  };
  cards: AnalysisHeaderCard[];
  summary: string;
}

export type VisualType = "line" | "bar" | "cards" | "table" | "list";

export interface VisualItem {
  type: VisualType;
  data: unknown;
  meta?: Record<string, unknown>;
}

export interface HighlightItem {
  label: string;
  description: string;
  variant: "success" | "warning" | "error";
}

export interface ChecklistSection {
  title: string;
  subtitle: string;
  timeframe: "30 dias" | "60 dias" | "90 dias";
  items: string[];
}

export interface ReportBlock {
  id: string;
  title: string;
  description: string;
  visuals: VisualItem[];
  highlights?: HighlightItem[];
}

export interface AnalysisReport {
  header: AnalysisHeader;
  blocks: ReportBlock[];
  checklist: string[];
  checklistSections: ChecklistSection[];
  status: ReportStatus;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const monthLabel = (value: string) => {
  if (!value) return "--";
  const date = value.length === 7 ? new Date(`${value}-01T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit"
  })
    .format(date)
    .replace(".", "");
};

function buildSummary(style: AnalysisStyle, totalRevenue: number, totalProfit: number, avgMargin: number) {
  const receita = formatCurrency(totalRevenue);
  const lucro = formatCurrency(totalProfit);
  const margem = formatPercent(avgMargin / 100);

  if (style === "creative") {
    return `Receita acumulada de ${receita}, com lucro no período de ${lucro} e margem média em ${margem}. Vamos usar esses números como base para o plano de evolução.`;
  }

  return `Receita acumulada: ${receita}. Lucro acumulado: ${lucro}. Margem média: ${margem}.`;
}

function buildStatus(score: number): ReportStatus {
  if (score >= 70) return "ok";
  if (score >= 45) return "warning";
  return "critical";
}

function calculateScore(avgMargin: number, totalProfit: number, cashNet: number) {
  const marginComponent = clamp(avgMargin, -30, 30);
  const profitComponent = totalProfit >= 0 ? 15 : -20;
  const cashComponent = cashNet >= 0 ? 15 : -15;

  const score = clamp(55 + marginComponent * 0.8 + profitComponent + cashComponent, 0, 100);
  return Math.round(score);
}

function buildHighlights(metrics?: DashboardMetricsResponse | null): HighlightItem[] {
  if (!metrics?.alerts?.length) return [];
  return metrics.alerts.slice(0, 3).map((alert) => ({
    label: alert.title,
    description: alert.description,
    variant: alert.type === "error" ? "error" : alert.type === "warning" ? "warning" : "success"
  }));
}

function buildChecklist(blocks: ReportBlock[], status: ReportStatus): string[] {
  const checklist = new Set<string>();

  blocks.forEach((block) => {
    if (block.id === "cash") {
      const hasHighOutflow = block.highlights?.some((item) => item.variant !== "success");
      if (hasHighOutflow) {
        checklist.add("Revisar prazos de recebimento/pagamento e renegociar saídas críticas.");
      }
    }
    if (block.id === "risks") {
      block.highlights?.forEach((item) => {
        if (item.variant !== "success") {
          checklist.add(item.description);
        }
      });
    }
  });

  if (status === "critical") {
    checklist.add("Agendar war-room financeiro nas próximas 48h para revisar plano de caixa.");
  }

  if (checklist.size === 0) {
    checklist.add("Monitorar métricas semanalmente e validar se o plano atual mantém a tendência positiva.");
  }

  return Array.from(checklist);
}

function buildChecklistSections(checklist: string[]): ChecklistSection[] {
  const slots: Record<ChecklistSection["timeframe"], string[]> = {
    "30 dias": [],
    "60 dias": [],
    "90 dias": []
  };

  checklist.forEach((item, index) => {
    if (index < 2) {
      slots["30 dias"].push(item);
    } else if (index < 4) {
      slots["60 dias"].push(item);
    } else {
      slots["90 dias"].push(item);
    }
  });

  return ["30 dias", "60 dias", "90 dias"].map((timeframe) => ({
    title: `${timeframe} · Prioridades`,
    subtitle: `Ações recomendadas em ${timeframe.toLowerCase()}`,
    timeframe: timeframe as ChecklistSection["timeframe"],
    items: slots[timeframe as ChecklistSection["timeframe"]]
  }));
}

export function buildAnalysisReport({
  profile,
  kpi,
  metrics,
  analyzeOutput,
  period,
  target,
  style
}: AnalysisBuilderInput): AnalysisReport {
  const lineSeries = kpi?.lineSeries ?? [];
  const cashflowSeries = kpi?.cashflow ?? [];
  const bridgeSeries = kpi?.bridge ?? [];
  const tableRows = kpi?.table ?? [];

  const totalRevenue = lineSeries.reduce((acc, item) => acc + (item.revenue ?? 0), 0);
  const totalExpenses = lineSeries.reduce((acc, item) => acc + (item.expenses ?? 0), 0);
  const totalProfit = lineSeries.reduce((acc, item) => acc + (item.profit ?? 0), 0);
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const cashIn = cashflowSeries.reduce((acc, item) => acc + (item.in ?? 0), 0);
  const cashOut = cashflowSeries.reduce((acc, item) => acc + (item.out ?? 0), 0);
  const cashNet = cashIn - cashOut;
  const burnRate = lineSeries.length > 0 ? cashNet / lineSeries.length : 0;
  const runway = burnRate < 0 ? Math.max(Math.round(Math.abs(totalProfit) / Math.abs(burnRate)), 0) : Infinity;

  const lastMonth = lineSeries[lineSeries.length - 1];
  const prevMonth = lineSeries[lineSeries.length - 2];

  const revenueDelta =
    lastMonth && prevMonth && prevMonth.revenue !== 0
      ? ((lastMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100
      : 0;

  const marginDelta =
    lastMonth && prevMonth && prevMonth.revenue !== 0
      ? (((lastMonth.profit / lastMonth.revenue) - (prevMonth.profit / prevMonth.revenue)) * 100)
      : 0;

  const score = calculateScore(avgMargin, totalProfit, cashNet);
  const status = buildStatus(score);

  const periodLabel = `${new Intl.DateTimeFormat("pt-BR").format(new Date(period.from))} → ${new Intl.DateTimeFormat(
    "pt-BR"
  ).format(new Date(period.to))}`;

  const header: AnalysisHeader = {
    title: "Análise Financeira · " + (target.type === "alias" ? `Grupo ${target.value}` : target.value),
    subtitle: `Período: ${periodLabel}`,
    score: {
      value: score,
      status
    },
    cards: [
      { label: "Receita acumulada", value: formatCurrency(totalRevenue) },
      { label: "Lucro acumulado", value: formatCurrency(totalProfit) },
      { label: "Margem média", value: formatPercent(avgMargin / 100) },
      { label: "Fluxo líquido", value: formatCurrency(cashNet) }
    ],
    summary: buildSummary(style, totalRevenue, totalProfit, avgMargin)
  };

  const highlights = buildHighlights(metrics);

  const revenueVisual: VisualItem = {
    type: "line",
    data: lineSeries.map((item) => ({
      month: monthLabel(String(item.month ?? "")),
      receita: item.revenue ?? 0,
      despesas: item.expenses ?? 0,
      lucro: item.profit ?? 0
    })),
    meta: {
      series: [
        { key: "receita", label: "Receita", color: "#8b5cf6" },
        { key: "despesas", label: "Despesas", color: "#22d3ee" },
        { key: "lucro", label: "Lucro", color: "#22c55e" }
      ]
    }
  };

  const cashVisual: VisualItem = {
    type: "bar",
    data: cashflowSeries.map((item) => ({
      label: item.category,
      entrada: item.in ?? 0,
      saida: item.out ?? 0
    }))
  };

  const tableVisual: VisualItem = {
    type: "table",
    data: tableRows.map((row) => ({
      month: monthLabel(String(row.month ?? "")),
      revenue: row.revenue ?? 0,
      expenses: row.expenses ?? 0,
      profit: row.profit ?? 0,
      margin: row.margin_percent ?? 0
    })),
    meta: {
      columns: ["Competência", "Receita", "Despesas", "Lucro", "Margem"]
    }
  };

  const bridgeVisual: VisualItem = {
    type: "bar",
    data: bridgeSeries.map((item, index) => ({
      label: item.label,
      value: item.amount,
      type: item.type === "total" ? (index === 0 ? "start" : "end") : item.type
    })),
    meta: { variant: "waterfall" }
  };

  const riskHighlights: HighlightItem[] =
    metrics?.alerts?.map((alert) => ({
      label: alert.title,
      description: alert.description,
      variant: alert.type === "error" ? "error" : alert.type === "warning" ? "warning" : "success"
    })) ?? [];

  const blocks: ReportBlock[] = [
    {
      id: "panorama",
      title: "Panorama Geral",
      description:
        style === "creative"
          ? `A receita do período somou ${formatCurrency(totalRevenue)}, com margem média em ${formatPercent(
              avgMargin / 100
            )}. ${
              revenueDelta >= 0 ? "Mantivemos" : "Registramos"
            } variação de ${formatPercent(revenueDelta / 100)} na última virada de mês.`
          : `Receita acumulada ${formatCurrency(totalRevenue)}; margem média ${formatPercent(
              avgMargin / 100
            )}; variação mensal ${formatPercent(revenueDelta / 100)}.`,
      visuals: [revenueVisual],
      highlights
    },
    {
      id: "margins",
      title: "Lucro & Margens",
      description:
        style === "creative"
          ? `O lucro acumulado está em ${formatCurrency(totalProfit)}, com margem líquida média de ${formatPercent(
              avgMargin / 100
            )}. O delta de margem no último mês ficou em ${formatPercent(marginDelta / 100)}.`
          : `Lucro total ${formatCurrency(totalProfit)}. Margem média ${formatPercent(
              avgMargin / 100
            )}. Delta mensal ${formatPercent(marginDelta / 100)}.`,
      visuals: [tableVisual, bridgeVisual]
    },
    {
      id: "cash",
      title: "Caixa & Liquidez",
      description:
        style === "creative"
          ? `Entradas totalizaram ${formatCurrency(cashIn)} contra saídas de ${formatCurrency(
              cashOut
            )}, resultando em fluxo líquido de ${formatCurrency(cashNet)}. O burn médio mensal é ${formatCurrency(
              burnRate
            )} e a runway estimada está em ${
              Number.isFinite(runway) ? `${runway} meses` : "nível saudável"
            }.`
          : `Entradas ${formatCurrency(cashIn)}; saídas ${formatCurrency(cashOut)}; fluxo líquido ${formatCurrency(
              cashNet
            )}. Burn médio ${formatCurrency(burnRate)}; runway ${
              Number.isFinite(runway) ? `${runway} meses` : "sem pressão imediata"
            }.`,
      visuals: [
        {
          type: "cards",
          data: [
            { label: "Fluxo líquido", value: formatCurrency(cashNet) },
            { label: "Burn médio/mês", value: formatCurrency(burnRate) },
            {
              label: "Runway estimada",
              value: Number.isFinite(runway) ? `${runway} meses` : "Sem pressão"
            }
          ]
        },
        cashVisual
      ],
      highlights: cashNet < 0 ? [{ label: "Fluxo negativo", description: "Reforçar caixa e revisar burn rate.", variant: "warning" }] : undefined
    }
  ];

  if (riskHighlights.length) {
    blocks.push({
      id: "risks",
      title: "Riscos & Monitoramento",
      description:
        style === "creative"
          ? "Principais alertas sinalizados durante o período. Recomendamos tratar os pontos em vermelho primeiro."
          : "Alertas do período em ordem cronológica.",
      visuals: [],
      highlights: riskHighlights
    });
  }

  if (analyzeOutput?.sections?.length) {
    analyzeOutput.sections.forEach((section: any, index: number) => {
      blocks.push({
        id: `ai-section-${index}`,
        title: section.title ?? `Insight IA #${index + 1}`,
        description: section.summary ?? "",
        visuals: [
          {
            type: "list",
            data: section.highlights ?? []
          }
        ],
        highlights: (section.callouts ?? []).map((callout: any) => ({
          label: callout.title ?? "",
          description: callout.message ?? "",
          variant:
            callout.variant === "success"
              ? "success"
              : callout.variant === "warning"
              ? "warning"
              : "error"
        }))
      });
    });
  }

  const checklist = buildChecklist(blocks, status);
  const checklistSections = buildChecklistSections(checklist);

  return {
    header,
    blocks,
    checklist,
    checklistSections,
    status
  };
}
