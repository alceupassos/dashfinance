"use client"

import { useEffect, useState } from "react"
import MetricsCard from "@/components/metrics-card"
import StatusBadge from "@/components/status-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { 
  Settings, 
  Key, 
  CheckCircle, 
  Edit,
  ExternalLink,
  CreditCard,
  Brain,
  Building,
  MessageSquare,
  Database,
  Mail,
  BarChart
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface IntegrationConfig {
  id: string
  integration_name: string
  display_name: string
  category: string
  description: string
  documentation_url: string
  is_active: boolean
  is_configured: boolean
  config_data: any
}

const categoryIcons: Record<string, any> = {
  payment: CreditCard,
  llm: Brain,
  erp: Building,
  whatsapp: MessageSquare,
  storage: Database,
  email: Mail,
  analytics: BarChart,
  other: Settings
}

const categoryColors: Record<string, string> = {
  payment: 'bg-green-500',
  llm: 'bg-purple-500',
  erp: 'bg-blue-500',
  whatsapp: 'bg-green-600',
  storage: 'bg-orange-500',
  email: 'bg-red-500',
  analytics: 'bg-yellow-500',
  other: 'bg-gray-500'
}

export default function IntegrationsConfigPage() {
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [editingIntegration, setEditingIntegration] = useState<IntegrationConfig | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  
  // Form fields
  const [apiKey, setApiKey] = useState("")
  const [apiSecret, setApiSecret] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [refreshToken, setRefreshToken] = useState("")
  const [configData, setConfigData] = useState("")
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    fetchIntegrations()
  }, [])

  const fetchIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('integration_configs')
        .select('*')
        .order('category, display_name')

      if (error) throw error
      setIntegrations(data || [])
    } catch (error) {
      console.error('Error fetching integrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (integration: IntegrationConfig) => {
    setEditingIntegration(integration)
    setApiKey(integration.config_data?.api_key ? '••••••••' : '')
    setApiSecret(integration.config_data?.api_secret ? '••••••••' : '')
    setAccessToken(integration.config_data?.access_token ? '••••••••' : '')
    setRefreshToken(integration.config_data?.refresh_token ? '••••••••' : '')
    setConfigData(JSON.stringify(integration.config_data || {}, null, 2))
    setIsActive(integration.is_active)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!editingIntegration) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Parse config_data
      let parsedConfigData = {}
      try {
        parsedConfigData = configData ? JSON.parse(configData) : {}
      } catch (e) {
        alert('JSON inválido no campo Config Data')
        return
      }

      // Preparar dados para envio (criptografia será feita na Edge Function)
      const updateData: any = {
        integration_name: editingIntegration.integration_name,
        config_data: parsedConfigData,
        is_active: isActive
      }

      // Só enviar campos que foram alterados (não começam com ••••)
      if (!apiKey.startsWith('••••') && apiKey) {
        updateData.api_key = apiKey
      }
      if (!apiSecret.startsWith('••••') && apiSecret) {
        updateData.api_secret = apiSecret
      }
      if (!accessToken.startsWith('••••') && accessToken) {
        updateData.access_token = accessToken
      }
      if (!refreshToken.startsWith('••••') && refreshToken) {
        updateData.refresh_token = refreshToken
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL}/manage-integration-config`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        }
      )

      if (response.ok) {
        setDialogOpen(false)
        fetchIntegrations()
        alert('Configuração salva com sucesso!')
      } else {
        const error = await response.json()
        alert(`Erro: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving config:', error)
      alert('Erro ao salvar configuração')
    }
  }

  const groupedIntegrations = integrations.reduce((acc, integration) => {
    if (!acc[integration.category]) {
      acc[integration.category] = []
    }
    acc[integration.category].push(integration)
    return acc
  }, {} as Record<string, IntegrationConfig[]>)

  const categoryKeys = Object.keys(groupedIntegrations)
  const configuredCount = integrations.filter((integration) => integration.is_configured).length
  const activeCount = integrations.filter((integration) => integration.is_active).length
  const categoryCount = categoryKeys.length
  const coveragePercentage = integrations.length > 0 ? Math.round((configuredCount / integrations.length) * 100) : 0
  const defaultTabValue = categoryKeys[0] ?? "overview"

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
          <Settings className="h-8 w-8" />
          Configurações de Integrações
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie todas as credenciais e tokens de API das integrações
        </p>
      </div>

      <Alert>
        <Key className="h-4 w-4" />
        <AlertDescription>
          Todas as credenciais são criptografadas e armazenadas com segurança. 
          Apenas administradores podem visualizar e editar essas configurações.
        </AlertDescription>
      </Alert>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricsCard
          title="Integrações"
          value={integrations.length}
          description="Total registradas"
          icon={<Settings className="h-4 w-4 text-muted-foreground" />}
          trendLabel="Categorias"
          trendValue={`${categoryCount}`}
        />
        <MetricsCard
          title="Configuradas"
          value={configuredCount}
          status={coveragePercentage === 100 ? "success" : "warning"}
          icon={<Key className="h-4 w-4 text-muted-foreground" />}
          trendLabel="Cobertura"
          trendValue={`${coveragePercentage}%`}
          trendDirection={coveragePercentage === 100 ? "up" : "down"}
        />
        <MetricsCard
          title="Ativas"
          value={activeCount}
          status={activeCount > 0 ? "success" : "critical"}
          icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />}
          trendLabel="Inativas"
          trendValue={`${integrations.length - activeCount}`}
          trendDirection={activeCount > 0 ? "up" : "down"}
        />
        <MetricsCard
          title="Categorias Monitoradas"
          value={categoryCount}
          icon={<BarChart className="h-4 w-4 text-muted-foreground" />}
          trendLabel="Última revisão"
          trendValue={new Date().toLocaleDateString("pt-BR")}
        />
      </div>

      {/* Tabs por Categoria */}
      {categoryKeys.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhuma integração encontrada</CardTitle>
            <CardDescription>Cadastre integrações no backend para começar</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Assim que as integrações forem sincronizadas, elas aparecerão aqui agrupadas por categoria.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={defaultTabValue} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
            {categoryKeys.map((category) => {
              const Icon = categoryIcons[category] || Settings
              return (
                <TabsTrigger key={category} value={category} className="flex items-center gap-2 capitalize">
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{category}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {categoryKeys.map((category) => {
            const items = groupedIntegrations[category] ?? []
            return (
              <TabsContent key={category} value={category} className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="capitalize">{category}</CardTitle>
                    <CardDescription>
                      {items.length} integração(ões) nesta categoria
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Integração</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Configurada</TableHead>
                          <TableHead>Documentação</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((integration) => {
                          const Icon = categoryIcons[integration.category] || Settings
                          return (
                            <TableRow key={integration.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${categoryColors[integration.category]}`}></div>
                                  <div>
                                    <div className="font-medium">{integration.display_name}</div>
                                    {integration.description && (
                                      <div className="text-xs text-muted-foreground">
                                        {integration.description}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <StatusBadge
                                  status={integration.is_active ? "success" : "inactive"}
                                  label={integration.is_active ? "Ativa" : "Inativa"}
                                />
                              </TableCell>
                              <TableCell>
                                <StatusBadge
                                  status={integration.is_configured ? "success" : "warning"}
                                  label={integration.is_configured ? "Config." : "Pendente"}
                                />
                              </TableCell>
                              <TableCell>
                                {integration.documentation_url ? (
                                  <a
                                    href={integration.documentation_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:underline flex items-center gap-1"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    Docs
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(integration)}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Configurar
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            )
          })}
        </Tabs>
      )}

      {/* Dialog de Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Configurar {editingIntegration?.display_name}
            </DialogTitle>
            <DialogDescription>
              {editingIntegration?.description}
            </DialogDescription>
          </DialogHeader>

          {editingIntegration && (
            <div className="space-y-4">
              <div>
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Digite a API Key"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {apiKey.startsWith('••••') ? 'Digite uma nova chave para atualizar' : 'A chave será criptografada'}
                </p>
              </div>

              <div>
                <Label>API Secret (se aplicável)</Label>
                <Input
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Digite o API Secret"
                />
              </div>

              <div>
                <Label>Access Token (se aplicável)</Label>
                <Input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="Digite o Access Token"
                />
              </div>

              <div>
                <Label>Refresh Token (se aplicável)</Label>
                <Input
                  type="password"
                  value={refreshToken}
                  onChange={(e) => setRefreshToken(e.target.value)}
                  placeholder="Digite o Refresh Token"
                />
              </div>

              <div>
                <Label>Configurações Adicionais (JSON)</Label>
                <Textarea
                  value={configData}
                  onChange={(e) => setConfigData(e.target.value)}
                  placeholder='{"store_id": "123", "environment": "production"}'
                  className="font-mono text-sm"
                  rows={6}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Configurações específicas da integração em formato JSON
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="isActive">Ativar esta integração</Label>
              </div>

              {editingIntegration.documentation_url && (
                <Alert>
                  <ExternalLink className="h-4 w-4" />
                  <AlertDescription>
                    <a
                      href={editingIntegration.documentation_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 underline"
                    >
                      Ver documentação da API
                    </a>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} className="flex-1">
                  Salvar Configuração
                </Button>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
