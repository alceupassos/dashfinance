"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFinancialKpis } from "@/lib/api";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TargetSelector } from "@/components/alias-selector";
import { PeriodPicker } from "@/components/period-picker";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { useEffectiveTarget } from "@/hooks/useEffectiveTarget";

export default function KpisPage() {
  const { selectedTarget } = useDashboardStore();
  const { effectiveCnpj } = useEffectiveTarget();

  const { data, isLoading } = useQuery({
    queryKey: ["report-kpis", effectiveCnpj],
    queryFn: () => getFinancialKpis({ cnpj: effectiveCnpj ?? undefined }),
    enabled: Boolean(effectiveCnpj)
  });

  type MetricType = NonNullable<typeof data>["metrics"][number];
  const renderValue = (metric: MetricType) => {
    if (metric.unit === "percent") {
      return formatPercent(metric.value / 100, 1);
    }
    return formatCurrency(metric.value);
  };

  const sortedMetrics = useMemo(
    () => data?.metrics?.slice().sort((a, b) => a.label.localeCompare(b.label)) ?? [],
    [data?.metrics]
  );

  return (
    <Card className="border-border/60 bg-[#11111a]/80">
      <CardHeader className="flex flex-col gap-2 border-none p-4 pb-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-sm">KPIs Financeiros</CardTitle>
          <p className="text-[11px] text-muted-foreground">Indicadores críticos com metas e status.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TargetSelector />
          <PeriodPicker />
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {isLoading && (
          <p className="col-span-full text-center text-[11px] text-muted-foreground">Carregando KPIs...</p>
        )}
        {!isLoading && data?.metrics.length === 0 && (
          <p className="col-span-full text-center text-[11px] text-muted-foreground">Sem dados disponíveis.</p>
        )}
        {sortedMetrics.map((metric) => (
          <div
            key={metric.label}
            className="space-y-2 rounded-md border border-border/60 bg-secondary/20 p-3 text-xs text-muted-foreground"
          >
            <p className="text-[11px] uppercase">{metric.label}</p>
            <p className="text-sm font-semibold text-foreground">{renderValue(metric)}</p>
            {metric.caption && <p className="text-[10px] text-foreground/70">{metric.caption}</p>}
            {metric.trend !== undefined && (
              <p className={metric.trend >= 0 ? "text-emerald-300" : "text-amber-300"}>
                {metric.trend >= 0 ? "+" : ""}
                {Math.abs(metric.trend * 100).toFixed(1)}%
                <span className="ml-1 text-[10px] text-muted-foreground">vs mês anterior</span>
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
