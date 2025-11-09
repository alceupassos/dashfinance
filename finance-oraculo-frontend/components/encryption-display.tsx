import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Copy, Eye, EyeOff } from "lucide-react"

export interface EncryptionDisplayProps {
  label?: string
  value?: string | null
  className?: string
  allowReveal?: boolean
  onCopy?: () => void
}

const maskValue = (value?: string | null) => {
  if (!value) return "—"
  const visible = value.slice(-4)
  return `••••••••${visible}`
}

export function EncryptionDisplay({
  label,
  value,
  allowReveal = true,
  className,
  onCopy,
}: EncryptionDisplayProps) {
  const [revealed, setRevealed] = useState(false)
  const displayValue = revealed ? value ?? "—" : maskValue(value)

  const handleCopy = async () => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      onCopy?.()
    } catch (error) {
      console.error("Clipboard error:", error)
    }
  }

  return (
    <div className={cn("flex flex-col gap-1 rounded-lg border border-border/50 p-3", className)}>
      {label && <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>}
      <div className="flex items-center justify-between gap-2">
        <code className="text-sm font-mono text-primary/90 break-all">{displayValue}</code>
        <div className="flex items-center gap-1">
          {allowReveal && value && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setRevealed((prev) => !prev)}
            >
              {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          )}
          {value && (
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default EncryptionDisplay
