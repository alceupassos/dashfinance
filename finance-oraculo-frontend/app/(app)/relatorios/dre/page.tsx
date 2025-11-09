"use client";

import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { getReportDre, analyzeDre } from "@/lib/api";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { mockTargets } from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { useState } from "react";

export default function DrePage() {
  const { selectedTarget, setTarget, period, setPeriod } = useDashboardStore();
  const [analysis, setAnalysis] = useState<string | null>(null);

  const cnpjOptions = mockTargets.cnpjs;
  const currentCnpj = selectedTarget.type === "cnpj" ? selectedTarget.value : cnpjOptions[0]?.value ?? "";

  const { data } = useQuery({
    queryKey: ["report-dre", currentCnpj, period],
    queryFn: () => getReportDre({ cnpj: currentCnpj, from: period.from, to: period.to }),
    enabled: Boolean(currentCnpj)
  });

  const handleAnalyze = async () => {
    const response = await analyzeDre();
    setAnalysis(response.insight);
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="flex flex-col gap-2 border-none p-4 pb-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-sm">Relatório DRE</CardTitle>
            <p className="text-[11px] text-muted-foreground">Demonstrativo de resultados com evolução temporal.</p>
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
            <Button variant="secondary" size="sm" onClick={handleAnalyze}>
              Análise com IA
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <div className="overflow-hidden rounded-md border border-border/60">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-[#0d0d15] text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr className="[&>th]:px-3 [&>th]:py-2">
                  <th>Conta</th>
                  <th>Valor atual</th>
                  <th>Valor anterior</th>
                  <th>Variação</th>
                </tr>
              </thead>
              <tbody>
                {data?.entries.map((entry) => (
                  <tr
                    key={entry.label}
                    className="border-t border-border/60 text-foreground transition-colors hover:bg-secondary/30 [&>td]:px-3 [&>td]:py-2"
                  >
                    <td className="font-medium">{entry.label}</td>
                    <td>{formatCurrency(entry.current)}</td>
                    <td>{formatCurrency(entry.previous)}</td>
                    <td>{formatPercent(entry.delta, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="h-[260px] overflow-hidden rounded-md border border-border/60 bg-[#11111a]/60 p-2 pr-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.chart ?? []}>
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
                <Line type="monotone" dataKey="Receita" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="EBITDA" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="LucroLiquido" stroke="#38bdf8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {analysis && (
            <div className="rounded-md border border-primary/40 bg-primary/10 p-3 text-xs text-foreground">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">Insight IA</p>
              <p>{analysis}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
