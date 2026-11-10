"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { api, errorMessage } from "@/lib/client";

export function DeleteMyRecipe({ id, title }: { id: string; title: string }) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const router = useRouter();
  const remove = async () => {
    setBusy(true);
    try {
      await api(`/api/recipes/${id}`, { method: "DELETE" });
      toast.success("Receita excluída");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => setOpen(true)}><Trash2 className="text-danger" /></Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Excluir “{title}”?</DialogTitle>
          <DialogDescription>Esta ação não pode ser desfeita. Avaliações e comentários da receita também serão removidos.</DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={remove} disabled={busy}>{busy ? "Excluindo…" : "Excluir"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
