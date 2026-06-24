export const dynamic = "force-dynamic";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="mb-2 text-lg font-bold">Not found</h1>
      <p className="mb-4 text-sm text-slate-500">That page doesn’t exist.</p>
      <Link href="/" className="font-semibold text-brand">
        Back to search
      </Link>
    </div>
  );
}
