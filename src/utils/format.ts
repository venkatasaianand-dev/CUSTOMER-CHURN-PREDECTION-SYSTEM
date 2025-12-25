export function fmtPct(v: number): string {
  if (!Number.isFinite(v)) return "-";
  return `${(v * 100).toFixed(2)}%`;
}

export function fmtProb(v: number): string {
  if (!Number.isFinite(v)) return "-";
  return v.toFixed(4);
}

export function safeText(v: any, fallback = "-"): string {
  if (v === undefined || v === null) return fallback;
  const s = String(v);
  return s.trim() ? s : fallback;
}
