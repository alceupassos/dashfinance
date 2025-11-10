"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardMetrics, getMonthlyKPI } from "@/lib/api";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { DashboardCardsGrid } from "@/components/dashboard-cards-grid";
import { RevenueCostChart } from "@/components/revenue-cost-chart";
import { CashflowStackedBars } from "@/components/cashflow-stacked-bars";
import { BridgeItem, EbitdaBridge } from "@/components/ebitda-bridge";
import { DenseTable, DenseTableRow } from "@/components/dense-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";
import { useDashboardCards } from "@/lib/hooks/use-dashboard-cards";
import { DashboardCardsResponse } from "@/lib/api";
import { DashboardSummaryPanel } from "@/components/dashboard-summary";
import { DashboardOracle } from "@/components/dashboard-oracle";

export default function DashboardPage() {
  const { selectedTarget, period } = useDashboardStore();
  const cardsQuery = useDashboardCards(selectedTarget);

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

  const isCardLoading = cardsQuery.isLoading;
  const isDashboardLoading = isLoading || isCardLoading;
  const isDashboardError = hasError || cardsQuery.isError;
  const statusText = isDashboardError
    ? "Falha ao carregar dados críticos"
    : isDashboardLoading
    ? "Sincronizando dados do dashboard"
    : "Dados sincronizados";
  const statusVariant: "success" | "warning" | "destructive" = isDashboardError
    ? "destructive"
    : isDashboardLoading
    ? "warning"
    : "success";

  const lastRevenue = kpiContent.revenueSeries.at(-1)?.receita ?? 0;
  const chartSkeleton = (
    <div className="h-[320px] w-full animate-pulse rounded-3xl border border-dashed border-border/40 bg-gradient-to-r from-[#0b0d14] to-[#11131c] p-4" />
  );
  const chartError = (
    <Card className="border-border/60 bg-[#11111a]/80">
      <CardHeader className="border-none p-4">
        <CardTitle className="text-sm">Erro de dados</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-destructive">
        Não foi possível carregar os gráficos. Verifique a conexão com o Supabase ou tente novamente.
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12">
        <DashboardCardsGrid
          cards={((cardsQuery.data as DashboardCardsResponse | undefined)?.cards) ?? []}
          loading={isCardLoading}
        />
      </div>

      <div className="col-span-12">
        <DashboardSummaryPanel
          target={selectedTarget}
          period={period}
          statusLabel={statusText}
          statusVariant={statusVariant}
          metrics={dashboard?.metrics}
          alerts={dashboard?.alerts}
          lastRevenue={lastRevenue}
          isLoading={isDashboardLoading}
        />
      </div>

      <div className="col-span-12">
        <DashboardOracle />
      </div>

      <div className="col-span-12 xl:col-span-8">
        {isDashboardError ? (
          chartError
        ) : isDashboardLoading ? (
          chartSkeleton
        ) : (
          <RevenueCostChart data={kpiContent.revenueSeries} />
        )}
      </div>
      <div className="col-span-12 xl:col-span-4">
        {isDashboardError ? (
          chartError
        ) : isDashboardLoading ? (
          chartSkeleton
        ) : (
          <CashflowStackedBars data={kpiContent.cashflowSeries} />
        )}
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
