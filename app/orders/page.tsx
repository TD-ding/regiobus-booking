export const dynamic = "force-dynamic";

import Link from "next/link";
import { getRiderEmail } from "@/lib/session";
import { getOrdersByEmail } from "@/lib/queries";
import { formatMoney, formatDate, formatTime } from "@/lib/util";
import { Badge, BackLink } from "@/components/ui";

export default async function OrdersPage() {
  const email = getRiderEmail();
  const orders = email ? await getOrdersByEmail(email) : [];

  return (
    <div>
      <BackLink href="/">Book another trip</BackLink>
      <h1 className="mb-3 text-xl font-bold">My trips</h1>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border bg-slate-50 px-6 py-12 text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-8 w-8 text-slate-400"
            >
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M3 10h18" />
            </svg>
          </div>
          <p className="mb-1 font-semibold text-slate-700">No trips yet</p>
          <p className="mb-4 text-sm text-slate-500">Your bookings will appear here once you complete a purchase.</p>
          <Link
            href="/"
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition active:scale-95"
          >
            Search departures
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/orders/${o.reference}`}
                className="block rounded-2xl border bg-white p-4 shadow-sm transition active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    {o.departure.route.origin.name} → {o.departure.route.destination.name}
                  </span>
                  <Badge status={o.status} />
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {formatDate(o.departure.departAt)} · {formatTime(o.departure.departAt)}
                </div>
                <div className="mt-1 flex justify-between text-sm">
                  <span className="font-mono text-xs text-slate-400">{o.reference}</span>
                  <span className="font-semibold">{formatMoney(o.totalCents, o.currency)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}