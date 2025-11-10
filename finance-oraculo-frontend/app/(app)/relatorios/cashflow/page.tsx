"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RoleGuard } from "@/components/role-guard";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Download,
  Filter,
  Activity,
} from "lucide-react";

interface CashflowEntry {
  date: string;
  inflow: number;
  outflow: number;
  balance: number;
  daily_change: number;
}

interface CashflowProjection {
  date: string;
  projected_balance: number;
  risk_level: "low" | "medium" | "high" | "critical";
}

interface CashflowData {
  current_balance: number;
  daily_average_inflow: number;
  daily_average_outflow: number;
  projected_balance_7days: number;
  runway_days: number;
  historical: CashflowEntry[];
  projection: CashflowProjection[];
}

export default function CashflowPage() {
  return (
    <RoleGuard allow={["admin", "executivo_conta"]}>
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const [selectedPeriod, setSelectedPeriod] = useState("30days");
  const [selectedCompany, setSelectedCompany] = useState("all");

  // Mock data
  const mockCashflowData: CashflowData = {
    current_balance: 125000,
    daily_average_inflow: 15800,
    daily_average_outflow: 12300,
    projected_balance_7days: 150600,
    runway_days: 45,
    historical: [
      {
        date: "2025-11-01",
        inflow: 18000,
        outflow: 11000,
        balance: 110000,
        daily_change: 7000,
      },
      {
        date: "2025-11-02",
        inflow: 12000,
        outflow: 13500,
        balance: 108500,
        daily_change: -1500,
      },
      {
        date: "2025-11-03",
        inflow: 16500,
        outflow: 12000,
        balance: 113000,
        daily_change: 4500,
      },
      {
        date: "2025-11-04",
        inflow: 14200,
        outflow: 11800,
        balance: 115400,
        daily_change: 2400,
      },
      {
        date: "2025-11-05",
        inflow: 18900,
        outflow: 12500,
        balance: 121800,
        daily_change: 6400,
      },
      {
        date: "2025-11-06",
        inflow: 15600,
        outflow: 11900,
        balance: 125500,
        daily_change: 3700,
      },
      {
        date: "2025-11-07",
        inflow: 16200,
        outflow: 12000,
        balance: 129700,
        daily_change: 4200,
      },
      {
        date: "2025-11-08",
        inflow: 14800,
        outflow: 13200,
        balance: 131300,
        daily_change: 1600,
      },
      {
        date: "2025-11-09",
        inflow: 17300,
        outflow: 11800,
        balance: 136800,
        daily_change: 5500,
      },
    ],
    projection: [
      { date: "2025-11-10", projected_balance: 142000, risk_level: "low" },
      { date: "2025-11-11", projected_balance: 145300, risk_level: "low" },
      { date: "2025-11-12", projected_balance: 148900, risk_level: "low" },
      { date: "2025-11-13", projected_balance: 151200, risk_level: "low" },
      { date: "2025-11-14", projected_balance: 148600, risk_level: "low" },
      { date: "2025-11-15", projected_balance: 145200, risk_level: "low" },
      { date: "2025-11-16", projected_balance: 142800, risk_level: "low" },
    ],
  };

  const { data: cashflowData = mockCashflowData, isLoading } = useQuery({
    queryKey: ["cashflow-report", selectedPeriod, selectedCompany],
    queryFn: async () => mockCashflowData,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Combinar histórico com projeção
  const combinedData = [
    ...cashflowData.historical.map((entry) => ({
      date: new Date(entry.date).toLocaleDateString("pt-BR"),
      balance: entry.balance,
      inflow: entry.inflow,
      outflow: entry.outflow,
      type: "histórico",
    })),
    ...cashflowData.projection.map((entry) => ({
      date: new Date(entry.date).toLocaleDateString("pt-BR"),
      balance: entry.projected_balance,
      inflow: 0,
      outflow: 0,
      type: "projeção",
    })),
  ];

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low":
        return "text-green-600";
      case "medium":
        return "text-yellow-600";
      case "high":
        return "text-orange-600";
      case "critical":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getRiskBgColor = (level: string) => {
    switch (level) {
      case "low":
        return "bg-green-50";
      case "medium":
        return "bg-yellow-50";
      case "high":
        return "bg-orange-50";
      case "critical":
        return "bg-red-50";
      default:
        return "bg-gray-50";
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case "low":
        return "Baixo Risco";
      case "medium":
        return "Risco Médio";
      case "high":
        return "Risco Alto";
      case "critical":
        return "Risco Crítico";
      default:
        return level;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Fluxo de Caixa
          </h1>
          <p className="text-muted-foreground mt-1">
            Análise e projeção de saldo disponível
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
            <label className="text-sm font-medium">Período</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-input rounded-md mt-1"
            >
              <option value="7days">Últimos 7 dias</option>
              <option value="30days">Últimos 30 dias</option>
              <option value="90days">Últimos 90 dias</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Empresa</label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="px-3 py-2 border border-input rounded-md mt-1"
            >
              <option value="all">Todas as empresas</option>
              <option value="12345678000190">Grupo Volpe LTDA</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(cashflowData.current_balance)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">A partir de hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Média Diária Entrada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(cashflowData.daily_average_inflow)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Últimos 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Média Diária Saída</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(cashflowData.daily_average_outflow)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Últimos 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Runway</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cashflowData.runway_days}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Dias até zeramento do caixa
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Gráfico */}
      <Card>
        <CardHeader>
          <CardTitle>Saldo Disponível - Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={combinedData}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorBalance)"
                name="Saldo"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Entradas vs Saídas */}
        <Card>
          <CardHeader>
            <CardTitle>Entradas vs Saídas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cashflowData.historical}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Bar dataKey="inflow" fill="#22c55e" name="Entradas" />
                <Bar dataKey="outflow" fill="#ef4444" name="Saídas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Projeção 7 Dias */}
        <Card>
          <CardHeader>
            <CardTitle>Projeção - Próximos 7 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cashflowData.projection}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Line
                  type="monotone"
                  dataKey="projected_balance"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Saldo Projetado"
                  dot={{ fill: "#3b82f6", r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Risco por Data */}
      <Card>
        <CardHeader>
          <CardTitle>Análise de Risco - Próximos 7 Dias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="py-3 px-4 text-left font-semibold">Data</th>
                  <th className="py-3 px-4 text-left font-semibold">Saldo Projetado</th>
                  <th className="py-3 px-4 text-left font-semibold">Nível de Risco</th>
                  <th className="py-3 px-4 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cashflowData.projection.map((projection) => (
                  <tr key={projection.date} className={getRiskBgColor(projection.risk_level)}>
                    <td className="py-3 px-4">
                      {new Date(projection.date).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-3 px-4 font-semibold">
                      {formatCurrency(projection.projected_balance)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={getRiskColor(projection.risk_level)}>
                        {getRiskLabel(projection.risk_level)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {projection.risk_level === "critical" && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Alerta
                        </Badge>
                      )}
                      {projection.risk_level === "high" && (
                        <Badge variant="outline" className="text-orange-600">
                          Atenção
                        </Badge>
                      )}
                      {projection.risk_level === "low" && (
                        <Badge variant="outline" className="text-green-600">
                          Seguro
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-900">
            <strong>ℹ️ Informação:</strong> As projeções são baseadas nas
            movimentações históricas dos últimos 30 dias. Fatores externos podem
            afetar a precisão da previsão. Recomenda-se monitorar regularmente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
