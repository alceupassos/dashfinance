"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import { Plus, DollarSign, TrendingUp, Key, AlertCircle } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

interface ClientLLMCost {
  company_cnpj: string
  provider: string
  model: string
  total_tokens: number
  total_cost_usd: number
  total_requests: number
  first_request: string
  last_request: string
}

interface ClientAPIKey {
  id: string
  company_cnpj: string
  provider: string
  is_active: boolean
  priority: number
  monthly_limit_usd: number | null
  notes: string | null
  created_at: string
}

interface MonthlyCost {
  company_cnpj: string
  month: string
  provider: string
  total_tokens: number
  total_cost_usd: number
  total_requests: number
  avg_response_time_ms: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export default function LLMCostsPerClient() {
  const [costs, setCosts] = useState<ClientLLMCost[]>([])
  const [monthlyCosts, setMonthlyCosts] = useState<MonthlyCost[]>([])
  const [apiKeys, setApiKeys] = useState<ClientAPIKey[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedCnpj, setSelectedCnpj] = useState("")
  const [selectedProvider, setSelectedProvider] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [priority, setPriority] = useState("5")
  const [monthlyLimit, setMonthlyLimit] = useState("")
  const [notes, setNotes] = useState("")

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Buscar custos por cliente
      const { data: costsData } = await supabase
        .from('llm_token_usage')
        .select('company_cnpj, provider, model, total_tokens, cost_usd, created_at')
        .not('company_cnpj', 'is', null)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      // Agregar por cliente/provedor/modelo
      const aggregated: Record<string, ClientLLMCost> = {}
      costsData?.forEach((item: any) => {
        const key = `${item.company_cnpj}-${item.provider}-${item.model}`
        if (!aggregated[key]) {
          aggregated[key] = {
            company_cnpj: item.company_cnpj,
            provider: item.provider,
            model: item.model,
            total_tokens: 0,
            total_cost_usd: 0,
            total_requests: 0,
            first_request: item.created_at,
            last_request: item.created_at
          }
        }
        aggregated[key].total_tokens += item.total_tokens || 0
        aggregated[key].total_cost_usd += item.cost_usd || 0
        aggregated[key].total_requests += 1
        if (new Date(item.created_at) < new Date(aggregated[key].first_request)) {
          aggregated[key].first_request = item.created_at
        }
        if (new Date(item.created_at) > new Date(aggregated[key].last_request)) {
          aggregated[key].last_request = item.created_at
        }
      })
      setCosts(Object.values(aggregated).sort((a, b) => b.total_cost_usd - a.total_cost_usd))

      // Buscar chaves de API por cliente
      const { data: keysData } = await supabase
        .from('llm_api_keys_per_client')
        .select('id, company_cnpj, provider, is_active, priority, monthly_limit_usd, notes, created_at')
        .order('company_cnpj, provider')

      setApiKeys(keysData || [])

      // Buscar custos mensais
      const { data: monthlyData } = await supabase
        .from('llm_token_usage')
        .select('company_cnpj, provider, total_tokens, cost_usd, created_at, response_time_ms')
        .not('company_cnpj', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1000)

      // Agregar por mês
      const monthlyAggregated: Record<string, MonthlyCost> = {}
      monthlyData?.forEach((item: any) => {
        const month = new Date(item.created_at).toISOString().substring(0, 7)
        const key = `${item.company_cnpj}-${month}-${item.provider}`
        if (!monthlyAggregated[key]) {
          monthlyAggregated[key] = {
            company_cnpj: item.company_cnpj,
            month,
            provider: item.provider,
            total_tokens: 0,
            total_cost_usd: 0,
            total_requests: 0,
            avg_response_time_ms: 0
          }
        }
        monthlyAggregated[key].total_tokens += item.total_tokens || 0
        monthlyAggregated[key].total_cost_usd += item.cost_usd || 0
        monthlyAggregated[key].total_requests += 1
        monthlyAggregated[key].avg_response_time_ms += item.response_time_ms || 0
      })
      Object.values(monthlyAggregated).forEach(item => {
        if (item.total_requests > 0) {
          item.avg_response_time_ms = item.avg_response_time_ms / item.total_requests
        }
      })
      setMonthlyCosts(Object.values(monthlyAggregated).sort((a, b) => b.month.localeCompare(a.month)))

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleAddKey = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL}/manage-client-llm-keys`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            company_cnpj: selectedCnpj,
            provider: selectedProvider,
            api_key: apiKey,
            priority: parseInt(priority),
            monthly_limit_usd: monthlyLimit ? parseFloat(monthlyLimit) : null,
            notes: notes || null
          })
        }
      )

      if (response.ok) {
        setDialogOpen(false)
        setSelectedCnpj("")
        setSelectedProvider("")
        setApiKey("")
        setPriority("5")
        setMonthlyLimit("")
        setNotes("")
        fetchData()
      }
    } catch (error) {
      console.error('Error adding key:', error)
    }
  }

  const totalCostByClient = costs.reduce((acc, cost) => {
    if (!acc[cost.company_cnpj]) {
      acc[cost.company_cnpj] = 0
    }
    acc[cost.company_cnpj] += cost.total_cost_usd
    return acc
  }, {} as Record<string, number>)

  const chartData = Object.entries(totalCostByClient)
    .map(([cnpj, cost]) => ({ name: cnpj.substring(0, 14), value: cost }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

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
            <DollarSign className="h-8 w-8" />
            Custos LLM por Cliente
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitoramento e controle de custos de LLM por empresa
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Chave por Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Chave de API por Cliente</DialogTitle>
              <DialogDescription>
                Configure uma chave de API específica para um cliente. Esta chave será usada em vez da chave global.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>CNPJ do Cliente</Label>
                <Input
                  value={selectedCnpj}
                  onChange={(e) => setSelectedCnpj(e.target.value)}
                  placeholder="00000000000000"
                />
              </div>
              <div>
                <Label>Provider</Label>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                    <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                    <SelectItem value="google">Google (Gemini)</SelectItem>
                    <SelectItem value="mistral">Mistral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Chave de API</Label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                />
              </div>
              <div>
                <Label>Prioridade (1-10, menor = maior prioridade)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                />
              </div>
              <div>
                <Label>Limite Mensal (USD) - Opcional</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={monthlyLimit}
                  onChange={(e) => setMonthlyLimit(e.target.value)}
                  placeholder="100.00"
                />
              </div>
              <div>
                <Label>Notas</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações sobre esta chave"
                />
              </div>
              <Button onClick={handleAddKey} className="w-full">
                Salvar Chave
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total (30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${costs.reduce((acc, c) => acc + c.total_cost_usd, 0).toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {costs.length} combinações cliente/provedor/modelo
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Clientes Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {new Set(costs.map(c => c.company_cnpj)).size}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Clientes com uso de LLM
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Chaves Configuradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {apiKeys.filter(k => k.is_active).length}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Chaves específicas por cliente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Custos por Cliente */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Clientes por Custo (30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabela de Custos Detalhados */}
      <Card>
        <CardHeader>
          <CardTitle>Custos Detalhados por Cliente</CardTitle>
          <CardDescription>Últimos 30 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CNPJ</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Custo (USD)</TableHead>
                <TableHead>Último Uso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costs.map((cost, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-mono text-sm">{cost.company_cnpj}</TableCell>
                  <TableCell>
                    <Badge>{cost.provider}</Badge>
                  </TableCell>
                  <TableCell>{cost.model}</TableCell>
                  <TableCell>{cost.total_tokens.toLocaleString()}</TableCell>
                  <TableCell>{cost.total_requests}</TableCell>
                  <TableCell className="font-bold">${cost.total_cost_usd.toFixed(2)}</TableCell>
                  <TableCell>
                    {new Date(cost.last_request).toLocaleDateString('pt-BR')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Chaves Configuradas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Chaves de API por Cliente
          </CardTitle>
          <CardDescription>Chaves específicas configuradas para cada cliente</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CNPJ</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Limite Mensal</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-mono text-sm">{key.company_cnpj}</TableCell>
                  <TableCell>
                    <Badge>{key.provider}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={key.is_active ? "default" : "outline"}>
                      {key.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>{key.priority}</TableCell>
                  <TableCell>
                    {key.monthly_limit_usd ? `$${key.monthly_limit_usd.toFixed(2)}` : "Sem limite"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {key.notes || "-"}
                  </TableCell>
                  <TableCell>
                    {new Date(key.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                </TableRow>
              ))}
              {apiKeys.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhuma chave configurada. Use o botão acima para adicionar.
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

