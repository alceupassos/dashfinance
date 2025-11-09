"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from "recharts";
import { getCashflowReport } from "@/lib/api";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { mockTargets } from "@/lib/api";
import { formatCurrency } from "@/lib/formatters";

export default function CashflowPage() {
  const { selectedTarget, setTarget, period, setPeriod } = useDashboardStore();
  const cnpjOptions = mockTargets.cnpjs;
  const currentCnpj = selectedTarget.type === "cnpj" ? selectedTarget.value : cnpjOptions[0]?.value ?? "";
  const periodoValue = period.from.slice(0, 7);

  const { data, isLoading } = useQuery({
    queryKey: ["report-cashflow", currentCnpj, periodoValue],
    queryFn: () => getCashflowReport({ cnpj: currentCnpj, periodo: periodoValue }),
    enabled: Boolean(currentCnpj)
  });

  const summaryItems = [
    { label: "Entradas", value: data?.total_entradas ?? 0 },
    { label: "Saídas", value: data?.total_saidas ?? 0 },
    { label: "Saldo atual", value: data?.saldo_atual ?? 0 }
  ];

  const chartData = useMemo(() => {
    const map = new Map<string, { entrada: number; saida: number }>();
    (data?.movimentacoes ?? []).forEach((entry) => {
      const existing = map.get(entry.data) ?? { entrada: 0, saida: 0 };
      if (entry.tipo === "entrada") {
        existing.entrada += entry.valor;
      } else {
        existing.saida += entry.valor;
      }
      map.set(entry.data, existing);
    });
    return Array.from(map.entries()).map(([date, values]) => ({
      date,
      entrada: values.entrada,
      saida: values.saida,
      saldo: values.entrada - values.saida
    }));
  }, [data?.movimentacoes]);

  return (
    <Card className="border-border/60 bg-[#11111a]/80">
      <CardHeader className="flex flex-col gap-2 border-none p-4 pb-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-sm">Fluxo de Caixa</CardTitle>
          <p className="text-[11px] text-muted-foreground">Entradas, saídas e saldo acumulado.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
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
          <Input type="date" value={period.from} onChange={(event) => setPeriod({ ...period, from: event.target.value })} />
          <Input type="date" value={period.to} onChange={(event) => setPeriod({ ...period, to: event.target.value })} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {summaryItems.map((item) => (
            <div key={item.label} className="rounded-md border border-border/60 bg-secondary/20 p-3 text-xs text-muted-foreground">
              <p className="text-[11px] uppercase tracking-[0.3em]">{item.label}</p>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(item.value)}</p>
            </div>
          ))}
        </div>
        <div className="h-[320px] overflow-hidden rounded-md border border-border/60 bg-[#11111a]/60 p-2 pr-6">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="1 3" stroke="#1f1f2b" />
              <XAxis dataKey="date" stroke="#666" fontSize={11} />
              <YAxis stroke="#666" fontSize={11} tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f0f16",
                  border: "1px solid rgba(68,68,88,0.5)",
                  borderRadius: "0.5rem",
                  fontSize: "12px"
                }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="entrada" stackId="cash" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="saida" stackId="cash" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="saldo" stroke="#38bdf8" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-md border border-border/60 bg-[#0c0d14]/80 p-4">
          <h3 className="text-sm font-semibold text-muted-foreground">Últimas movimentações</h3>
          <div className="mt-3 space-y-2 text-[11px]">
            {(data?.movimentacoes ?? []).slice(0, 6).map((entry) => (
              <div key={`${entry.data}-${entry.descricao}`} className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{entry.descricao}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(entry.data).toLocaleDateString()}</p>
                </div>
                <span className={entry.tipo === "entrada" ? "text-emerald-300" : "text-amber-300"}>
                  {entry.tipo === "entrada" ? "+" : "-"} {formatCurrency(entry.valor)}
                </span>
              </div>
            ))}
            {!data?.movimentacoes?.length && (
              <p className="text-center text-[11px] text-muted-foreground">Nenhuma movimentação registrada.</p>
            )}
          </div>
        </div>
        <div className="rounded-md border border-border/60 bg-[#11111a]/80 p-4">
          <h3 className="text-sm font-semibold text-muted-foreground">Previsão para 7 dias</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-4 text-[11px] text-muted-foreground">
            {(data?.previsao_7_dias ?? []).map((row) => (
              <div key={row.data} className="rounded-md border border-border/30 bg-[#0f0f16]/60 p-3 text-center">
                <p className="text-[10px] uppercase">{new Date(row.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</p>
                <p className="text-sm font-semibold text-foreground">{formatCurrency(row.saldo)}</p>
                <p className="text-[10px]">{row.emoji} {row.status}</p>
              </div>
            ))}
            {!data?.previsao_7_dias?.length && (
              <p className="text-center text-[11px] text-muted-foreground col-span-full">Sem previsão disponível.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
