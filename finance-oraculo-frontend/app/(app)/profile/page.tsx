"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserStore } from "@/store/use-user-store";

export default function ProfilePage() {
  const { profile, status, refreshProfile } = useUserStore((state) => ({
    profile: state.profile,
    status: state.status,
    refreshProfile: state.refreshProfile
  }));

  const loading = status === "loading" && !profile;

  const availableCompanies = useMemo(() => profile?.availableCompanies ?? [], [profile]);

  return (
    <Card className="border-border/60 bg-[#11111a]/80">
      <CardHeader className="border-none p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-sm">Meu Perfil</CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Informações pessoais, permissões e empresas vinculadas.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refreshProfile()} disabled={loading}>
            Atualizar dados
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 text-xs">
        {loading && <p className="text-muted-foreground">Carregando informações do perfil...</p>}
        {!loading && profile && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoField label="Nome completo" value={profile.name} />
              <InfoField label="Email" value={profile.email} />
              <InfoField label="Role" value={profile.role.replace("_", " ")} />
              <InfoField label="Empresa padrão" value={profile.defaultCompanyCnpj ?? "Não definida"} />
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={profile.twoFactorEnabled ? "success" : "warning"}>
                {profile.twoFactorEnabled ? "2FA Ativo" : "2FA Desativado"}
              </Badge>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-medium text-muted-foreground">Empresas disponíveis</p>
              {availableCompanies.length === 0 ? (
                <p className="text-muted-foreground">Nenhuma empresa vinculada à sua conta.</p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {availableCompanies.map((cnpj) => (
                    <li
                      key={cnpj}
                      className="rounded-md border border-border/50 bg-secondary/20 px-3 py-2 text-[11px] text-foreground"
                    >
                      {cnpj}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
        {!loading && !profile && (
          <p className="text-muted-foreground">
            Nenhuma sessão ativa. Realize o login novamente para visualizar suas informações.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
      <p className="rounded-md border border-border/40 bg-secondary/20 px-3 py-2 text-foreground">{value}</p>
    </div>
  );
}
