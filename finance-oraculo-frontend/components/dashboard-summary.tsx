"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";
import { DashboardMetricsResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface DashboardSummaryPanelProps {
  target: { type: "alias" | "cnpj"; value: string };
  period: { from: string; to: string };
  statusLabel: string;
  statusVariant: "success" | "warning" | "destructive";
  metrics?: DashboardMetricsResponse["metrics"];
  alerts?: DashboardMetricsResponse["alerts"];
  lastRevenue?: number;
  isLoading?: boolean;
}

export function DashboardSummaryPanel({
  target,
  period,
  statusLabel,
  statusVariant,
  metrics,
  alerts,
  lastRevenue,
  isLoading
}: DashboardSummaryPanelProps) {
  const targetLabel = target.type === "alias" ? "Grupo" : "CNPJ";
  const alertsToShow = alerts?.slice(0, 2) ?? [];

  return (
    <Card className="border-border/60 bg-[#0d0f16]">
      <CardHeader className="flex flex-col gap-4 border-none p-6">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Resumo consolidado</p>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
          {isLoading && <span className="text-[11px] text-muted-foreground">Atualizando...</span>}
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-foreground">{targetLabel}: {target.value}</h2>
          <p className="text-sm text-muted-foreground">Período {period.from} → {period.to}</p>
        </div>
        {typeof lastRevenue === "number" && (
          <p className="text-sm text-foreground">
            Última receita registrada: <span className="font-semibold">{formatCurrency(lastRevenue)}</span>
          </p>
        )}
      </CardHeader>
      <CardContent className="grid gap-4 border-t border-border/40 p-6">
        <section className="grid gap-3 sm:grid-cols-3">
          {(metrics ?? []).slice(0, 3).map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl border border-border/40 bg-[#0b0c12] p-3 text-sm text-muted-foreground"
            >
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">{metric.label}</p>
              <p className="text-lg font-semibold text-foreground">{metric.value}</p>
              {metric.trend && (
                <span className="text-[11px] text-muted-foreground">{metric.trend.direction} {metric.trend.value}</span>
              )}
            </div>
          ))}
        </section>
        <section className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Alertas recentes</p>
          {alertsToShow.length ? (
            <div className="space-y-2">
              {alertsToShow.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm",
                    alert.type === "error" && "border-red-500/40 bg-red-500/5 text-red-100",
                    alert.type === "warning" && "border-amber-400/30 bg-amber-400/10 text-amber-100",
                    alert.type === "success" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                  )}
                >
                  <p className="font-semibold text-foreground">{alert.title}</p>
                  <p className="text-xs text-muted-foreground">{alert.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum alerta crítico recente.</p>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
