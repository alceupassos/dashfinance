"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"
import { useUserStore } from "@/store/use-user-store"
import { 
  DollarSign, 
  Zap, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  FileText
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface UsageData {
  llm_tokens_used: number
  llm_cost_usd: number
  whatsapp_messages_used: number
  llm_tokens_remaining: number
  llm_cost_remaining_usd: number
  whatsapp_messages_remaining: number
  within_limits: boolean
  overage_llm_tokens: number
  overage_llm_cost_usd: number
}

interface Subscription {
  plan: {
    display_name: string
    monthly_price_usd: number
    max_llm_tokens_per_month: number | null
    max_llm_cost_per_month_usd: number | null
    max_whatsapp_messages_per_month: number | null
  }
  status: string
  current_period_start: string
  current_period_end: string
}

interface Invoice {
  id: string
  period_start: string
  period_end: string
  total_amount_usd: number
  base_amount_usd: number
  overage_amount_usd: number
  status: string
  paid_at: string | null
}

export default function MyUsagePage() {
  const { profile, availableCompanies } = useUserStore()
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCompany] = useState(availableCompanies[0] || "")

  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Buscar assinatura
      const { data: subData } = await supabase
        .from('client_subscriptions')
        .select(`
          *,
          plan:service_plans(*)
        `)
        .eq('company_cnpj', selectedCompany)
        .single()

      if (subData) {
        setSubscription(subData as any)
      }

      // Buscar uso atual
      const { data: usageData } = await supabase.rpc('check_usage_limits', {
        p_company_cnpj: selectedCompany
      })

      if (usageData && usageData.length > 0) {
        setUsage(usageData[0] as UsageData)
      }

      // Buscar faturas
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('*')
        .eq('company_cnpj', selectedCompany)
        .order('created_at', { ascending: false })
        .limit(12)

      setInvoices(invoicesData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedCompany])

  useEffect(() => {
    if (selectedCompany) {
      fetchData()
    }
  }, [selectedCompany, fetchData])

  const calculateUsagePercent = (used: number, limit: number | null) => {
    if (!limit) return 0
    return Math.min((used / limit) * 100, 100)
  }

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-500'
    if (percent >= 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
              <h2 className="text-xl font-bold mb-2">Nenhuma assinatura encontrada</h2>
              <p className="text-muted-foreground">
                Entre em contato para ativar seu plano
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TrendingUp className="h-8 w-8" />
          Meu Uso e Cobrança
        </h1>
        <p className="text-muted-foreground mt-1">
          Acompanhe seu uso e faturas do período atual
        </p>
      </div>

      {/* Plano Atual */}
      <Card>
        <CardHeader>
          <CardTitle>Plano Atual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{subscription.plan.display_name}</div>
              <div className="text-muted-foreground">
                ${subscription.plan.monthly_price_usd.toFixed(2)}/mês
              </div>
            </div>
            <Badge variant={subscription.status === 'active' ? 'default' : 'outline'}>
              {subscription.status === 'active' ? 'Ativo' : subscription.status}
            </Badge>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Período: {new Date(subscription.current_period_start).toLocaleDateString('pt-BR')} - {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}
          </div>
        </CardContent>
      </Card>

      {/* Uso Atual */}
      {usage && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tokens LLM */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Tokens LLM
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {usage.llm_tokens_used.toLocaleString()}
                    </span>
                    {subscription.plan.max_llm_tokens_per_month && (
                      <span className="text-muted-foreground">
                        / {subscription.plan.max_llm_tokens_per_month.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {subscription.plan.max_llm_tokens_per_month && (
                    <>
                      <Progress
                        value={calculateUsagePercent(usage.llm_tokens_used, subscription.plan.max_llm_tokens_per_month)}
                        className={`h-2 ${getUsageColor(calculateUsagePercent(usage.llm_tokens_used, subscription.plan.max_llm_tokens_per_month))}`}
                      />
                      <div className="text-xs text-muted-foreground">
                        {usage.llm_tokens_remaining.toLocaleString()} restantes
                      </div>
                    </>
                  )}
                  {usage.overage_llm_tokens > 0 && (
                    <Badge variant="destructive" className="mt-2">
                      Excedente: {usage.overage_llm_tokens.toLocaleString()} tokens
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Custo LLM */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Custo LLM
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      ${usage.llm_cost_usd.toFixed(2)}
                    </span>
                    {subscription.plan.max_llm_cost_per_month_usd && (
                      <span className="text-muted-foreground">
                        / ${subscription.plan.max_llm_cost_per_month_usd.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {subscription.plan.max_llm_cost_per_month_usd && (
                    <>
                      <Progress
                        value={calculateUsagePercent(usage.llm_cost_usd, subscription.plan.max_llm_cost_per_month_usd)}
                        className={`h-2 ${getUsageColor(calculateUsagePercent(usage.llm_cost_usd, subscription.plan.max_llm_cost_per_month_usd))}`}
                      />
                      <div className="text-xs text-muted-foreground">
                        ${usage.llm_cost_remaining_usd.toFixed(2)} restantes
                      </div>
                    </>
                  )}
                  {usage.overage_llm_cost_usd > 0 && (
                    <Badge variant="destructive" className="mt-2">
                      Excedente: ${usage.overage_llm_cost_usd.toFixed(2)}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Mensagens WhatsApp */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Mensagens WhatsApp
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {usage.whatsapp_messages_used}
                    </span>
                    {subscription.plan.max_whatsapp_messages_per_month && (
                      <span className="text-muted-foreground">
                        / {subscription.plan.max_whatsapp_messages_per_month}
                      </span>
                    )}
                  </div>
                  {subscription.plan.max_whatsapp_messages_per_month && (
                    <>
                      <Progress
                        value={calculateUsagePercent(usage.whatsapp_messages_used, subscription.plan.max_whatsapp_messages_per_month)}
                        className={`h-2 ${getUsageColor(calculateUsagePercent(usage.whatsapp_messages_used, subscription.plan.max_whatsapp_messages_per_month))}`}
                      />
                      <div className="text-xs text-muted-foreground">
                        {usage.whatsapp_messages_remaining} restantes
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alerta de Excedente */}
          {!usage.within_limits && (
            <Alert className="border-yellow-500 bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Limite Excedido</AlertTitle>
              <AlertDescription>
                Você ultrapassou os limites do seu plano. O excedente será cobrado com taxa adicional.
                Considere fazer upgrade para um plano maior.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      {/* Faturas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Faturas
          </CardTitle>
          <CardDescription>Histórico de cobranças</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <div className="font-medium">
                    {new Date(invoice.period_start).toLocaleDateString('pt-BR')} - {new Date(invoice.period_end).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Base: ${invoice.base_amount_usd.toFixed(2)}
                    {invoice.overage_amount_usd > 0 && (
                      <> • Excedente: ${invoice.overage_amount_usd.toFixed(2)}</>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">
                    ${invoice.total_amount_usd.toFixed(2)}
                  </div>
                  <Badge
                    variant={
                      invoice.status === 'paid' ? 'default' :
                      invoice.status === 'pending' ? 'outline' :
                      'destructive'
                    }
                  >
                    {invoice.status === 'paid' ? 'Paga' :
                     invoice.status === 'pending' ? 'Pendente' :
                     invoice.status}
                  </Badge>
                </div>
              </div>
            ))}
            {invoices.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma fatura encontrada
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
