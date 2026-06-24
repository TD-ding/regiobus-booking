"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { holdAction, type ActionState } from "@/app/actions";
import { formatMoney } from "@/lib/util";
import { ErrorText, StickyBar } from "@/components/ui";

function Submit({ qty, totalCents, currency }: { qty: number; totalCents: number; currency: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || qty === 0}
      className="w-full rounded-xl bg-brand px-4 py-3 text-base font-semibold text-white shadow-sm disabled:opacity-50"
    >
      {pending ? "Reserving…" : `Continue · ${qty} ticket${qty === 1 ? "" : "s"} · ${formatMoney(totalCents, currency)}`}
    </button>
  );
}

export function CountPicker({
  departureId,
  priceCents,
  currency,
  seatsLeft,
}: {
  departureId: string;
  priceCents: number;
  currency: string;
  seatsLeft: number;
}) {
  const max = Math.min(8, seatsLeft);
  const [qty, setQty] = useState(Math.min(1, max));
  const [state, formAction] = useFormState<ActionState, FormData>(holdAction, undefined);

  return (
    <form action={formAction}>
      <input type="hidden" name="departureId" value={departureId} />
      <input type="hidden" name="quantity" value={qty} />

      <div className="rounded-2xl border bg-white p-4">
        <p className="text-sm text-slate-500">Open seating — choose how many tickets.</p>
        <p className="mb-4 text-xs text-slate-400">{seatsLeft} seats remaining</p>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="h-12 w-12 rounded-full border text-2xl font-bold text-brand"
          >
            −
          </button>
          <span className="text-3xl font-bold">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(max, q + 1))}
            className="h-12 w-12 rounded-full border text-2xl font-bold text-brand"
          >
            +
          </button>
        </div>
      </div>

      <ErrorText>{state?.error}</ErrorText>
      <StickyBar>
        <Submit qty={qty} totalCents={qty * priceCents} currency={currency} />
      </StickyBar>
    </form>
  );
}
