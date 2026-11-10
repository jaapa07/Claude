import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { Providers, themeScript } from "@/components/providers";
import { SiteHeader } from "@/components/layout/site-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { TimerTray } from "@/components/recipe/timer-tray";
import { getCurrentUser } from "@/lib/auth/session";
import { appUrl } from "@/lib/utils";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: { default: "Receita Viral — receitas virais, populares e do mundo todo", template: "%s · Receita Viral" },
  description:
    "Descubra receitas que bombam nas redes, pratos brasileiros e internacionais, busque pelo que tem na geladeira, planeje a semana e gere listas de compras.",
  applicationName: "Receita Viral",
  keywords: ["receitas", "receitas virais", "receitas fáceis", "air fryer", "cardápio semanal", "lista de compras"],
  openGraph: { type: "website", locale: "pt_BR", siteName: "Receita Viral" },
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, title: "Receita Viral", statusBarStyle: "default" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#fffaf3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const sessionUser = user ? { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl } : null;
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${jakarta.variable} ${fraunces.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
          Pular para o conteúdo
        </a>
        <Providers user={sessionUser}>
          <SiteHeader />
          <main id="conteudo" className="pb-24 lg:pb-0">{children}</main>
          <SiteFooter />
          <BottomNav />
          <TimerTray />
        </Providers>
      </body>
    </html>
  );
}
