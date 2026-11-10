import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { ListsManager } from "./lists-manager";

export const metadata: Metadata = { title: "Listas de compras" };
export const dynamic = "force-dynamic";

export default async function ShoppingListsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?next=/compras");
  const lists = await prisma.shoppingList.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, updatedAt: true, items: { select: { checked: true } } },
  });
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <ListsManager
        lists={lists.map((l) => ({
          id: l.id,
          name: l.name,
          updatedAt: l.updatedAt.toISOString(),
          itemCount: l.items.length,
          checkedCount: l.items.filter((i) => i.checked).length,
        }))}
      />
    </div>
  );
}
