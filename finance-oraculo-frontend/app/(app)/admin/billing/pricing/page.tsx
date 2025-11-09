"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { DollarSign, Edit, TrendingUp, AlertCircle } from "lucide-react"

interface LLMPricing {
  id: string
  provider: string
  model: string
  cost_per_1k_input_tokens: number
  cost_per_1k_output_tokens: number
  price_per_1k_input_tokens: number
  price_per_1k_output_tokens: number
  markup_multiplier: number
  is_active: boolean
}

interface ProfitMargin {
  provider: string
  model: string
  total_cost_usd: number
  total_client_price_usd: number
  profit_usd: number
  profit_margin_percent: number
  total_requests: number
}

export default function LLMPricingPage() {
  const [pricing, setPricing] = useState<LLMPricing[]>([])
  const [profitMargins, setProfitMargins] = useState<ProfitMargin[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingPricing, setEditingPricing] = useState<LLMPricing | null>(null)
  const [inputCost, setInputCost] = useState("")
  const [outputCost, setOutputCost] = useState("")
  const [markup, setMarkup] = useState("3.5")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Buscar precificação
      const { data: pricingData } = await supabase
        .from('llm_pricing')
        .select('*')
        .order('provider, model')

      setPricing(pricingData || [])

      // Buscar margem de lucro (últimos 30 dias)
      const { data: marginData } = await supabase
        .from('llm_token_usage')
        .select('provider, model, cost_usd, prompt_tokens, completion_tokens')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      // Calcular margens
      const margins: Record<string, ProfitMargin> = {}
      marginData?.forEach((item: any) => {
        const key = `${item.provider}-${item.model}`
        if (!margins[key]) {
          margins[key] = {
            provider: item.provider,
            model: item.model,
            total_cost_usd: 0,
            total_client_price_usd: 0,
            profit_usd: 0,
            profit_margin_percent: 0,
            total_requests: 0
          }
        }
        margins[key].total_cost_usd += item.cost_usd || 0
        
        // Calcular preço para cliente (3.5x)
        const clientPrice = (item.cost_usd || 0) * 3.5
        margins[key].total_client_price_usd += clientPrice
        margins[key].profit_usd += clientPrice - (item.cost_usd || 0)
        margins[key].total_requests += 1
      })

      Object.values(margins).forEach(margin => {
        if (margin.total_cost_usd > 0) {
          margin.profit_margin_percent = (margin.profit_usd / margin.total_cost_usd) * 100
        }
      })

      setProfitMargins(Object.values(margins).sort((a, b) => b.profit_usd - a.profit_usd))
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (item: LLMPricing) => {
    setEditingPricing(item)
    setInputCost(item.cost_per_1k_input_tokens.toString())
    setOutputCost(item.cost_per_1k_output_tokens.toString())
    setMarkup(item.markup_multiplier.toString())
    setEditDialogOpen(true)
  }

  const handleSave = async () => {
    if (!editingPricing) return

    const inputCostNum = parseFloat(inputCost)
    const outputCostNum = parseFloat(outputCost)
    const markupNum = parseFloat(markup)

    const { error } = await supabase
      .from('llm_pricing')
      .update({
        cost_per_1k_input_tokens: inputCostNum,
        cost_per_1k_output_tokens: outputCostNum,
        markup_multiplier: markupNum,
        price_per_1k_input_tokens: inputCostNum * markupNum,
        price_per_1k_output_tokens: outputCostNum * markupNum,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingPricing.id)

    if (error) {
      console.error('Error updating pricing:', error)
      return
    }

    setEditDialogOpen(false)
    fetchData()
  }

  const calculatePrice = (cost: number, markup: number) => {
    return cost * markup
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
          Precificação LLM
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure custos e preços (margem de 3.5x padrão)
        </p>
      </div>

      {/* Resumo de Margem */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Margem de Lucro (Últimos 30 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Custo Total</div>
              <div className="text-2xl font-bold">
                ${profitMargins.reduce((acc, m) => acc + m.total_cost_usd, 0).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Receita Total</div>
              <div className="text-2xl font-bold text-green-500">
                ${profitMargins.reduce((acc, m) => acc + m.total_client_price_usd, 0).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Lucro Total</div>
              <div className="text-2xl font-bold text-blue-500">
                ${profitMargins.reduce((acc, m) => acc + m.profit_usd, 0).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Margem Média</div>
              <div className="text-2xl font-bold">
                {profitMargins.length > 0
                  ? (profitMargins.reduce((acc, m) => acc + m.profit_margin_percent, 0) / profitMargins.length).toFixed(1)
                  : '0'}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Precificação */}
      <Card>
        <CardHeader>
          <CardTitle>Precificação por Modelo</CardTitle>
          <CardDescription>Custo real vs Preço para cliente (3.5x markup)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Custo Input (1k tokens)</TableHead>
                <TableHead>Preço Input (1k tokens)</TableHead>
                <TableHead>Custo Output (1k tokens)</TableHead>
                <TableHead>Preço Output (1k tokens)</TableHead>
                <TableHead>Markup</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricing.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge>{item.provider}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{item.model}</TableCell>
                  <TableCell>${item.cost_per_1k_input_tokens.toFixed(6)}</TableCell>
                  <TableCell className="font-medium text-green-500">
                    ${item.price_per_1k_input_tokens.toFixed(6)}
                  </TableCell>
                  <TableCell>${item.cost_per_1k_output_tokens.toFixed(6)}</TableCell>
                  <TableCell className="font-medium text-green-500">
                    ${item.price_per_1k_output_tokens.toFixed(6)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.markup_multiplier}x</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? "default" : "outline"}>
                      {item.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tabela de Margem por Modelo */}
      <Card>
        <CardHeader>
          <CardTitle>Margem de Lucro por Modelo</CardTitle>
          <CardDescription>Últimos 30 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Custo Total</TableHead>
                <TableHead>Receita Total</TableHead>
                <TableHead>Lucro</TableHead>
                <TableHead>Margem %</TableHead>
                <TableHead>Requests</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profitMargins.map((margin, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Badge>{margin.provider}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{margin.model}</TableCell>
                  <TableCell>${margin.total_cost_usd.toFixed(2)}</TableCell>
                  <TableCell className="font-medium text-green-500">
                    ${margin.total_client_price_usd.toFixed(2)}
                  </TableCell>
                  <TableCell className="font-bold text-blue-500">
                    ${margin.profit_usd.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge className={margin.profit_margin_percent > 200 ? "bg-green-500" : ""}>
                      {margin.profit_margin_percent.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell>{margin.total_requests}</TableCell>
                </TableRow>
              ))}
              {profitMargins.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum dado de uso nos últimos 30 dias
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Precificação</DialogTitle>
            <DialogDescription>
              Configure o custo real e o markup para calcular o preço automaticamente
            </DialogDescription>
          </DialogHeader>
          {editingPricing && (
            <div className="space-y-4">
              <div>
                <Label>Provider: {editingPricing.provider}</Label>
              </div>
              <div>
                <Label>Modelo: {editingPricing.model}</Label>
              </div>
              <div>
                <Label>Custo Input (por 1k tokens)</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={inputCost}
                  onChange={(e) => setInputCost(e.target.value)}
                />
              </div>
              <div>
                <Label>Custo Output (por 1k tokens)</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={outputCost}
                  onChange={(e) => setOutputCost(e.target.value)}
                />
              </div>
              <div>
                <Label>Markup Multiplicador (padrão: 3.5x)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={markup}
                  onChange={(e) => setMarkup(e.target.value)}
                />
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm font-medium mb-2">Preço Calculado:</div>
                <div className="text-sm">
                  Input: <span className="font-bold text-green-500">
                    ${calculatePrice(parseFloat(inputCost) || 0, parseFloat(markup) || 3.5).toFixed(6)}
                  </span> por 1k tokens
                </div>
                <div className="text-sm">
                  Output: <span className="font-bold text-green-500">
                    ${calculatePrice(parseFloat(outputCost) || 0, parseFloat(markup) || 3.5).toFixed(6)}
                  </span> por 1k tokens
                </div>
              </div>
              <Button onClick={handleSave} className="w-full">
                Salvar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

