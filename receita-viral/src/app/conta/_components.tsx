"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { api, errorMessage } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/states";

/** Botão que limpa o histórico de receitas vistas. */
export function ClearHistoryButton() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const clear = async () => {
    if (!confirm("Limpar todo o histórico de receitas vistas?")) return;
    setBusy(true);
    try {
      await api("/api/me/history", { method: "DELETE" });
      toast.success("Histórico limpo");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button variant="ghost" size="sm" onClick={clear} disabled={busy}>
      {busy ? <Spinner /> : <Trash2 />} Limpar histórico
    </Button>
  );
}

export function SectionHeader({ title, href, linkLabel = "Ver tudo", children }: { title: string; href?: string; linkLabel?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <div className="flex items-center gap-2">
        {children}
        {href && (
          <Link href={href} className="text-sm font-semibold text-primary hover:underline">
            {linkLabel} →
          </Link>
        )}
      </div>
    </div>
  );
}
