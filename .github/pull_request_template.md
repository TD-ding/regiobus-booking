# Pull Request: Mobile-first booking MVP

## Overview
Complete implementation of the RegioBus booking flow, from search to payment to order management. This PR delivers a production-ready MVP that feels like a real travel product on mobile.

## What's included

### Core booking flow
- **Search with station picker**: Bottom-sheet UI, grouped by city, searchable, mobile-optimized
- **Scannable results**: Journey cards showing depart/arrive times, duration, price, and seat availability with urgency badges
- **Seat selection**: Visual seat map for assigned-seat departures; quantity picker for open seating
- **10-minute seat holds**: TTL-based holds with atomic confirm transaction that prevents double-booking
- **Multi-passenger checkout**: Inline validation, contact email for order lookup
- **Mock payment**: Success/failure simulation, retryable on failure
- **Order management**: View all trips, booking reference + QR code, cancel with refund

### Product quality
- **Loading states**: Spinners during search, confirm, and payment
- **Error recovery**: Expired holds, payment failures, validation errors, cancellation failures — all have clear recovery paths
- **Empty states**: No search results, no orders
- **Success confirmations**: Clear messaging after booking and cancellation
- **Form validation**: Inline validation with helpful error messages on search and passenger forms
- **Accessibility**: Proper labels, visible focus states, keyboard navigation, WCAG-compliant contrast
- **Responsive**: Mobile-first design (max-w-md shell), works on 360×640 and up

### Technical implementation
- **Computed availability**: Real-time seat state (AVAILABLE/SOLD/HELD), never stored, calculated from current DB state
- **Atomic confirm transaction**: Re-verifies seats unsold, creates order + items, deletes holds, creates payment record — all in one Prisma transaction
- **Portable data model**: Integer cents for money, string status fields (not DB enums), UTC timestamps — designed for SQLite→Postgres swap with zero code change
- **Thin identity**: holdKey cookie for checkout, riderEmail for orders (magic-link auth deferred to phase 2)
- **Mock payment provider**: Behind a swappable interface (`lib/payment.ts`)

## Testing
- **7 passing tests**: Seat-hold→confirm, concurrency/double-booking prevention, cancellation, count-only departures, payment retry
- **Production build**: Verified green from clean state (`npm run build`)
- **CI pipeline**: GitHub Actions workflow runs tests + build on push/PR

## Deployment
- **Docker ready**: Dockerfile + docker-compose.yml with SQLite (production Postgres config commented and ready)
- **Standalone output**: Next.js standalone mode for optimized Docker images
- **See**: `DOCKER.md` for deployment instructions, `HANDOFF.md` for full review notes

## Run it locally
```bash
npm install
npx prisma migrate dev
npm run seed
npm run dev         # http://localhost:3000
npm test            # 7/7 should pass
npm run build       # should complete successfully
```

## Review checklist
- [x] Production build green from clean state
- [x] All tests passing (7/7)
- [x] Mobile UX feels like a real travel product
- [x] Error states have clear recovery paths
- [x] Loading and empty states implemented
- [x] Form validation with inline messages
- [x] Accessibility: labels, focus, keyboard nav
- [x] CI/CD pipeline configured
- [x] Docker deployment ready
- [x] Documentation complete (README, HANDOFF, DOCKER)

## What to test
1. **Mobile flow**: DevTools mobile view (360×640), search Springfield → Rivertown, pick seats, complete booking
2. **Seat-hold protection**: Book a seat, then try to book the same seat in incognito — should be blocked
3. **Error recovery**: Try payment failure button, verify retry works; try cancelling an order
4. **Accessibility**: Tab through forms, verify focus states and keyboard navigation

## Known limitations (deferred to phase 2)
- No real auth (magic-link planned)
- No hold-expiry countdown in UI (backend enforces 10min)
- Mock payment only (real gateway via `PaymentProvider` interface)
- No partial refunds (cancel is all-or-nothing)
- No email confirmations

## Questions?
See `HANDOFF.md` for detailed architecture notes, deployment checklist, and troubleshooting.

---

🤖 Built with Claude Code
