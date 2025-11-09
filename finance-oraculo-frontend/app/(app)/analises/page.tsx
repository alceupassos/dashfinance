"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getDashboardMetrics,
  getMonthlyKPI,
  postAnalyze,
  type DashboardMetricsResponse,
  type KpiMonthlyResponse
} from "@/lib/api";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { buildAnalysisReport, type ReportBlock, type VisualItem, type ReportStatus } from "@/lib/analysis-builder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnalysisStyleToggle } from "@/components/analysis-style-toggle";
import { AlertTriangle, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar
} from "recharts";
import { AnalysisChecklistGrid } from "@/components/analysis-checklist-grid";

export default function AnalisesPage() {
  const { selectedTarget, period, analysisStyle } = useDashboardStore();

  const kpiQuery = useQuery({
    queryKey: ["kpi", selectedTarget, period],
    queryFn: () => getMonthlyKPI({ target: selectedTarget, from: period.from, to: period.to })
  });

  const metricsQuery = useQuery({
    queryKey: ["dashboard-metrics", selectedTarget],
    queryFn: () => getDashboardMetrics(selectedTarget),
    staleTime: 60_000
  });

  const analyzeQuery = useQuery({
    queryKey: ["analysis", selectedTarget, period, analysisStyle],
    queryFn: () => postAnalyze(analysisStyle, selectedTarget),
    refetchOnWindowFocus: false
  });

  const report = useMemo(() => {
    if (!kpiQuery.data && !metricsQuery.data && !analyzeQuery.data) return null;
    return buildAnalysisReport({
      profile: null,
      kpi: kpiQuery.data as KpiMonthlyResponse | undefined,
      metrics: metricsQuery.data as DashboardMetricsResponse | undefined,
      analyzeOutput: analyzeQuery.data,
      period,
      target: selectedTarget,
      style: analysisStyle
    });
  }, [kpiQuery.data, metricsQuery.data, analyzeQuery.data, period, selectedTarget, analysisStyle]);

  const isLoading = kpiQuery.isLoading || metricsQuery.isLoading || analyzeQuery.isLoading;
  const hasError = kpiQuery.isError || metricsQuery.isError || analyzeQuery.isError;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start gap-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Relatório assistido
          </p>
          <h1 className="text-2xl font-semibold text-foreground">Análises financeiras inteligentes</h1>
          <p className="text-sm text-muted-foreground">
            {selectedTarget.type === "alias" ? "Grupo" : "CNPJ"}: <span className="font-medium text-foreground">{selectedTarget.value}</span> · Período {period.from} → {period.to}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <AnalysisStyleToggle />
          <Button
            variant="outline"
            size="sm"
            onClick={() => alert("Geração de imagens será conectada ao Gemini / Nano Banana.")}
          >
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            Gerar imagens
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => analyzeQuery.refetch()}
            disabled={analyzeQuery.isFetching}
          >
            <RefreshCw className={cn("mr-2 h-3.5 w-3.5", analyzeQuery.isFetching && "animate-spin")} />
            Reprocessar
          </Button>
        </div>
      </header>

      {isLoading && <LoadingCard />}

      {hasError && <ErrorCard onRetry={() => analyzeQuery.refetch()} />}

      {!isLoading && !hasError && report && (
        <div className="space-y-6">
          <AnalysisHeader report={report} isRefreshing={analyzeQuery.isFetching} />

          {report.blocks.length === 0 ? (
            <AnalysisEmptyState />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {report.blocks.map((block) => (
                <AnalysisBlock key={block.id} block={block} />
              ))}
            </div>
          )}

          <AnalysisChecklistGrid sections={report.checklistSections} />
        </div>
      )}
    </div>
  );
}

function LoadingCard() {
  return (
    <Card className="border-border/60 bg-[#11111a]/80">
      <CardContent className="flex flex-col gap-3 p-6 text-sm text-muted-foreground">
        <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Preparando narrativa</span>
        <p className="text-foreground">Carregando narrativa do oráculo com dados financeiros, IA e RAG...</p>
      </CardContent>
    </Card>
  );
}

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="border border-destructive/40 bg-destructive/5">
      <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm text-destructive">
        <AlertTriangle className="h-4 w-4" />
        <p>Não foi possível gerar a análise automaticamente. Verifique as credenciais ou tente novamente.</p>
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Tentar novamente
        </Button>
      </CardContent>
    </Card>
  );
}

