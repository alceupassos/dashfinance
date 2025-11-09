"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import MoodIndicator from "@/components/mood-indicator"
import TimelineChart from "@/components/timeline-chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, Download } from "lucide-react"

interface MoodDaily {
  sentiment_score: number
  total_messages: number
  day_bucket: string
}

interface MoodMessage {
  id: string
  phone_number: string
  sentiment_score: number
  sentiment_label: string
  message_text: string
  created_at: string
}

export default function MoodTimelinePage() {
  const params = useParams<{ phone: string }>()
  const router = useRouter()
  const [daily, setDaily] = useState<MoodDaily[]>([])
  const [messages, setMessages] = useState<MoodMessage[]>([])
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params?.phone) {
      fetchTimeline()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.phone, dateRange.start, dateRange.end])

  const fetchTimeline = async () => {
    setLoading(true)
    try {
      const { data: dailyData } = await supabase
        .from("whatsapp_mood_index_daily")
        .select("sentiment_score,total_messages,day_bucket")
        .eq("phone_number", params.phone)
        .gte("day_bucket", dateRange.start)
        .lte("day_bucket", dateRange.end)
        .order("day_bucket", { ascending: true })

      setDaily((dailyData as MoodDaily[]) || [])

      const { data: messagesData } = await supabase
        .from("whatsapp_sentiment_messages")
        .select("*")
        .eq("phone_number", params.phone)
        .gte("created_at", dateRange.start)
        .lte("created_at", `${dateRange.end}T23:59:59.999Z`)
        .order("created_at", { ascending: false })
        .limit(200)

      setMessages((messagesData as MoodMessage[]) || [])
    } catch (error) {
      console.error("Error fetching mood timeline:", error)
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = () => {
    if (messages.length === 0) return
    const header = "created_at,sentiment_score,sentiment_label,message_text\n"
    const rows = messages
      .map((msg) =>
        [
          msg.created_at,
          msg.sentiment_score.toFixed(2),
          msg.sentiment_label,
          JSON.stringify(msg.message_text ?? "").replaceAll(",", ";"),
        ].join(",")
      )
      .join("\n")
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `mood_timeline_${params.phone}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const timelineData = useMemo(
    () =>
      daily.map((item) => ({
        label: new Date(item.day_bucket).toLocaleDateString("pt-BR"),
        value: item.sentiment_score,
        secondaryValue: item.total_messages,
      })),
    [daily]
  )

  const todayMood = daily[daily.length - 1]?.sentiment_score ?? 0

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Button variant="ghost" className="mb-2 gap-2 px-0 text-sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold">Timeline de Humor</h1>
          <p className="text-muted-foreground">Cliente / telefone: {params.phone}</p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Input
            type="date"
            value={dateRange.start}
            onChange={(event) => setDateRange((prev) => ({ ...prev, start: event.target.value }))}
          />
          <Input
            type="date"
            value={dateRange.end}
            onChange={(event) => setDateRange((prev) => ({ ...prev, end: event.target.value }))}
          />
          <Button variant="outline" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo Atual</CardTitle>
          <CardDescription>Sentimento ao final do período selecionado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <MoodIndicator score={todayMood} />
          <p className="text-sm text-muted-foreground">
            Total de mensagens analisadas:{" "}
            <strong>{daily.reduce((acc, item) => acc + (item.total_messages ?? 0), 0)}</strong>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sentimento ao longo do tempo</CardTitle>
          <CardDescription>Comparativo com volume de mensagens</CardDescription>
        </CardHeader>
        <CardContent>
          <TimelineChart
            data={timelineData}
            valueFormatter={(value) => value.toFixed(2)}
            labelFormatter={(label) => label}
            variant="area"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mensagens analisadas</CardTitle>
          <CardDescription>Ordenadas da mais recente para a mais antiga</CardDescription>
        </CardHeader>
        <CardContent className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Sentimento</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Mensagem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((message) => (
                <TableRow key={message.id}>
                  <TableCell>{new Date(message.created_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="capitalize">{message.sentiment_label}</TableCell>
                  <TableCell>
                    <MoodIndicator score={message.sentiment_score} showLabel={false} />
                  </TableCell>
                  <TableCell className="max-w-xl text-sm text-muted-foreground">
                    {message.message_text?.slice(0, 200)}
                    {message.message_text && message.message_text.length > 200 && "…"}
                  </TableCell>
                </TableRow>
              ))}
              {messages.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Nenhuma mensagem encontrada para o período selecionado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
