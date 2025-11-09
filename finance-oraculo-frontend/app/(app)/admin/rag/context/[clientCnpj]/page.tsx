"use client"

import { useEffect, useState } from "react"
import TimelineChart from "@/components/timeline-chart"
import MoodIndicator from "@/components/mood-indicator"
import EncryptionDisplay from "@/components/encryption-display"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

interface RagContext {
  summary: string
  key_points: string[]
  trending_topics: string[]
  sentiment_trend: Array<{ bucket: string; score: number; messages: number }>
  last_updated: string
  context_signature: string
}

export default function RagContextPage() {
  const params = useParams<{ clientCnpj: string }>()
  const router = useRouter()
  const [context, setContext] = useState<RagContext | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params?.clientCnpj) {
      fetchContext()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.clientCnpj])

  const fetchContext = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL}/get-client-rag-context?client=${params.clientCnpj}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )

      if (response.ok) {
        const payload = await response.json()
        setContext(payload)
      }
    } catch (error) {
      console.error("Error fetching context:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  if (!context) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum contexto consolidado foi encontrado para este cliente.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <Button variant="ghost" className="mb-2 gap-2 px-0 text-sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold">Contexto RAG</h1>
          <p className="text-muted-foreground">Cliente: {params.clientCnpj}</p>
        </div>
        <Badge variant="outline">
          Atualizado em {new Date(context.last_updated).toLocaleString("pt-BR")}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo executivo</CardTitle>
          <CardDescription>Insights consolidados a partir das últimas conversas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">{context.summary}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Principais pontos</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                {context.key_points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Tópicos em alta</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {context.trending_topics.map((topic) => (
                  <Badge key={topic} variant="outline">
                    #{topic}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sentimento e volume</CardTitle>
          <CardDescription>Últimos 30 dias de conversas indexadas</CardDescription>
        </CardHeader>
        <CardContent>
          <TimelineChart
            data={context.sentiment_trend.map((item) => ({
              label: new Date(item.bucket).toLocaleDateString("pt-BR"),
              value: item.score,
              secondaryValue: item.messages,
            }))}
            valueFormatter={(value) => value.toFixed(2)}
            variant="area"
          />
          <div className="mt-4">
            <MoodIndicator score={context.sentiment_trend[context.sentiment_trend.length - 1]?.score ?? 0} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Metadados</CardTitle>
          <CardDescription>Hash do contexto armazenado</CardDescription>
        </CardHeader>
        <CardContent>
          <EncryptionDisplay
            label="Assinatura criptografada"
            value={context.context_signature}
            allowReveal={false}
            className="border-dashed"
          />
        </CardContent>
      </Card>
    </div>
  )
}
