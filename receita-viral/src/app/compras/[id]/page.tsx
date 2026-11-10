import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { ShoppingListView } from "./list-view";

export const metadata: Metadata = { title: "Lista de compras" };
export const dynamic = "force-dynamic";

export default async function ShoppingListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?next=/compras/${id}`);
  const list = await prisma.shoppingList.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      name: true,
      items: {
        orderBy: [{ group: "asc" }, { name: "asc" }],
        select: { id: true, name: true, quantity: true, unit: true, group: true, checked: true, recipeTitle: true },
      },
    },
  });
  if (!list) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <ShoppingListView list={list} />
    </div>
  );
}
