"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";

export interface BridgeItem {
  label: string;
  value: number;
  type: "start" | "positive" | "negative" | "end";
}

const COLORS: Record<BridgeItem["type"], string> = {
  start: "#38bdf8",
  positive: "#22c55e",
  negative: "#ef4444",
  end: "#a855f7"
};

const processedData = (data: BridgeItem[]) =>
  data.map((item) => ({
    name: item.label,
    value: item.value,
    type: item.type
  }));

export function EbitdaBridge({ data }: { data: BridgeItem[] }) {
  const chartData = processedData(data);

  return (
    <Card className="col-span-12 border-border/60 bg-[#11111a]/80">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-none p-4">
        <CardTitle className="text-sm">EBITDA Bridge</CardTitle>
        <span className="text-[11px] text-muted-foreground">Impacto dos drivers operacionais</span>
      </CardHeader>
      <CardContent className="h-72 p-0 pb-4 pl-4 pr-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="1 3" stroke="#1f1f2b" vertical={false} />
            <XAxis dataKey="name" stroke="#666" fontSize={11} />
            <YAxis stroke="#666" fontSize={11} tickFormatter={(value) => formatCurrency(Number(value))} />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: "#0f0f16",
                border: "1px solid rgba(68,68,88,0.5)",
                borderRadius: "0.5rem",
                fontSize: "12px"
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((item) => (
                <Cell key={item.name} fill={COLORS[item.type]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
