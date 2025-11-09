import { useQuery } from "@tanstack/react-query";
import { DashboardCardsResponse, getDashboardCards } from "@/lib/api";

type TargetParam = { type: "alias" | "cnpj"; value: string };

export function useDashboardCards(target: TargetParam) {
  return useQuery<DashboardCardsResponse>({
    queryKey: ["dashboard-cards", target.type, target.value],
    queryFn: () => getDashboardCards(target),
    staleTime: 60_000,
  });
}
