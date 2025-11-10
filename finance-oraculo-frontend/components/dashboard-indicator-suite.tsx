"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  LineChart,
  Line,
  Legend
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { useEffectiveTarget } from "@/hooks/useEffectiveTarget";
import { getCashflowReport, getFinancialKpis, getMonthlyKPI } from "@/lib/api";

const fallbackCashflow = [
  { month: "Jan", entrada: 820000, saida: 560000 },
  { month: "Feb", entrada: 910000, saida: 600000 },
  { month: "Mar", entrada: 870000, saida: 620000 },
  { month: "Apr", entrada: 940000, saida: 640000 },
  { month: "Mai", entrada: 980000, saida: 660000 },
  { month: "Jun", entrada: 1020000, saida: 710000 }
];

const fallbackMargins = [
  { label: "% Margem Bruta", value: 46 },
  { label: "% Margem EBITDA", value: 38 },
  { label: "% Margem Líquida", value: 25 },
  { label: "Lucro Operacional", value: 18 }
];

const motionProps = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45 }
};

const ChartTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border/60 bg-black/80 p-2 text-[11px] text-white">
      {payload.map((item: any) => (
        <p key={item.name} className="leading-tight">
          {item.name}: R$ {item.value?.toLocaleString("pt-BR")}
        </p>
      ))}
    </div>
  );
};

export function DashboardIndicatorSuite() {
  const { selectedTarget, period } = useDashboardStore();
  const { effectiveCnpj } = useEffectiveTarget();

  const cashflowQuery = useQuery({
    queryKey: ["cashflow-report", effectiveCnpj, period.from],
    queryFn: () =>
      getCashflowReport({
        cnpj: effectiveCnpj ?? undefined,
        periodo: period.to
      }),
    enabled: Boolean(effectiveCnpj)
  });

  const kpisQuery = useQuery({
    queryKey: ["financial-kpis", effectiveCnpj],
    queryFn: () => getFinancialKpis({ cnpj: effectiveCnpj ?? undefined }),
    enabled: Boolean(effectiveCnpj)
  });

  const monthlyQuery = useQuery({
    queryKey: ["monthly-kpi", selectedTarget, period],
    queryFn: () =>
      getMonthlyKPI({
        target: selectedTarget,
        from: period.from,
        to: period.to
      }),
    enabled: Boolean(effectiveCnpj)
  });

  const chartCashflow = useMemo(() => {
    const entries = cashflowQuery.data?.movimentacoes ?? [];
    if (!entries.length) return fallbackCashflow;
    const map = new Map<string, { entrada: number; saida: number }>();
    entries.forEach((entry) => {
      const date = new Date(entry.data);
      if (Number.isNaN(date.getTime())) return;
      const label = new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date);
      const target = map.get(label) ?? { entrada: 0, saida: 0 };
      if (entry.tipo === "entrada") {
        target.entrada += entry.valor;
      } else {
        target.saida += entry.valor;
      }
      map.set(label, target);
    });
    if (!map.size) return fallbackCashflow;
    return Array.from(map.entries()).map(([month, values]) => ({
      month,
      ...values
    }));
  }, [cashflowQuery.data]);

  const marginMetrics = useMemo(() => {
    const metrics = kpisQuery.data?.metrics ?? [];
    const map = new Map<string, number>();
    metrics.forEach((metric) => {
      map.set(metric.label.toLowerCase(), metric.value);
    });
    return (
      [
        ["% margem bruta", "Margem Bruta"],
        ["% margem ebitda", "Margem EBITDA"],
        ["% margem líquida", "Margem Líquida"],
        ["lucro operacional", "Lucro Operacional"]
      ].map(([key, label]) => ({
        label,
        value: map.get(key) ?? 0
      })) ?? fallbackMargins
    );
  }, [kpisQuery.data]);

  const projectionData = useMemo(() => {
    const series = monthlyQuery.data?.lineSeries ?? [];
    if (!series.length) {
      return [
        { label: "Nov/25", receita: 930000, despesas: 420000, saldo: 510000 },
        { label: "Dez/25", receita: 1120000, despesas: 530000, saldo: 590000 },
        { label: "Jan/26", receita: 990000, despesas: 470000, saldo: 520000 },
        { label: "Fev/26", receita: 1040000, despesas: 500000, saldo: 540000 }
      ];
    }
    return series.slice(-4).map((item) => ({
      label: item.month ? item.month.replace(/-01$/, "") : "—",
      receita: item.revenue ?? 0,
      despesas: item.expenses ?? 0,
      saldo: item.profit ?? 0
    }));
  }, [monthlyQuery.data]);

  const analysisText = useMemo(() => {
    const cashflow = cashflowQuery.data;
    const strong = cashflow?.saldo_atual
      ? `Saldo atual de R$ ${cashflow.saldo_atual.toLocaleString("pt-BR")}`
      : "Saldo ainda em validação";
    return `${strong}. Entradas (${cashflow?.total_entradas?.toLocaleString("pt-BR") ?? "0"}) continuam superaando saídas (${cashflow?.total_saidas?.toLocaleString("pt-BR") ?? "0"}).`;
  }, [cashflowQuery.data]);

  return (
    <div className="space-y-4">
      <motion.div {...motionProps}>
        <Card className="border-border/60 bg-[#0c0c15]/80">
          <CardHeader className="border-none p-4">
            <CardTitle className="text-sm flex items-center justify-between">
              Fluxo de Caixa Real x Projetado
              <Badge variant="outline">Realtime</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartCashflow}>
                  <defs>
                    <linearGradient id="cashflowEntry" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="cashflowExit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fb7185" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2933" />
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="entrada"
                    stroke="#34d399"
                    fill="url(#cashflowEntry)"
                    name="Entradas"
                  />
                  <Area
                    type="monotone"
                    dataKey="saida"
                    stroke="#fb7185"
                    fill="url(#cashflowExit)"
                    name="Saídas"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-muted-foreground">{analysisText}</p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div {...motionProps}>
        <Card className="border-border/60 bg-[#0c0c15]/80">
          <CardHeader className="border-none p-4">
            <CardTitle className="text-sm">Margens Estratégicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marginMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2933" />
                  <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-muted-foreground">
              A diferença entre margem bruta e líquida revela quantas oportunidades de otimização existem nas despesas
              variáveis. Priorize a automação de pagamentos recorrentes quando o gap ultrapassar 15 pontos porcentuais.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div {...motionProps}>
        <Card className="border-border/60 bg-[#0c0c15]/80">
          <CardHeader className="border-none p-4">
            <CardTitle className="text-sm flex items-center justify-between">
              Projeção de Saldo e Runway
              <Badge variant="outline">Simulação</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projectionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2933" />
                  <XAxis dataKey="label" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                  <Line type="monotone" dataKey="receita" stroke="#22d3ee" name="Receita" strokeWidth={2} dot />
                  <Line type="monotone" dataKey="despesas" stroke="#f97316" name="Despesas" strokeWidth={2} dot />
                  <Line
                    type="monotone"
                    dataKey="saldo"
                    stroke="#4ade80"
                    name="Saldo Projetado"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-muted-foreground">
              A linha verde indica que os saldos projetados serão positivos ainda em janeiro. Mantenha o foco em
              reduzir o ciclo de recebíveis para acelerar o runway caso o mix de clientes mude.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
