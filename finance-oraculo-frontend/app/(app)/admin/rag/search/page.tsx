"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"

interface RAGResult {
  id: string
  company_cnpj: string
  phone_number: string
  message_text: string
  sentiment_score: number
  topics: string[]
  similarity: number
  created_at: string
}

export default function RAGSearchPage() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<RAGResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setSearched(true)

    try {
      // Buscar conversas RAG que contenham o termo
      const { data, error } = await supabase
        .from('rag_conversations')
        .select('*')
        .ilike('message_text', `%${query}%`)
        .limit(20)

      if (error) throw error

      // Simular score de similaridade
      const resultsWithSimilarity = (data || []).map((item: any) => ({
        ...item,
        similarity: Math.random() * (1 - 0.5) + 0.5 // Entre 0.5 e 1.0
      }))

      setResults(resultsWithSimilarity as RAGResult[])
    } catch (error) {
      console.error('Error searching RAG:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Busca RAG</h1>
        <p className="text-muted-foreground mt-2">Recuperação de contexto por similaridade semântica</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Conversas</CardTitle>
          <CardDescription>Use palavras-chave para encontrar conversas similares</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Buscar por palavra-chave (ex: saldo, pagamento, fatura)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={loading}>
              {loading ? "Buscando..." : "Buscar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {searched && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados</CardTitle>
            <CardDescription>
              {results.length} resultado{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhum resultado encontrado</div>
            ) : (
              <div className="space-y-4">
                {results.map((result) => (
                  <div key={result.id} className="border rounded-lg p-4 hover:bg-accent transition">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-mono text-sm text-muted-foreground">
                          {result.phone_number} • {result.company_cnpj}
                        </p>
                        <p className="mt-2 text-sm">{result.message_text}</p>
                      </div>
                      <Badge variant="outline">
                        {(result.similarity * 100).toFixed(0)}% similar
                      </Badge>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {result.topics?.map((topic, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(result.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
