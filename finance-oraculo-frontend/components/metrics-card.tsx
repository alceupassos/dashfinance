import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

type Status = "default" | "success" | "warning" | "critical"

const STATUS_RING: Record<Status, string> = {
  default: "border-border",
  success: "border-green-500/40",
  warning: "border-yellow-500/60",
  critical: "border-red-500/70",
}

const TREND_COLORS: Record<"up" | "down" | "steady", string> = {
  up: "text-emerald-400",
  down: "text-red-400",
  steady: "text-muted-foreground",
}

export interface MetricsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: ReactNode
  status?: Status
  trendLabel?: string
  trendValue?: string
  trendDirection?: "up" | "down" | "steady"
  footer?: ReactNode
  className?: string
}

export function MetricsCard({
  title,
  value,
  description,
  icon,
  status = "default",
  trendDirection = "steady",
  trendLabel,
  trendValue,
  footer,
  className,
}: MetricsCardProps) {
  return (
    <Card className={cn("h-full border-2 bg-card/90 backdrop-blur", STATUS_RING[status], className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          {description && <CardDescription className="text-xs">{description}</CardDescription>}
        </div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {(trendLabel || trendValue) && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{trendLabel}</span>
            <span className={cn("font-semibold", TREND_COLORS[trendDirection])}>{trendValue}</span>
          </div>
        )}
        {footer}
      </CardContent>
    </Card>
  )
}

export default MetricsCard
