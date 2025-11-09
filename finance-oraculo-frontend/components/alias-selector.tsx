"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTargets } from "@/lib/api";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { useUserStore } from "@/store/use-user-store";

export function TargetSelector() {
  const { selectedTarget, setTarget } = useDashboardStore();
  const { role, availableCompanies } = useUserStore((state) => ({
    role: state.role,
    availableCompanies: state.availableCompanies
  }));
  const { data } = useQuery({
    queryKey: ["targets"],
    queryFn: getTargets,
    staleTime: 1000 * 60 * 5,
    retry: 1
  });

  const targets = data ?? { aliases: [], cnpjs: [] };

  const { aliasOptions, cnpjOptions } = useMemo(() => {
    const aliasList =
      targets.aliases?.map((alias) => {
        const membersCount = Array.isArray(alias.members)
          ? alias.members.length
          : typeof (alias as any).empresas === "number"
          ? (alias as any).empresas
          : 0;
        return {
          value: alias.id,
          label: `${alias.label} (${membersCount} empresas)`
        };
      }) ?? [];

    const companyList =
      targets.cnpjs
        ?.map((company) => ({
          value: (company as any).value ?? (company as any).id,
          label: company.label
        }))
        ?.filter((item) => (role === "cliente" ? availableCompanies.includes(item.value) : true)) ?? [];

    return {
      aliasOptions: aliasList,
      cnpjOptions: companyList
    };
  }, [targets, role, availableCompanies]);

  useEffect(() => {
    if (role === "cliente") {
      const first = cnpjOptions[0];
      if (first && (selectedTarget.type !== "cnpj" || selectedTarget.value !== first.value)) {
        setTarget({ type: "cnpj", value: first.value });
      }
      return;
    }

    const currentOptions = selectedTarget.type === "alias" ? aliasOptions : cnpjOptions;
    const hasCurrent = currentOptions.some((option) => option.value === selectedTarget.value);

    if (!hasCurrent) {
      if (selectedTarget.type === "alias" && aliasOptions.length > 0) {
        setTarget({ type: "alias", value: aliasOptions[0].value });
      } else if (cnpjOptions.length > 0) {
        setTarget({ type: "cnpj", value: cnpjOptions[0].value });
      }
    }
  }, [
    aliasOptions,
    cnpjOptions,
    role,
    selectedTarget.type,
    selectedTarget.value,
    setTarget
  ]);

  return (
    <div className="flex w-full min-w-[220px] flex-col gap-1">
      <Label>Alias / Empresa</Label>
      <div className="flex gap-2">
        <Select
          value={selectedTarget.type}
          disabled={role === "cliente"}
          onValueChange={(value) => {
            if (value === selectedTarget.type) return;
            if (value === "alias") {
              const first = aliasOptions[0];
              setTarget({ type: "alias", value: first?.value ?? "" });
            } else {
              const first = cnpjOptions[0];
              setTarget({ type: "cnpj", value: first?.value ?? "" });
            }
          }}
        >
          <SelectTrigger className="w-28">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alias">Alias</SelectItem>
            <SelectItem value="cnpj">CNPJ</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={selectedTarget.value}
          onValueChange={(value) => setTarget({ type: selectedTarget.type, value })}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Selecionar" />
          </SelectTrigger>
          <SelectContent>
            {(selectedTarget.type === "alias" ? aliasOptions : cnpjOptions).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
