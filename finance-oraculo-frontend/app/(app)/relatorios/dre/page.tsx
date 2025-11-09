"use client";

import { useQuery } from "@tanstack/react-query";
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
import { getReportDre, analyzeDre } from "@/lib/api";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { mockTargets } from "@/lib/api";
import { formatCurrency } from "@/lib/formatters";
import { useMemo, useState } from "react";

const lineKeys = [
  { key: "receita_bruta", label: "Receita bruta" },
  { key: "lucro_liquido", label: "Lucro líquido" },
  { key: "ebitda", label: "EBITDA" }
];

const lineColors = {
  receita_bruta: "#8b5cf6",
  lucro_liquido: "#38bdf8",
  ebitda: "#22c55e"
};

export default function DrePage() {
  const { selectedTarget, setTarget, period, setPeriod } = useDashboardStore();
  const [analysis, setAnalysis] = useState<string | null>(null);

  const cnpjOptions = mockTargets.cnpjs;
  const currentCnpj = selectedTarget.type === "cnpj" ? selectedTarget.value : cnpjOptions[0]?.value ?? "";
  const periodoValue = period.from.slice(0, 7);

  const { data, isLoading } = useQuery({
    queryKey: ["report-dre", currentCnpj, periodoValue],
    queryFn: () => getReportDre({ cnpj: currentCnpj, periodo: periodoValue }),
    enabled: Boolean(currentCnpj)
  });

  const dreLines = useMemo(() => {
    const dre = data?.dre;
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
      { label: "Resultados financeiros", value: dre.receitas_financeiras + dre.despesas_financeiras },
      { label: "Lucro antes do IR", value: dre.lucro_antes_ir },
      { label: "IR/CSLL", value: dre.ir_csll },
      { label: "Lucro líquido", value: dre.lucro_liquido }
    ];
  }, [data]);

  const chartData = useMemo(() => {
    return (data?.historico ?? []).map((entry) => ({
      month: entry.periodo,
      receita_bruta: entry.receita_bruta,
      ebitda: entry.ebitda,
      lucro_liquido: entry.lucro_liquido
    }));
  }, [data]);

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
            <Button variant="secondary" size="sm" onClick={handleAnalyze}>
              Análise com IA
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <div className="overflow-hidden rounded-md border border-border/60 bg-[#11111a]/80">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-[#0d0d15] text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr className="[&>th]:px-3 [&>th]:py-2">
                  <th>Conta</th>
                  <th>Valor atual</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={2} className="px-3 py-6 text-center text-[11px] text-muted-foreground">
                      Carregando DRE...
                    </td>
                  </tr>
                )}
                {!isLoading && dreLines.map((line) => (
                  <tr key={line.label} className="border-t border-border/60 text-foreground [&>td]:px-3 [&>td]:py-2">
                    <td className="font-medium">{line.label}</td>
                    <td>{formatCurrency(line.value)}</td>
                  </tr>
                ))}
                {!isLoading && !dreLines.length && (
                  <tr>
                    <td colSpan={2} className="px-3 py-6 text-center text-[11px] text-muted-foreground">
                      Nenhum dado disponível.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="h-[320px] overflow-hidden rounded-md border border-border/60 bg-[#11111a]/60 p-2 pr-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
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
