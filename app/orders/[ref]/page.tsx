export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getOrderByRef } from "@/lib/queries";
import { formatMoney, formatDate, formatTime } from "@/lib/util";
import { Badge, BackLink } from "@/components/ui";
import { CancelForm } from "./cancel-form";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: { ref: string };
  searchParams: { booked?: string; cancelled?: string };
}) {
  const order = await getOrderByRef(params.ref);
  if (!order) notFound();

  const seatLabels = order.items.map((it) => it.seat?.label).filter(Boolean) as string[];
  const cancellable = order.status === "PAID" || order.status === "PENDING";
  // Simple deterministic QR placeholder (an SVG built from the reference).
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(order.reference)}`;

  return (
    <div>
      <BackLink href="/orders">My trips</BackLink>

      {searchParams.booked && (
        <div className="mb-4 rounded-xl bg-green-50 px-4 py-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
                <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-green-800">Booking confirmed</p>
              <p className="mt-0.5 text-sm text-green-700">
                Your seats are reserved. Show this reference or QR code when you board.
              </p>
            </div>
          </div>
        </div>
      )}
      {searchParams.cancelled && (
        <div className="mb-4 rounded-xl bg-slate-100 px-4 py-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-400 text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-700">Booking cancelled</p>
              <p className="mt-0.5 text-sm text-slate-600">Your payment has been refunded.</p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border bg-white p-5 text-center shadow-sm">
        <div className="mb-1 text-xs uppercase tracking-wide text-slate-400">Booking reference</div>
        <div className="mb-3 font-mono text-2xl font-bold tracking-wider">{order.reference}</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrUrl} alt="Booking QR code" className="mx-auto h-40 w-40" />
        <div className="mt-3">
          <Badge status={order.status} />
        </div>
      </div>

      <div className="mt-3 rounded-2xl border bg-white p-4">
        <div className="font-semibold">
          {order.departure.route.origin.name} → {order.departure.route.destination.name}
        </div>
        <div className="text-sm text-slate-500">
          {formatDate(order.departure.departAt)} · {formatTime(order.departure.departAt)}–
          {formatTime(order.departure.arriveAt)}
        </div>
        {seatLabels.length > 0 && (
          <div className="mt-2 text-sm">
            Seats: <span className="font-medium">{seatLabels.join(", ")}</span>
          </div>
        )}
      </div>

      <div className="mt-3 rounded-2xl border bg-white p-4">
        <p className="mb-2 text-sm font-semibold">Passengers</p>
        <ul className="space-y-1 text-sm">
          {order.items.map((it) => (
            <li key={it.id} className="flex justify-between">
              <span>{it.passengerName}</span>
              <span className="text-slate-500">
                {it.seat ? `Seat ${it.seat.label}` : formatMoney(it.priceCents, order.currency)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t pt-2 font-bold">
          <span>Total</span>
          <span className="text-brand">{formatMoney(order.totalCents, order.currency)}</span>
        </div>
      </div>

      {cancellable && <CancelForm orderRef={order.reference} />}
    </div>
  );
}