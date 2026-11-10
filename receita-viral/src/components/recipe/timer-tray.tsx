"use client";
import * as React from "react";
import { Pause, Play, X, TimerIcon } from "lucide-react";
import { useTimers } from "@/components/providers";
import { cn } from "@/lib/utils";

function fmt(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(sec).padStart(2, "0")}`;
}

/** Bandeja flutuante com os temporizadores ativos (persistem entre páginas). */
export function TimerTray() {
  const { timers, pause, resume, remove } = useTimers();
  const [, force] = React.useState(0);
  React.useEffect(() => {
    if (!timers.length) return;
    const iv = setInterval(() => force((x) => x + 1), 250);
    return () => clearInterval(iv);
  }, [timers.length]);
  if (!timers.length) return null;
  return (
    <div className="no-print fixed bottom-20 right-3 z-40 flex w-64 flex-col gap-2 md:bottom-5 md:right-5" aria-live="polite">
      {timers.map((t) => {
        const remaining = t.pausedRemaining ?? t.endsAt - Date.now();
        const pct = 1 - Math.max(0, remaining) / t.durationMs;
        return (
          <div key={t.id} className={cn("relative overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-lift", t.done && "border-primary animate-pulse")}>
            <div className="absolute inset-y-0 left-0 bg-primary-soft transition-all" style={{ width: `${pct * 100}%` }} />
            <div className="relative flex items-center gap-2">
              <TimerIcon className="size-4 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-muted-foreground">{t.label}</p>
                <p className="font-mono text-lg font-bold tabular-nums">{t.done ? "Pronto!" : fmt(remaining)}</p>
              </div>
              {!t.done && (
                <button
                  onClick={() => (t.pausedRemaining != null ? resume(t.id) : pause(t.id))}
                  className="rounded-full p-1.5 hover:bg-muted"
                  aria-label={t.pausedRemaining != null ? "Retomar" : "Pausar"}
                >
                  {t.pausedRemaining != null ? <Play className="size-4" /> : <Pause className="size-4" />}
                </button>
              )}
              <button onClick={() => remove(t.id)} className="rounded-full p-1.5 hover:bg-muted" aria-label="Remover temporizador">
                <X className="size-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
