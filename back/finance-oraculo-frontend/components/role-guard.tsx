"use client";

import { ReactNode } from "react";
import { useUserStore, UserRole } from "@/store/use-user-store";

interface RoleGuardProps {
  allow: UserRole[] | UserRole;
  fallback?: ReactNode;
  children: ReactNode;
}

export function RoleGuard({ allow, fallback = null, children }: RoleGuardProps) {
  const role = useUserStore((state) => state.role);
  const list = Array.isArray(allow) ? allow : [allow];
  if (!list.includes(role)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
