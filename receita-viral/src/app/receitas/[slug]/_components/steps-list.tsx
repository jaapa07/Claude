"use client";
import { TimerIcon } from "lucide-react";
import { useTimers } from "@/components/providers";

export function StepsList({ recipeTitle, steps }: { recipeTitle: string; steps: { id: string; text: string; timerMinutes: number | null }[] }) {
  const { start } = useTimers();
  return (
    <ol className="space-y-5">
      {steps.map((s, i) => (
        <li key={s.id} className="print-break flex gap-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground shadow-soft">{i + 1}</span>
          <div className="flex-1 space-y-2 pt-1">
            <p className="leading-relaxed">{s.text}</p>
            {s.timerMinutes ? (
              <button
                type="button"
                onClick={() => start(`${recipeTitle} — etapa ${i + 1}`, s.timerMinutes!)}
                className="no-print inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary transition hover:brightness-95"
              >
                <TimerIcon className="size-3.5" /> Iniciar temporizador de {s.timerMinutes >= 60 ? `${Math.floor(s.timerMinutes / 60)}h${s.timerMinutes % 60 ? ` ${s.timerMinutes % 60}min` : ""}` : `${s.timerMinutes} min`}
              </button>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
