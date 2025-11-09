import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { AlertTriangle, CheckCircle2, Loader2, PauseCircle, XCircle } from "lucide-react"
import type { ComponentProps } from "react"

type Status =
  | "healthy"
  | "success"
  | "active"
  | "default"
  | "warning"
  | "degraded"
  | "paused"
  | "pending"
  | "error"
  | "critical"
  | "inactive"
  | "unknown"

const STATUS_STYLES: Record<
  Status,
  { className: string; icon?: React.ComponentType<ComponentProps<"svg">> }
> = {
  healthy: { className: "bg-green-500/90 text-white", icon: CheckCircle2 },
  success: { className: "bg-green-500/90 text-white", icon: CheckCircle2 },
  active: { className: "bg-green-500/90 text-white", icon: CheckCircle2 },
  default: { className: "bg-slate-600 text-white" },
  warning: { className: "bg-yellow-500/90 text-black", icon: AlertTriangle },
  degraded: { className: "bg-yellow-500/90 text-black", icon: AlertTriangle },
  paused: { className: "bg-slate-500/90 text-white", icon: PauseCircle },
  pending: { className: "bg-blue-500/90 text-white", icon: Loader2 },
  error: { className: "bg-red-600 text-white", icon: XCircle },
  critical: { className: "bg-red-600 text-white", icon: XCircle },
  inactive: { className: "bg-gray-600 text-white", icon: PauseCircle },
  unknown: { className: "bg-gray-500 text-white" },
}

export interface StatusBadgeProps extends ComponentProps<typeof Badge> {
  status?: Status
  label?: string
  pulse?: boolean
}

export function StatusBadge({
  status = "unknown",
  label,
  pulse,
  className,
  ...props
}: StatusBadgeProps) {
  const config = STATUS_STYLES[status] ?? STATUS_STYLES.unknown
  const Icon = config.icon

  return (
    <Badge
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-tight",
        config.className,
        pulse && "animate-pulse",
        className
      )}
      {...props}
    >
      {Icon && <Icon className={cn("h-3 w-3", status === "pending" && "animate-spin")} />}
      {label ?? status}
    </Badge>
  )
}

export default StatusBadge
