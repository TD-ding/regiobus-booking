export const dynamic = "force-dynamic";

import Link from "next/link";
import { searchDepartures } from "@/lib/queries";
import { formatMoney, formatTime, formatDate, formatDuration } from "@/lib/util";
import { Steps, BackLink } from "@/components/ui";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { originStationId?: string; destStationId?: string; date?: string; pax?: string };
}) {
  const { originStationId, destStationId, date } = searchParams;
  if (!originStationId || !destStationId || !date) {
    return (
      <div>
        <BackLink href="/">New search</BackLink>
        <p className="text-sm text-slate-500">Missing search criteria.</p>
      </div>
    );
  }

  const departures = await searchDepartures({ originStationId, destStationId, date });

  return (
    <div>
      <Steps active={0} />
      <BackLink href="/">Edit search</BackLink>
      <h1 className="mb-1 text-xl font-bold">
        {departures[0] ? `${departures[0].originName} → ${departures[0].destName}` : "Departures"}
      </h1>
      {departures[0] && (
        <p className="mb-4 text-sm text-slate-500">
          {formatDate(departures[0].departAt)} · {departures.length} option{departures.length === 1 ? "" : "s"}
        </p>
      )}

      {departures.length === 0 ? (
        <div className="rounded-2xl border bg-slate-50 px-6 py-10 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-slate-200">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-6 w-6 text-slate-400"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M8 15h8M8.21 9h.01M15.99 9h.01" strokeLinecap="round" />
            </svg>
          </div>
          <p className="font-medium text-slate-700">No departures found</p>
          <p className="mt-1 text-sm text-slate-500">Try another date or route.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {departures.map((d) => {
            const urgency = d.seatsLeft > 0 && d.seatsLeft <= 5;
            return (
              <li key={d.id}>
                <Link
                  href={`/departures/${d.id}`}
                  className="block rounded-2xl border bg-white p-4 shadow-sm transition active:scale-[0.98]"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold tabular-nums">{formatTime(d.departAt)}</span>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          className="h-4 w-4 shrink-0 text-slate-300"
                        >
                          <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-xl font-bold tabular-nums">{formatTime(d.arriveAt)}</span>
                      </div>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {formatDuration(d.departAt, d.arriveAt)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xl font-bold text-brand">{formatMoney(d.priceCents, d.currency)}</div>
                      <div className="text-xs text-slate-400">per rider</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t pt-3">
                    <span className="text-xs text-slate-400">
                      {d.seatSelection ? "Choose your seat" : "Open seating"}
                    </span>
                    {d.seatsLeft > 0 ? (
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          urgency
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-50 text-green-700"
                        }`}
                      >
                        {urgency ? `Only ${d.seatsLeft} left` : `${d.seatsLeft} seats`}
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                        Sold out
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}