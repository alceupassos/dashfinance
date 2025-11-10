"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RoleGuard } from "@/components/role-guard";
import { MessageSquare, Plus, Edit, Trash2, Copy, Eye } from "lucide-react";
import {
  getWhatsappTemplates,
  createWhatsappTemplate,
  updateWhatsappTemplate,
  deleteWhatsappTemplate,
  type WhatsappTemplate,
  type UpsertWhatsappTemplatePayload
} from "@/lib/api";
import { Switch } from "@/components/ui/switch";

export default function WhatsappTemplatesPage() {
  return (
    <RoleGuard allow={["admin", "executivo_conta"]}>
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsappTemplate | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "greetings",
    content: "",
    variables: "",
    isActive: true
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: () => getWhatsappTemplates()
  });

  const filteredTemplates = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return templates;
    return templates.filter((template) => {
      const target = `${template.nome} ${template.categoria}`.toLowerCase();
      return target.includes(term);
    });
  }, [search, templates]);

  const resetForm = () => {
    setFormData({
      name: "",
      category: "greetings",
      content: "",
      variables: "",
      isActive: true
    });
    setSelectedTemplate(null);
  };

  const openCreate = () => {
    resetForm();
    setIsEditorOpen(true);
  };

  const openEdit = (template: WhatsappTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.nome,
      category: template.categoria,
      content: template.corpo,
      variables: (template.variaveisObrigatorias ?? []).join(", "),
      isActive: template.status?.toLowerCase() === "ativa"
    });
    setIsEditorOpen(true);
  };

  const buildPayload = (): UpsertWhatsappTemplatePayload => ({
    nome: formData.name.trim(),
    categoria: formData.category,
    status: formData.isActive ? "ativa" : "inativa",
    corpo: formData.content,
    descricao: null,
    variaveisObrigatorias: formData.variables
      .split(",")
      .map((variable) => variable.trim())
      .filter(Boolean),
    variaveisOpcionais: []
  });

  const createMutation = useMutation({
    mutationFn: (payload: UpsertWhatsappTemplatePayload) => createWhatsappTemplate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      setIsEditorOpen(false);
      setFeedback("Template criado com sucesso.");
      resetForm();
    },
    onError: (error: unknown) => {
      console.error("[whatsapp-templates] create error", error);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpsertWhatsappTemplatePayload }) =>
      updateWhatsappTemplate(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      setIsEditorOpen(false);
      setFeedback("Template atualizado com sucesso.");
      resetForm();
    },
    onError: (error: unknown) => {
      console.error("[whatsapp-templates] update error", error);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWhatsappTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      setFeedback("Template removido.");
    }
  });

  const toggleMutation = useMutation({
    mutationFn: (template: WhatsappTemplate) =>
      updateWhatsappTemplate(template.id, {
        nome: template.nome,
        categoria: template.categoria,
        status: template.status?.toLowerCase() === "ativa" ? "inativa" : "ativa",
        corpo: template.corpo,
        descricao: template.descricao ?? null,
        variaveisObrigatorias: template.variaveisObrigatorias ?? [],
        variaveisOpcionais: template.variaveisOpcionais ?? [],
        horaEnvioRecomendada: template.horaEnvioRecomendada ?? null,
        empresaCnpj: template.empresaCnpj ?? null,
        provider: template.provider ?? null
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
    }
  });

  const handleSubmit = () => {
    const payload = buildPayload();
    if (!payload.nome || !payload.corpo) {
      setFeedback("Preencha nome e conteúdo do template.");
      return;
    }
    if (selectedTemplate) {
      updateMutation.mutate({ id: selectedTemplate.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (template: WhatsappTemplate) => {
    if (window.confirm(`Remover o template "${template.nome}"?`)) {
      deleteMutation.mutate(template.id);
    }
  };

  const handleToggleActive = (template: WhatsappTemplate) => {
    toggleMutation.mutate(template);
  };

  const handleCopy = (content: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(content);
      setFeedback("Conteúdo copiado para a área de transferência.");
    }
  };


  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      greetings: "Saudações",
      receipts: "Recibos",
      alerts: "Alertas",
      reports: "Relatórios",
      actions: "Ações",
      general: "Geral"
    };
    return labels[category] ?? category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      greetings: "bg-blue-100 text-blue-800",
      receipts: "bg-green-100 text-green-800",
      alerts: "bg-red-100 text-red-800",
      reports: "bg-purple-100 text-purple-800",
      actions: "bg-amber-100 text-amber-800",
      general: "bg-slate-100 text-slate-800"
    };
    return colors[category] ?? "bg-gray-100 text-gray-800";
  };

  const statusBadge = (status?: string) => {
    const normalized = status?.toLowerCase();
    if (normalized === "ativa") return <Badge variant="default" className="bg-green-600">Ativo</Badge>;
    if (normalized === "inativa") return <Badge variant="outline">Inativo</Badge>;
    return <Badge variant="outline">{status ?? "—"}</Badge>;
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            Templates WhatsApp
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie templates de mensagens pré-configuradas</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pesquisar Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Buscar por nome ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">Carregando templates...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">Nenhum template encontrado</p>
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <Card key={template.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{template.nome}</h3>
                      <Badge className={getCategoryColor(template.categoria)}>
                        {getCategoryLabel(template.categoria)}
                      </Badge>
                      {statusBadge(template.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">
                      {template.corpo}
                    </p>
                    {(template.variaveisObrigatorias?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {template.variaveisObrigatorias?.map((variable) => (
                          <Badge key={variable} variant="outline" className="font-mono text-xs">
                            {"{"}
                            {variable}
                            {"}"}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      {template.criadoEm && (
                        <span>Criado: {new Date(template.criadoEm).toLocaleDateString("pt-BR")}</span>
                      )}
                      {template.ultimaAtualizacao && (
                        <span>Atualizado: {new Date(template.ultimaAtualizacao).toLocaleDateString("pt-BR")}</span>
                      )}
                      {template.provider && <span>Provider: {template.provider}</span>}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setIsPreviewOpen(true);
                      }}
                      title="Visualizar"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(template.corpo)}
                      title="Copiar"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(template)}
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(template)}
                      title={template.status?.toLowerCase() === "ativa" ? "Desativar" : "Ativar"}
                    >
                      {template.status?.toLowerCase() === "ativa" ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template)}
                      title="Deletar"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {feedback && <p className="text-xs text-muted-foreground">{feedback}</p>}

      {/* Create/Edit Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? "Editar Template" : "Novo Template"}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate
                ? "Atualize os dados do template"
                : "Crie um novo template de mensagem"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Saudação Inicial"
              />
            </div>

            <div>
              <Label htmlFor="category">Categoria</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ex: greetings"
              />
            </div>

            <div>
              <Label htmlFor="content">Conteúdo</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Ex: Olá {{name}}! Como posso ajudá-lo?"
                rows={6}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Use {"{"}variáveis{"}"} para conteúdo dinâmico
              </p>
            </div>

            <div>
              <Label htmlFor="variables">Variáveis obrigatórias (separadas por vírgula)</Label>
              <Input
                id="variables"
                value={formData.variables}
                onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
                placeholder="name, amount, date"
              />
            </div>

            <div className="flex items-center justify-between rounded-md border border-border/60 bg-secondary/20 p-3">
              <div>
                <Label>Template ativo?</Label>
                <p className="text-xs text-muted-foreground">Quando ativo, fica disponível para disparo imediato.</p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prévia do Template</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <p className="text-sm font-medium">{selectedTemplate.nome}</p>
              </div>
              <div>
                <Label>Categoria</Label>
                <Badge className={getCategoryColor(selectedTemplate.categoria)}>
                  {getCategoryLabel(selectedTemplate.categoria)}
                </Badge>
              </div>
              <div>
                <Label>Conteúdo</Label>
                <div className="bg-secondary/50 p-4 rounded-md border">
                  <p className="text-sm whitespace-pre-wrap">{selectedTemplate.corpo}</p>
                </div>
              </div>
              {(selectedTemplate.variaveisObrigatorias?.length ?? 0) > 0 && (
                <div>
                  <Label>Variáveis obrigatórias</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.variaveisObrigatorias?.map((variable) => (
                      <Badge key={variable} variant="outline" className="font-mono">
                        {"{"}
                        {variable}
                        {"}"}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <Button onClick={() => handleCopy(selectedTemplate.corpo)} className="w-full">
                Copiar Template
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
