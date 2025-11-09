"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts"

interface UsageData {
  date: string
  tokens: number
  cost_usd: number
  requests: number
  whatsapp_messages: number
}

export default function UsageDetailPage() {
  const [usageData, setUsageData] = useState<UsageData[]>([])
  const [totals, setTotals] = useState({
    tokens: 0,
    cost: 0,
    requests: 0,
    messages: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUsageData = async () => {
      try {
        const last30Days = new Date()
        last30Days.setDate(last30Days.getDate() - 30)

        const { data, error } = await supabase
          .from('llm_token_usage')
          .select('*')
          .gte('created_at', last30Days.toISOString())
          .order('created_at', { ascending: true })

        if (error) throw error

        // Agrupar por dia
        const grouped: Record<string, { date: string; tokens: number; cost_usd: number; requests: number; whatsapp_messages: number }> = {}
        data?.forEach((item: any) => {
          const date = new Date(item.created_at).toLocaleDateString('pt-BR')
          if (!grouped[date]) {
            grouped[date] = { date, tokens: 0, cost_usd: 0, requests: 0, whatsapp_messages: 0 }
          }
          grouped[date].tokens += item.total_tokens || 0
          grouped[date].cost_usd += item.cost_usd || 0
          grouped[date].requests += 1
        })

        const chartData = Object.values(grouped).sort((a: any, b: any) => {
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        })

        setUsageData(chartData as UsageData[])

        // Calcular totais
        const totalsCalc = {
          tokens: (chartData as UsageData[]).reduce((sum, d) => sum + d.tokens, 0),
          cost: (chartData as UsageData[]).reduce((sum, d) => sum + d.cost_usd, 0),
          requests: (chartData as UsageData[]).reduce((sum, d) => sum + d.requests, 0),
          messages: 0
        }
        setTotals(totalsCalc)
      } catch (error) {
        console.error('Error fetching usage data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsageData()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Detalhes de Uso</h1>
        <p className="text-muted-foreground mt-2">Análise detalhada dos últimos 30 dias</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.tokens.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Últimos 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Custo Total (USD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totals.cost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Últimos 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Requisições</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.requests}</div>
            <p className="text-xs text-muted-foreground mt-1">Últimos 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Custo por Token</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${((totals.cost / totals.tokens) * 1000000).toFixed(4)}</div>
            <p className="text-xs text-muted-foreground mt-1">Por 1M tokens</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uso de Tokens por Dia</CardTitle>
          <CardDescription>Visualização dos últimos 30 dias</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="tokens" stroke="#8884d8" name="Tokens" />
                <Line type="monotone" dataKey="cost_usd" stroke="#82ca9d" name="Custo (USD)" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Requisições por Dia</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="requests" fill="#8884d8" name="Requisições" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

