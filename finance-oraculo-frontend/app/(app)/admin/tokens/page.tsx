"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createOnboardingToken,
  deleteOnboardingToken,
  getCompaniesList,
  getOnboardingTokens,
  toggleOnboardingTokenStatus,
  type OnboardingToken,
  type TokenFunction
} from "@/lib/api";
import { RoleGuard } from "@/components/role-guard";

const STATUS_OPTIONS = [
  { label: "Todos", value: "all" },
  { label: "Ativos", value: "active" },
  { label: "Inativos", value: "inactive" }
];

const FUNCTION_OPTIONS: Array<{ label: string; value: TokenFunction }> = [
  { label: "Onboarding", value: "onboarding" },
  { label: "Admin", value: "admin" }
];

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

const statusBadge = (ativo?: boolean) => (ativo ? "success" : "outline");

export default function AdminTokensPage() {
  return (
    <RoleGuard allow={["admin", "executivo_conta", "franqueado"]}>
      <TokensContent />
    </RoleGuard>
  );
}

function TokensContent() {
  const queryClient = useQueryClient();
  const { data: tokens = [], isLoading } = useQuery({
    queryKey: ["onboarding-tokens"],
    queryFn: getOnboardingTokens
  });
  const { data: companies = [] } = useQuery({
    queryKey: ["companies-list"],
    queryFn: getCompaniesList
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [functionFilter, setFunctionFilter] = useState<TokenFunction | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string | undefined>(companies?.[0]?.cnpj);
  const [selectedFunction, setSelectedFunction] = useState<TokenFunction>("onboarding");
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCompany && companies?.length) {
      setSelectedCompany(companies[0].cnpj);
    }
  }, [companies, selectedCompany]);

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createOnboardingToken>[0]) => createOnboardingToken(payload),
    onSuccess(newToken) {
      queryClient.setQueryData<OnboardingToken[]>(["onboarding-tokens"], (current = []) => [newToken, ...current]);
      setFeedback(`Token ${newToken.token} criado!`);
    }
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => toggleOnboardingTokenStatus(id, ativo),
    onSuccess(updated) {
      if (!updated) return;
      queryClient.setQueryData<OnboardingToken[]>(["onboarding-tokens"], (current = []) =>
        current.map((token) => (token.id === updated.id ? updated : token))
      );
      setFeedback(`Token ${updated.token} ${updated.ativo ? "ativado" : "desativado"}.`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOnboardingToken(id),
    onSuccess(payload) {
      queryClient.setQueryData<OnboardingToken[]>(["onboarding-tokens"], (current = []) =>
        current.filter((token) => token.id !== payload.id)
      );
      setFeedback("Token removido.");
    }
  });

  const filteredTokens = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return tokens
      .filter((token) => {
        if (status !== "all") {
          const matchesStatus = status === "active" ? token.ativo : !token.ativo;
          if (!matchesStatus) return false;
        }
        if (functionFilter !== "all" && token.funcao !== functionFilter) {
          return false;
        }
        if (!normalizedSearch) return true;
        const target = `${token.token} ${token.empresa_nome ?? ""}`.toLowerCase();
        return target.includes(normalizedSearch);
      })
      .slice(0, 100);
  }, [tokens, search, status, functionFilter]);

  const stats = useMemo(() => {
    const total = tokens.length;
    const active = tokens.filter((token) => token.ativo).length;
    const onboard = tokens.filter((token) => token.funcao === "onboarding").length;
    const admin = tokens.filter((token) => token.funcao === "admin").length;
    return { total, active, onboard, admin };
  }, [tokens]);

  const handleCopy = async (token: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(token);
      setFeedback(`Token ${token} copiado`);
    }
  };

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createMutation.mutate({
      empresa_id: selectedCompany,
      funcao: selectedFunction,
      criado_por: "Codex"
    });
    setDialogOpen(false);
  };

  const toggleHandler = (token: OnboardingToken) => {
    toggleMutation.mutate({ id: token.id, ativo: !token.ativo });
  };

  const deleteHandler = (token: OnboardingToken) => {
    if (window.confirm(`Remover o token ${token.token}?`)) {
      deleteMutation.mutate(token.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-[#0f0f16]/70 p-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Gerenciador de tokens
            </p>
            <h1 className="text-2xl font-semibold text-foreground">Vault de onboarding</h1>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Controle os tokens que abastecem o onboarding de clientes e administradores do Oráculo.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" size="lg">
                  + Novo token
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar token</DialogTitle>
                  <DialogDescription>
                    Selecione empresa e função. O token será gerado com 5 caracteres e ativado por padrão.
                  </DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleCreate}>
                  <div className="space-y-1 text-[11px]">
                    <label className="text-xs font-semibold text-muted-foreground">Empresa</label>
                    <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                      <SelectTrigger className="w-full text-[12px]">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.cnpj} value={company.cnpj}>
                            {company.nome ?? company.nomeFantasia ?? company.razaoSocial ?? company.cnpj}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <label className="text-xs font-semibold text-muted-foreground">Função</label>
                    <Select value={selectedFunction} onValueChange={(value) => setSelectedFunction(value as TokenFunction)}>
                      <SelectTrigger className="w-full text-[12px]">
                        <SelectValue placeholder="Função" />
                      </SelectTrigger>
                      <SelectContent>
                        {FUNCTION_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter className="pt-2">
                    <Button variant="secondary" size="sm" onClick={() => setDialogOpen(false)} type="button">
                      Cancelar
                    </Button>
                    <Button type="submit" size="sm" disabled={createMutation.isLoading}>
                      {createMutation.isLoading ? "Gerando..." : "Salvar token"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            {feedback && <span className="text-[11px] text-muted-foreground">{feedback}</span>}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="rounded-lg border border-border/60 bg-[#11111a]/70">
            <CardHeader className="flex items-center justify-between gap-2 border-none p-3">
              <CardTitle className="text-[11px] text-muted-foreground">Tokens totais</CardTitle>
              <span className="text-xs text-muted-foreground">Auditável</span>
            </CardHeader>
            <CardContent className="p-3 text-2xl font-semibold text-foreground">{stats.total}</CardContent>
          </Card>
          <Card className="rounded-lg border border-border/60 bg-[#11111a]/70">
            <CardHeader className="flex items-center justify-between gap-2 border-none p-3">
              <CardTitle className="text-[11px] text-muted-foreground">Ativos</CardTitle>
              <span className="text-xs text-success-foreground">Real-time</span>
            </CardHeader>
            <CardContent className="p-3 text-2xl font-semibold text-foreground">{stats.active}</CardContent>
          </Card>
          <Card className="rounded-lg border border-border/60 bg-[#11111a]/70">
            <CardHeader className="flex items-center justify-between gap-2 border-none p-3">
              <CardTitle className="text-[11px] text-muted-foreground">Funções</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-3 text-[12px] text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Onboarding</span>
                <span className="font-semibold text-foreground">{stats.onboard}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Admin</span>
                <span className="font-semibold text-foreground">{stats.admin}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-border/60 bg-[#0f0f16]/80">
        <CardHeader className="flex flex-col gap-3 border-none p-4 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-sm">Tokens ativos e auditoria</CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Use a busca ou os filtros para localizar tokens rapidamente.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Input
              placeholder="Buscar token ou empresa"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-56"
            />
            <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
              <SelectTrigger className="w-44 text-[12px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={functionFilter} onValueChange={(value) => setFunctionFilter(value as TokenFunction | "all")}> 
              <SelectTrigger className="w-40 text-[12px]">
                <SelectValue placeholder="Função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {FUNCTION_OPTIONS.map((option) => (
                  <SelectItem key={`${option.value}-filter`} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-[#0d0d15] text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr className="[&>th]:px-3 [&>th]:py-2">
                  <th>TOKEN</th>
                  <th>EMPRESA</th>
                  <th>FUNÇÃO</th>
                  <th>STATUS</th>
                  <th>CRIADO EM</th>
                  <th>ÚLTIMO USO</th>
                  <th className="text-right">AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {filteredTokens.map((token) => (
                  <tr
                    key={token.id}
                    className="border-t border-border/50 text-foreground transition-colors hover:bg-secondary/30 [&>td]:px-3 [&>td]:py-2"
                  >
                    <td className="font-mono text-sm text-foreground">{token.token}</td>
                    <td className="font-medium">{token.empresa_nome ?? "—"}</td>
                    <td>
                      <Badge variant={token.funcao === "admin" ? "destructive" : "outline"}>
                        {token.funcao}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={statusBadge(token.ativo)}>
                        {token.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td>{formatDate(token.criado_em)}</td>
                    <td>{formatDate(token.ultimo_uso)}</td>
                    <td className="flex items-center justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleHandler(token)}
                        disabled={toggleMutation.isLoading}
                      >
                        {token.ativo ? "Desativar" : "Ativar"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleCopy(token.token)}>
                        Copiar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteHandler(token)}
                        disabled={deleteMutation.isLoading}
                      >
                        Remover
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredTokens.length === 0 && (
            <div className="flex items-center justify-center p-8 text-[11px] text-muted-foreground">
              {isLoading ? "Carregando tokens..." : "Nenhum token encontrado"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
