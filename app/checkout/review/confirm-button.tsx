"use client";

import { useFormState, useFormStatus } from "react-dom";
import { confirmOrderAction, type ActionState } from "@/app/actions";
import { ErrorText, StickyBar } from "@/components/ui";

function Submit({ totalLabel }: { totalLabel: string }) {
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
      {pending ? "Confirming booking…" : `Confirm · ${totalLabel}`}
    </button>
  );
}

export function ConfirmButton({ totalLabel }: { totalLabel: string }) {
  const [state, formAction] = useFormState<ActionState, FormData>(confirmOrderAction, undefined);
  return (
    <form action={formAction}>
      <ErrorText>{state?.error}</ErrorText>
      <StickyBar>
        <Submit totalLabel={totalLabel} />
      </StickyBar>
    </form>
  );
}
