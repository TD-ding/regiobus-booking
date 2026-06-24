export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Steps, BackLink } from "@/components/ui";
import { PassengerForm } from "./passenger-form";

export default function CheckoutPage() {
  const paxCount = Number(cookies().get("paxCount")?.value || "0");
  const departureId = cookies().get("departureId")?.value;
  if (!paxCount || !departureId) redirect("/");

  return (
    <div>
      <Steps active={2} />
      <BackLink href={`/departures/${departureId}`}>Change seats</BackLink>
      <h1 className="mb-1 text-lg font-bold">Passenger details</h1>
      <p className="mb-4 text-sm text-slate-500">
        {paxCount} passenger{paxCount === 1 ? "" : "s"}
      </p>
      <PassengerForm paxCount={paxCount} />
    </div>
  );
}