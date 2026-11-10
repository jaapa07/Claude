"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCheck, Trash2 } from "lucide-react";
import { api, errorMessage } from "@/lib/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState, Spinner } from "@/components/ui/states";

type Item = { id: string; title: string; body: string; link: string | null; read: boolean; createdAt: string };

const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 7 * 86400) return `há ${Math.floor(diff / 86400)} d`;
  return fmt.format(new Date(iso));
}

export function NotificationsList({ items: initial }: { items: Item[] }) {
  const router = useRouter();
  const [items, setItems] = React.useState(initial);
  const [busy, setBusy] = React.useState<"read" | "clear" | null>(null);
  React.useEffect(() => setItems(initial), [initial]);

  const unread = items.filter((n) => !n.read).length;
  const readCount = items.length - unread;

  const markAll = async () => {
    setBusy("read");
    try {
      await api("/api/me/notifications", { method: "PATCH", body: { all: true } });
      setItems((xs) => xs.map((n) => ({ ...n, read: true })));
      toast.success("Todas marcadas como lidas");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const clearRead = async () => {
    setBusy("clear");
    try {
      await api("/api/me/notifications", { method: "DELETE" });
      setItems((xs) => xs.filter((n) => !n.read));
      toast.success("Notificações lidas removidas");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const open = async (n: Item) => {
    if (!n.read) {
      setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      api("/api/me/notifications", { method: "PATCH", body: { ids: [n.id] } }).then(() => router.refresh()).catch(() => {});
    }
    if (n.link) router.push(n.link);
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Notificações</h1>
          <p className="text-sm text-muted-foreground">{unread ? `${unread} não lida${unread > 1 ? "s" : ""}` : "Tudo em dia ✨"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={markAll} disabled={!unread || busy !== null}>
            {busy === "read" ? <Spinner /> : <CheckCheck />} Marcar todas como lidas
          </Button>
          <Button variant="ghost" size="sm" onClick={clearRead} disabled={!readCount || busy !== null}>
            {busy === "clear" ? <Spinner /> : <Trash2 />} Limpar lidas
          </Button>
        </div>
      </div>
      {items.length ? (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => open(n)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition hover:border-primary/40",
                  n.read ? "border-border bg-card" : "border-primary/30 bg-primary-soft",
                )}
              >
                <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-primary")} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className={cn("font-semibold", !n.read && "text-foreground")}>{n.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{n.body}</span>
                  {!n.read && <span className="sr-only">(não lida)</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState emoji="🔔" title="Nenhuma notificação" description="Avisaremos aqui sobre novas receitas, aprovações e comentários." />
      )}
    </>
  );
}
