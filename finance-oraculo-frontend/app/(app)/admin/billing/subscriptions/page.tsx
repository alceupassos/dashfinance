"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import { Building, AlertTriangle, CheckCircle, Clock, DollarSign } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface Subscription {
  id: string
  company_cnpj: string
  plan_id: string
  status: string
  current_period_start: string
  current_period_end: string
  llm_tokens_used_this_period: number
  llm_cost_this_period_usd: number
  whatsapp_messages_this_period: number
  plan: {
    display_name: string
    monthly_price_usd: number
    max_llm_tokens_per_month: number | null
    max_llm_cost_per_month_usd: number | null
    max_whatsapp_messages_per_month: number | null
  }
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  const fetchSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('client_subscriptions')
        .select(`
          *,
          plan:service_plans(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSubscriptions(data || [])
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Ativa</Badge>
      case 'suspended':
        return <Badge className="bg-yellow-500"><AlertTriangle className="h-3 w-3 mr-1" />Suspensa</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>
      case 'trial':
        return <Badge className="bg-blue-500"><Clock className="h-3 w-3 mr-1" />Trial</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const calculateUsagePercent = (used: number, limit: number | null) => {
    if (!limit) return 0
    return Math.min((used / limit) * 100, 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Building className="h-8 w-8" />
          Assinaturas de Clientes
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie assinaturas e uso dos clientes
        </p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total de Assinaturas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {subscriptions.filter(s => s.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Em Trial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {subscriptions.filter(s => s.status === 'trial').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Receita Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${subscriptions
                .filter(s => s.status === 'active')
                .reduce((acc, s) => acc + (s.plan?.monthly_price_usd || 0), 0)
                .toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Assinaturas */}
      <Card>
        <CardHeader>
          <CardTitle>Assinaturas</CardTitle>
          <CardDescription>Lista completa de assinaturas e uso</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CNPJ</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Uso LLM</TableHead>
                <TableHead>Custo LLM</TableHead>
                <TableHead>Mensagens</TableHead>
                <TableHead>Próxima Cobrança</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-mono text-sm">{sub.company_cnpj}</TableCell>
                  <TableCell>
                    <div className="font-medium">{sub.plan?.display_name}</div>
                    <div className="text-xs text-muted-foreground">
                      ${sub.plan?.monthly_price_usd.toFixed(2)}/mês
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(sub.status)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(sub.current_period_start).toLocaleDateString('pt-BR')} - {new Date(sub.current_period_end).toLocaleDateString('pt-BR')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{sub.llm_tokens_used_this_period.toLocaleString()}</span>
                        {sub.plan?.max_llm_tokens_per_month && (
                          <span className="text-muted-foreground">
                            / {sub.plan.max_llm_tokens_per_month.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {sub.plan?.max_llm_tokens_per_month && (
                        <Progress
                          value={calculateUsagePercent(sub.llm_tokens_used_this_period, sub.plan.max_llm_tokens_per_month)}
                          className="h-2"
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">
                        ${sub.llm_cost_this_period_usd.toFixed(2)}
                      </div>
                      {sub.plan?.max_llm_cost_per_month_usd && (
                        <>
                          <Progress
                            value={calculateUsagePercent(sub.llm_cost_this_period_usd, sub.plan.max_llm_cost_per_month_usd)}
                            className="h-2"
                          />
                          <div className="text-xs text-muted-foreground">
                            Limite: ${sub.plan.max_llm_cost_per_month_usd.toFixed(2)}
                          </div>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {sub.whatsapp_messages_this_period}
                      {sub.plan?.max_whatsapp_messages_per_month && (
                        <span className="text-muted-foreground">
                          {' / '}{sub.plan.max_whatsapp_messages_per_month}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(sub.current_period_end).toLocaleDateString('pt-BR')}
                    </div>
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

