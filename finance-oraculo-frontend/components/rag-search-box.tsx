import { FormEvent, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Search, Loader2 } from "lucide-react"

export interface RagSearchOption {
  value: string
  label: string
}

export interface RagSearchBoxProps {
  clients: RagSearchOption[]
  onSearch: (payload: { query: string; client: string }) => Promise<void> | void
  className?: string
  placeholder?: string
  loading?: boolean
}

export function RagSearchBox({
  clients,
  onSearch,
  className,
  placeholder = "Buscar por sentimento, assunto ou palavra-chave",
  loading,
}: RagSearchBoxProps) {
  const [query, setQuery] = useState("")
  const [client, setClient] = useState(clients[0]?.value ?? "")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!query || !client) return
    setSubmitting(true)
    try {
      await onSearch({ query, client })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-3 md:flex-row", className)}>
      <div className="flex-1">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="h-11 text-base"
        />
      </div>
      <Select value={client} onValueChange={setClient}>
        <SelectTrigger className="h-11 md:w-64">
          <SelectValue placeholder="Cliente" />
        </SelectTrigger>
        <SelectContent>
          {clients.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" className="h-11 md:w-40" disabled={submitting || loading || !query}>
        {submitting || loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Buscando
          </>
        ) : (
          <>
            <Search className="mr-2 h-4 w-4" />
            Buscar
          </>
        )}
      </Button>
    </form>
  )
}

export default RagSearchBox
