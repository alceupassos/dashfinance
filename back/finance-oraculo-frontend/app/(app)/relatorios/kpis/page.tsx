"use client";

import { useQuery } from "@tanstack/react-query";
import { getFinancialKpis } from "@/lib/api";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockTargets } from "@/lib/api";
import { formatPercent } from "@/lib/formatters";

export default function KpisPage() {
  const { selectedTarget, setTarget } = useDashboardStore();
  const cnpjOptions = mockTargets.cnpjs;
  const currentCnpj = selectedTarget.type === "cnpj" ? selectedTarget.value : cnpjOptions[0]?.value ?? "";

  const { data } = useQuery({
    queryKey: ["report-kpis", currentCnpj],
    queryFn: () => getFinancialKpis({ cnpj: currentCnpj })
  });

  return (
    <Card className="border-border/60 bg-[#11111a]/80">
      <CardHeader className="flex flex-col gap-2 border-none p-4 pb-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-sm">KPIs Financeiros</CardTitle>
          <p className="text-[11px] text-muted-foreground">Indicadores críticos com metas e status.</p>
        </div>
        <Select value={currentCnpj} onValueChange={(value) => setTarget({ type: "cnpj", value })}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Selecionar empresa" />
          </SelectTrigger>
          <SelectContent>
            {cnpjOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.value} — {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {data?.metrics.map((metric) => {
          const onTrack =
            metric.target !== undefined
              ? metric.unit === "dias"
                ? metric.value <= metric.target
                : metric.value >= metric.target
              : true;
          return (
            <div
              key={metric.label}
              className="space-y-2 rounded-md border border-border/60 bg-secondary/20 p-3 text-xs text-muted-foreground"
            >
              <p className="text-[11px] uppercase">{metric.label}</p>
              <p className="text-sm font-semibold text-foreground">
                {metric.unit === "dias"
                  ? `${metric.value} dias`
                  : formatPercent(metric.value, 1)}
              </p>
              {metric.target !== undefined && (
                <p className={onTrack ? "text-emerald-300" : "text-amber-300"}>
                  Meta:{" "}
                  {metric.unit === "dias"
                    ? `${metric.target} dias`
                    : formatPercent(metric.target, 1)}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
