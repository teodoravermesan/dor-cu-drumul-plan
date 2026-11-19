export const CATEGORIES = [
  { value: "transport", label: "Transport" },
  { value: "cazare", label: "Cazare" },
  { value: "mancare", label: "Mâncare" },
  { value: "activitati", label: "Activități" },
  { value: "altele", label: "Altele" },
] as const;

export const BOOKING_KINDS = [
  { value: "zbor", label: "Zbor", emoji: "✈️" },
  { value: "cazare", label: "Cazare", emoji: "🏨" },
  { value: "masina", label: "Mașină închiriată", emoji: "🚗" },
] as const;

/** Parse a YYYY-MM-DD string as a local date (no timezone shift). */
export function parseDay(s: string): Date {
  const [y = 1970, m = 1, d = 1] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toDayString(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** All days from start to end inclusive. */
export function tripDays(start: string, end: string): string[] {
  const out: string[] = [];
  const d = parseDay(start);
  const e = parseDay(end);
  while (d <= e && out.length < 366) {
    out.push(toDayString(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** Whole days from `today` until `start` (0 = today, negative = past). */
export function daysUntil(start: string, today: Date = new Date()): number {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((parseDay(start).getTime() - t.getTime()) / 86400000);
}

export function isPastTrip(end: string, today: Date = new Date()): boolean {
  return daysUntil(end, today) < 0;
}

const fmtShort = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short" });
const fmtLong = new Intl.DateTimeFormat("ro-RO", { weekday: "long", day: "numeric", month: "long" });

export function formatRange(start: string, end: string) {
  const y = parseDay(end).getFullYear();
  return `${fmtShort.format(parseDay(start))} – ${fmtShort.format(parseDay(end))} ${y}`;
}
export function formatDayLong(s: string) {
  return fmtLong.format(parseDay(s));
}
export function formatEur(n: number) {
  return new Intl.NumberFormat("ro-RO", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export function countdownLabel(start: string, end: string, today = new Date()) {
  const n = daysUntil(start, today);
  if (n > 1) return `în ${n} zile`;
  if (n === 1) return "mâine";
  if (n === 0) return "azi";
  if (!isPastTrip(end, today)) return "în desfășurare";
  return "încheiată";
}

export const PACKING_CATEGORIES = ["Documente", "Haine", "Electronice", "Trusă medicală/Cosmetice"];

export function packingProgress(items: { done: boolean }[]) {
  const total = items.length;
  const done = items.filter((i) => i.done).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}
