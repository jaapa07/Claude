"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/states";

/** Diálogo de confirmação controlado. `onConfirm` pode ser assíncrono; o diálogo fecha ao terminar sem erro. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  danger = true,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => Promise<boolean | void> | boolean | void;
}) {
  const [busy, setBusy] = React.useState(false);
  async function run() {
    setBusy(true);
    try {
      const ok = await onConfirm();
      if (ok !== false) onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription asChild><div>{description}</div></DialogDescription>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button variant={danger ? "danger" : "default"} onClick={run} disabled={busy}>
            {busy && <Spinner />}
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
