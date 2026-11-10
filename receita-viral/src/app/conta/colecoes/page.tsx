import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { CollectionsManager } from "./_components";

export const metadata: Metadata = { title: "Coleções" };
export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?next=/conta/colecoes");
  const rows = await prisma.collection.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      _count: { select: { items: true } },
      items: { orderBy: { addedAt: "desc" }, take: 4, select: { recipe: { select: { id: true, title: true, imageUrl: true, emoji: true } } } },
    },
  });
  const collections = rows.map((c) => ({ id: c.id, name: c.name, description: c.description, count: c._count.items, covers: c.items.map((i) => i.recipe) }));
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/conta" className="hover:text-primary">Minha conta</Link> / <span className="text-foreground">Coleções</span>
      </nav>
      <CollectionsManager collections={collections} />
    </div>
  );
}
