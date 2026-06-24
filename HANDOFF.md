# RegioBus — Handoff Notes

## What this is
A mobile-first MVP for booking regional coach tickets. The full happy path is live: search departures → pick seats or quantity → enter passenger details → confirm → mock payment → view orders → cancel bookings.

## What works right now
- **Search**: Bottom-sheet station picker (grouped by city, searchable), date + rider count.
- **Results**: Scannable departure cards with times, duration, price, and seat availability (with urgency for low stock).
- **Seat selection**: Visual seat map for assigned-seat departures; quantity picker for open seating.
- **Checkout flow**: Multi-passenger form with inline validation, review screen with hold expiry detection, mock payment with success/failure simulation.
- **Orders**: My trips list with status badges, detail page with QR code and booking reference, cancellation with refund.
- **Seat holds**: 10-minute TTL with atomic confirm transaction that re-verifies no double-booking.
- **Computed availability**: Never stored, always calculated from sold seats + active holds (excluding the user's own hold).

## Stack & portability
- **Next.js 14.2 App Router** + TypeScript, React 18.3, server actions for mutations.
- **Prisma 6.19** on SQLite in dev, designed for zero-churn swap to Postgres (integer cents for money, string status fields, UTC datetimes, no DB-specific features).
- **Tailwind CSS 3.4** mobile-first (max-w-md shell, sticky bottom CTAs).
- **Zod 4.4** shared client/server validation.
- **Vitest 4.1** for focused tests (7 passing: seat-hold→confirm, concurrency, cancel, count-only, payment retry).

## Data model highlights
- **Seat holds** (`SeatHold`) with `expiresAt` + holdKey (http-only cookie). Can hold specific seats OR a quantity.
- **Atomic order confirm** (Prisma `$transaction`): re-check seats unsold, create order + items, delete holds, create payment record.
- **Payment** is a mock `PaymentProvider` interface (`lib/payment.ts`) — swap in Stripe/etc. without touching the flow.
- **Thin identity**: holdKey for checkout, riderEmail cookie for "my orders". No real auth yet (magic-link deferred to phase 2).

## Run it locally
```bash
cd booking
npm install
npx prisma migrate dev    # creates dev.db
npm run seed              # demo data: 6 cities, 8 routes, 96 departures over 3 days
npm run dev               # http://localhost:3000
npm test                  # 7 tests, should all pass
npm run build             # production build (validates types + builds)
```

## What to review
1. **Mobile feel**: Open DevTools mobile view (360×640), search Springfield → Rivertown, pick seats, complete a booking. The station picker and results cards should feel like a real travel product.
2. **Seat-hold flow**: Book a departure with seat selection, then open a private/incognito window and try to book the same seat — should be blocked. Complete the first booking, then the seat becomes available again in the second window.
3. **Error states**: Try payment failure (click "Simulate failed payment"), verify it stays retryable. Let a seat hold expire (wait 10min or mock it by deleting holds in DB), verify the review page shows a clear recovery path.
4. **Accessibility**: Tab through the search form, station picker, and checkout — focus states should be visible, labels should be present.

## Not in this slice (known gaps)
- **Real auth**: Currently just cookies. Magic-link or OAuth needed for production.
- **Hold expiry countdown**: Users don't see the 10-minute timer ticking down (backend enforces it, UI doesn't show it).
- **Real payment gateway**: Mock only. Stripe/Adyen/etc. swap requires implementing the `PaymentProvider` interface in `lib/payment.ts`.
- **Partial refunds**: Cancel is all-or-nothing. Partial cancellation (some passengers) not implemented.
- **Empty/loading polish**: Some screens could use richer loading skeletons and empty states (done for orders and search results, but not everywhere).
- **Email confirmations**: No emails sent on booking/cancel (backend action exists, email step not wired).

## Key files
- `lib/booking.ts` — core domain logic: holdSeats, createOrder, runPayment, cancelOrder.
- `lib/availability.ts` — computed availability (never stored).
- `lib/payment.ts` — PaymentProvider interface + MockProvider.
- `prisma/schema.prisma` — data model (10 models, portable to Postgres).
- `app/actions.ts` — all server actions (search, hold, passengers, confirm, pay, cancel).
- `tests/booking.test.ts` — 7 focused tests proving the critical paths work.

## Deployment checklist (when ready)
1. Swap `datasource db` in `schema.prisma` to `provider = "postgresql"`, set `DATABASE_URL` to Postgres.
2. Run `npx prisma migrate dev` against Postgres (creates tables).
3. Seed production data (real routes, real schedules).
4. Swap `MockProvider` for real payment gateway in `lib/payment.ts`.
5. Add real auth (magic-link, OAuth, or session-based).
6. Configure email provider (Resend, SendGrid, etc.) and wire booking confirmations.
7. Set up monitoring (Sentry, Datadog, etc.) for payment failures and booking errors.
8. Test seat-hold expiry and concurrency under load (current TTL is 10 minutes, tune if needed).

## Questions or issues?
If something doesn't work or the instructions are unclear, check:
- `npm test` — should be 7/7 passing.
- `npm run build` — should complete without errors.
- `dev.db` exists after `npx prisma migrate dev`.
- Seed data loaded after `npm run seed` (should print counts).

If tests fail or the build breaks, restore to a clean state:
```bash
rm -f dev.db dev.db-journal .next -rf node_modules
npm install
npx prisma migrate dev
npm run seed
npm test
```
