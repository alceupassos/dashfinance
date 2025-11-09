import { Smile, Meh, Frown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MoodIndicatorProps {
  score: number
  className?: string
  showLabel?: boolean
}

const getMoodConfig = (score: number) => {
  if (score >= 0.5) {
    return { label: "Positivo", color: "text-green-500", Icon: Smile }
  }
  if (score >= 0) {
    return { label: "Neutro", color: "text-blue-500", Icon: Meh }
  }
  if (score >= -0.5) {
    return { label: "Levemente negativo", color: "text-yellow-500", Icon: Meh }
  }
  return { label: "Negativo", color: "text-red-500", Icon: Frown }
}

export function MoodIndicator({ score, className, showLabel = true }: MoodIndicatorProps) {
  const { label, color, Icon } = getMoodConfig(score)

  return (
    <div className={cn("inline-flex items-center gap-2 font-medium", color, className)}>
      <Icon className="h-5 w-5" />
      <span>
        {score.toFixed(2)} {showLabel && <span className="text-xs uppercase opacity-80">{label}</span>}
      </span>
    </div>
  )
}

export default MoodIndicator
