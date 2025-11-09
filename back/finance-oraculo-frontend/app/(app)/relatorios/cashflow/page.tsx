"use client";

import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, BarChart, Bar, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ComposedChart } from "recharts";
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

  const { data } = useQuery({
    queryKey: ["report-cashflow", currentCnpj, period],
    queryFn: () => getCashflowReport({ cnpj: currentCnpj, from: period.from, to: period.to })
  });

  return (
    <Card className="border-border/60 bg-[#11111a]/80">
      <CardHeader className="flex flex-col gap-2 border-none p-4 pb-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-sm">Fluxo de Caixa</CardTitle>
          <p className="text-[11px] text-muted-foreground">Entradas, saídas e saldo acumulado.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Select
            value={currentCnpj}
            onValueChange={(value) => setTarget({ type: "cnpj", value })}
          >
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
          <Input
            type="date"
            value={period.from}
            onChange={(event) => setPeriod({ ...period, from: event.target.value })}
          />
          <Input
            type="date"
            value={period.to}
            onChange={(event) => setPeriod({ ...period, to: event.target.value })}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Summary label="Entradas" value={formatCurrency(data?.summary.in ?? 0)} />
          <Summary label="Saídas" value={formatCurrency(data?.summary.out ?? 0)} />
          <Summary label="Saldo final" value={formatCurrency(data?.summary.balance ?? 0)} />
        </div>
        <div className="h-[300px] overflow-hidden rounded-md border border-border/60 bg-[#11111a]/60 p-2 pr-6">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data?.series ?? []}>
              <CartesianGrid strokeDasharray="1 3" stroke="#1f1f2b" />
              <XAxis dataKey="month" stroke="#666" fontSize={11} />
              <YAxis stroke="#666" fontSize={11} tickFormatter={(value) => formatCurrency(Number(value))} />
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
        <div className="overflow-hidden rounded-md border border-border/60">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-[#0d0d15] text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr className="[&>th]:px-3 [&>th]:py-2">
                <th>Data</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {data?.transactions.map((row) => (
                <tr
                  key={`${row.date}-${row.description}`}
                  className="border-t border-border/60 text-foreground transition-colors hover:bg-secondary/30 [&>td]:px-3 [&>td]:py-2"
                >
                  <td>{new Date(row.date).toLocaleDateString("pt-BR")}</td>
                  <td>
                    <span className={row.type === "Entrada" ? "text-emerald-300" : "text-red-300"}>{row.type}</span>
                  </td>
                  <td>{row.category}</td>
                  <td>{row.description}</td>
                  <td>{formatCurrency(row.value)}</td>
                  <td>{formatCurrency(row.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-secondary/20 p-3 text-xs text-muted-foreground">
      <p className="text-[11px] uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
