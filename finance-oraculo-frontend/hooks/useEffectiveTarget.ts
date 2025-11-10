"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTargets, type TargetsResponse } from "@/lib/api";
import { useDashboardStore, type SelectedTarget } from "@/store/use-dashboard-store";

type AliasMembersMap = Map<string, string[]>;

function buildAliasMembersMap(targets?: TargetsResponse | null): AliasMembersMap {
  const map: AliasMembersMap = new Map();
  if (!targets?.aliases) return map;
  targets.aliases.forEach((alias) => {
    const rawMembers = Array.isArray(alias.members) ? alias.members : [];
    const normalizedMembers: string[] = [];

    rawMembers.forEach((member) => {
      if (typeof member === "string") {
        normalizedMembers.push(member);
        return;
      }
      if (member && typeof member === "object") {
        const candidate =
          (member as Record<string, unknown>).company_cnpj ??
          (member as Record<string, unknown>).cnpj ??
          (member as Record<string, unknown>).value ??
          (member as Record<string, unknown>).empresa_cnpj;
        if (typeof candidate === "string") {
          normalizedMembers.push(candidate);
        }
      }
    });

    map.set(alias.id, normalizedMembers);
  });
  return map;
}

export function useEffectiveTarget() {
  const { selectedTarget } = useDashboardStore();
  const targetsQuery = useQuery({
    queryKey: ["targets"],
    queryFn: getTargets,
    staleTime: 1000 * 60 * 5,
    retry: 1
  });

  const aliasMembers = useMemo(
    () => buildAliasMembersMap(targetsQuery.data),
    [targetsQuery.data]
  );

  const fallbackCnpj = useMemo(() => targetsQuery.data?.cnpjs?.[0]?.value ?? null, [targetsQuery.data]);

  const effectiveCnpj = useMemo(() => {
    if (selectedTarget.type === "cnpj") {
      return selectedTarget.value || fallbackCnpj;
    }

    const members = aliasMembers.get(selectedTarget.value);
    if (members && members.length > 0) return members[0];
    return fallbackCnpj;
  }, [aliasMembers, fallbackCnpj, selectedTarget]);

  return {
    targets: targetsQuery.data,
    isLoadingTargets: targetsQuery.isLoading,
    aliasMembers,
    fallbackCnpj,
    effectiveCnpj,
    selectedTarget
  };
}

export function buildTargetParams(selectedTarget: SelectedTarget) {
  return {
    type: selectedTarget.type,
    value: selectedTarget.value
  } as const;
}

