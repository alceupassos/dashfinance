"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { Settings, CheckCircle, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface YampiConfig {
  id: string
  api_key: string
  store_id: string
  environment: 'sandbox' | 'production'
  product_id_llm_tokens: string
  product_id_whatsapp_messages: string
  is_active: boolean
}

export default function YampiConfigPage() {
  const [config, setConfig] = useState<YampiConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [apiKey, setApiKey] = useState("")
  const [storeId, setStoreId] = useState("")
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox')
  const [productIdLLM, setProductIdLLM] = useState("")
  const [productIdWhatsApp, setProductIdWhatsApp] = useState("")

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('yampi_config')
        .select('*')
        .eq('is_active', true)
        .single()

      if (data) {
        setConfig(data)
        setApiKey(data.api_key ? '••••••••' : '')
        setStoreId(data.store_id || '')
        setEnvironment(data.environment || 'sandbox')
        setProductIdLLM(data.product_id_llm_tokens || '')
        setProductIdWhatsApp(data.product_id_whatsapp_messages || '')
      }
    } catch (error) {
      console.error('Error fetching config:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL}/manage-yampi-config`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            api_key: apiKey.startsWith('••••') ? undefined : apiKey,
            store_id: storeId,
            environment,
            product_id_llm_tokens: productIdLLM,
            product_id_whatsapp_messages: productIdWhatsApp
          })
        }
      )

      if (response.ok) {
        fetchConfig()
        alert('Configuração salva com sucesso!')
      } else {
        const error = await response.json()
        alert(`Erro: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving config:', error)
      alert('Erro ao salvar configuração')
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL}/yampi-test-connection`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.ok) {
        alert('Conexão com Yampi OK!')
      } else {
        const error = await response.json()
        alert(`Erro na conexão: ${error.error}`)
      }
    } catch (error) {
      alert('Erro ao testar conexão')
    }
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
          <Settings className="h-8 w-8" />
          Configuração Yampi
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure a integração com Yampi para emissão de faturas
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Integração Yampi</AlertTitle>
        <AlertDescription>
          Configure suas credenciais da API do Yampi para emissão automática de faturas.
          A API key será criptografada e armazenada com segurança.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Credenciais Yampi</CardTitle>
          <CardDescription>Configure acesso à API do Yampi</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>API Key</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Sua API key do Yampi"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {apiKey.startsWith('••••') ? 'Digite uma nova chave para atualizar' : 'A chave será criptografada ao salvar'}
            </p>
          </div>

          <div>
            <Label>Store ID</Label>
            <Input
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              placeholder="ID da sua loja no Yampi"
            />
          </div>

          <div>
            <Label>Ambiente</Label>
            <Select value={environment} onValueChange={(v: 'sandbox' | 'production') => setEnvironment(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox (Testes)</SelectItem>
                <SelectItem value="production">Produção</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-4">IDs de Produtos</h3>
            
            <div className="space-y-4">
              <div>
                <Label>Product ID - Tokens LLM</Label>
                <Input
                  value={productIdLLM}
                  onChange={(e) => setProductIdLLM(e.target.value)}
                  placeholder="ID do produto para tokens LLM"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  ID do produto no Yampi que será usado para cobrança de tokens LLM
                </p>
              </div>

              <div>
                <Label>Product ID - Mensagens WhatsApp</Label>
                <Input
                  value={productIdWhatsApp}
                  onChange={(e) => setProductIdWhatsApp(e.target.value)}
                  placeholder="ID do produto para mensagens WhatsApp"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  ID do produto no Yampi que será usado para cobrança de mensagens WhatsApp
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Configuração'}
            </Button>
            <Button variant="outline" onClick={testConnection}>
              Testar Conexão
            </Button>
          </div>
        </CardContent>
      </Card>

      {config && (
        <Card>
          <CardHeader>
            <CardTitle>Status da Configuração</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Status:</span>
                <Badge variant={config.is_active ? "default" : "outline"}>
                  {config.is_active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Ambiente:</span>
                <Badge variant={config.environment === 'production' ? "default" : "outline"}>
                  {config.environment === 'production' ? "Produção" : "Sandbox"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Store ID:</span>
                <span className="font-mono text-sm">{config.store_id || 'Não configurado'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Documentação Yampi API</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Documentação:</strong>{' '}
              <a href="https://developers.yampi.com.br" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                https://developers.yampi.com.br
              </a>
            </p>
            <p>
              <strong>Endpoint de Pedidos:</strong>{' '}
              <code className="bg-muted px-2 py-1 rounded">POST /api/v2/orders</code>
            </p>
            <p>
              <strong>Webhooks:</strong> Configure webhooks no Yampi para receber atualizações de status de pagamento
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

