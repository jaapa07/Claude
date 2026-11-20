/** 83456 → "1:23.456"; null → "--:--.---". */
export function formatTime(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 0) return '--:--.---';
  const total = Math.floor(ms);
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const millis = total % 1000;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

export function ordinal(position: number): string {
  return `${position}º`;
}

/** Tempo jogado: "2 h 05 min", "12 min", "menos de 1 min". */
export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'menos de 1 min';
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
}

export const TROPHY_LABEL = { gold: 'Ouro', silver: 'Prata', bronze: 'Bronze' } as const;
