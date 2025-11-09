"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";

interface CashflowPoint {
  label: string;
  entrada: number;
  saida: number;
}

interface CashflowStackedBarsProps {
  data: CashflowPoint[];
}

export function CashflowStackedBars({ data }: CashflowStackedBarsProps) {
  const xKey = "label";

  return (
    <Card className="col-span-12 border-border/60 bg-[#11111a]/80">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-none p-4">
        <CardTitle className="text-sm">Fluxo de Caixa (in/out)</CardTitle>
        <span className="text-[11px] text-muted-foreground">Comparativo mensal consolidado</span>
      </CardHeader>
      <CardContent className="h-[280px] p-0 pr-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={18} margin={{ top: 16, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="1 4" stroke="#1f1f2b" vertical={false} />
            <XAxis dataKey={xKey} stroke="#666" fontSize={11} />
            <YAxis
              stroke="#666"
              fontSize={11}
              tickFormatter={(value) => formatCurrency(Number(value))}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f0f16",
                border: "1px solid rgba(68,68,88,0.5)",
                borderRadius: "0.5rem",
                fontSize: "12px"
              }}
              formatter={(value: number, name: string) => [formatCurrency(value), name]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="entrada" name="Entradas" stackId="cash" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="saida" name="Saídas" stackId="cash" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
