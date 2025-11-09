"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardMetrics, getMonthlyKPI } from "@/lib/api";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { KpiCards } from "@/components/kpi-cards";
import { RevenueCostChart } from "@/components/revenue-cost-chart";
import { CashflowStackedBars } from "@/components/cashflow-stacked-bars";
import { BridgeItem, EbitdaBridge } from "@/components/ebitda-bridge";
import { DenseTable, DenseTableRow } from "@/components/dense-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";

export default function DashboardPage() {
  const { selectedTarget, period } = useDashboardStore();

  const {
    data: kpiData,
    isLoading: isLoadingKpi,
    isError: isErrorKpi
  } = useQuery({
    queryKey: ["kpi", selectedTarget, period],
    queryFn: () => getMonthlyKPI({ target: selectedTarget, from: period.from, to: period.to })
  });

  const {
    data: dashboard,
    isLoading: isLoadingDashboard,
    isError: isErrorDashboard
  } = useQuery({
    queryKey: ["dashboard-metrics", selectedTarget],
    queryFn: () => getDashboardMetrics(selectedTarget),
    staleTime: 60_000
  });

  const kpiContent = useMemo(() => {
    if (!kpiData) {
      return {
        cards: [],
        revenueSeries: [] as Array<{ month: string; receita: number; despesas: number; lucro: number }>,
        cashflowSeries: [] as Array<{ label: string; entrada: number; saida: number }>,
        bridgeSeries: [] as BridgeItem[],
        tableRows: [] as DenseTableRow[]
      };
    }

    const toMonthLabel = (value: string) => {
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

    const cards = (kpiData.cards ?? []).map((card) => ({
      label: card.label,
      value: card.value,
      delta: card.delta,
      caption: card.caption
    }));

    const revenueSeries =
      kpiData.lineSeries?.map((item) => ({
        month: toMonthLabel(item.month),
        receita: item.revenue ?? 0,
        despesas: item.expenses ?? 0,
        lucro: item.profit ?? 0
      })) ?? [];

    const cashflowSeries =
      kpiData.cashflow?.map((item) => ({
        label: item.category,
        entrada: item.in ?? 0,
        saida: item.out ?? 0
      })) ?? [];

    const bridgeSeries =
      kpiData.bridge
        ?.filter((item) => Number.isFinite(item.amount))
        ?.map((item, index, array) => {
          let type: BridgeItem["type"];
          if (item.type === "total") {
            type = index === 0 ? "start" : "end";
          } else {
            type = item.type === "increase" ? "positive" : "negative";
          }
          return {
            label: item.label,
            value: item.amount,
            type
          } as BridgeItem;
        }) ?? [];

    const tableRows =
      kpiData.table?.map((row) => ({
        month: toMonthLabel(row.month),
        revenue: row.revenue ?? 0,
        expenses: row.expenses ?? 0,
        profit: row.profit ?? 0,
        margin_percent: row.margin_percent ?? 0
      })) ?? [];

    return { cards, revenueSeries, cashflowSeries, bridgeSeries, tableRows };
  }, [kpiData]);

  const isLoading = isLoadingKpi || isLoadingDashboard;
  const hasError = isErrorKpi || isErrorDashboard;

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12">
        <KpiCards
          items={
            kpiContent.cards.length
              ? kpiContent.cards
              : new Array(4).fill(null).map((_, index) => ({
                  label: `Carregando ${index + 1}`,
                  value: 0,
                  caption: "..."
                }))
          }
        />
      </div>

      <div className="col-span-12 grid grid-cols-12 gap-4">
        <div className="col-span-12 xl:col-span-8">
          <RevenueCostChart data={kpiContent.revenueSeries} />
        </div>
        <div className="col-span-12 xl:col-span-4">
          <Card className="h-full border-border/60 bg-[#11111a]/80">
            <CardHeader className="border-none p-4 pb-2">
              <CardTitle className="text-sm">Resumo do período</CardTitle>
            </CardHeader>
            <CardContent className="flex h-full flex-col gap-3 p-4 pt-0 text-xs text-muted-foreground">
              <p>
                {selectedTarget.type === "alias" ? "Alias" : "CNPJ"} selecionado:{" "}
                <span className="text-foreground font-semibold">{selectedTarget.value}</span>
              </p>
              <p>
                Intervalo analisado:{" "}
                <span className="text-foreground font-semibold">
                  {period.from} → {period.to}
                </span>
              </p>
              <p>
                Status:{" "}
                <span className="text-primary">
                  {hasError
                    ? "Falha ao carregar dados"
                    : isLoading
                    ? "Carregando dados do backend..."
                    : "Dados sincronizados"}
                </span>
              </p>
              {kpiContent.revenueSeries.length > 0 && (
                <div className="space-y-1 text-[11px] text-muted-foreground">
                  <p>
                    Receita acumulada:{" "}
                    <span className="font-semibold text-foreground">
                      {formatCurrency(
                        kpiContent.revenueSeries.reduce((acc, item) => acc + item.receita, 0)
                      )}
                    </span>
                  </p>
                  <p>
                    Lucro acumulado:{" "}
                    <span className="font-semibold text-foreground">
                      {formatCurrency(
                        kpiContent.revenueSeries.reduce((acc, item) => acc + item.lucro, 0)
                      )}
                    </span>
                  </p>
                </div>
              )}
              <div className="mt-4 space-y-2">
                <p className="text-[11px] font-medium uppercase text-muted-foreground">Alertas recentes</p>
                {dashboard?.alerts?.length ? (
                  <div className="space-y-2">
                    {dashboard.alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="rounded-md border border-border/50 bg-secondary/30 p-2 text-[11px]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">{alert.title}</span>
                          <Badge variant={alert.type === "error" ? "destructive" : alert.type === "warning" ? "warning" : "success"}>
                            {alert.type}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">{alert.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Nenhum alerta crítico.</p>
                )}
              </div>
              {dashboard?.metrics && (
                <div className="mt-4 space-y-1 text-[11px]">
                  {dashboard.metrics.slice(0, 3).map((metric) => (
                    <div key={metric.label} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{metric.label}</span>
                      <span className="text-foreground font-semibold">{metric.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="col-span-12">
        <CashflowStackedBars data={kpiContent.cashflowSeries} />
      </div>

      {kpiContent.bridgeSeries.length > 0 && (
        <div className="col-span-12">
          <EbitdaBridge data={kpiContent.bridgeSeries as BridgeItem[]} />
        </div>
      )}

      <div className="col-span-12">
        <DenseTable rows={kpiContent.tableRows} />
      </div>
    </div>
  );
}
