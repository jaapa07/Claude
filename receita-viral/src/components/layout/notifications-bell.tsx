"use client";
import * as React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useSession } from "@/components/providers";
import { api } from "@/lib/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type N = { id: string; title: string; body: string; link: string | null; read: boolean; createdAt: string };

export function NotificationsBell() {
  const user = useSession();
  const [items, setItems] = React.useState<N[]>([]);
  const [unread, setUnread] = React.useState(0);

  const load = React.useCallback(() => {
    if (!user) return;
    api<{ items: N[]; unread: number }>("/api/me/notifications?take=8")
      .then((d) => {
        setItems(d.items);
        setUnread(d.unread);
      })
      .catch(() => {});
  }, [user]);

  React.useEffect(() => {
    load();
    const iv = setInterval(load, 60_000);
    return () => clearInterval(iv);
  }, [load]);

  if (!user) return null;
  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open && unread) {
          api("/api/me/notifications", { method: "PATCH", body: { all: true } }).then(() => setUnread(0)).catch(() => {});
        }
      }}
    >
      <DropdownMenuTrigger className="relative inline-flex size-10 items-center justify-center rounded-full hover:bg-muted" aria-label={`Notificações${unread ? ` (${unread} novas)` : ""}`}>
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notificações</DropdownMenuLabel>
        {items.length === 0 && <p className="px-3 pb-3 text-sm text-muted-foreground">Nenhuma notificação por enquanto.</p>}
        {items.map((n) => (
          <DropdownMenuItem key={n.id} asChild>
            <Link href={n.link ?? "/conta/notificacoes"} className="!items-start">
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-primary"}`} />
              <span>
                <span className="block font-semibold">{n.title}</span>
                <span className="block text-xs text-muted-foreground">{n.body}</span>
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/conta/notificacoes" className="justify-center font-semibold text-primary">Ver todas</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
