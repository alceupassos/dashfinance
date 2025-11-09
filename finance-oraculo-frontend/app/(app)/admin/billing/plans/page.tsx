"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import { Check, X, DollarSign, Zap, MessageSquare, Users, Building, Star } from "lucide-react"

interface ServicePlan {
  id: string
  plan_name: string
  display_name: string
  description: string
  monthly_price_usd: number
  max_llm_tokens_per_month: number | null
  max_llm_cost_per_month_usd: number | null
  max_whatsapp_messages_per_month: number | null
  max_companies: number | null
  max_users: number | null
  includes_ai_analysis: boolean
  includes_whatsapp_bot: boolean
  includes_automated_reports: boolean
  includes_api_access: boolean
  includes_priority_support: boolean
  overage_enabled: boolean
  overage_rate_multiplier: number
  is_active: boolean
}

export default function BillingPlansPage() {
  const [plans, setPlans] = useState<ServicePlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('service_plans')
        .select('*')
        .order('monthly_price_usd')

      if (error) throw error
      setPlans(data || [])
    } catch (error) {
      console.error('Error fetching plans:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number | null) => {
    if (num === null) return "Ilimitado"
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(0)}k`
    return num.toString()
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
          <DollarSign className="h-8 w-8" />
          Planos de Serviço
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie planos e preços do Oráculo Financeiro
        </p>
      </div>

      {/* Cards de Planos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={plan.plan_name === 'oraculo' ? 'border-yellow-500 border-2 relative' : ''}
          >
            {plan.plan_name === 'oraculo' && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-yellow-500 text-black">
                  <Star className="h-3 w-3 mr-1" />
                  Premium
                </Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-2xl">{plan.display_name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">
                  ${plan.monthly_price_usd.toFixed(2)}
                </span>
                <span className="text-muted-foreground">/mês</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Limites */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tokens LLM/mês</span>
                  <span className="font-medium">{formatNumber(plan.max_llm_tokens_per_month)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Custo LLM/mês</span>
                  <span className="font-medium">
                    {plan.max_llm_cost_per_month_usd ? `$${plan.max_llm_cost_per_month_usd.toFixed(2)}` : "Ilimitado"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Mensagens WhatsApp</span>
                  <span className="font-medium">{formatNumber(plan.max_whatsapp_messages_per_month)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Empresas</span>
                  <span className="font-medium">{formatNumber(plan.max_companies)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Usuários</span>
                  <span className="font-medium">{formatNumber(plan.max_users)}</span>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  {plan.includes_ai_analysis ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-gray-500" />
                  )}
                  <span>Análise IA</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {plan.includes_whatsapp_bot ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-gray-500" />
                  )}
                  <span>Bot WhatsApp</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {plan.includes_automated_reports ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-gray-500" />
                  )}
                  <span>Relatórios Automáticos</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {plan.includes_api_access ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-gray-500" />
                  )}
                  <span>Acesso API</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {plan.includes_priority_support ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-gray-500" />
                  )}
                  <span>Suporte Prioritário</span>
                </div>
              </div>

              {plan.overage_enabled && (
                <div className="border-t pt-4">
                  <div className="text-xs text-muted-foreground">
                    Excedente: {plan.overage_rate_multiplier}x o custo normal
                  </div>
                </div>
              )}

              <Badge variant={plan.is_active ? "default" : "outline"} className="w-full justify-center">
                {plan.is_active ? "Ativo" : "Inativo"}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabela Detalhada */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes dos Planos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plano</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Tokens LLM</TableHead>
                <TableHead>Custo LLM</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Empresas</TableHead>
                <TableHead>Usuários</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.display_name}</TableCell>
                  <TableCell>${plan.monthly_price_usd.toFixed(2)}</TableCell>
                  <TableCell>{formatNumber(plan.max_llm_tokens_per_month)}</TableCell>
                  <TableCell>
                    {plan.max_llm_cost_per_month_usd ? `$${plan.max_llm_cost_per_month_usd.toFixed(2)}` : "Ilimitado"}
                  </TableCell>
                  <TableCell>{formatNumber(plan.max_whatsapp_messages_per_month)}</TableCell>
                  <TableCell>{formatNumber(plan.max_companies)}</TableCell>
                  <TableCell>{formatNumber(plan.max_users)}</TableCell>
                  <TableCell>
                    <Badge variant={plan.is_active ? "default" : "outline"}>
                      {plan.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Destaque do Plano Oráculo */}
      <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500" />
            Oráculo Premium - Serviço de Valor Agregado
          </CardTitle>
          <CardDescription>
            O plano mais completo para empresas que querem um verdadeiro oráculo financeiro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Recursos Exclusivos:</h3>
              <ul className="space-y-1 text-sm">
                <li>✓ Análise IA avançada com modelos premium</li>
                <li>✓ Bot WhatsApp ilimitado</li>
                <li>✓ Relatórios executivos personalizados</li>
                <li>✓ Integrações customizadas</li>
                <li>✓ Suporte prioritário 24/7</li>
                <li>✓ Consultoria financeira mensal</li>
                <li>✓ Dashboard executivo personalizado</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Ideal para:</h3>
              <ul className="space-y-1 text-sm">
                <li>• Empresas que precisam de insights profundos</li>
                <li>• CEOs que querem um &ldquo;oráculo&rdquo; para decisões</li>
                <li>• Empresas com alto volume de transações</li>
                <li>• Clientes que valorizam automação completa</li>
                <li>• Empresas em crescimento acelerado</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
