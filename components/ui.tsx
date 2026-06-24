import Link from "next/link";

export function PrimaryButton({
  children,
  type = "submit",
  disabled,
}: {
  children: React.ReactNode;
  type?: "submit" | "button";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className="w-full rounded-xl bg-brand px-4 py-3 text-center text-base font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function StickyBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t bg-white/95 px-4 py-3 backdrop-blur">
      {children}
    </div>
  );
}

export function Steps({ active }: { active: number }) {
  const labels = ["Search", "Seats", "Details", "Pay"];
  return (
    <ol className="mb-4 flex items-center gap-1 text-xs">
      {labels.map((l, i) => (
        <li key={l} className="flex flex-1 items-center gap-1">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-semibold ${
              i <= active ? "bg-brand text-white" : "bg-slate-200 text-slate-500"
            }`}
          >
            {i + 1}
          </span>
          <span className={i <= active ? "text-slate-900" : "text-slate-400"}>{l}</span>
        </li>
      ))}
    </ol>
  );
}

export function Badge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PAID: "bg-green-100 text-green-700",
    PENDING: "bg-amber-100 text-amber-700",
    CANCELLED: "bg-slate-200 text-slate-600",
    EXPIRED: "bg-slate-200 text-slate-600",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] ?? "bg-slate-100"}`}>
      {status}
    </span>
  );
}

export function ErrorText({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{children}</p>;
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mb-3 inline-block text-sm text-brand">
      ← {children}
    </Link>
  );
}
