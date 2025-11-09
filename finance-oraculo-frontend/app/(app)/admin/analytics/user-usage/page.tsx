"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import { Users, Activity, MessageSquare, Zap, TrendingUp, Clock } from "lucide-react"
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface UserUsage {
  user_id: string
  email: string
  total_sessions: number
  total_duration_hours: number
  pages_visited: string[]
  features_used: string[]
  api_calls: number
  llm_interactions: number
  whatsapp_messages: number
  last_active: string
}

export default function UserUsagePage() {
  const [usage, setUsage] = useState<UserUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d')

  useEffect(() => {
    fetchUsage()
  }, [fetchUsage])

  const fetchUsage = useCallback(async () => {
    try {
      const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

      // Buscar uso agregado por usuário
      const { data: usageData } = await supabase
        .from('user_system_usage')
        .select('user_id, session_start, session_end, session_duration_seconds, pages_visited, features_used, api_calls_count, llm_interactions_count, whatsapp_messages_sent, whatsapp_messages_received')
        .gte('session_start', since)

      // Agregar por usuário
      const aggregated: Record<string, UserUsage> = {}
      
      usageData?.forEach((item: any) => {
        if (!aggregated[item.user_id]) {
          aggregated[item.user_id] = {
            user_id: item.user_id,
            email: '', // Buscar depois
            total_sessions: 0,
            total_duration_hours: 0,
            pages_visited: [],
            features_used: [],
            api_calls: 0,
            llm_interactions: 0,
            whatsapp_messages: 0,
            last_active: item.session_start
          }
        }
        
        aggregated[item.user_id].total_sessions++
        aggregated[item.user_id].total_duration_hours += (item.session_duration_seconds || 0) / 3600
        aggregated[item.user_id].api_calls += item.api_calls_count || 0
        aggregated[item.user_id].llm_interactions += item.llm_interactions_count || 0
        aggregated[item.user_id].whatsapp_messages += (item.whatsapp_messages_sent || 0) + (item.whatsapp_messages_received || 0)
        
        if (item.pages_visited) {
          aggregated[item.user_id].pages_visited.push(...item.pages_visited)
        }
        if (item.features_used) {
          aggregated[item.user_id].features_used.push(...item.features_used)
        }
        
        if (new Date(item.session_start) > new Date(aggregated[item.user_id].last_active)) {
          aggregated[item.user_id].last_active = item.session_start
        }
      })

      // Buscar emails dos usuários
      const userIds = Object.keys(aggregated)
      if (userIds.length > 0) {
        const { data: users } = await supabase.auth.admin.listUsers()
        users?.users.forEach(user => {
          if (aggregated[user.id]) {
            aggregated[user.id].email = user.email || ''
          }
        })
      }

      // Remover duplicatas de páginas e features
      Object.values(aggregated).forEach(u => {
        u.pages_visited = [...new Set(u.pages_visited)]
        u.features_used = [...new Set(u.features_used)]
      })

      setUsage(Object.values(aggregated).sort((a, b) => b.total_sessions - a.total_sessions))
    } catch (error) {
      console.error('Error fetching usage:', error)
    } finally {
      setLoading(false)
    }
  }, [timeframe])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Uso do Sistema por Usuário
          </h1>
          <p className="text-muted-foreground mt-1">
            Análise detalhada do uso do sistema por usuário
          </p>
        </div>
        <Tabs value={timeframe} onValueChange={(v: any) => setTimeframe(v)}>
          <TabsList>
            <TabsTrigger value="7d">7 dias</TabsTrigger>
            <TabsTrigger value="30d">30 dias</TabsTrigger>
            <TabsTrigger value="90d">90 dias</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Usuários Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usage.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total de Sessões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usage.reduce((acc, u) => acc + u.total_sessions, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Horas Totais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usage.reduce((acc, u) => acc + u.total_duration_hours, 0).toFixed(1)}h
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Interações LLM</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usage.reduce((acc, u) => acc + u.llm_interactions, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Uso */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por Usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Sessões</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead>Páginas</TableHead>
                <TableHead>Features</TableHead>
                <TableHead>API Calls</TableHead>
                <TableHead>LLM</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Última Atividade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usage.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell>
                    <div className="font-medium">{user.email || user.user_id.substring(0, 8)}</div>
                  </TableCell>
                  <TableCell>{user.total_sessions}</TableCell>
                  <TableCell>{user.total_duration_hours.toFixed(1)}h</TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.pages_visited.length}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.features_used.length}</Badge>
                  </TableCell>
                  <TableCell>{user.api_calls}</TableCell>
                  <TableCell>
                    <Badge>{user.llm_interactions}</Badge>
                  </TableCell>
                  <TableCell>{user.whatsapp_messages}</TableCell>
                  <TableCell>
                    {new Date(user.last_active).toLocaleDateString('pt-BR')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