function AnalysisHeader({
  report,
  isRefreshing
}: {
  report: ReturnType<typeof buildAnalysisReport>;
  isRefreshing: boolean;
}) {
  const badgeMap: Record<ReportStatus, { label: string; className: string }> = {
    ok: { label: "Estável", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
    warning: { label: "Atenção", className: "border-amber-400/30 bg-amber-400/10 text-amber-200" },
    critical: { label: "Crítico", className: "border-red-500/30 bg-red-500/10 text-red-200" }
  };

  return (
    <Card className="border-border/60 bg-[#10111a]">
      <CardHeader className="flex flex-col gap-4 border-none p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className={cn("rounded-full border px-3 py-1 text-[11px]", badgeMap[report.status].className)}>
            Score {report.header.score.value} · {badgeMap[report.status].label}
          </Badge>
          {isRefreshing && <span className="text-[11px] text-muted-foreground">Atualizando...</span>}
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">{report.header.title}</h2>
          <p className="text-sm text-muted-foreground">{report.header.subtitle}</p>
          <p className="text-base text-foreground">{report.header.summary}</p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 border-t border-border/40 p-6 sm:grid-cols-2 lg:grid-cols-4">
        {report.header.cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border/40 bg-[#0d0f16] p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{card.label}</p>
            <p className="text-lg font-semibold text-foreground">{card.value}</p>
            {card.help && <p className="text-xs text-muted-foreground">{card.help}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AnalysisBlock({ block }: { block: ReportBlock }) {
  return (
    <Card className="border-border/60 bg-[#0f1118]">
      <CardHeader className="space-y-2 border-none p-5">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base text-foreground">{block.title}</CardTitle>
          {block.highlights?.length ? (
            <Badge variant="outline" className="text-[11px] uppercase text-muted-foreground">
              {block.highlights.length} alertas
            </Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">{block.description}</p>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-0">
        {block.visuals.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem gráficos disponíveis para este bloco.</p>
        ) : (
          block.visuals.map((visual, index) => <VisualRenderer key={`${block.id}-${index}`} visual={visual} />)
        )}

        {block.highlights?.length ? (
          <div className="space-y-2">
            {block.highlights.map((highlight) => (
              <div
                key={highlight.label + highlight.description}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm",
                  highlight.variant === "error" && "border-red-500/40 bg-red-500/5 text-red-100",
                  highlight.variant === "warning" && "border-amber-400/30 bg-amber-400/10 text-amber-50",
                  highlight.variant === "success" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-50"
                )}
              >
                <p className="text-[11px] uppercase tracking-wide">{highlight.label}</p>
                <p className="text-sm">{highlight.description}</p>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function VisualRenderer({ visual }: { visual: VisualItem }) {
  if (visual.type === "line") {
    const series = (visual.meta?.series as Array<{ key: string; label: string; color?: string }>) ?? [];
    return (
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={(visual.data as Array<Record<string, number | string>>) ?? []}>
            <CartesianGrid strokeDasharray="1 4" stroke="#1c1d29" />
            <XAxis dataKey="month" stroke="#555" fontSize={11} />
            <YAxis
              stroke="#555"
              fontSize={11}
              tickFormatter={(value) => formatCurrency(Number(value))}
              width={80}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#0d0f16", border: "1px solid #1f2230", borderRadius: 12 }}
              formatter={(value: number, name: string) => [formatCurrency(Number(value)), name]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {series.map((serie) => (
              <Line
                key={serie.key}
                type="monotone"
                dataKey={serie.key}
                name={serie.label}
                stroke={serie.color ?? "#8b5cf6"}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (visual.type === "bar") {
    const data = (visual.data as Array<Record<string, number | string>>) ?? [];
    const keys = Object.keys(data[0] ?? {}).filter((key) => key !== "label");
    return (
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="1 4" stroke="#1c1d29" />
            <XAxis dataKey="label" stroke="#555" fontSize={11} />
            <YAxis
              stroke="#555"
              fontSize={11}
              tickFormatter={(value) => formatCurrency(Number(value))}
              width={80}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#0d0f16", border: "1px solid #1f2230", borderRadius: 12 }}
              formatter={(value: number, name: string) => [formatCurrency(Number(value)), name]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {keys.map((key, index) => (
              <Bar key={key} dataKey={key} fill={barPalette[index % barPalette.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (visual.type === "table") {
    const rows = (visual.data as Array<Record<string, number | string>>) ?? [];
    const columns = (visual.meta?.columns as string[]) ?? Object.keys(rows[0] ?? {});
    return (
      <div className="overflow-x-auto rounded-xl border border-border/40">
        <table className="min-w-full text-sm">
          <thead className="bg-[#0b0c12]/80 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-3 py-2 text-left">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-border/30">
                {columns.map((column) => {
                  const value = row[column as keyof typeof row];
                  const formatted = typeof value === "number" ? formatCurrency(value) : value;
                  return (
                    <td key={column} className="px-3 py-2 text-xs text-muted-foreground">
                      {formatted}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (visual.type === "cards") {
    const items = (visual.data as Array<{ label: string; value: string }>) ?? [];
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border border-border/30 bg-[#0b0c12] p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{item.label}</p>
            <p className="text-lg font-semibold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>
    );
  }

  if (visual.type === "list") {
    const items = (visual.data as string[]) ?? [];
    return (
      <ul className="space-y-2 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  return null;
}

const barPalette = ["#8b5cf6", "#22d3ee", "#f97316", "#22c55e"];

function AnalysisEmptyState() {
  return (
    <Card className="border-dashed border-border/60 bg-[#11121c]/50">
      <CardContent className="flex flex-col gap-3 p-8 text-center text-sm text-muted-foreground">
        <p className="text-base font-semibold text-foreground">Ainda não há dados suficientes</p>
        <p>
          Suba um DRE atualizado ou execute as integrações OMIE/F360 para liberar o relatório completo. Assim que o primeiro lote for sincronizado, o oráculo volta a gerar os blocos automaticamente.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button size="sm" variant="secondary">
            Upload DRE
          </Button>
          <Button size="sm" variant="outline">
            Rodar sincronização
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
