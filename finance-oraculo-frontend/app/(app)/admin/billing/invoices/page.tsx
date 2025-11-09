"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"

interface Invoice {
  id: string
  yampi_order_id: string
  company_cnpj: string
  total_amount_usd: number
  status: string
  period_start: string
  period_end: string
  llm_tokens_used: number
  llm_cost_usd: number
  created_at: string
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const { data, error } = await supabase
          .from('yampi_invoices')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        setInvoices(data || [])
      } catch (error) {
        console.error('Error fetching invoices:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchInvoices()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">Pago</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500">Pendente</Badge>
      case 'failed':
        return <Badge className="bg-red-500">Falhou</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
        <p className="text-muted-foreground mt-2">Gerenciar faturas do Yampi</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas as Faturas</CardTitle>
          <CardDescription>Histórico completo de invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma fatura encontrada</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Yampi</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Valor (USD)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Tokens LLM</TableHead>
                    <TableHead>Criado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono text-sm">{invoice.yampi_order_id.slice(0, 8)}</TableCell>
                      <TableCell className="font-mono">{invoice.company_cnpj}</TableCell>
                      <TableCell className="font-bold">${invoice.total_amount_usd.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(invoice.period_start).toLocaleDateString('pt-BR')} até{' '}
                        {new Date(invoice.period_end).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>{invoice.llm_tokens_used.toLocaleString()}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(invoice.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
