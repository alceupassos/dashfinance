import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { cn } from "@/lib/utils";
import { AiOracleButton } from "@/components/ai-oracle-button";
import { AiOraclePanel } from "@/components/ai-oracle-panel";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ifin.app.br"),
  title: "IFinance Oráculo | Painel Financeiro Inteligente",
  description:
    "Frontend do Oráculo IFinance: dashboards densos, análises automáticas e integrações com o backend financeiro.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/icon.svg"
  },
  openGraph: {
    title: "IFinance Oráculo",
    description: "Nano Banana Insights para o seu BPO Financeiro.",
    url: "https://www.ifin.app.br",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Nano Banana Insights - IFinance Oráculo"
      }
    ]
  }
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  colorScheme: "dark"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={cn("bg-oraculo-gradient min-h-screen text-foreground antialiased font-sans")}>
        <Providers>
          {children}
          <AiOraclePanel />
          <AiOracleButton />
        </Providers>
      </body>
    </html>
  );
}
