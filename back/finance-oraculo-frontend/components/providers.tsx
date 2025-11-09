"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { PropsWithChildren, useEffect, useState } from "react";
import { useUserStore } from "@/store/use-user-store";

export function Providers({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <SessionInitializer />
        {children}
        <ReactQueryDevtools />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function SessionInitializer() {
  const initialize = useUserStore((state) => state.initialize);

  useEffect(() => {
    initialize().catch((error) => {
      console.error("[session] falha ao iniciar sessão", error);
    });
  }, [initialize]);

  return null;
}
