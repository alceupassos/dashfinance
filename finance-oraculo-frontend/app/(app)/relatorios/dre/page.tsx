"use client";

// Endpoints utilizados:
// - GET /targets
// - GET /functions/v1/relatorios-dre
// - POST /analysis/financial-insight

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import {
  generateFinancialInsight,
  getReportDre,
  getTargets,
  type FinancialInsightResponse
} from "@/lib/api";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { TargetSelector } from "@/components/alias-selector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/formatters";

const lineKeys = [
  { key: "receita_bruta", label: "Receita bruta" },
  { key: "lucro_liquido", label: "Lucro líquido" },
  { key: "ebitda", label: "EBITDA" }
] as const;

const lineColors: Record<(typeof lineKeys)[number]["key"], string> = {
  receita_bruta: "#8b5cf6",
  lucro_liquido: "#38bdf8",
  ebitda: "#22c55e"
};

type InsightCacheEntry = {
  data: FinancialInsightResponse;
  cachedAt: string;
};

export default function DrePage() {
  const { selectedTarget, setPeriod, period, analysisStyle } = useDashboardStore();
  const styleParam = analysisStyle === "technical" ? "technical" : "structured";

  const insightCacheRef = useRef<Record<string, InsightCacheEntry>>({});
  const [insight, setInsight] = useState<FinancialInsightResponse | null>(null);
  const [cachedTimestamp, setCachedTimestamp] = useState<string | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);

  const { data: targetsData } = useQuery({
    queryKey: ["targets"],
    queryFn: getTargets,
    staleTime: 1000 * 60 * 5
  });

  const aliasMembers = useMemo(() => {
    const map = new Map<string, string[]>();
    targetsData?.aliases?.forEach((alias) => {
      const members = Array.isArray(alias.members) ? alias.members : [];
      map.set(alias.id, members);
    });
    return map;
  }, [targetsData]);

  const firstCnpj = targetsData?.cnpjs?.[0]?.value;

  const effectiveCnpj = useMemo(() => {
    if (selectedTarget.type === "cnpj") {
      return selectedTarget.value;
    }
    const members = aliasMembers.get(selectedTarget.value);
    if (members && members.length > 0) {
      return members[0];
    }
    return firstCnpj ?? null;
  }, [aliasMembers, firstCnpj, selectedTarget]);

  const insightKey = effectiveCnpj
    ? `${effectiveCnpj}|${period.from}|${period.to}|${styleParam}`
    : "no-company";

  useEffect(() => {
    if (!effectiveCnpj) {
      setInsight(null);
      setCachedTimestamp(null);
      return;
    }
    const cached = insightCacheRef.current[insightKey];
    if (cached) {
      setInsight(cached.data);
      setCachedTimestamp(cached.cachedAt);
      setInsightError(null);
    } else {
      setInsight(null);
      setCachedTimestamp(null);
    }
  }, [effectiveCnpj, insightKey]);

  const referenceMonth = useMemo(() => {
    const base = period.to || new Date().toISOString().slice(0, 10);
    return base.slice(0, 7);
  }, [period.to]);

  const dreQuery = useQuery({
    queryKey: ["report-dre", effectiveCnpj, referenceMonth],
    queryFn: () => getReportDre({ cnpj: effectiveCnpj ?? undefined, periodo: referenceMonth }),
    enabled: Boolean(effectiveCnpj),
    staleTime: 60_000
  });

  const dre = dreQuery.data?.dre;

  const dreLines = useMemo(() => {
    if (!dre) return [];
    return [
      { label: "Receita bruta", value: dre.receita_bruta },
      { label: "Deduções", value: dre.deducoes },
      { label: "Receita líquida", value: dre.receita_liquida },
      { label: "Custos", value: dre.custos },
      { label: "Lucro bruto", value: dre.lucro_bruto },
      { label: "Despesas operacionais", value: dre.despesas_operacionais },
      { label: "EBITDA", value: dre.ebitda },
      { label: "Depreciação", value: dre.depreciacao },
      { label: "EBIT", value: dre.ebit },
      {
        label: "Resultado financeiro",
        value: (dre.receitas_financeiras ?? 0) + (dre.despesas_financeiras ?? 0)
      },
      { label: "Lucro antes do IR", value: dre.lucro_antes_ir },
      { label: "IR/CSLL", value: dre.ir_csll },
      { label: "Lucro líquido", value: dre.lucro_liquido }
    ];
  }, [dre]);

  const chartData = useMemo(() => {
    return (dreQuery.data?.historico ?? []).map((entry) => ({
      month: entry.periodo,
      receita_bruta: entry.receita_bruta,
      ebitda: entry.ebitda,
      lucro_liquido: entry.lucro_liquido
    }));
  }, [dreQuery.data?.historico]);

  const overviewRows = useMemo(() => {
    if (insight?.overview?.comparison?.length) {
      return insight.overview.comparison;
    }
    if (!dre) return [];
    return [
      { label: "Receita líquida", current: dre.receita_liquida },
      { label: "EBITDA", current: dre.ebitda },
      { label: "Lucro líquido", current: dre.lucro_liquido }
    ];
  }, [dre, insight?.overview?.comparison]);

  const overviewHighlights = insight?.overview?.highlights ?? [];

  const opportunitySeries = insight?.opportunities?.chart?.series?.[0];
  const opportunityChartData = useMemo(() => {
    if (!opportunitySeries?.data) return [];
    return opportunitySeries.data.map((point) => ({
      label: point.label,
      value: point.value
    }));
  }, [opportunitySeries]);

  const insightMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveCnpj) {
        throw new Error("Selecione uma empresa para gerar o insight.");
      }
      return generateFinancialInsight({
        company_cnpj: effectiveCnpj,
        from: period.from,
        to: period.to,
        style: styleParam,
        alias: selectedTarget.type === "alias" ? selectedTarget.value : undefined
      });
    },
    onSuccess: (data) => {
      const cachedAt = new Date().toISOString();
      insightCacheRef.current[insightKey] = { data, cachedAt };
      setInsight(data);
      setCachedTimestamp(cachedAt);
      setInsightError(null);
    },
    onError: (error) => {
      console.error("[dre] generateFinancialInsight error", error);
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível gerar o insight estruturado. Tente novamente.";
      setInsightError(message);
    }
  });

  const isGenerating = insightMutation.isPending;
  const showSkeleton = isGenerating && !insight;

  const generatedAtLabel = useMemo(() => {
    const fromMetadata = insight?.metadata?.generated_at;
    const source = fromMetadata ?? cachedTimestamp;
    if (!source) return null;
    const date = new Date(source);
    if (Number.isNaN(date.getTime())) return source;
    return date.toLocaleString("pt-BR");
  }, [cachedTimestamp, insight?.metadata?.generated_at]);

  const generatedBy = insight?.metadata?.generated_by ?? null;

  const periodLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("pt-BR");
    const fromLabel = period.from ? formatter.format(new Date(period.from)) : "—";
    const toLabel = period.to ? formatter.format(new Date(period.to)) : "—";
    return `${fromLabel} → ${toLabel}`;
  }, [period.from, period.to]);

  const insightStatus = (insight?.status ?? "ok").toString().toLowerCase();

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Análise DRE & Insights Estruturados</h1>
        <p className="text-sm text-muted-foreground">
          Gere uma leitura executiva do demonstrativo de resultados com identificação automática de riscos e
          oportunidades.
        </p>
      </header>

      <Card>
        <CardHeader className="space-y-4">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">Período e empresa</CardTitle>
            <CardDescription>Defina o recorte para gerar o insight estruturado e visualizar a DRE detalhada.</CardDescription>
          </div>
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex flex-1 flex-col gap-2">
              <TargetSelector />
              <p className="text-xs text-muted-foreground">Período atual: {periodLabel}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="date"
                value={period.from}
                onChange={(event) => setPeriod({ ...period, from: event.target.value })}
                aria-label="Data inicial"
              />
              <Input
                type="date"
                value={period.to}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(event) => setPeriod({ ...period, to: event.target.value })}
                aria-label="Data final"
              />
              <Button
                onClick={() => insightMutation.mutate()}
                disabled={isGenerating || !effectiveCnpj}
                className="whitespace-nowrap"
              >
                {isGenerating ? "Gerando..." : "Gerar Insight Estruturado"}
              </Button>
            </div>
          </div>
          {insightError && (
            <Alert variant="destructive">
              <AlertTitle>Falha ao gerar insight</AlertTitle>
              <AlertDescription className="flex flex-col gap-2">
                <span>{insightError}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start"
                  disabled={isGenerating}
                  onClick={() => insightMutation.mutate()}
                >
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {generatedAtLabel && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className={statusBadgeClass(insightStatus)}>
                Status: {statusLabel(insightStatus)}
              </Badge>
              <Badge variant="outline">Última análise: {generatedAtLabel}</Badge>
              {generatedBy && <span>• Gerado por: {generatedBy}</span>}
            </div>
          )}
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader className="space-y-1">
            <CardTitle>Visão Geral</CardTitle>
            <CardDescription>Resumo narrativo com principais destaques do período.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showSkeleton ? (
              <InsightSkeleton />
            ) : insight ? (
              <>
                {insight.overview?.summary ? (
                  <p className="text-sm leading-relaxed text-foreground">{insight.overview.summary}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhum resumo foi retornado pela análise automática para o período selecionado.
                  </p>
                )}

                {overviewHighlights.length > 0 && (
                  <ul className="space-y-2 text-sm">
                    {overviewHighlights.map((highlight) => (
                      <li key={highlight} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {overviewRows.length > 0 && (
                  <div className="rounded-lg border border-border/60 bg-muted/5 p-3">
                    <table className="w-full text-xs">
                      <thead className="text-muted-foreground">
                        <tr>
                          <th className="pb-2 text-left font-medium">Indicador</th>
                          <th className="pb-2 text-right font-medium">Atual</th>
                          <th className="pb-2 text-right font-medium">Variação</th>
                        </tr>
                      </thead>
                      <tbody className="[&>tr:not(:last-child)]:border-b [&>tr]:border-border/40">
                        {overviewRows.map((row) => (
                          <tr key={row.label}>
                            <td className="py-1.5 font-medium">{row.label}</td>
                            <td className="py-1.5 text-right">
                              {typeof row.current === "number"
                                ? formatCurrency(row.current)
                                : row.current ?? "—"}
                            </td>
                            <td className="py-1.5 text-right text-sm text-muted-foreground">
                              {typeof row.variation_percent === "number"
                                ? `${row.variation_percent.toFixed(1)}%`
                                : row.variation_percent ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <EmptyInsightMessage />
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader className="space-y-1">
            <CardTitle>Riscos & Alertas</CardTitle>
            <CardDescription>Principais pontos de atenção identificados pela análise.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showSkeleton ? (
              <InsightSkeleton />
            ) : insight?.risks?.length ? (
              <>
                <ul className="space-y-3 text-sm">
                  {insight.risks.map((risk) => (
                    <li key={`${risk.title}-${risk.date ?? risk.impact}`} className="flex items-start gap-3">
                      <span className={`mt-1 h-2.5 w-2.5 rounded-full ${severityDotClass(risk.severity)}`} />
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{risk.title}</p>
                        {risk.impact && <p className="text-muted-foreground">{risk.impact}</p>}
                        {risk.comment && <p className="text-xs text-muted-foreground">{risk.comment}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/financeiro/alertas"
                  className="inline-flex items-center text-xs font-medium text-primary hover:underline"
                >
                  Ver alertas financeiros →
                </Link>
              </>
            ) : (
              <EmptyInsightMessage message="Nenhum risco relevante foi identificado para este período." />
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader className="space-y-1">
            <CardTitle>Oportunidades & Próximos Passos</CardTitle>
            <CardDescription>Recomendações automatizadas para otimizar o resultado operacional.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showSkeleton ? (
              <InsightSkeleton />
            ) : insight?.opportunities ? (
              <>
                {insight.opportunities.summary ? (
                  <p className="text-sm leading-relaxed text-foreground">{insight.opportunities.summary}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma recomendação específica foi retornada para o período analisado.
                  </p>
                )}
                {(insight.opportunities.actions ?? insight.opportunities.next_steps)?.length ? (
                  <ul className="space-y-2 text-sm">
                    {(insight.opportunities.actions ?? insight.opportunities.next_steps ?? []).map((action) => (
                      <li key={action} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {opportunityChartData.length > 1 && (
                  <div className="h-32 rounded-lg border border-border/60 bg-muted/5 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={opportunityChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f29371a" />
                        <XAxis dataKey="label" hide />
                        <YAxis hide />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={opportunitySeries?.color ?? "#22c55e"}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            ) : (
              <EmptyInsightMessage message="Nenhuma oportunidade foi detectada ainda. Gere um novo insight para atualizar." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Evolução DRE</CardTitle>
            <CardDescription>
              Tendência mensal dos principais indicadores financeiros com base no período de referência.
            </CardDescription>
          </div>
          <Badge variant="outline">Competência: {referenceMonth}</Badge>
        </CardHeader>
        <CardContent className="h-[320px]">
          {dreQuery.isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Carregando demonstrativo...
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sem dados históricos para exibir.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="1 3" stroke="#1f29371a" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(value) => formatCurrency(Number(value))}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                    fontSize: "12px"
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {lineKeys.map((metric) => (
                  <Line
                    key={metric.key}
                    type="monotone"
                    dataKey={metric.key}
                    stroke={lineColors[metric.key]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estrutura do Demonstrativo</CardTitle>
          <CardDescription>Valores consolidados da DRE no período selecionado.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Conta</th>
                <th className="px-3 py-2 font-medium text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {dreQuery.isLoading ? (
                <tr>
                  <td colSpan={2} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    Carregando demonstrativo...
                  </td>
                </tr>
              ) : dreLines.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    Nenhum dado disponível para o período.
                  </td>
                </tr>
              ) : (
                dreLines.map((line) => (
                  <tr key={line.label} className="border-b border-border/40 last:border-0">
                    <td className="px-3 py-2 font-medium">{line.label}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(line.value)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function statusBadgeClass(status: string) {
  if (["critical", "critico"].includes(status)) return "border-red-500/40 bg-red-500/10 text-red-400";
  if (["attention", "warning", "atencao"].includes(status)) return "border-amber-500/40 bg-amber-500/10 text-amber-400";
  return "border-emerald-500/40 bg-emerald-500/10 text-emerald-400";
}

function statusLabel(status: string) {
  if (["critical", "critico"].includes(status)) return "Crítico";
  if (["attention", "warning", "atencao"].includes(status)) return "Atenção";
  return "Ok";
}

function severityDotClass(severity?: string) {
  const normalized = severity?.toLowerCase() ?? "";
  if (["critical", "critico"].includes(normalized)) return "bg-red-500";
  if (["attention", "warning", "atencao", "medio", "medium"].includes(normalized)) return "bg-amber-500";
  if (["low", "ok", "positivo"].includes(normalized)) return "bg-emerald-500";
  return "bg-slate-400";
}

function EmptyInsightMessage({ message = "Nenhum insight foi gerado ainda. Clique em \"Gerar Insight Estruturado\"." }) {
  return <p className="text-sm text-muted-foreground">{message}</p>;
}

function InsightSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-2/3 animate-pulse rounded bg-muted/50" />
      <div className="h-3 w-full animate-pulse rounded bg-muted/30" />
      <div className="h-3 w-5/6 animate-pulse rounded bg-muted/20" />
    </div>
  );
}
