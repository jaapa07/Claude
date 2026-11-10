"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Ban, ShieldCheck, ShieldOff, Unlock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/states";
import { api, errorMessage } from "@/lib/client";
import { ConfirmDialog } from "./confirm-dialog";

type Patch = { role?: "USER" | "ADMIN"; status?: "ACTIVE" | "BLOCKED" };

export function UserActions({ user, isSelf }: { user: { id: string; name: string; role: "USER" | "ADMIN"; status: "ACTIVE" | "BLOCKED" }; isSelf: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<keyof Patch | null>(null);
  const [pending, setPending] = React.useState<{ patch: Patch; title: string; description: string; label: string } | null>(null);

  async function apply(patch: Patch, msg: string) {
    setBusy(patch.role ? "role" : "status");
    try {
      await api(`/api/admin/users/${user.id}`, { method: "PATCH", body: patch });
      toast.success(msg);
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    } finally {
      setBusy(null);
    }
  }

  if (isSelf) return <span className="text-xs text-muted-foreground">Você</span>;

  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {user.role === "ADMIN" ? (
        <Button size="sm" variant="outline" disabled={!!busy} onClick={() => setPending({ patch: { role: "USER" }, title: `Remover admin de ${user.name}?`, description: "A pessoa perderá acesso ao painel administrativo.", label: "Remover admin" })}>
          {busy === "role" ? <Spinner /> : <ShieldOff />} Remover admin
        </Button>
      ) : (
        <Button size="sm" variant="outline" disabled={!!busy} onClick={() => setPending({ patch: { role: "ADMIN" }, title: `Tornar ${user.name} administrador?`, description: "A pessoa terá acesso total ao painel: receitas, usuários, fontes e configurações.", label: "Tornar admin" })}>
          {busy === "role" ? <Spinner /> : <ShieldCheck />} Tornar admin
        </Button>
      )}
      {user.status === "ACTIVE" ? (
        <Button size="sm" variant="ghost" className="text-danger" disabled={!!busy} onClick={() => setPending({ patch: { status: "BLOCKED" }, title: `Bloquear ${user.name}?`, description: "A sessão é encerrada e a pessoa não consegue mais entrar até ser desbloqueada.", label: "Bloquear" })}>
          {busy === "status" ? <Spinner /> : <Ban />} Bloquear
        </Button>
      ) : (
        <Button size="sm" variant="accent" disabled={!!busy} onClick={() => apply({ status: "ACTIVE" }, "Usuário desbloqueado")}>
          {busy === "status" ? <Spinner /> : <Unlock />} Desbloquear
        </Button>
      )}
      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title={pending?.title ?? ""}
        description={pending?.description}
        confirmLabel={pending?.label}
        danger={pending?.patch.status === "BLOCKED" || pending?.patch.role === "USER"}
        onConfirm={() => (pending ? apply(pending.patch, pending.patch.role ? "Papel atualizado" : "Usuário bloqueado") : undefined)}
      />
    </div>
  );
}
