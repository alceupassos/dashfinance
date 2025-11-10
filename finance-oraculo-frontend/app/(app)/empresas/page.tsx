"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RoleGuard } from "@/components/role-guard";
import {
  Building2,
  Plus,
  Eye,
  RefreshCw,
  Download,
  Search,
  Filter,
  MoreVertical,
} from "lucide-react";

interface Company {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "syncing";
  last_sync: string;
  revenue: number;
  employees: number;
  industry: string;
  city: string;
  state: string;
}

export default function EmpresasPage() {
  return (
    <RoleGuard allow={["admin", "executivo_conta"]}>
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  // Mock data
  const mockCompanies: Company[] = [
    {
      id: "1",
      name: "Grupo Volpe LTDA",
      cnpj: "12.345.678/0001-90",
      email: "contato@volpe.com.br",
      phone: "(11) 3456-7890",
      status: "active",
      last_sync: "2025-11-09T14:30:00Z",
      revenue: 2500000,
      employees: 45,
      industry: "Consultoria",
      city: "São Paulo",
      state: "SP",
    },
    {
      id: "2",
      name: "Tech Solutions Brasil",
      cnpj: "98.765.432/0001-99",
      email: "info@techsolutions.com.br",
      phone: "(21) 9876-5432",
      status: "active",
      last_sync: "2025-11-08T10:15:00Z",
      revenue: 1800000,
      employees: 30,
      industry: "Tecnologia",
      city: "Rio de Janeiro",
      state: "RJ",
    },
    {
      id: "3",
      name: "Comércio Geral Express",
      cnpj: "55.555.555/0001-55",
      email: "vendas@comercio.com.br",
      phone: "(31) 5555-5555",
      status: "syncing",
      last_sync: "2025-11-09T16:00:00Z",
      revenue: 950000,
      employees: 15,
      industry: "Comércio",
      city: "Belo Horizonte",
      state: "MG",
    },
    {
      id: "4",
      name: "Indústria Metal Flex",
      cnpj: "77.777.777/0001-77",
      email: "producao@metalflex.com.br",
      phone: "(47) 7777-7777",
      status: "active",
      last_sync: "2025-11-09T08:30:00Z",
      revenue: 3200000,
      employees: 60,
      industry: "Indústria",
      city: "Blumenau",
      state: "SC",
    },
    {
      id: "5",
      name: "Serviços de Limpeza Premium",
      cnpj: "99.999.999/0001-99",
      email: "admin@limpeza.com.br",
      phone: "(85) 9999-9999",
      status: "inactive",
      last_sync: "2025-10-15T12:00:00Z",
      revenue: 420000,
      employees: 8,
      industry: "Serviços",
      city: "Fortaleza",
      state: "CE",
    },
  ];

  const { data: companies = mockCompanies, isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => mockCompanies,
  });

  const filteredCompanies = companies.filter((company) => {
    const matchSearch =
      company.name.toLowerCase().includes(search.toLowerCase()) ||
      company.cnpj.includes(search);
    const matchStatus = filterStatus === "all" || company.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "syncing":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Ativo";
      case "inactive":
        return "Inativo";
      case "syncing":
        return "Sincronizando";
      default:
        return status;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Empresas
          </h1>
          <p className="text-muted-foreground mt-1">
            Listagem de clientes e empresas gerenciadas
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Empresa
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
          <div className="flex-1 min-w-[300px]">
            <label className="text-sm font-medium">Pesquisar</label>
            <div className="flex gap-2 mt-1">
              <Search className="h-5 w-5 text-muted-foreground self-center" />
              <Input
                placeholder="Buscar por nome ou CNPJ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-input rounded-md mt-1"
            >
              <option value="all">Todos</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="syncing">Sincronizando</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Sob gestão</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {companies.filter((c) => c.status === "active").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Operacionais</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                companies.reduce((sum, c) => sum + c.revenue, 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Anual estimado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Colaboradores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companies.reduce((sum, c) => sum + c.employees, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Companies Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center p-8">
              <p className="text-muted-foreground">Carregando empresas...</p>
            </CardContent>
          </Card>
        ) : filteredCompanies.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center p-8">
              <p className="text-muted-foreground">Nenhuma empresa encontrada</p>
            </CardContent>
          </Card>
        ) : (
          filteredCompanies.map((company) => (
            <Card
              key={company.id}
              className="overflow-hidden hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="line-clamp-2">{company.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {company.cnpj}
                    </p>
                  </div>
                  <Badge className={getStatusColor(company.status)}>
                    {getStatusLabel(company.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Faturamento</p>
                    <p className="font-semibold">{formatCurrency(company.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Colaboradores</p>
                    <p className="font-semibold">{company.employees}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Setor</p>
                    <p className="font-semibold text-xs">{company.industry}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Localização</p>
                    <p className="font-semibold text-xs">
                      {company.city}, {company.state}
                    </p>
                  </div>
                </div>

                <div className="bg-secondary/50 p-2 rounded text-xs">
                  <p className="text-muted-foreground">
                    Último sync:{" "}
                    {new Date(company.last_sync).toLocaleString("pt-BR")}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedCompany(company);
                      setShowDetailDialog(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Detalhes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={company.status === "syncing"}
                  >
                    <RefreshCw
                      className={`h-4 w-4 mr-1 ${company.status === "syncing" ? "animate-spin" : ""}`}
                    />
                    Sincronizar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedCompany?.name}</DialogTitle>
            <DialogDescription>{selectedCompany?.cnpj}</DialogDescription>
          </DialogHeader>

          {selectedCompany && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium text-sm">{selectedCompany.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium text-sm">{selectedCompany.phone}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Faturamento</p>
                  <p className="font-semibold">
                    {formatCurrency(selectedCompany.revenue)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Colaboradores</p>
                  <p className="font-semibold">{selectedCompany.employees}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Setor</p>
                  <p className="font-medium">{selectedCompany.industry}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Localização</p>
                  <p className="font-medium">
                    {selectedCompany.city}, {selectedCompany.state}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={getStatusColor(selectedCompany.status)}>
                  {getStatusLabel(selectedCompany.status)}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Último Sync</p>
                <p className="text-sm">
                  {new Date(selectedCompany.last_sync).toLocaleString("pt-BR")}
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1">
                  Editar
                </Button>
                <Button className="flex-1" variant="outline">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Sincronizar Agora
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
