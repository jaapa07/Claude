import type { Metadata } from "next";
import { aiConfigured } from "@/lib/chef";
import { ChefChat } from "./chef-chat";

export const metadata: Metadata = {
  title: "Chef IA",
  description: "Assistente gastronômico: diga o que tem em casa, peça receitas fáceis, jantares especiais, cardápios semanais e adaptações de porções.",
};
export const dynamic = "force-dynamic";

export default async function ChefPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return <ChefChat aiEnabled={aiConfigured()} initialQuestion={q?.slice(0, 500)} />;
}
