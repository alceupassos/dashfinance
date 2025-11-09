"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import MetricsCard from "@/components/metrics-card"
import TimelineChart from "@/components/timeline-chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { ArrowLeft, MousePointerClick, ActivitySquare, Timer, Api } from "lucide-react"

interface UsageSession {
  id: string
  user_id: string
  user_email: string
  company_cnpj: string | null
  session_start: string
  session_end: string
  session_duration_seconds: number
  pages_visited: string[]
  features_used: string[]
  api_calls_count: number
  successful_calls: number
  failed_calls: number
  avg_duration_ms: number
  created_at: string
}

export default function UsageDetailPage() {
  const params = useParams<{ userId: string }>()
  const router = useRouter()
  const [sessions, setSessions] = useState<UsageSession[]>([])
  const [selectedSession, setSelectedSession] = useState<UsageSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params?.userId) {
      fetchSessions(params.userId)
    }
  }, [params?.userId])

  const fetchSessions = async (userId: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("user_usage_tracking")
        .select("*")
        .eq("user_id", userId)
        .order("session_start", { ascending: false })
        .limit(20)

      if (error) throw error
      setSessions(data as UsageSession[])
      setSelectedSession((data as UsageSession[])[0] ?? null)
    } catch (error) {
      console.error("Error fetching usage detail:", error)
    } finally {
      setLoading(false)
    }
  }

  const timelineData = useMemo(() => {
    return sessions
      .slice()
      .reverse()
      .map((session) => ({
        label: new Date(session.session_start).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        value: session.api_calls_count,
        secondaryValue: Math.round(session.session_duration_seconds / 60),
      }))
  }, [sessions])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  if (!selectedSession) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhum dado de sessão encontrado para este usuário.
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalDuration = sessions.reduce((acc, session) => acc + session.session_duration_seconds, 0)
  const totalApiCalls = sessions.reduce((acc, session) => acc + session.api_calls_count, 0)

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Button variant="ghost" className="mb-2 gap-2 px-0 text-sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold">Detalhes de Uso</h1>
          <p className="text-muted-foreground">
            Usuário: <span className="font-mono">{selectedSession.user_email}</span>
          </p>
        </div>
        <Badge variant="outline">Últimas {sessions.length} sessões</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricsCard
          title="Duração Total"
          value={`${Math.round(totalDuration / 60)} min`}
          description="Últimas sessões"
          icon={<Timer className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricsCard
          title="Chamadas API"
          value={totalApiCalls}
          description="Sucesso + falha"
          icon={<Api className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricsCard
          title="Features utilizadas"
          value={[...new Set(sessions.flatMap((session) => session.features_used))].length}
          description="Últimas sessões"
          icon={<ActivitySquare className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timeline de Atividade</CardTitle>
          <CardDescription>API calls x duração por sessão</CardDescription>
        </CardHeader>
        <CardContent>
          <TimelineChart
            data={timelineData}
            labelFormatter={(label) => label}
            valueFormatter={(value) => `${value} calls`}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sessões Recentes</CardTitle>
            <CardDescription>Selecione para ver detalhes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition hover:border-primary",
                  selectedSession.id === session.id && "border-primary bg-primary/5"
                )}
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {new Date(session.session_start).toLocaleDateString("pt-BR")}{" "}
                    {new Date(session.session_start).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <Badge variant="secondary">{Math.round(session.session_duration_seconds / 60)} min</Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {session.pages_visited.slice(0, 3).join(", ")}
                  {session.pages_visited.length > 3 && "…"}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalhes da Sessão</CardTitle>
            <CardDescription>
              {new Date(selectedSession.session_start).toLocaleString("pt-BR")} —{" "}
              {new Date(selectedSession.session_end).toLocaleTimeString("pt-BR")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Duração</p>
                <p className="text-xl font-semibold">{Math.round(selectedSession.session_duration_seconds / 60)} min</p>
              </div>
              <div>
                <p className="text-muted-foreground">Chamadas API</p>
                <p className="text-xl font-semibold">{selectedSession.api_calls_count}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Sucesso</p>
                <p className="text-xl font-semibold text-green-500">{selectedSession.successful_calls}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Falhas</p>
                <p className="text-xl font-semibold text-red-500">{selectedSession.failed_calls}</p>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase text-muted-foreground">Páginas visitadas</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedSession.pages_visited.map((page) => (
                  <Badge key={page} variant="outline">
                    {page}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase text-muted-foreground">Features utilizadas</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedSession.features_used.map((feature) => (
                  <Badge key={feature} variant="secondary">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Eventos e chamadas API</CardTitle>
          <CardDescription>Resumo por sessão selecionada</CardDescription>
        </CardHeader>
        <CardContent className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tempo</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Detalhes</TableHead>
                <TableHead>Latência média</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  {new Date(selectedSession.session_start).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell className="flex items-center gap-2">
                  <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                  Login
                </TableCell>
                <TableCell>Início da sessão</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>≈ sessão</TableCell>
                <TableCell>
                  <Api className="mr-2 inline h-4 w-4 text-muted-foreground" />
                  Chamadas API
                </TableCell>
                <TableCell>
                  {selectedSession.successful_calls} sucesso / {selectedSession.failed_calls} falha
                </TableCell>
                <TableCell>{Math.round(selectedSession.avg_duration_ms)} ms</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
