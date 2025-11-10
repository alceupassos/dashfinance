"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RoleGuard } from "@/components/role-guard";
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Building2,
  Users,
} from "lucide-react";

interface GroupCompany {
  id: string;
  name: string;
  cnpj: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  company_count: number;
  companies: GroupCompany[];
  created_at: string;
  updated_at: string;
}

export default function GruposPage() {
  return (
    <RoleGuard allow={["admin", "executivo_conta"]}>
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  // Mock data
  const mockGroups: Group[] = [
    {
      id: "group-1",
      name: "Grupo Volpe",
      description: "Empresas do grupo Volpe",
      company_count: 3,
      companies: [
        { id: "1", name: "Volpe Consultoria", cnpj: "12.345.678/0001-90" },
        { id: "2", name: "Volpe Tecnologia", cnpj: "12.345.679/0001-91" },
        { id: "3", name: "Volpe Imóveis", cnpj: "12.345.680/0001-92" },
      ],
      created_at: "2025-11-01T10:00:00Z",
      updated_at: "2025-11-09T14:30:00Z",
    },
    {
      id: "group-2",
      name: "Tech Solutions",
      description: "Empresas de tecnologia integradas",
      company_count: 2,
      companies: [
        { id: "4", name: "Tech Solutions Brasil", cnpj: "98.765.432/0001-99" },
        { id: "5", name: "Tech Cloud Services", cnpj: "98.765.433/0001-98" },
      ],
      created_at: "2025-11-02T11:00:00Z",
      updated_at: "2025-11-08T10:15:00Z",
    },
    {
      id: "group-3",
      name: "Comercial Integrado",
      description: "Rede de comércio",
      company_count: 1,
      companies: [
        { id: "6", name: "Comércio Geral Express", cnpj: "55.555.555/0001-55" },
      ],
      created_at: "2025-11-03T12:00:00Z",
      updated_at: "2025-11-09T08:00:00Z",
    },
  ];

  const { data: groups = mockGroups, isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => mockGroups,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setFormData({ name: "", description: "" });
      setShowCreateDialog(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });

  const filteredGroups = groups.filter(
    (group) =>
      group.name.toLowerCase().includes(search.toLowerCase()) ||
      group.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    if (formData.name) {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja deletar este grupo?")) {
      deleteMutation.mutate(id);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedGroupId(expandedGroupId === id ? null : id);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Layers className="h-8 w-8" />
            Grupos de Empresas
          </h1>
          <p className="text-muted-foreground mt-1">
            Agruppe suas empresas para análises consolidadas
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Grupo
        </Button>
      </div>

      {/* Busca */}
      <Card>
        <CardHeader>
          <CardTitle>Pesquisar Grupos</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Buscar por nome ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Grupos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groups.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Grupos criados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Empresas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {groups.reduce((sum, g) => sum + g.company_count, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Agrupadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Média por Grupo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {groups.length > 0
                ? (
                    groups.reduce((sum, g) => sum + g.company_count, 0) /
                    groups.length
                  ).toFixed(1)
                : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Empresas/grupo</p>
          </CardContent>
        </Card>
      </div>

      {/* Grupos List */}
      <div className="space-y-3">
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center p-8">
              <p className="text-muted-foreground">Carregando grupos...</p>
            </CardContent>
          </Card>
        ) : filteredGroups.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center p-8">
              <p className="text-muted-foreground">Nenhum grupo encontrado</p>
            </CardContent>
          </Card>
        ) : (
          filteredGroups.map((group) => (
            <Card key={group.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div
                  className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => toggleExpand(group.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <button className="p-1">
                        {expandedGroupId === group.id ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                      </button>
                      <div>
                        <h3 className="font-semibold">{group.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {group.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        <Users className="h-3 w-3" />
                        {group.company_count}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingGroup(group);
                          setFormData({
                            name: group.name,
                            description: group.description,
                          });
                          setShowCreateDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(group.id);
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedGroupId === group.id && (
                  <div className="p-4 space-y-3">
                    {group.companies.map((company) => (
                      <div
                        key={company.id}
                        className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border"
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{company.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {company.cnpj}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          Remover
                        </Button>
                      </div>
                    ))}

                    <Button variant="outline" className="w-full gap-2 mt-3">
                      <Plus className="h-4 w-4" />
                      Adicionar Empresa
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? "Editar Grupo" : "Novo Grupo"}
            </DialogTitle>
            <DialogDescription>
              {editingGroup
                ? "Atualize os dados do grupo"
                : "Crie um novo agrupamento de empresas"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do Grupo</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Grupo Volpe"
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Ex: Empresas do grupo Volpe"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setEditingGroup(null);
                  setFormData({ name: "", description: "" });
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending || !formData.name}
              >
                {createMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-900">
            <strong>ℹ️ Dica:</strong> Use grupos para organizar empresas por
            holding, região, ou departamento. Isso facilita análises consolidadas
            e relatórios comparativos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
