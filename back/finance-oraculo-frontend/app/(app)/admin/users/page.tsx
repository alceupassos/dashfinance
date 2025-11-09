"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAdminUser, deleteAdminUser, getAdminUsers, updateAdminUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoleGuard } from "@/components/role-guard";
import { useUserStore } from "@/store/use-user-store";
import { Trash2 } from "lucide-react";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  executivo_conta: "Executivo",
  franqueado: "Franqueado",
  cliente: "Cliente",
  viewer: "Viewer"
};

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
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { availableCompanies } = useUserStore();

  const users = useMemo(() => (Array.isArray(data) ? data : []), [data]);

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
                  const createdAt = user.created_at ?? user.createdAt;
                  const lastLogin = user.last_login_at ?? user.lastLogin;
                  const company = user.company ?? user.company_cnpj ?? "--";

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
                      <td>{company}</td>
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
          companies={availableCompanies}
          onCompleted={() => queryClient.invalidateQueries({ queryKey: ["admin-users"] })}
          onClose={closeDialog}
        />
      </Dialog>
    </div>
  );
}

interface UserModalProps {
  initialUser: any | null;
  companies: string[];
  onCompleted: () => void;
  onClose: () => void;
}

function UserModal({ initialUser, companies, onCompleted, onClose }: UserModalProps) {
  const isNew = !initialUser;

  const [name, setName] = useState(initialUser?.name ?? "");
  const [email, setEmail] = useState(initialUser?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>(initialUser?.role ?? "viewer");
  const [status, setStatus] = useState<string>(initialUser?.status ?? "active");
  const [company, setCompany] = useState<string>(
    initialUser?.company ?? companies[0] ?? ""
  );

  useEffect(() => {
    setName(initialUser?.name ?? "");
    setEmail(initialUser?.email ?? "");
    setPassword("");
    setRole(initialUser?.role ?? "viewer");
    setStatus(initialUser?.status ?? "active");
    setCompany(initialUser?.company ?? companies[0] ?? "");
  }, [initialUser, companies]);

  useEffect(() => {
    if (role === "cliente" && !company && companies.length) {
      setCompany(companies[0]);
    }
  }, [role, companies, company]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (isNew) {
        await createAdminUser({
          email,
          name,
          role,
          password: password || undefined
        });
      } else {
        await updateAdminUser(initialUser.id, {
          name,
          role,
          status,
          company
        });
      }
    },
    onSuccess: async () => {
      onCompleted();
      onClose();
    }
  });

  const isCliente = role === "cliente";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await mutation.mutateAsync();
  }

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
            <label className="text-[11px] font-medium text-muted-foreground">Nome completo</label>
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Email</label>
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
              <label className="text-[11px] font-medium text-muted-foreground">Senha provisória</label>
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
            <label className="text-[11px] font-medium text-muted-foreground">Role</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="executivo_conta">Executivo de Conta</SelectItem>
                <SelectItem value="franqueado">Franqueado</SelectItem>
                <SelectItem value="cliente">Cliente</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Status</label>
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
        </div>

        {isCliente && (
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Empresa vinculada</label>
            <Select value={company} onValueChange={setCompany}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o CNPJ" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((cnpj) => (
                  <SelectItem key={cnpj} value={cnpj}>
                    {cnpj}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
