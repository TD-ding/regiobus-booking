"use client";

import { useFormState, useFormStatus } from "react-dom";
import { cancelOrderAction, type ActionState } from "@/app/actions";

function CancelButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-300 px-4 py-3 text-base font-semibold text-red-600 transition active:scale-[0.98] disabled:opacity-50"
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
      {pending ? "Cancelling…" : "Cancel this booking"}
    </button>
  );
}

export function CancelForm({ orderRef }: { orderRef: string }) {
  const [state, formAction] = useFormState<ActionState, FormData>(cancelOrderAction, undefined);
  return (
    <form action={formAction} className="mt-4 space-y-3">
      <input type="hidden" name="orderRef" value={orderRef} />
      {state?.error && (
        <div className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 shrink-0 text-red-600">
              <path d="M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="flex-1">
              <p className="font-semibold text-red-900">Cancellation failed</p>
              <p className="mt-1 text-sm text-red-800">{state.error}</p>
            </div>
          </div>
        </div>
      )}
      <CancelButton />
    </form>
  );
}
