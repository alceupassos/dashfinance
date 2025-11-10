"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RoleGuard } from "@/components/role-guard";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Download, Filter } from "lucide-react";
import { getReportDre, type DreReportResponse, type DreStructured } from "@/lib/api";
import { useEffectiveTarget } from "@/hooks/useEffectiveTarget";

export default function DREPage() {
  return (
    <RoleGuard allow={["admin", "executivo_conta"]}>
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const { effectiveCnpj } = useEffectiveTarget();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const { data: dreReport, isLoading } = useQuery<DreReportResponse>({
    queryKey: ["dre-report", selectedMonth, effectiveCnpj],
    queryFn: () => getReportDre({
      cnpj: effectiveCnpj ?? undefined,
      periodo: selectedMonth,
    }),
    enabled: Boolean(effectiveCnpj),
  });

  const dre = dreReport?.dre;
  const historico = dreReport?.historico ?? [];
  const previousPeriod = historico.length > 0 ? historico[historico.length - 1] : null;

  // Dados para gráfico de composição
  const compositionData = [
    { name: "Custo de Bens", value: dreReport.data.cost_of_goods },
    { name: "Despesas Operacionais", value: dreReport.data.operating_expenses },
    { name: "Outras Despesas", value: dreReport.data.other_expenses },
    { name: "Lucro Líquido", value: dreReport.data.net_income },
  ];

  // Dados para gráfico comparativo
  const comparisonData = [
    {
      name: "Receita",
      atual: dreReport.data.revenue,
      anterior: dreReport.previous_period?.revenue || 0,
    },
    {
      name: "Lucro Bruto",
      atual: dreReport.data.gross_profit,
      anterior: dreReport.previous_period?.gross_profit || 0,
    },
    {
      name: "Lucro Operacional",
      atual: dreReport.data.operating_income,
      anterior: dreReport.previous_period?.operating_income || 0,
    },
    {
      name: "Lucro Líquido",
      atual: dreReport.data.net_income,
      anterior: dreReport.previous_period?.net_income || 0,
    },
  ];

  const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e"];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
};

  const calculateVariation = (current: number, previous: number) => {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
  };

  const revenueVariation = calculateVariation(
    dreReport.data.revenue,
    dreReport.previous_period?.revenue || 0
  );

  const netIncomeVariation = calculateVariation(
    dreReport.data.net_income,
    dreReport.previous_period?.net_income || 0
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8" />
            DRE - Demonstração de Resultado
          </h1>
          <p className="text-muted-foreground mt-1">
            Análise detalhada de receitas e despesas
          </p>
        </div>
        <Button className="gap-2">
          <Download className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 flex-wrap">
          <div>
            <Label htmlFor="month">Período</Label>
            <input
              id="month"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-input rounded-md"
            />
          </div>
          <div>
            <Label htmlFor="company">Empresa</Label>
            <select
              id="company"
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="px-3 py-2 border border-input rounded-md"
            >
              <option value="all">Todas as empresas</option>
              <option value="12345678000190">Grupo Volpe LTDA</option>
              <option value="98765432000199">Outra Empresa</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dreReport.data.revenue)}
            </div>
            <div className="flex items-center gap-1 mt-2">
              {revenueVariation > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span
                className={
                  revenueVariation > 0 ? "text-green-600" : "text-red-600"
                }
              >
                {Math.abs(revenueVariation).toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">vs mês anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Lucro Bruto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dreReport.data.gross_profit)}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">
                Margem: {dreReport.data.gross_margin.toFixed(1)}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Lucro Operacional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dreReport.data.operating_income)}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">
                {((dreReport.data.operating_income / dreReport.data.revenue) * 100).toFixed(1)}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(dreReport.data.net_income)}
            </div>
            <div className="flex items-center gap-1 mt-2">
              {netIncomeVariation > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span
                className={
                  netIncomeVariation > 0 ? "text-green-600" : "text-red-600"
                }
              >
                {Math.abs(netIncomeVariation).toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Gráfico Comparativo */}
        <Card>
          <CardHeader>
            <CardTitle>Comparativo com Período Anterior</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Bar dataKey="atual" fill="#3b82f6" name="Atual" />
                <Bar dataKey="anterior" fill="#9ca3af" name="Anterior" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Composição */}
        <Card>
          <CardHeader>
            <CardTitle>Composição das Receitas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={compositionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {compositionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela Detalhada DRE */}
      <Card>
        <CardHeader>
          <CardTitle>Demonstração Estruturada</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {/* Receitas */}
                <tr className="bg-blue-50">
                  <td className="py-3 px-4 font-semibold">Receita Total</td>
                  <td className="py-3 px-4 text-right font-semibold">
                    {formatCurrency(dreReport.data.revenue)}
                  </td>
                </tr>

                {/* Custos */}
                <tr>
                  <td className="py-3 px-4 text-muted-foreground">
                    (-) Custo de Bens Vendidos
                  </td>
                  <td className="py-3 px-4 text-right">
                    ({formatCurrency(dreReport.data.cost_of_goods)})
                  </td>
                </tr>

                {/* Lucro Bruto */}
                <tr className="bg-green-50">
                  <td className="py-3 px-4 font-semibold">= Lucro Bruto</td>
                  <td className="py-3 px-4 text-right font-semibold text-green-700">
                    {formatCurrency(dreReport.data.gross_profit)}
                  </td>
                </tr>

                {/* Despesas Operacionais */}
                <tr>
                  <td className="py-3 px-4 text-muted-foreground">
                    (-) Despesas Operacionais
                  </td>
                  <td className="py-3 px-4 text-right">
                    ({formatCurrency(dreReport.data.operating_expenses)})
                  </td>
                </tr>

                {/* Lucro Operacional */}
                <tr className="bg-amber-50">
                  <td className="py-3 px-4 font-semibold">= Lucro Operacional</td>
                  <td className="py-3 px-4 text-right font-semibold">
                    {formatCurrency(dreReport.data.operating_income)}
                  </td>
                </tr>

                {/* Outras Receitas/Despesas */}
                <tr>
                  <td className="py-3 px-4 text-muted-foreground">
                    (+) Outras Receitas
                  </td>
                  <td className="py-3 px-4 text-right">
                    {formatCurrency(dreReport.data.other_income)}
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-4 text-muted-foreground">
                    (-) Outras Despesas
                  </td>
                  <td className="py-3 px-4 text-right">
                    ({formatCurrency(dreReport.data.other_expenses)})
                  </td>
                </tr>

                {/* Lucro Líquido */}
                <tr className="bg-green-100">
                  <td className="py-3 px-4 font-bold text-lg">= Lucro Líquido</td>
                  <td className="py-3 px-4 text-right font-bold text-lg text-green-700">
                    {formatCurrency(dreReport.data.net_income)}
                  </td>
                </tr>

                {/* Margens */}
                <tr className="bg-purple-50">
                  <td className="py-3 px-4 font-semibold">Margem Líquida</td>
                  <td className="py-3 px-4 text-right font-semibold">
                    {dreReport.data.net_margin.toFixed(2)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-900">
            <strong>ℹ️ Informação:</strong> Esta DRE é baseada em dados dos últimos
            30 dias. Para análises mais detalhadas ou períodos específicos, consulte
            seu relatório contábil oficial.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
