export const dynamic = "force-dynamic";

import { getStationsGrouped } from "@/lib/queries";
import { SearchForm } from "./search-form";
import { Steps } from "@/components/ui";

export default async function HomePage() {
  const cities = await getStationsGrouped();
  const groups = cities.map((c) => ({
    city: c.name,
    stations: c.stations.map((s) => ({ id: s.id, name: s.name })),
  }));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <Steps active={0} />
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Where to?</h1>
      <p className="mb-5 text-sm text-slate-500">Search regional coach departures.</p>
      <SearchForm groups={groups} today={today} />
    </div>
  );
}