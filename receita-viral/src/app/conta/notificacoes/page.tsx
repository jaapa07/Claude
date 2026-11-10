import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { NotificationsList } from "./notifications-list";

export const metadata: Metadata = { title: "Notificações" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?next=/conta/notificacoes");
  const items = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/conta" className="hover:text-primary">Minha conta</Link> / <span className="text-foreground">Notificações</span>
      </nav>
      <NotificationsList
        items={items.map((n) => ({ id: n.id, title: n.title, body: n.body, link: n.link, read: n.read, createdAt: n.createdAt.toISOString() }))}
      />
    </div>
  );
}
