"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Brush
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";

interface RevenueCostChartPoint {
  month: string;
  receita: number;
  despesas: number;
  lucro: number;
}

interface RevenueCostChartProps {
  data: RevenueCostChartPoint[];
}

export function RevenueCostChart({ data }: RevenueCostChartProps) {
  return (
    <Card className="col-span-12 border-border/60 bg-[#11111a]/80">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-none p-4">
        <CardTitle className="text-sm">Receita x Custos x Despesas</CardTitle>
        <span className="text-[11px] text-muted-foreground">Período consolidado (zoom + hover)</span>
      </CardHeader>
      <CardContent className="h-[300px] p-0 pr-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="1 5" stroke="#1f1f2b" />
            <XAxis dataKey="month" stroke="#666" fontSize={11} />
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
            <Line type="monotone" dataKey="receita" name="Receita" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="despesas" name="Despesas" stroke="#22d3ee" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="lucro" name="Lucro" stroke="#22c55e" strokeWidth={2} dot={false} />
            <Brush height={20} stroke="#8b5cf6" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
