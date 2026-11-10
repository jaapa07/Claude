import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { PreferencesForm } from "./preferences-form";

export const metadata: Metadata = { title: "Preferências" };
export const dynamic = "force-dynamic";

export default async function PreferencesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?next=/conta/preferencias");
  const profile = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { name: true, email: true, bio: true, avatarUrl: true, dietaryPrefs: true, allergies: true, notifyNewRecipes: true },
  });
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/conta" className="hover:text-primary">Minha conta</Link> / <span className="text-foreground">Preferências</span>
      </nav>
      <h1 className="mb-6 font-display text-3xl font-bold sm:text-4xl">Preferências</h1>
      <PreferencesForm profile={profile} />
    </div>
  );
}
