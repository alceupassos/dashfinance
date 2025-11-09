import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "IFinance Oráculo | Acesso",
  description: "Área de autenticação do Oráculo Financeiro."
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-oraculo-gradient px-4">
      <div className="w-full max-w-md rounded-lg border border-border/60 bg-[#11111a]/90 p-6 shadow-xl">
        {children}
      </div>
    </div>
  );
}
