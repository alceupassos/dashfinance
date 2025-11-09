import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart } from "recharts"
import { cn } from "@/lib/utils"

export interface TimelinePoint {
  label: string
  value: number
  secondaryValue?: number
}

export interface TimelineChartProps {
  data: TimelinePoint[]
  labelFormatter?: (label: string) => string
  valueFormatter?: (value: number) => string
  variant?: "line" | "area"
  height?: number
  className?: string
}

export function TimelineChart({
  data,
  labelFormatter,
  valueFormatter,
  variant = "line",
  height = 280,
  className,
}: TimelineChartProps) {
  if (data.length === 0) {
    return (
      <div className={cn("flex h-48 items-center justify-center rounded-md border border-dashed", className)}>
        <p className="text-sm text-muted-foreground">Sem dados suficientes para exibir</p>
      </div>
    )
  }

  const formatLabel = (label: string) => labelFormatter ? labelFormatter(label) : label
  const formatValue = (value: number) => valueFormatter ? valueFormatter(value) : value.toString()

  const renderContent = () => {
    if (variant === "area") {
      return (
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tickFormatter={formatLabel} />
          <YAxis tickFormatter={formatValue} />
          <Tooltip formatter={(val: number) => formatValue(val)} labelFormatter={formatLabel} />
          <Area type="monotone" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
          {data.some((point) => typeof point.secondaryValue === "number") && (
            <Area type="monotone" dataKey="secondaryValue" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.2} />
          )}
        </AreaChart>
      )
    }

    return (
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" tickFormatter={formatLabel} />
        <YAxis tickFormatter={formatValue} />
        <Tooltip formatter={(val: number) => formatValue(val)} labelFormatter={formatLabel} />
        <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} dot={false} />
        {data.some((point) => typeof point.secondaryValue === "number") && (
          <Line type="monotone" dataKey="secondaryValue" stroke="#f97316" strokeWidth={2} dot={false} />
        )}
      </LineChart>
    )
  }

  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <ResponsiveContainer width="100%" height={height}>
        {renderContent()}
      </ResponsiveContainer>
    </div>
  )
}

export default TimelineChart
