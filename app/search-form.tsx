"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { searchAction, type ActionState } from "@/app/actions";
import { ErrorText, StickyBar } from "@/components/ui";

type Station = { id: string; name: string };
type CityGroup = { city: string; stations: Station[] };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3.5 text-base font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-50"
    >
      {pending ? (
        <>
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
            <path
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              className="opacity-75"
            />
          </svg>
          Searching…
        </>
      ) : (
        <>
          <SearchIcon className="h-5 w-5" />
          Search departures
        </>
      )}
    </button>
  );
}

export function SearchForm({ groups, today }: { groups: CityGroup[]; today: string }) {
  const [state, formAction] = useFormState<ActionState, FormData>(searchAction, undefined);

  const byId = useMemo(() => {
    const m = new Map<string, { city: string; name: string }>();
    for (const g of groups) for (const s of g.stations) m.set(s.id, { city: g.city, name: s.name });
    return m;
  }, [groups]);

  const [originId, setOriginId] = useState("");
  const [destId, setDestId] = useState("");
  const [pax, setPax] = useState(1);
  const [picking, setPicking] = useState<null | "origin" | "dest">(null);

  function label(id: string) {
    const s = byId.get(id);
    return s ? { city: s.city, name: s.name } : null;
  }
  function swap() {
    setOriginId(destId);
    setDestId(originId);
  }

  const sameStation = originId !== "" && originId === destId;
  const canSubmit = originId && destId && !sameStation;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="originStationId" value={originId} />
      <input type="hidden" name="destStationId" value={destId} />
      <input type="hidden" name="pax" value={pax} />

      {/* From / To card with swap */}
      <div className="relative rounded-2xl border bg-white shadow-sm">
        <FieldButton
          icon={<DotIcon className="text-brand" />}
          caption="From"
          value={label(originId)}
          placeholder="Choose origin station"
          onClick={() => setPicking("origin")}
        />
        <div className="ml-12 border-t" />
        <FieldButton
          icon={<PinIcon className="text-brand" />}
          caption="To"
          value={label(destId)}
          placeholder="Choose destination station"
          onClick={() => setPicking("dest")}
        />
        <button
          type="button"
          onClick={swap}
          disabled={!originId && !destId}
          aria-label="Swap origin and destination"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border bg-white p-2 text-brand shadow-sm transition active:scale-90 disabled:opacity-40"
        >
          <SwapIcon className="h-4 w-4" />
        </button>
      </div>

      {sameStation && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Origin and destination must be different.
        </div>
      )}

      {/* Date + riders */}
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col rounded-2xl border bg-white px-4 py-3 shadow-sm focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Date</span>
          <input
            type="date"
            name="date"
            defaultValue={today}
            min={today}
            className="mt-0.5 bg-transparent text-base font-semibold outline-none"
            required
          />
        </label>
        <div className="flex w-32 flex-col rounded-2xl border bg-white px-4 py-3 shadow-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Riders</span>
          <div className="mt-1 flex items-center justify-between">
            <button
              type="button"
              aria-label="Fewer riders"
              onClick={() => setPax((p) => Math.max(1, p - 1))}
              className="flex h-7 w-7 items-center justify-center rounded-full border text-lg leading-none text-slate-600 transition active:scale-90 disabled:opacity-40"
              disabled={pax <= 1}
            >
              −
            </button>
            <span className="text-base font-semibold tabular-nums">{pax}</span>
            <button
              type="button"
              aria-label="More riders"
              onClick={() => setPax((p) => Math.min(8, p + 1))}
              className="flex h-7 w-7 items-center justify-center rounded-full border text-lg leading-none text-slate-600 transition active:scale-90 disabled:opacity-40"
              disabled={pax >= 8}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {state?.error && !sameStation && (
        <div className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 shrink-0 text-red-600">
              <path d="M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm font-medium text-red-800">{state.error}</p>
          </div>
        </div>
      )}

      <StickyBar>
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3.5 text-base font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-50"
        >
          {state && "pending" in state ? (
            <>
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  className="opacity-75"
                />
              </svg>
              Searching…
            </>
          ) : (
            <>
              <SearchIcon className="h-5 w-5" />
              Search departures
            </>
          )}
        </button>
      </StickyBar>

      {picking && (
        <StationSheet
          title={picking === "origin" ? "Select origin" : "Select destination"}
          groups={groups}
          selectedId={picking === "origin" ? originId : destId}
          disabledId={picking === "origin" ? destId : originId}
          onClose={() => setPicking(null)}
          onPick={(id) => {
            if (picking === "origin") setOriginId(id);
            else setDestId(id);
            setPicking(null);
          }}
        />
      )}
    </form>
  );
}

function FieldButton({
  icon,
  caption,
  value,
  placeholder,
  onClick,
}: {
  icon: React.ReactNode;
  caption: string;
  value: { city: string; name: string } | null;
  placeholder: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center">{icon}</span>
      <span className="min-w-0 flex-1 pr-10">
        <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
          {caption}
        </span>
        {value ? (
          <span className="block truncate text-base font-semibold">
            {value.city} <span className="font-normal text-slate-400">·</span> {value.name}
          </span>
        ) : (
          <span className="block truncate text-base text-slate-400">{placeholder}</span>
        )}
      </span>
    </button>
  );
}

function StationSheet({
  title,
  groups,
  selectedId,
  disabledId,
  onClose,
  onPick,
}: {
  title: string;
  groups: CityGroup[];
  selectedId: string;
  disabledId: string;
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!query) return groups;
    return groups
      .map((g) => {
        const cityMatch = g.city.toLowerCase().includes(query);
        const stations = cityMatch
          ? g.stations
          : g.stations.filter((s) => s.name.toLowerCase().includes(query));
        return { city: g.city, stations };
      })
      .filter((g) => g.stations.length > 0);
  }, [groups, query]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <div className="relative mx-auto flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl">
        <div className="sticky top-0 rounded-t-3xl bg-white px-4 pb-3 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200" />
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-slate-400 active:bg-slate-100"
              aria-label="Close"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2.5">
            <SearchIcon className="h-4 w-4 text-slate-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search city or station"
              className="w-full bg-transparent text-base outline-none placeholder:text-slate-400"
            />
            {q && (
              <button type="button" onClick={() => setQ("")} aria-label="Clear" className="text-slate-400">
                <CloseIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-y-auto px-2 pb-6">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-slate-400">No stations match “{q}”.</p>
          ) : (
            filtered.map((g) => (
              <div key={g.city} className="mb-1">
                <div className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {g.city}
                </div>
                <ul>
                  {g.stations.map((s) => {
                    const isSelected = s.id === selectedId;
                    const isDisabled = s.id === disabledId;
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          disabled={isDisabled}
                          onClick={() => onPick(s.id)}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-base active:bg-slate-100 disabled:opacity-40 ${
                            isSelected ? "bg-brand/5 font-semibold text-brand" : ""
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <PinIcon className={isSelected ? "text-brand" : "text-slate-300"} />
                            {s.name}
                          </span>
                          {isSelected && <CheckIcon className="h-5 w-5 text-brand" />}
                          {isDisabled && <span className="text-xs text-slate-400">in use</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* --- inline icons (no dependency) --- */
function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}
function CloseIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}
function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SwapIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M7 4v16M7 4 4 7M7 4l3 3M17 20V4M17 20l3-3M17 20l-3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function DotIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`h-5 w-5 ${className}`}>
      <circle cx="12" cy="12" r="5" />
    </svg>
  );
}
function PinIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`h-5 w-5 ${className}`}>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
