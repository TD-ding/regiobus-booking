# RegioBus — Regional coach booking MVP

Mobile-first ticket booking for regional coach travel. Full happy path implemented end to end:
**search → pick departure → choose seats / ticket count → passenger info → confirm → (mock) payment → booked order → my orders → cancel.**

## Stack
- **Next.js 14 (App Router)** + **TypeScript**, server actions for all mutations
- **Tailwind CSS** (mobile-first, sticky bottom CTAs, 4-step progress)
- **Prisma** on **SQLite** in dev — portable to Postgres in prod (integer cents, string status fields, no DB-specific features)
- **Zod** validation shared by client and server
- Mock **PaymentProvider** behind an interface (`lib/payment.ts`) — swap in a real gateway later with no flow change

## Quick start
```bash
npm install
npx prisma migrate dev      # apply schema (creates dev.db)
npm run seed                # demo cities/stations/routes/departures
npm run dev                 # http://localhost:3000
```

## Test
```bash
npm test                    # Vitest: 7 focused tests (seat-hold→confirm, concurrency, cancel, count-only, payment retry)
npm run build               # production build (typecheck + compile)
```

## What's covered by tests (`tests/booking.test.ts`)
1. **Seat-hold → confirm happy path** — hold shows HELD to others / AVAILABLE to owner; confirm promotes hold→sold atomically; pay → PAID + CAPTURED.
2. **No double-booking** — a 2nd checkout can't hold a held seat; and confirm aborts if the seat was SOLD in between (the trust-critical re-check).
3. **Cancel releases the seat** — order CANCELLED, payment REFUNDED, seat back to AVAILABLE.
4. **Count-only departures** — quantity hold, multi-passenger order with no seat assignment, availability decrements; over-capacity rejected.
5. **Payment failure** keeps the order PENDING and retryable.

## Key files
- `lib/booking.ts` — `holdSeats`, `createOrder` (the atomic confirm transaction), `runPayment`, `cancelOrder`
- `lib/availability.ts` — availability is **computed, never stored**
- `lib/payment.ts` — `PaymentProvider` interface + `MockProvider`
- `prisma/schema.prisma` — data model (see `HANDOFF.md` for full details)
- `app/` — screens + `app/actions.ts` server actions
- `HANDOFF.md` — detailed handoff notes for team review

## Features in this slice
- **Searchable station picker** — bottom-sheet UI, grouped by city, mobile-optimized
- **Scannable departure results** — journey duration, price, seat availability with urgency
- **Seat-hold with TTL** — 10-minute holds, atomic confirm transaction with double-book prevention
- **Multi-passenger checkout** — inline validation, contact email for order lookup
- **Mock payment** — success/failure simulation, retryable on failure
- **Order management** — view all trips, booking reference + QR code, cancel with refund
- **Computed availability** — real-time seat state (AVAILABLE/SOLD/HELD), no stale data
- **Loading states** — spinners during search, confirm, and payment
- **Error recovery** — expired holds, payment failures, validation errors all have clear recovery paths
- **Accessibility** — proper labels, focus states, keyboard navigation
- **Production build** — green typecheck and build, ready to deploy

## Not in this slice (next phases)
- Magic-link auth (identity is currently a thin cookie keyed to contact email)
- Hold-expiry countdown UI (backend enforces 10min TTL, UI doesn't show timer)
- Real payment gateway (mock only, swap via `PaymentProvider` interface)
- Partial refunds (cancel is all-or-nothing)
- Email confirmations (action exists, email step not wired)

## Run with production build
```bash
npm run build
npm start                   # serves production build on :3000
```

## Architecture notes
- **Portability**: Money stored as integer cents, status fields as strings (not DB enums), UTC timestamps. Swap SQLite→Postgres by changing `datasource provider` in `schema.prisma` and setting `DATABASE_URL`.
- **Thin identity**: `holdKey` cookie for checkout flow, `riderEmail` cookie for "my orders". No full auth yet (magic-link deferred).
- **Atomic confirm**: `createOrder` runs in a Prisma transaction that re-verifies seats are unsold, creates order + items, deletes holds, creates payment record. This prevents double-booking even under concurrency.
- **Computed availability**: `getAvailability` calculates seat state from current DB state (sold seats + active holds). A seat held by a different `holdKey` shows as HELD; held by the same key shows as AVAILABLE (so the user sees their own hold as available).

## Deployment prep (when ready for production)
See `HANDOFF.md` for full deployment checklist, including:
- Database swap to Postgres
- Real payment gateway integration
- Auth implementation
- Email provider setup
- Monitoring and error tracking
- Load testing for seat-hold concurrency

## Team handoff
For detailed review notes, architecture decisions, known gaps, and deployment steps, see **`HANDOFF.md`**.
