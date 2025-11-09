"use client";

import { ReactNode, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useUserStore } from "@/store/use-user-store";

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { tokens, status } = useUserStore((state) => ({
    tokens: state.tokens,
    status: state.status
  }));

  const devBypass = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "1";

  useEffect(() => {
    if (devBypass) return;
    if ((status === "ready" || status === "error") && !tokens) {
      const redirect = pathname && pathname !== "/" ? pathname : "/dashboard";
      router.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
    }
  }, [status, tokens, router, pathname, devBypass]);

  if (devBypass) {
    return <>{children}</>;
  }

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-xs text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p>Validando sessão...</p>
        </div>
      </div>
    );
  }

  if (!tokens) {
    return null;
  }

  return <>{children}</>;
}
