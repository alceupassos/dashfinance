"use client"

import { useEffect, useState } from "react"
import IntegrationForm from "@/components/integration-form"
import EncryptionDisplay from "@/components/encryption-display"
import StatusBadge from "@/components/status-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import { Plus, RotateCw } from "lucide-react"

interface ClientKey {
  id: string
  company_cnpj: string
  provider: string
  api_key_suffix: string
  priority: number
  monthly_limit_usd: number | null
  is_active: boolean
  created_at: string
}

const PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
  { value: "azure", label: "Azure" },
]

export default function KeysPerClientPage() {
  const [keys, setKeys] = useState<ClientKey[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({
    company_cnpj: "",
    provider: "openai",
    api_key: "",
    priority: "1",
    monthly_limit_usd: "",
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchKeys()
  }, [])

  const fetchKeys = async () => {
    const { data } = await supabase
      .from("llm_api_keys_per_client")
      .select("id,company_cnpj,provider,priority,monthly_limit_usd,is_active,created_at")
      .order("company_cnpj")
    const formatted =
      data?.map((item) => ({
        ...item,
        api_key_suffix: "••••",
      })) ?? []
    setKeys(formatted as ClientKey[])
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL}/manage-client-llm-keys`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company_cnpj: form.company_cnpj,
          provider: form.provider,
          api_key: form.api_key,
          priority: parseInt(form.priority, 10),
          monthly_limit_usd: form.monthly_limit_usd ? parseFloat(form.monthly_limit_usd) : null,
        }),
      })

      if (response.ok) {
        setDialogOpen(false)
        setForm({ company_cnpj: "", provider: "openai", api_key: "", priority: "1", monthly_limit_usd: "" })
        fetchKeys()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chaves LLM por Cliente</h1>
          <p className="text-muted-foreground">
            Cada cliente pode ter provedores, prioridades e limites específicos.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova chave
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chaves configuradas</CardTitle>
          <CardDescription>Rotacione credenciais críticas regularmente</CardDescription>
        </CardHeader>
        <CardContent className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Limite mensal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-mono text-sm">{key.company_cnpj}</TableCell>
                  <TableCell className="capitalize">{key.provider}</TableCell>
                  <TableCell>{key.priority}</TableCell>
                  <TableCell>
                    {key.monthly_limit_usd ? `$${key.monthly_limit_usd.toFixed(2)}` : "Sem limite"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={key.is_active ? "success" : "inactive"} label={key.is_active ? "Ativa" : "Inativa"} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs">
                      <RotateCw className="h-3 w-3" />
                      Rotacionar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {keys.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nenhuma chave configurada até o momento.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar nova chave</DialogTitle>
          </DialogHeader>
          <IntegrationForm
            description="As chaves são criptografadas e armazenadas com KMS."
            fields={[
              {
                id: "company",
                label: "CNPJ",
                value: form.company_cnpj,
                placeholder: "00.000.000/0000-00",
                onChange: (value) => setForm((prev) => ({ ...prev, company_cnpj: value })),
              },
              {
                id: "provider",
                label: "Provedor",
                type: "select",
                value: form.provider,
                options: PROVIDERS,
                onChange: (value) => setForm((prev) => ({ ...prev, provider: value })),
              },
              {
                id: "apiKey",
                label: "API Key",
                type: "password",
                value: form.api_key,
                onChange: (value) => setForm((prev) => ({ ...prev, api_key: value })),
              },
              {
                id: "priority",
                label: "Prioridade",
                value: form.priority,
                placeholder: "1 = alta prioridade",
                onChange: (value) => setForm((prev) => ({ ...prev, priority: value })),
              },
              {
                id: "monthlyLimit",
                label: "Limite mensal (USD)",
                value: form.monthly_limit_usd,
                placeholder: "Opcional",
                onChange: (value) => setForm((prev) => ({ ...prev, monthly_limit_usd: value })),
              },
            ]}
            footer={
              <Button onClick={handleSave} disabled={loading} className="w-full">
                {loading ? "Salvando..." : "Salvar chave"}
              </Button>
            }
          />
          <EncryptionDisplay label="Pré-visualização segura" value={form.api_key} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
