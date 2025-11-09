"use client";

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
  const role = useUserStore((state) => state.role);

  return (
    <aside className="hidden min-h-screen w-64 flex-col border-r border-border/70 bg-[#13131b]/95 px-3 py-6 text-xs lg:flex">
      <div className="mb-8 flex items-center gap-2 px-3">
        <div className="relative h-9 w-[150px]">
          <Image
            src="/logo-ifinance.svg"
            alt="iFinance"
            fill
            priority
            sizes="150px"
            className="object-contain"
          />
        </div>
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
              <p className="px-3 text-[10px] uppercase tracking-widest text-muted-foreground">{section.title}</p>
              <div className="flex flex-col gap-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-xs transition-all",
                        active
                          ? "bg-primary/10 text-primary border border-primary/30"
                          : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
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
      <div className="mt-auto rounded-md border border-border/60 bg-secondary/30 px-3 py-3 text-[11px] text-muted-foreground">
        <p className="font-medium text-foreground">Automação das 8 às 17h</p>
        <p>Envios inteligentes no WhatsApp com insights do Oráculo.</p>
      </div>
    </aside>
  );
}
