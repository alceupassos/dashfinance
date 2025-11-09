"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getWhatsappTemplates, createWhatsappTemplate, updateWhatsappTemplate, sendWhatsappMessage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RoleGuard } from "@/components/role-guard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function WhatsappTemplatesPage() {
  return (
    <RoleGuard allow={["admin", "executivo_conta"]}>
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: () => getWhatsappTemplates()
  });
  const [selected, setSelected] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isLoading) {
    return (
      <Card className="border-border/60 bg-[#11111a]/80">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Carregando templates...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border/60 bg-[#11111a]/80">
        <CardContent className="p-8 text-center text-sm text-red-400">
          Erro ao carregar templates. Tente novamente.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 bg-[#11111a]/80">
      <CardHeader className="flex flex-col gap-2 border-none p-4 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-sm">Templates WhatsApp</CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Utilize variáveis dinâmicas para personalizar comunicações com clientes.
          </p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => { setSelected(null); setIsModalOpen(true); }}>
              Criar novo template
            </Button>
          </DialogTrigger>
          <TemplateModal template={selected} onClose={() => setIsModalOpen(false)} />
        </Dialog>
      </CardHeader>
      <CardContent className="grid gap-3 p-4 md:grid-cols-2">
        {!data || data.length === 0 ? (
          <div className="col-span-2 rounded-md border border-border/60 bg-secondary/20 p-8 text-center text-sm text-muted-foreground">
            Nenhum template encontrado. Crie o primeiro!
          </div>
        ) : (
          data.map((template) => (
            <div key={template.id} className="space-y-3 rounded-md border border-border/60 bg-secondary/20 p-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{template.nome}</p>
                  <p className="text-[11px] text-muted-foreground">{template.categoria}</p>
                </div>
                <Badge variant={template.status === "ativa" ? "success" : "outline"}>
                  {template.variaveisObrigatorias?.length || 0} variáveis
                </Badge>
              </div>
              <p className="rounded-md border border-border/60 bg-[#0d0d15]/60 px-3 py-2 text-muted-foreground">
                {template.corpo}
              </p>
              <div className="flex flex-wrap gap-2">
                {template.variaveisObrigatorias?.map((variable: string) => (
                  <Badge key={variable} variant="default" className="text-[10px]">
                    {`{{${variable}}}`}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" onClick={() => setSelected(template)}>
                      Editar
                    </Button>
                  </DialogTrigger>
                  <TemplateModal template={template} onClose={() => setSelected(null)} />
                </Dialog>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => {
                    setSelected({ ...template, id: undefined, nome: `${template.nome} (cópia)` });
                    setIsModalOpen(true);
                  }}
                >
                  Duplicar
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function TemplateModal({ template, onClose }: { template: any | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState(template?.nome ?? "");
  const [descricao, setDescricao] = useState(template?.descricao ?? "");
  const [categoria, setCategoria] = useState(template?.categoria ?? "financeiro");
  const [corpo, setCorpo] = useState(template?.corpo ?? "");
  const [status, setStatus] = useState(template?.status ?? "ativa");
  const [testPhone, setTestPhone] = useState("");
  const [testCnpj, setTestCnpj] = useState("");
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [testFeedback, setTestFeedback] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: createWhatsappTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      onClose();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateWhatsappTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      onClose();
    }
  });

  // Extrair variáveis do corpo
  const regex = /{{(\w+)}}/g;
  const extractedVariables: string[] = [];
  let match;
  while ((match = regex.exec(corpo)) !== null) {
    extractedVariables.push(match[1]);
  }
  const uniqueVariables = Array.from(new Set(extractedVariables));
  const livePreview = useMemo(() => {
    return corpo.replace(/{{(\w+)}}/g, (_m: string, key: string) => {
      const value = variableValues[key] ?? `<${key}>`;
      return String(value);
    });
  }, [corpo, variableValues]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = {
      nome,
      descricao,
      categoria,
      corpo,
      status,
      variaveisObrigatorias: uniqueVariables,
      variaveisOpcionais: []
    };

    if (template?.id) {
      updateMutation.mutate({ id: template.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const testMutation = useMutation({
    mutationFn: async () => {
      setTestFeedback(null);
      const hasTemplate = !!template?.id;
      const payload = hasTemplate
        ? {
            empresa_cnpj: testCnpj || undefined,
            contato_phone: testPhone,
            templateId: template.id as string,
            variaveis: uniqueVariables.reduce<Record<string, string>>((acc, key) => {
              acc[key] = variableValues[key] ?? "";
              return acc;
            }, {})
          }
        : {
            empresa_cnpj: testCnpj || undefined,
            contato_phone: testPhone,
            mensagem: livePreview
          };
      return await sendWhatsappMessage(payload as any, { preferReturnRepresentation: true });
    },
    onSuccess: () => setTestFeedback("Mensagem de teste enviada."),
    onError: () => setTestFeedback("Falha ao enviar teste. Verifique número/credenciais.")
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isTesting = testMutation.isPending;

  return (
    <DialogContent className="max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{template?.id ? "Editar template" : "Novo template"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Nome interno</label>
          <Input 
            value={nome} 
            onChange={(e) => setNome(e.target.value)} 
            placeholder="Recebimento de Pagamento" 
            required 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Descrição</label>
          <Input 
            value={descricao} 
            onChange={(e) => setDescricao(e.target.value)} 
            placeholder="Confirma recebimento de pagamento" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Categoria</label>
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="financeiro">Financeiro</SelectItem>
              <SelectItem value="comercial">Comercial</SelectItem>
              <SelectItem value="operacional">Operacional</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativa">Ativa</SelectItem>
              <SelectItem value="inativa">Inativa</SelectItem>
              <SelectItem value="aguardando_aprovacao">Aguardando Aprovação</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">
            Corpo da mensagem (use {`{{variavel}}`} para variáveis)
          </label>
          <Textarea 
            value={corpo} 
            onChange={(e) => setCorpo(e.target.value)} 
            rows={6} 
            placeholder="Olá {{nome}}, seu pagamento de {{valor}} foi recebido em {{data}}"
            required
          />
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground">
            Variáveis detectadas ({uniqueVariables.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {uniqueVariables.length > 0 ? (
              uniqueVariables.map((variable: string) => (
                <Badge key={variable} variant="default" className="text-[10px]">
                  {`{{${variable}}}`}
                </Badge>
              ))
            ) : (
              <span className="text-[11px] text-muted-foreground">Nenhuma variável detectada</span>
            )}
          </div>
        </div>
        <div className="rounded-md border border-border/60 bg-secondary/20 p-3 text-[11px]">
          <p className="mb-2 font-medium text-muted-foreground">Prévia:</p>
          <p className="text-foreground">{livePreview}</p>
        </div>
        {uniqueVariables.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-muted-foreground">Valores para teste</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {uniqueVariables.map((key) => (
                <div key={key} className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">{key}</label>
                  <Input
                    value={variableValues[key] ?? ""}
                    onChange={(e) =>
                      setVariableValues((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    placeholder={`Valor para ${key}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="rounded-md border border-border/60 bg-[#0d0f15]/60 p-3">
          <p className="mb-2 text-[11px] font-medium text-muted-foreground">Testar envio</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">Telefone</label>
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+5511999999999"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">CNPJ (opcional)</label>
              <Input
                value={testCnpj}
                onChange={(e) => setTestCnpj(e.target.value)}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="flex items-end justify-end">
              <Button
                type="button"
                onClick={() => testMutation.mutate()}
                disabled={isTesting || !testPhone}
              >
                {isTesting ? "Enviando..." : "Testar envio"}
              </Button>
            </div>
          </div>
          {testFeedback && (
            <p className="mt-2 text-[11px] text-muted-foreground">{testFeedback}</p>
          )}
        </div>
        {(createMutation.isError || updateMutation.isError) && (
          <div className="rounded-md border border-red-500/50 bg-red-500/10 p-2 text-[11px] text-red-400">
            Erro ao salvar template. Tente novamente.
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

