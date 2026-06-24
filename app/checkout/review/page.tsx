export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDepartureWithRoute, getActiveHolds } from "@/lib/queries";
import { peekHoldKey } from "@/lib/session";
import { formatMoney, formatTime, formatDate } from "@/lib/util";
import { Steps, BackLink, ErrorText } from "@/components/ui";
import { ConfirmButton } from "./confirm-button";

export default async function ReviewPage() {
  const draftRaw = cookies().get("passengerDraft")?.value;
  const departureId = cookies().get("departureId")?.value;
  const holdKey = peekHoldKey();
  if (!draftRaw || !departureId || !holdKey) redirect("/");

  const draft = JSON.parse(draftRaw) as {
    passengers: { name: string; doc?: string }[];
    contactEmail: string;
    contactPhone?: string;
  };
  const departure = await getDepartureWithRoute(departureId);
  if (!departure) redirect("/");
  const holds = await getActiveHolds(departureId, holdKey);

  const expired = holds.length === 0;
  const seatLabels = holds.map((h) => h.seatLabel).filter(Boolean) as string[];
  const totalCents = draft.passengers.length * departure.priceCents;

  return (
    <div>
      <Steps active={2} />
      <BackLink href="/checkout">Edit passengers</BackLink>
      <h1 className="mb-3 text-lg font-bold">Review your trip</h1>

      <div className="mb-3 rounded-2xl border bg-white p-4">
        <div className="font-semibold">
          {departure.route.origin.name} → {departure.route.destination.name}
        </div>
        <div className="text-sm text-slate-500">
          {formatDate(departure.departAt)} · {formatTime(departure.departAt)}–{formatTime(departure.arriveAt)}
        </div>
        {seatLabels.length > 0 && (
          <div className="mt-2 text-sm">
            Seats: <span className="font-medium">{seatLabels.join(", ")}</span>
          </div>
        )}
      </div>

      <div className="mb-3 rounded-2xl border bg-white p-4">
        <p className="mb-2 text-sm font-semibold">Passengers</p>
        <ul className="space-y-1 text-sm">
          {draft.passengers.map((p, i) => (
            <li key={i} className="flex justify-between">
              <span>{p.name}</span>
              <span className="text-slate-500">{formatMoney(departure.priceCents, departure.currency)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 text-xs text-slate-500">Contact: {draft.contactEmail}</div>
      </div>

      <div className="mb-4 rounded-2xl border bg-white p-4">
        <div className="flex justify-between text-sm">
          <span>
            {formatMoney(departure.priceCents, departure.currency)} × {draft.passengers.length}
          </span>
          <span>{formatMoney(totalCents, departure.currency)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t pt-2 text-base font-bold">
          <span>Total</span>
          <span className="text-brand">{formatMoney(totalCents, departure.currency)}</span>
        </div>
      </div>

      {expired ? (
        <div className="space-y-3">
          <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
                  <path d="M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-900">Seat hold expired</p>
                <p className="mt-1 text-sm text-amber-800">
                  Your selected seats were held for 10 minutes. Please return to the departure page and choose your seats again.
                </p>
              </div>
            </div>
          </div>
          <BackLink href={`/departures/${departureId}`}>Choose seats again</BackLink>
        </div>
      ) : (
        <ConfirmButton totalLabel={formatMoney(totalCents, departure.currency)} />
      )}
    </div>
  );
}