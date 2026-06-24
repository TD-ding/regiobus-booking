"use client";

import { useFormState, useFormStatus } from "react-dom";
import { passengersAction, type ActionState } from "@/app/actions";
import { StickyBar } from "@/components/ui";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-base font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-50"
    >
      {pending && (
        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
          <path
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            className="opacity-75"
          />
        </svg>
      )}
      {pending ? "Saving…" : "Continue to review"}
    </button>
  );
}

export function PassengerForm({ paxCount }: { paxCount: number }) {
  const [state, formAction] = useFormState<ActionState, FormData>(passengersAction, undefined);

  return (
    <form action={formAction} className="space-y-5">
      {Array.from({ length: paxCount }).map((_, i) => (
        <div key={i} className="rounded-2xl border bg-white p-4">
          <p className="mb-3 text-sm font-semibold">Passenger {i + 1}</p>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Full name <span className="text-red-600">*</span>
          </label>
          <input
            name="name"
            required
            minLength={2}
            className="mb-3 w-full rounded-xl border px-3 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            placeholder="Jane Doe"
          />
          <label className="mb-1 block text-xs font-medium text-slate-600">ID / passport (optional)</label>
          <input
            name="doc"
            className="w-full rounded-xl border px-3 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            placeholder="Optional"
          />
        </div>
      ))}

      <div className="rounded-2xl border bg-white p-4">
        <p className="mb-3 text-sm font-semibold">Contact</p>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Email <span className="text-red-600">*</span>
        </label>
        <input
          name="contactEmail"
          type="email"
          required
          className="mb-3 w-full rounded-xl border px-3 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          placeholder="you@example.com"
        />
        <label className="mb-1 block text-xs font-medium text-slate-600">Phone (optional)</label>
        <input
          name="contactPhone"
          type="tel"
          className="w-full rounded-xl border px-3 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          placeholder="Optional"
        />
      </div>

      {state?.error && (
        <div className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 shrink-0 text-red-600">
              <path d="M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm font-medium text-red-800">{state.error}</p>
          </div>
        </div>
      )}

      <StickyBar>
        <Submit />
      </StickyBar>
    </form>
  );
}
