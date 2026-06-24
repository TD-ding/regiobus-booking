// Shared constants & small helpers.

export const HOLD_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Status string unions (we use String columns, not DB enums, for SQLite->Postgres portability).
export const DepartureStatus = ["SCHEDULED", "CANCELLED", "DEPARTED"] as const;
export const OrderStatus = ["PENDING", "PAID", "CANCELLED", "EXPIRED"] as const;
export const PaymentStatus = [
  "REQUIRES_PAYMENT",
  "AUTHORIZED",
  "CAPTURED",
  "FAILED",
  "REFUNDED",
] as const;

export function formatMoney(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function formatTime(d: Date): string {
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(d);
}

export function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

// Human-friendly journey length, e.g. "2h 15m", "45m", "3h".
export function formatDuration(from: Date, to: Date): string {
  const mins = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I

export function generateReference(): string {
  let body = "";
  for (let i = 0; i < 6; i++) {
    body += REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)];
  }
  return `BX-${body}`;
}
