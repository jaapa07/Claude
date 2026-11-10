"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Check, ExternalLink, MoreHorizontal, Pencil, Send, Star, StarOff, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/states";
import { api, errorMessage } from "@/lib/client";
import { ConfirmDialog } from "./confirm-dialog";

type Status = "DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED" | "ARCHIVED";

export function RecipeActions({ recipe }: { recipe: { id: string; slug: string; title: string; status: Status; featured: boolean } }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  async function patch(body: { status?: Status; featured?: boolean }, success: string) {
    setBusy(true);
    try {
      await api(`/api/admin/recipes/${recipe.id}`, { method: "PATCH", body });
      toast.success(success);
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    try {
      await api(`/api/admin/recipes/${recipe.id}`, { method: "DELETE" });
      toast.success("Receita excluída");
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  }

  const primary =
    recipe.status === "PENDING" ? (
      <Button size="sm" variant="accent" disabled={busy} onClick={() => patch({ status: "PUBLISHED" }, "Receita aprovada e publicada")}>
        {busy ? <Spinner /> : <Check />} Aprovar
      </Button>
    ) : recipe.status !== "PUBLISHED" ? (
      <Button size="sm" variant="secondary" disabled={busy} onClick={() => patch({ status: "PUBLISHED" }, "Receita publicada")}>
        {busy ? <Spinner /> : <Send />} Publicar
      </Button>
    ) : null;

  return (
    <div className="flex items-center justify-end gap-1.5">
      {primary}
      <Button asChild size="icon-sm" variant="ghost" aria-label="Editar">
        <Link href={`/admin/receitas/${recipe.id}`}><Pencil /></Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="ghost" aria-label="Mais ações" disabled={busy}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {recipe.status === "PUBLISHED" && (
            <DropdownMenuItem asChild>
              <Link href={`/receitas/${recipe.slug}`} target="_blank"><ExternalLink /> Ver página</Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => patch({ featured: !recipe.featured }, recipe.featured ? "Destaque removido" : "Receita destacada")}>
            {recipe.featured ? <StarOff /> : <Star />} {recipe.featured ? "Remover destaque" : "Destacar"}
          </DropdownMenuItem>
          {recipe.status === "PENDING" && (
            <DropdownMenuItem onSelect={() => patch({ status: "REJECTED" }, "Receita rejeitada")}>
              <X /> Rejeitar
            </DropdownMenuItem>
          )}
          {recipe.status === "PUBLISHED" && (
            <DropdownMenuItem onSelect={() => patch({ status: "DRAFT" }, "Receita despublicada")}>
              <Pencil /> Voltar para rascunho
            </DropdownMenuItem>
          )}
          {recipe.status !== "ARCHIVED" && (
            <DropdownMenuItem onSelect={() => patch({ status: "ARCHIVED" }, "Receita arquivada")}>
              <Archive /> Arquivar
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-danger [&_svg]:text-danger" onSelect={() => setConfirmDelete(true)}>
            <Trash2 /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir receita?"
        description={<>“{recipe.title}” será removida junto com avaliações, comentários e favoritos. Essa ação não pode ser desfeita.</>}
        confirmLabel="Excluir"
        onConfirm={remove}
      />
    </div>
  );
}
