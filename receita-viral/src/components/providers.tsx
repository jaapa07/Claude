"use client";

import * as React from "react";
import { Toaster, toast } from "sonner";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client";

/* ------------------------------------------------------------------ tema */
type Theme = "light" | "dark" | "system";
const ThemeContext = React.createContext<{ theme: Theme; resolved: "light" | "dark"; setTheme: (t: Theme) => void }>({
  theme: "system",
  resolved: "light",
  setTheme: () => {},
});
export const useTheme = () => React.useContext(ThemeContext);

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>("system");
  const [resolved, setResolved] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("rv-theme") as Theme | null;
      if (saved) setThemeState(saved);
    } catch {}
  }, []);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const r = theme === "system" ? (mq.matches ? "dark" : "light") : theme;
      setResolved(r);
      document.documentElement.classList.toggle("dark", r === "dark");
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", r === "dark" ? "#14110f" : "#fffaf3");
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  const setTheme = React.useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem("rv-theme", t);
    } catch {}
  }, []);

  return <ThemeContext.Provider value={{ theme, resolved, setTheme }}>{children}</ThemeContext.Provider>;
}

/** Script inline para aplicar o tema antes da hidratação (evita "flash"). */
export const themeScript = `(function(){try{var t=localStorage.getItem('rv-theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()`;

/* ------------------------------------------------------------------ sessão */
export type SessionUser = { id: string; name: string; email: string; role: "USER" | "ADMIN"; avatarUrl: string | null } | null;
const SessionContext = React.createContext<SessionUser>(null);
export const useSession = () => React.useContext(SessionContext);

/* ------------------------------------------------------------------ favoritos */
const FavoritesContext = React.createContext<{ ids: Set<string>; toggle: (id: string) => Promise<void>; ready: boolean }>({
  ids: new Set(),
  toggle: async () => {},
  ready: false,
});
export const useFavorites = () => React.useContext(FavoritesContext);

function FavoritesProvider({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const [ids, setIds] = React.useState<Set<string>>(new Set());
  const [ready, setReady] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    if (!user) {
      setIds(new Set());
      setReady(true);
      return;
    }
    api<{ ids: string[] }>("/api/me/favorites?idsOnly=1")
      .then((d) => setIds(new Set(d.ids)))
      .catch(() => {})
      .finally(() => setReady(true));
  }, [user]);

  const toggle = React.useCallback(
    async (id: string) => {
      if (!user) {
        toast("Entre na sua conta para salvar favoritos", { action: { label: "Entrar", onClick: () => router.push("/entrar") } });
        return;
      }
      const isFav = ids.has(id);
      setIds((prev) => {
        const n = new Set(prev);
        if (isFav) n.delete(id);
        else n.add(id);
        return n;
      });
      try {
        await api(`/api/recipes/${id}/favorite`, { method: isFav ? "DELETE" : "POST" });
        toast.success(isFav ? "Removida dos favoritos" : "Salva nos favoritos ❤️");
      } catch (err) {
        setIds((prev) => {
          const n = new Set(prev);
          if (isFav) n.add(id);
          else n.delete(id);
          return n;
        });
        toast.error(errorMessage(err));
      }
    },
    [ids, user, router],
  );

  return <FavoritesContext.Provider value={{ ids, toggle, ready }}>{children}</FavoritesContext.Provider>;
}

/* ------------------------------------------------------------------ temporizadores */
export type Timer = { id: string; label: string; endsAt: number; durationMs: number; pausedRemaining?: number; done?: boolean };
const TimerContext = React.createContext<{
  timers: Timer[];
  start: (label: string, minutes: number) => void;
  pause: (id: string) => void;
  resume: (id: string) => void;
  remove: (id: string) => void;
}>({ timers: [], start: () => {}, pause: () => {}, resume: () => {}, remove: () => {} });
export const useTimers = () => React.useContext(TimerContext);

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.25, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.3);
    });
  } catch {}
}

function TimerProvider({ children }: { children: React.ReactNode }) {
  const [timers, setTimers] = React.useState<Timer[]>([]);

  React.useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("rv-timers") || "[]") as Timer[];
      if (Array.isArray(saved)) setTimers(saved);
    } catch {}
  }, []);
  React.useEffect(() => {
    try {
      sessionStorage.setItem("rv-timers", JSON.stringify(timers));
    } catch {}
  }, [timers]);

  React.useEffect(() => {
    const iv = setInterval(() => {
      setTimers((prev) => {
        let changed = false;
        const next = prev.map((t) => {
          if (!t.done && t.pausedRemaining == null && t.endsAt <= Date.now()) {
            changed = true;
            beep();
            toast.success(`⏰ ${t.label} — tempo esgotado!`, { duration: 10000 });
            if ("Notification" in window && Notification.permission === "granted") {
              try {
                new Notification("Receita Viral", { body: `${t.label}: tempo esgotado!`, icon: "/icons/icon-192.png" });
              } catch {}
            }
            if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
            return { ...t, done: true };
          }
          return t;
        });
        return changed ? next : prev;
      });
    }, 500);
    return () => clearInterval(iv);
  }, []);

  const value = React.useMemo(
    () => ({
      timers,
      start: (label: string, minutes: number) => {
        if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {});
        const durationMs = minutes * 60_000;
        setTimers((p) => [...p, { id: crypto.randomUUID(), label, durationMs, endsAt: Date.now() + durationMs }]);
        toast(`Temporizador iniciado: ${label} (${minutes} min)`);
      },
      pause: (id: string) => setTimers((p) => p.map((t) => (t.id === id ? { ...t, pausedRemaining: Math.max(0, t.endsAt - Date.now()) } : t))),
      resume: (id: string) =>
        setTimers((p) => p.map((t) => (t.id === id && t.pausedRemaining != null ? { ...t, endsAt: Date.now() + t.pausedRemaining, pausedRemaining: undefined } : t))),
      remove: (id: string) => setTimers((p) => p.filter((t) => t.id !== id)),
    }),
    [timers],
  );
  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

/* ------------------------------------------------------------------ raiz */
export function Providers({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  React.useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return (
    <ThemeProvider>
      <SessionContext.Provider value={user}>
        <FavoritesProvider user={user}>
          <TimerProvider>
            {children}
            <Toaster position="top-center" richColors closeButton toastOptions={{ className: "!rounded-2xl" }} />
          </TimerProvider>
        </FavoritesProvider>
      </SessionContext.Provider>
    </ThemeProvider>
  );
}
