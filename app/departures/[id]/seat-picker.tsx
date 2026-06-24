"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { holdAction, type ActionState } from "@/app/actions";
import { formatMoney } from "@/lib/util";
import { ErrorText, StickyBar } from "@/components/ui";
import type { SeatState } from "@/lib/availability";

const MAX_SEATS = 8;

function Submit({ count, totalCents, currency }: { count: number; totalCents: number; currency: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || count === 0}
      className="w-full rounded-xl bg-brand px-4 py-3 text-base font-semibold text-white shadow-sm disabled:opacity-50"
    >
      {pending
        ? "Holding seats…"
        : count === 0
          ? "Select a seat"
          : `Continue · ${count} seat${count === 1 ? "" : "s"} · ${formatMoney(totalCents, currency)}`}
    </button>
  );
}

export function SeatPicker({
  departureId,
  priceCents,
  currency,
  seats,
}: {
  departureId: string;
  priceCents: number;
  currency: string;
  seats: SeatState[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [state, formAction] = useFormState<ActionState, FormData>(holdAction, undefined);

  const rows = Math.max(...seats.map((s) => s.rowIndex), 0) + 1;
  const cols = Math.max(...seats.map((s) => s.colIndex), 0) + 1;
  const grid: (SeatState | undefined)[][] = Array.from({ length: rows }, () => Array(cols).fill(undefined));
  for (const s of seats) grid[s.rowIndex][s.colIndex] = s;

  function toggle(label: string, status: string) {
    if (status !== "AVAILABLE") return;
    setSelected((cur) =>
      cur.includes(label)
        ? cur.filter((l) => l !== label)
        : cur.length >= MAX_SEATS
          ? cur
          : [...cur, label],
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="departureId" value={departureId} />
      {selected.map((l) => (
        <input key={l} type="hidden" name="seatLabels" value={l} />
      ))}

      <div className="mb-3 flex gap-4 text-xs text-slate-500">
        <Legend className="bg-white border" label="Available" />
        <Legend className="bg-brand" label="Selected" />
        <Legend className="bg-slate-300" label="Taken" />
      </div>

      <div className="mb-2 rounded-t-xl bg-slate-100 py-1 text-center text-xs text-slate-400">Front</div>
      <div className="space-y-2">
        {grid.map((row, r) => (
          <div key={r} className="flex items-center justify-center gap-2">
            {row.map((seat, c) => {
              if (!seat) return <div key={c} className="h-10 w-10" />;
              const isSel = selected.includes(seat.label);
              const cls =
                seat.status === "SOLD" || seat.status === "HELD"
                  ? "bg-slate-300 text-slate-400 cursor-not-allowed"
                  : isSel
                    ? "bg-brand text-white"
                    : "bg-white border border-slate-300 text-slate-700";
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggle(seat.label, seat.status)}
                  className={`h-10 w-10 rounded-lg text-xs font-semibold transition ${cls}`}
                  aria-label={`Seat ${seat.label} ${seat.status}`}
                >
                  {seat.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <ErrorText>{state?.error}</ErrorText>
      <StickyBar>
        <Submit count={selected.length} totalCents={selected.length * priceCents} currency={currency} />
      </StickyBar>
    </form>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-4 w-4 rounded ${className}`} />
      {label}
    </span>
  );
}
