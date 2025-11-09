"use client";

import { useId } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from "recharts";
import { cn } from "@/lib/utils";

export interface GrafanaSeriesConfig {
  dataKey: string;
  label: string;
  stroke: string;
  fill?: string;
  type: "line" | "area";
  yAxisId?: string;
  unit?: string;
}

export interface GrafanaLineChartProps {
  data: Array<Record<string, unknown>>;
  series: GrafanaSeriesConfig[];
  height?: number;
  className?: string;
}

export function GrafanaLineChart({ data, series, height = 320, className }: GrafanaLineChartProps) {
  const gradientId = useId();

  return (
    <div className={cn("rounded-3xl border border-border/40 bg-[#0c0d14]/80 p-4", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <defs>
            {series.map((item) => (
              <linearGradient key={`${item.dataKey}-${gradientId}`} id={`${item.dataKey}-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={item.fill ?? item.stroke} stopOpacity={0.8} />
                <stop offset="100%" stopColor={item.fill ?? item.stroke} stopOpacity={0.1} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="1 3" stroke="#1c1e2a" vertical={false} />
          <XAxis dataKey="label" stroke="#555" fontSize={11} tick={{ fill: "#999" }} />
          <YAxis
            yAxisId="left"
            stroke="#555"
            fontSize={11}
            tick={{ fill: "#999" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#555"
            fontSize={11}
            tick={{ fill: "#999" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f111a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              fontSize: 12
            }}
            itemStyle={{ color: "#fff" }}
            cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 2 }}
            formatter={(value: number, name: string) => {
              const series = seriesConfigForName(name);
              if (series?.unit === "%") {
                return [`${Number(value).toFixed(1)}%`, name];
              }
              return [value, name];
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: 12, fontSize: 12, color: "#bbb" }}
            formatter={(value) => <span className="text-[12px] text-muted-foreground">{value}</span>}
          />
          {series.map((item) =>
            item.type === "area" ? (
              <Area
                key={item.dataKey}
                type="monotone"
                dataKey={item.dataKey}
                stroke={item.stroke}
                fill={`url(#${item.dataKey}-${gradientId})`}
                yAxisId={item.yAxisId ?? "left"}
                dot={false}
                strokeWidth={2}
                animationDuration={800}
              />
            ) : (
              <Line
                key={item.dataKey}
                type="monotone"
                dataKey={item.dataKey}
                stroke={item.stroke}
                yAxisId={item.yAxisId ?? "left"}
                dot={false}
                strokeWidth={2}
                animationDuration={800}
              />
            )
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  function seriesConfigForName(name: string) {
    return series.find((item) => item.label === name || item.dataKey === name);
  }
}
