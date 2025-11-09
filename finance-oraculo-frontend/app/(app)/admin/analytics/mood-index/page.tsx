"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import MoodIndicator from "@/components/mood-indicator"
import TimelineChart from "@/components/timeline-chart"
import { TrendingUp, AlertTriangle } from "lucide-react"
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"

interface MoodIndex {
  period_date: string
  avg_sentiment_score: number
  sentiment_trend: string
  very_negative_count: number
  negative_count: number
  neutral_count: number
  positive_count: number
  very_positive_count: number
  total_messages: number
}

export default function MoodIndexPage() {
  const [moodData, setMoodData] = useState<MoodIndex[]>([])
  const [selectedCompany, setSelectedCompany] = useState<string>("")
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  useEffect(() => {
    if (selectedCompany) {
      fetchMoodData()
    }
  }, [selectedCompany, fetchMoodData])

  const fetchCompanies = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('companies')
        .select('cnpj, name')
        .order('name')
      setCompanies(data || [])
      if (data && data.length > 0) {
        setSelectedCompany(data[0].cnpj)
      }
    } catch (error) {
      console.error('Error fetching companies:', error)
    }
  }, [])

  const fetchMoodData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('mood_index_timeline')
        .select('*')
        .eq('company_cnpj', selectedCompany)
        .eq('period_type', 'day')
        .order('period_date', { ascending: false })
        .limit(30)

      if (error) throw error
      setMoodData((data || []).reverse())
    } catch (error) {
      console.error('Error fetching mood data:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedCompany])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  const chartData = moodData.map(item => ({
    date: new Date(item.period_date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
    score: item.avg_sentiment_score,
    positive: item.positive_count + item.very_positive_count,
    negative: item.negative_count + item.very_negative_count,
    neutral: item.neutral_count
  }))

  const avgSentiment = moodData.length > 0
    ? moodData.reduce((acc, item) => acc + item.avg_sentiment_score, 0) / moodData.length
    : 0

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            Índice de Humor dos Clientes
          </h1>
          <p className="text-muted-foreground mt-1">
            Análise de sentimento e humor ao longo do tempo via WhatsApp
          </p>
        </div>
        <Select value={selectedCompany} onValueChange={setSelectedCompany}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Selecione uma empresa" />
          </SelectTrigger>
          <SelectContent>
            {companies.map((company) => (
              <SelectItem key={company.cnpj} value={company.cnpj}>
                {company.name || company.cnpj}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Média de Sentimento</CardTitle>
          </CardHeader>
          <CardContent>
            <MoodIndicator score={avgSentiment} />
            <p className="text-xs text-muted-foreground mt-2">
              {avgSentiment >= 0.5 ? 'Muito Positivo' :
               avgSentiment >= 0 ? 'Positivo' :
               avgSentiment >= -0.5 ? 'Neutro/Negativo' : 'Muito Negativo'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total de Mensagens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {moodData.reduce((acc, item) => acc + item.total_messages, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Mensagens Positivas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {moodData.reduce((acc, item) => acc + item.positive_count + item.very_positive_count, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Mensagens Negativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">
              {moodData.reduce((acc, item) => acc + item.negative_count + item.very_negative_count, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Tendência */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução do Sentimento</CardTitle>
          <CardDescription>Últimos 30 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <TimelineChart
            data={chartData.map((item) => ({ label: item.date, value: item.score }))}
            variant="area"
            valueFormatter={(value) => value.toFixed(2)}
          />
        </CardContent>
      </Card>

      {/* Distribuição de Sentimentos */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Sentimentos</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="positive" stackId="a" fill="#22c55e" />
              <Bar dataKey="neutral" stackId="a" fill="#94a3b8" />
              <Bar dataKey="negative" stackId="a" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabela Detalhada */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento Diário</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Score Médio</TableHead>
                <TableHead>Tendência</TableHead>
                <TableHead>Muito Negativo</TableHead>
                <TableHead>Negativo</TableHead>
                <TableHead>Neutro</TableHead>
                <TableHead>Positivo</TableHead>
                <TableHead>Muito Positivo</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {moodData.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    {new Date(item.period_date).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <span className={getSentimentColor(item.avg_sentiment_score)}>
                      {item.avg_sentiment_score.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.sentiment_trend === 'improving' ? 'default' :
                        item.sentiment_trend === 'declining' ? 'destructive' : 'secondary'
                      }
                    >
                      {item.sentiment_trend === 'improving' ? 'Melhorando' :
                       item.sentiment_trend === 'declining' ? 'Piorando' : 'Estável'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-red-500">{item.very_negative_count}</TableCell>
                  <TableCell className="text-orange-500">{item.negative_count}</TableCell>
                  <TableCell>{item.neutral_count}</TableCell>
                  <TableCell className="text-blue-500">{item.positive_count}</TableCell>
                  <TableCell className="text-green-500">{item.very_positive_count}</TableCell>
                  <TableCell className="font-medium">{item.total_messages}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
