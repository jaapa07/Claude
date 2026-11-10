"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/states";
import { api, errorMessage } from "@/lib/client";
import { ConfirmDialog } from "./confirm-dialog";

export function CommentActions({ id, status }: { id: string; status: "PENDING" | "VISIBLE" | "HIDDEN" }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState(false);

  async function setStatus(next: "VISIBLE" | "HIDDEN") {
    setBusy(next);
    try {
      await api(`/api/admin/comments/${id}`, { method: "PATCH", body: { status: next } });
      toast.success(next === "VISIBLE" ? "Comentário aprovado" : "Comentário ocultado");
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }
  async function remove() {
    try {
      await api(`/api/admin/comments/${id}`, { method: "DELETE" });
      toast.success("Comentário excluído");
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {status !== "VISIBLE" && (
        <Button size="sm" variant="accent" disabled={!!busy} onClick={() => setStatus("VISIBLE")}>
          {busy === "VISIBLE" ? <Spinner /> : <Check />} {status === "HIDDEN" ? "Mostrar" : "Aprovar"}
        </Button>
      )}
      {status !== "HIDDEN" && (
        <Button size="sm" variant="outline" disabled={!!busy} onClick={() => setStatus("HIDDEN")}>
          {busy === "HIDDEN" ? <Spinner /> : <EyeOff />} Ocultar
        </Button>
      )}
      <Button size="sm" variant="ghost" className="text-danger" disabled={!!busy} onClick={() => setConfirm(true)}>
        <Trash2 /> Excluir
      </Button>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Excluir comentário?" description="O comentário será removido definitivamente." confirmLabel="Excluir" onConfirm={remove} />
    </div>
  );
}
