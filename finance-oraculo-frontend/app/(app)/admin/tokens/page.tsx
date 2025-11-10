"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RoleGuard } from "@/components/role-guard";
import { Key, Plus, Copy, Trash2, Eye, EyeOff, Zap } from "lucide-react";
import {
  getOnboardingTokens,
  createOnboardingToken,
  toggleOnboardingTokenStatus,
  deleteOnboardingToken,
  type OnboardingToken
} from "@/lib/api";

interface CreateOnboardingTokenPayload {
  empresa_id?: string;
  funcao: "admin" | "onboarding";
  criado_por?: string;
}

export default function AdminTokensPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showNewTokenDialog, setShowNewTokenDialog] = useState(false);
  const [showTokenValue, setShowTokenValue] = useState<string | null>(null);
  const [newTokenData, setNewTokenData] = useState<CreateOnboardingTokenPayload>({
    empresa_id: "",
    funcao: "onboarding",
  });
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data: tokens = [], isLoading } = useQuery({
    queryKey: ["admin-tokens"],
    queryFn: getOnboardingTokens,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateOnboardingTokenPayload) => {
      return await createOnboardingToken(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tokens"] });
      setNewTokenData({ empresa_id: "", funcao: "onboarding" });
      setShowNewTokenDialog(false);
      setFeedback("Token criado com sucesso!");
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (error) => {
      setFeedback(`Erro ao criar token: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
      setTimeout(() => setFeedback(null), 5000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await deleteOnboardingToken(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tokens"] });
      setFeedback("Token deletado com sucesso!");
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (error) => {
      setFeedback(`Erro ao deletar token: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
      setTimeout(() => setFeedback(null), 5000);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      return await toggleOnboardingTokenStatus(id, ativo);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tokens"] });
      setFeedback("Status do token atualizado!");
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (error) => {
      setFeedback(`Erro ao atualizar token: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
      setTimeout(() => setFeedback(null), 5000);
    },
  });

  const filteredTokens = tokens.filter(
    (t) =>
      t.token.toLowerCase().includes(search.toLowerCase()) ||
      t.empresa_nome?.toLowerCase().includes(search.toLowerCase()) ||
      t.empresa_id?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateToken = () => {
    if (newTokenData.empresa_id) {
      createMutation.mutate(newTokenData);
    } else {
      setFeedback("Selecione uma empresa para criar o token");
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleDeleteToken = (id: string) => {
    if (confirm("Tem certeza que deseja deletar este token?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleRevokeToken = (id: string, currentStatus: boolean) => {
    const action = currentStatus ? "revogar" : "ativar";
    if (confirm(`Tem certeza que deseja ${action} este token?`)) {
      revokeMutation.mutate({ id, ativo: !currentStatus });
    }
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    alert("Token copiado para a área de transferência!");
  };

  const getStatusColor = (ativo: boolean) => {
    return ativo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (ativo: boolean) => {
    return ativo ? "Ativo" : "Inativo";
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Key className="h-8 w-8" />
            Gerenciador de Tokens
          </h1>
          <p className="text-muted-foreground mt-1">
            Crie e gerencie tokens de onboarding para seus clientes
          </p>
        </div>
        <Button onClick={() => setShowNewTokenDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Token
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tokens.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Todos os tokens</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {tokens.filter((t) => t.ativo).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Em uso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Inativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {tokens.filter((t) => !t.ativo).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Revogados</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pesquisar Tokens</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Buscar por token, empresa ou ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
          {feedback && (
            <div className={`mt-2 p-2 rounded-md text-xs ${
              feedback.includes("Erro") ? "bg-red-50 text-red-900" : "bg-green-50 text-green-900"
            }`}>
              {feedback}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center p-8">
              <p className="text-muted-foreground">Carregando tokens...</p>
            </CardContent>
          </Card>
        ) : filteredTokens.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center p-8">
              <p className="text-muted-foreground">Nenhum token encontrado</p>
            </CardContent>
          </Card>
        ) : (
          filteredTokens.map((token) => (
            <Card key={token.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{token.empresa_nome || token.empresa_id || "Token sem empresa"}</h3>
                      <Badge className={getStatusColor(token.ativo)}>
                        {getStatusLabel(token.ativo)}
                      </Badge>
                      {token.ativo && (
                        <Badge variant="outline" className="bg-blue-50">
                          <Zap className="h-3 w-3 mr-1" />
                          Ativo
                        </Badge>
                      )}
                      {token.funcao && (
                        <Badge variant="outline" className="text-xs">
                          {token.funcao}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Empresa ID</p>
                        <p className="text-sm font-medium">{token.empresa_id || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Último uso</p>
                        <p className="text-sm font-medium">
                          {token.ultimo_uso ? new Date(token.ultimo_uso).toLocaleDateString("pt-BR") : "Nunca"}
                        </p>
                      </div>
                    </div>

                    <div className="bg-secondary/50 p-3 rounded-md border border-input mb-3 flex items-center justify-between">
                      <code className="text-xs font-mono">
                        {showTokenValue === token.id
                          ? token.token
                          : token.token.substring(0, 10) + "..." + token.token.slice(-8)}
                      </code>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setShowTokenValue(
                              showTokenValue === token.id ? null : token.id
                            )
                          }
                        >
                          {showTokenValue === token.id ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyToken(token.token)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>Criado: {new Date(token.criado_em).toLocaleDateString("pt-BR")}</span>
                      <span>Criado por: {token.criado_por || "Sistema"}</span>
                      {token.ultimo_uso && (
                        <span>
                          Último uso:{" "}
                          {new Date(token.ultimo_uso).toLocaleString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      variant={token.ativo ? "destructive" : "default"}
                      size="sm"
                      onClick={() => handleRevokeToken(token.id, token.ativo)}
                      disabled={revokeMutation.isPending}
                      title={token.ativo ? "Revogar" : "Ativar"}
                    >
                      {revokeMutation.isPending ? "..." : token.ativo ? "Revogar" : "Ativar"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteToken(token.id)}
                      disabled={deleteMutation.isPending}
                      className="text-destructive hover:text-destructive"
                      title="Deletar"
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

      {/* Create Dialog */}
      <Dialog open={showNewTokenDialog} onOpenChange={setShowNewTokenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Token</DialogTitle>
            <DialogDescription>
              Gere um novo token de onboarding para um cliente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="empresa_id">ID da Empresa (UUID)</Label>
              <Input
                id="empresa_id"
                value={newTokenData.empresa_id}
                onChange={(e) =>
                  setNewTokenData({
                    ...newTokenData,
                    empresa_id: e.target.value,
                  })
                }
                placeholder="Ex: 123e4567-e89b-12d3-a456-426614174000"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Deixe vazio para criar token genérico
              </p>
            </div>

            <div>
              <Label htmlFor="funcao">Função</Label>
              <select
                id="funcao"
                value={newTokenData.funcao}
                onChange={(e) =>
                  setNewTokenData({
                    ...newTokenData,
                    funcao: e.target.value as "admin" | "onboarding",
                  })
                }
                className="w-full px-3 py-2 border border-input rounded-md"
              >
                <option value="onboarding">Onboarding</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-900">
                <strong>ℹ️ Informação:</strong> O token será gerado automaticamente e ficará ativo por padrão.
              </p>
            </div>

            {feedback && (
              <div className={`p-3 rounded-md text-sm ${
                feedback.includes("Erro") ? "bg-red-50 text-red-900" : "bg-green-50 text-green-900"
              }`}>
                {feedback}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowNewTokenDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateToken}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Criando..." : "Criar Token"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
