"use client"

import { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { AuthGuard } from "@/components/auth-guard";
import { useTrackUsage } from "@/hooks/use-track-usage";

export default function ApplicationLayout({ children }: { children: ReactNode }) {
  // Track usage do sistema
  useTrackUsage();

  return (
    <AuthGuard>
      <div className="app-shell">
        <Sidebar />
        <div className="shell-content">
          <Topbar />
          <main className="flex-1 overflow-y-auto px-6 pb-12 pt-4">
            <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6">{children}</div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
