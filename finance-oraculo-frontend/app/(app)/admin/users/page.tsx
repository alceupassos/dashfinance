"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAdminUser, deleteAdminUser, getAdminUsers, getTargets, updateAdminUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoleGuard } from "@/components/role-guard";
import { useUserStore } from "@/store/use-user-store";
import { Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  executivo_conta: "Executivo",
  franqueado: "Franqueado",
  cliente: "Cliente",
  cliente_multi: "Cliente (multi)",
  viewer: "Viewer"
};

interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at?: string;
  last_login_at?: string | null;
  company_cnpj?: string | null;
  available_companies: string[];
  default_company_cnpj?: string | null;
  has_full_access?: boolean;
}

interface CompanyOption {
  value: string;
  label: string;
}

export default function AdminUsersPage() {
  return (
    <RoleGuard allow="admin">
      <UsersContent />
    </RoleGuard>
  );
}

function UsersContent() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => getAdminUsers({ limit: 200 })
  });
  const targetsQuery = useQuery({
    queryKey: ["targets"],
    queryFn: getTargets,
    staleTime: 1000 * 60 * 5
  });
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { availableCompanies, hasFullAccess } = useUserStore();

  const users = useMemo<AdminUserRecord[]>(() => {
    if (!Array.isArray(data)) return [];
    return data.map((user: any) => {
      const available = Array.isArray(user.available_companies) ? user.available_companies : [];
      const derivedFullAccess =
        user.has_full_access ??
        (available.includes("*") || user.role === "admin" || user.role === "executivo_conta");
      return {
        ...user,
        available_companies: derivedFullAccess ? ["*"] : available,
        default_company_cnpj: user.default_company_cnpj ?? user.company_cnpj ?? null,
        has_full_access: derivedFullAccess
      };
    });
  }, [data]);

  const companyOptions = useMemo<CompanyOption[]>(() => {
    if (targetsQuery.data?.cnpjs?.length) {
      return targetsQuery.data.cnpjs.map((company: any) => ({
        value: company.value ?? company.id,
        label: company.label
      }));
    }

    if (hasFullAccess && availableCompanies.includes("*")) {
      return [];
    }

    return availableCompanies.map((cnpj) => ({
      value: cnpj,
      label: cnpj
    }));
  }, [targetsQuery.data, availableCompanies, hasFullAccess]);

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteAdminUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] })
  });

  const filtered = useMemo(() => {
    if (!users.length) return [];
    return users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus = statusFilter === "all" || user.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const openCreate = () => {
    setSelectedUser(null);
    setDialogOpen(true);
  };

  const openEdit = (user: any) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedUser(null);
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="flex flex-col gap-2 border-none p-4 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-sm">Gestão de usuários</CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Controle de acesso por role, status e empresas vinculadas.
            </p>
          </div>
          <Button size="sm" onClick={openCreate}>
            Criar novo usuário
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {isLoading && <p className="text-xs text-muted-foreground">Carregando usuários...</p>}
          {error && (
            <p className="text-xs text-destructive">
              Não foi possível carregar a lista de usuários. Tente novamente mais tarde.
            </p>
          )}
          <div className="flex flex-wrap gap-2 text-xs">
            <Input
              placeholder="Buscar por nome ou email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-56"
            />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="executivo_conta">Executivo</SelectItem>
                <SelectItem value="franqueado">Franqueado</SelectItem>
                <SelectItem value="cliente">Cliente</SelectItem>
                <SelectItem value="cliente_multi">Cliente (multi)</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="suspended">Suspenso</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-hidden rounded-md border border-border/60">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-[#0d0d15] text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr className="[&>th]:px-3 [&>th]:py-2">
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Empresa</th>
                  <th>Criado em</th>
                  <th>Último login</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => {
                  const createdAt = user.created_at;
                  const lastLogin = user.last_login_at;
                  const companyLabel = user.has_full_access
                    ? "Todas as empresas"
                    : user.available_companies?.length
                    ? user.available_companies.join(", ")
                    : user.company_cnpj ?? "--";

                  return (
                    <tr
                      key={user.id}
                      className="border-t border-border/60 text-foreground transition-colors hover:bg-secondary/30 [&>td]:px-3 [&>td]:py-2"
                    >
                      <td className="font-medium">{user.name}</td>
                      <td className="text-muted-foreground">{user.email}</td>
                      <td>
                        <Badge variant="outline">{roleLabels[user.role] ?? user.role}</Badge>
                      </td>
                      <td>
                        <Badge
                          variant={
                            user.status === "active" ? "success" : user.status === "suspended" ? "warning" : "outline"
                          }
                        >
                          {user.status}
                        </Badge>
                      </td>
                      <td className="max-w-[200px] truncate">{companyLabel}</td>
                      <td>{createdAt ? new Date(createdAt).toLocaleDateString("pt-BR") : "--"}</td>
                      <td>{lastLogin ? new Date(lastLogin).toLocaleString("pt-BR") : "--"}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(user)}>
                            Editar
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(user.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <UserModal
          initialUser={selectedUser}
          companyOptions={companyOptions}
          onCompleted={() => queryClient.invalidateQueries({ queryKey: ["admin-users"] })}
          onClose={closeDialog}
        />
      </Dialog>
    </div>
  );
}

interface UserModalProps {
  initialUser: AdminUserRecord | null;
  companyOptions: CompanyOption[];
  onCompleted: () => void;
  onClose: () => void;
}

function UserModal({ initialUser, companyOptions, onCompleted, onClose }: UserModalProps) {
  const isNew = !initialUser;

  const [name, setName] = useState(initialUser?.name ?? "");
  const [email, setEmail] = useState(initialUser?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>(initialUser?.role ?? "viewer");
  const [status, setStatus] = useState<string>(initialUser?.status ?? "active");
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(
    initialUser?.has_full_access ? [] : initialUser?.available_companies ?? []
  );
  const [hasFullAccess, setHasFullAccess] = useState<boolean>(
    initialUser?.has_full_access ?? (initialUser?.role === "admin" || initialUser?.role === "executivo_conta") ?? false
  );
  const [defaultCompany, setDefaultCompany] = useState<string>(
    initialUser?.default_company_cnpj ??
      initialUser?.company_cnpj ??
      initialUser?.available_companies?.[0] ??
      companyOptions[0]?.value ??
      ""
  );
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const initialRole = initialUser?.role ?? "viewer";
    const nextCompanies = initialUser?.has_full_access ? [] : initialUser?.available_companies ?? [];
    setName(initialUser?.name ?? "");
    setEmail(initialUser?.email ?? "");
    setPassword("");
    setRole(initialRole);
    setStatus(initialUser?.status ?? "active");
    setSelectedCompanies(nextCompanies);
    setHasFullAccess(
      initialUser?.has_full_access ?? (initialRole === "admin" || initialRole === "executivo_conta")
    );
    setDefaultCompany(
      initialUser?.default_company_cnpj ??
        initialUser?.company_cnpj ??
        nextCompanies[0] ??
        companyOptions[0]?.value ??
        ""
    );
  }, [initialUser, companyOptions]);

  useEffect(() => {
    if (role === "admin" || role === "executivo_conta") {
      setHasFullAccess(true);
    }
  }, [role]);

  useEffect(() => {
    if ((role === "cliente" || role === "cliente_multi") && !hasFullAccess) {
      if (selectedCompanies.length === 0 && companyOptions.length > 0) {
        setSelectedCompanies([companyOptions[0].value]);
        setDefaultCompany(companyOptions[0].value);
      } else if (!selectedCompanies.includes(defaultCompany)) {
        setDefaultCompany(selectedCompanies[0] ?? "");
      }
    }
  }, [role, hasFullAccess, selectedCompanies, companyOptions, defaultCompany]);

  const mutation = useMutation({
    mutationFn: async () => {
      const restrictedRole = role === "cliente" || role === "cliente_multi";
      const normalizedCompanies = hasFullAccess ? [] : Array.from(new Set(selectedCompanies));

      if (restrictedRole && !hasFullAccess && normalizedCompanies.length === 0) {
        setFormError("Selecione ao menos uma empresa para este usuário.");
        throw new Error("missing-companies");
      }

      const payload = {
        email,
        name,
        role,
        status,
        password: isNew ? password || undefined : undefined,
        default_company_cnpj: hasFullAccess
          ? defaultCompany || null
          : defaultCompany || normalizedCompanies[0] || null,
        available_companies: normalizedCompanies,
        full_access: hasFullAccess
      };

      if (isNew) {
        await createAdminUser(payload);
      } else if (initialUser) {
        await updateAdminUser(initialUser.id, payload);
      }
    },
    onSuccess: async () => {
      setFormError(null);
      onCompleted();
      onClose();
    }
  });

  const toggleCompany = (cnpj: string) => {
    if (hasFullAccess) return;
    if (role === "cliente") {
      setSelectedCompanies([cnpj]);
      setDefaultCompany(cnpj);
      return;
    }

    setSelectedCompanies((prev) =>
      prev.includes(cnpj) ? prev.filter((item) => item !== cnpj) : [...prev, cnpj]
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await mutation.mutateAsync();
    } catch (submitError) {
      if ((submitError as Error).message !== "missing-companies") {
        setFormError("Não foi possível salvar o usuário.");
      }
    }
  };

  const effectiveDefaultOptions = hasFullAccess
    ? companyOptions
    : companyOptions.filter((option) => selectedCompanies.includes(option.value));

  const showCompanySelection = !hasFullAccess && (role === "cliente" || role === "cliente_multi" || companyOptions.length > 0);

  return (
    <DialogContent className="max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{isNew ? "Novo usuário" : "Editar usuário"}</DialogTitle>
        <DialogDescription className="text-[11px]">
          Controle de acesso ao Oráculo.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-muted-foreground">Nome completo</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-muted-foreground">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={!isNew}
            />
          </div>
          {isNew && (
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground">Senha provisória</Label>
              <Input
                type="password"
                placeholder="Mínimo 8 caracteres"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-muted-foreground">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="executivo_conta">Executivo de Conta</SelectItem>
                <SelectItem value="franqueado">Franqueado</SelectItem>
                <SelectItem value="cliente">Cliente</SelectItem>
                <SelectItem value="cliente_multi">Cliente (multi)</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-muted-foreground">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="suspended">Suspenso</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-full flex items-center justify-between rounded-md border border-border/60 bg-secondary/10 px-3 py-2">
            <div>
              <Label className="text-[11px] font-medium text-muted-foreground">Acesso completo</Label>
              <p className="text-[10px] text-muted-foreground">
                Permite acessar todas as empresas e funcionalidades.
              </p>
            </div>
            <Switch
              checked={hasFullAccess}
              onCheckedChange={(checked) => setHasFullAccess(checked)}
              disabled={role === "admin" || role === "executivo_conta"}
            />
          </div>
        </div>

        {showCompanySelection && (
          <div className="space-y-2 rounded-md border border-border/60 bg-secondary/10 p-3">
            <Label className="text-[11px] font-medium text-muted-foreground">
              Empresas permitidas
            </Label>
            <div className="flex flex-col gap-2">
              {companyOptions.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Lista de empresas indisponível no momento.
                </p>
              )}
              {companyOptions.map((company) => {
                const checked = selectedCompanies.includes(company.value);
                return (
                  <label key={company.value} className="flex items-center gap-2 text-[11px]">
                    <input
                      type={role === "cliente" ? "radio" : "checkbox"}
                      name={role === "cliente" ? "single-company" : "multi-company"}
                      value={company.value}
                      checked={role === "cliente" ? checked : checked}
                      onChange={() => toggleCompany(company.value)}
                      disabled={hasFullAccess}
                    />
                    <span>{company.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">
            Empresa padrão (dashboard)
          </Label>
          <Select
            value={defaultCompany}
            onValueChange={setDefaultCompany}
            disabled={(!hasFullAccess && effectiveDefaultOptions.length === 0) || (role === "cliente" && selectedCompanies.length === 0)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a empresa padrão" />
            </SelectTrigger>
            <SelectContent>
              {(hasFullAccess ? companyOptions : effectiveDefaultOptions).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formError && (
          <p className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-destructive">
            {formError}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
