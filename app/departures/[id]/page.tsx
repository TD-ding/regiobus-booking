export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getDepartureWithRoute } from "@/lib/queries";
import { getAvailability } from "@/lib/availability";
import { peekHoldKey } from "@/lib/session";
import { formatMoney, formatTime, formatDate } from "@/lib/util";
import { Steps, BackLink } from "@/components/ui";
import { SeatPicker } from "./seat-picker";
import { CountPicker } from "./count-picker";

export default async function DeparturePage({ params }: { params: { id: string } }) {
  const departure = await getDepartureWithRoute(params.id);
  if (!departure) notFound();

  const holdKey = peekHoldKey();
  const availability = await getAvailability(departure.id, holdKey);

  return (
    <div>
      <Steps active={1} />
      <BackLink href="/">New search</BackLink>
      <h1 className="text-lg font-bold">
        {departure.route.origin.name} → {departure.route.destination.name}
      </h1>
      <p className="mb-4 text-sm text-slate-500">
        {formatDate(departure.departAt)} · {formatTime(departure.departAt)}–{formatTime(departure.arriveAt)} ·{" "}
        {formatMoney(departure.priceCents, departure.currency)} per seat
      </p>

      {availability.seatSelection ? (
        <SeatPicker
          departureId={departure.id}
          priceCents={departure.priceCents}
          currency={departure.currency}
          seats={availability.seats}
        />
      ) : (
        <CountPicker
          departureId={departure.id}
          priceCents={departure.priceCents}
          currency={departure.currency}
          seatsLeft={availability.seatsLeft}
        />
      )}
    </div>
  );
}