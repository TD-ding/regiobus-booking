"use client";

import { useFormState, useFormStatus } from "react-dom";
import { payAction, type ActionState } from "@/app/actions";
import { ErrorText, StickyBar } from "@/components/ui";

function PayButton({ simulate, amountLabel }: { simulate: "success" | "fail"; amountLabel: string }) {
  const { pending } = useFormStatus();
  const primary = simulate === "success";
  return (
    <button
      type="submit"
      name="simulate"
      value={simulate}
      disabled={pending}
      className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-base font-semibold shadow-sm transition active:scale-[0.98] disabled:opacity-50 ${
        primary ? "bg-brand text-white" : "border border-slate-300 text-slate-600"
      }`}
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
      {pending ? "Processing payment…" : primary ? `Pay ${amountLabel}` : "Simulate failed payment"}
    </button>
  );
}

export function PaymentForm({ orderRef, amountLabel }: { orderRef: string; amountLabel: string }) {
  const [state, formAction] = useFormState<ActionState, FormData>(payAction, undefined);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="orderRef" value={orderRef} />
      {state?.error && (
        <div className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-red-900">Payment failed</p>
              <p className="mt-1 text-sm text-red-800">{state.error} You can try again.</p>
            </div>
          </div>
        </div>
      )}
      <PayButton simulate="fail" amountLabel={amountLabel} />
      <StickyBar>
        <PayButton simulate="success" amountLabel={amountLabel} />
      </StickyBar>
    </form>
  );
}
