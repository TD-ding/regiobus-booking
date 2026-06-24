export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getOrderByRef } from "@/lib/queries";
import { formatMoney } from "@/lib/util";
import { Steps, BackLink } from "@/components/ui";
import { PaymentForm } from "./payment-form";

export default async function PaymentPage({ searchParams }: { searchParams: { ref?: string } }) {
  const ref = searchParams.ref;
  if (!ref) redirect("/");
  const order = await getOrderByRef(ref);
  if (!order) redirect("/");
  if (order.status === "PAID") redirect(`/orders/${ref}`);

  return (
    <div>
      <Steps active={3} />
      <BackLink href={`/orders/${ref}`}>View booking</BackLink>
      <h1 className="mb-1 text-xl font-bold">Payment</h1>
      <p className="mb-4 text-sm text-slate-500">Complete your booking by processing payment.</p>

      <div className="mb-4 rounded-2xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Order total</span>
          <span className="text-2xl font-bold text-brand">{formatMoney(order.totalCents, order.currency)}</span>
        </div>
        <div className="mt-2 text-xs text-slate-400">Reference: {order.reference}</div>
      </div>

      <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
        <div className="flex items-start gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 shrink-0 text-amber-600">
            <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="text-sm text-amber-800">
            <span className="font-semibold">Demo payment</span> — no real card is charged. Choose an outcome to simulate the gateway response.
          </div>
        </div>
      </div>

      <PaymentForm orderRef={order.reference} amountLabel={formatMoney(order.totalCents, order.currency)} />
    </div>
  );
}