"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  FileBarChart,
  FileSpreadsheet,
  Home,
  MessageSquare,
  Settings2,
  ShieldCheck,
  Users2,
  Workflow
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/use-user-store";

type NavRole = "admin" | "executivo_conta" | "franqueado" | "cliente" | "viewer";

const navSections: Array<{
  title: string;
  allow?: NavRole[];
  items: Array<{
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    allow?: NavRole[];
  }>;
}> = [
  {
    title: "Principal",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Home },
      { href: "/analises", label: "Análises IA", icon: Activity },
      { href: "/relatorios/dre", label: "DRE", icon: FileSpreadsheet },
      { href: "/relatorios/cashflow", label: "Fluxo de Caixa", icon: BarChart3 },
      { href: "/relatorios/kpis", label: "KPIs Financeiros", icon: FileBarChart }
    ]
  },
  {
    title: "Empresas",
    allow: ["admin", "executivo_conta", "franqueado"],
    items: [
      { href: "/empresas", label: "Lista de Empresas", icon: Building2 },
      { href: "/grupos", label: "Grupos", icon: Workflow },
      { href: "/clientes", label: "Clientes", icon: Users2 }
    ]
  },
  {
    title: "Administração",
    allow: ["admin"],
    items: [
      { href: "/admin/users", label: "Usuários", icon: ShieldCheck },
      { href: "/admin/api-keys", label: "API Keys", icon: ClipboardList },
      { href: "/admin/llm-config", label: "LLM Config", icon: MessageSquare },
      { href: "/admin/llm-usage", label: "Custos LLM", icon: FileBarChart },
      { href: "/admin/franchises", label: "Franquias", icon: Building2 }
    ]
  },
  {
    title: "WhatsApp",
    allow: ["admin", "executivo_conta"],
    items: [
      { href: "/whatsapp/conversations", label: "Conversas", icon: MessageSquare },
      { href: "/whatsapp/scheduled", label: "Agendadas", icon: Bell },
      { href: "/whatsapp/templates", label: "Templates", icon: ClipboardList },
      { href: "/whatsapp/config", label: "Configurações", icon: Settings2 }
    ]
  },
  {
    title: "Monitoramento",
    items: [
      { href: "/audit", label: "Audit", icon: Activity },
      { href: "/relatorios/payables", label: "Contas a Pagar", icon: FileSpreadsheet },
      { href: "/relatorios/receivables", label: "Contas a Receber", icon: FileSpreadsheet }
    ]
  },
  {
    title: "Perfil",
    items: [
      { href: "/profile", label: "Meu Perfil", icon: Users2 },
      { href: "/profile/notifications", label: "Notificações", icon: Bell },
      { href: "/config", label: "Automations n8n", icon: Settings2 }
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const role = useUserStore((state) => state.role ?? "viewer");
  const [logoError, setLogoError] = useState(false);

  return (
    <aside className="shell-sidebar text-xs">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="relative h-10 w-[160px]">
          {logoError ? (
            <span className="text-lg font-bold text-primary">iFinance</span>
          ) : (
            <Image
              src="/logo-ifinance.svg"
              alt="iFinance"
              fill
              priority
              sizes="160px"
              className="object-contain drop-shadow-soft"
              onError={() => setLogoError(true)}
            />
          )}
        </div>
        <span className="rounded-full bg-primary/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
          Oráculo
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto pr-1">
        {navSections.map((section) => {
          if (section.allow && !section.allow.includes(role)) {
            return null;
          }

          const visibleItems = section.items.filter((item) => !item.allow || item.allow.includes(role));
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="flex flex-col gap-2">
              <p className="section-title px-3">{section.title}</p>
              <div className="flex flex-col gap-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-xs transition-all",
                        active
                          ? "bg-primary/15 text-primary shadow-neon"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="mt-auto glass-panel-muted text-[11px]">
        <p className="font-medium text-foreground">Modo Inteligência</p>
        <p className="text-muted-foreground">Envios automatizados + alertas IA direto no WhatsApp.</p>
      </div>
    </aside>
  );
}
