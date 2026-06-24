import { prisma } from "./db";
import { getAvailability } from "./availability";
import { HOLD_TTL_MS, generateReference } from "./util";
import { paymentProvider } from "./payment";

export class BookingError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "BookingError";
  }
}

const ACTIVE_RIDER_ORDER = ["PENDING", "PAID"] as const;

/**
 * Create/replace seat holds for a checkout session (holdKey), with a TTL.
 * Re-validates availability first so we never hold a seat that's sold or held by others.
 */
export async function holdSeats(input: {
  departureId: string;
  holdKey: string;
  seatLabels?: string[];
  quantity?: number;
}): Promise<{ expiresAt: Date }> {
  const { departureId, holdKey } = input;
  const expiresAt = new Date(Date.now() + HOLD_TTL_MS);

  return prisma.$transaction(async (tx) => {
    const departure = await tx.departure.findUniqueOrThrow({ where: { id: departureId } });
    if (departure.status !== "SCHEDULED") {
      throw new BookingError("DEPARTURE_UNAVAILABLE", "This departure is no longer available.");
    }

    const avail = await getAvailability(departureId, holdKey, tx);

    // Clear this checkout's previous holds for the departure (re-selection replaces them).
    await tx.seatHold.deleteMany({ where: { departureId, holdKey } });

    if (departure.seatSelection) {
      const labels = input.seatLabels ?? [];
      if (labels.length === 0) {
        throw new BookingError("NO_SEATS", "Select at least one seat.");
      }
      const selectable = new Set(
        avail.seats.filter((s) => s.status === "AVAILABLE").map((s) => s.label),
      );
      const taken = labels.filter((l) => !selectable.has(l));
      if (taken.length > 0) {
        throw new BookingError(
          "SEAT_TAKEN",
          `Seat(s) ${taken.join(", ")} are no longer available. Please pick again.`,
        );
      }
      await tx.seatHold.createMany({
        data: labels.map((label) => ({ departureId, holdKey, seatLabel: label, expiresAt })),
      });
    } else {
      const qty = input.quantity ?? 0;
      if (qty < 1) throw new BookingError("NO_QUANTITY", "Choose a ticket quantity.");
      if (qty > avail.seatsLeft) {
        throw new BookingError("SOLD_OUT", `Only ${avail.seatsLeft} seats left on this departure.`);
      }
      await tx.seatHold.create({
        data: { departureId, holdKey, seatLabel: null, quantity: qty, expiresAt },
      });
    }

    return { expiresAt };
  });
}

export async function releaseHold(holdKey: string): Promise<void> {
  await prisma.seatHold.deleteMany({ where: { holdKey } });
}

async function upsertRider(contactEmail: string, contactPhone?: string) {
  const existing = await prisma.rider.findUnique({ where: { email: contactEmail } });
  if (existing) return existing;
  return prisma.rider.create({ data: { email: contactEmail, phone: contactPhone || null } });
}

/**
 * THE trust-critical step. In one transaction:
 *  1. re-verify every hold is still ours and unexpired,
 *  2. create Order + OrderItems (linking seats for assigned-seat departures),
 *  3. delete the holds (promote hold -> sold),
 *  4. create the Payment row (REQUIRES_PAYMENT).
 * If any seat was lost in the meantime, the whole transaction aborts.
 */
export async function createOrder(input: {
  holdKey: string;
  departureId: string;
  passengers: { name: string; doc?: string }[];
  contactEmail: string;
  contactPhone?: string;
}): Promise<{ reference: string }> {
  const { holdKey, departureId, passengers, contactEmail, contactPhone } = input;
  const rider = await upsertRider(contactEmail, contactPhone);

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const departure = await tx.departure.findUniqueOrThrow({ where: { id: departureId } });
    if (departure.status !== "SCHEDULED") {
      throw new BookingError("DEPARTURE_UNAVAILABLE", "This departure is no longer available.");
    }

    const holds = await tx.seatHold.findMany({
      where: { departureId, holdKey, expiresAt: { gt: now } },
    });
    if (holds.length === 0) {
      throw new BookingError("HOLD_EXPIRED", "Your seat hold expired. Please select seats again.");
    }

    let items: { passengerName: string; passengerDoc: string | null; priceCents: number; seatId: string | null }[];

    if (departure.seatSelection) {
      const heldLabels = holds.map((h) => h.seatLabel).filter(Boolean) as string[];
      if (heldLabels.length !== passengers.length) {
        throw new BookingError(
          "PASSENGER_MISMATCH",
          "Passenger count does not match the seats held.",
        );
      }
      const seats = await tx.seat.findMany({
        where: { departureId, label: { in: heldLabels } },
        include: { orderItem: true },
      });
      // Re-verify each held seat is still unsold (someone else could have completed first).
      for (const seat of seats) {
        if (seat.orderItem) {
          throw new BookingError(
            "SEAT_TAKEN",
            `Seat ${seat.label} was just taken. Please pick again.`,
          );
        }
      }
      const seatByLabel = new Map(seats.map((s) => [s.label, s]));
      items = passengers.map((p, i) => ({
        passengerName: p.name,
        passengerDoc: p.doc || null,
        priceCents: departure.priceCents,
        seatId: seatByLabel.get(heldLabels[i])!.id,
      }));
    } else {
      const qty = holds.reduce((sum, h) => sum + h.quantity, 0);
      if (qty !== passengers.length) {
        throw new BookingError(
          "PASSENGER_MISMATCH",
          "Passenger count does not match the tickets held.",
        );
      }
      items = passengers.map((p) => ({
        passengerName: p.name,
        passengerDoc: p.doc || null,
        priceCents: departure.priceCents,
        seatId: null,
      }));
    }

    const totalCents = items.reduce((sum, it) => sum + it.priceCents, 0);

    const order = await tx.order.create({
      data: {
        reference: generateReference(),
        riderId: rider.id,
        departureId,
        status: "PENDING",
        totalCents,
        currency: departure.currency,
        contactEmail,
        contactPhone: contactPhone || null,
        items: { create: items },
        payment: {
          create: {
            provider: "mock",
            status: "REQUIRES_PAYMENT",
            amountCents: totalCents,
            currency: departure.currency,
          },
        },
      },
    });

    // Promote: holds are now realized as sold OrderItems.
    await tx.seatHold.deleteMany({ where: { departureId, holdKey } });

    return { reference: order.reference };
  });
}

/** Run the (mock) payment for a PENDING order and mark it PAID on success. */
export async function runPayment(input: {
  orderRef: string;
  simulate?: "success" | "fail";
}): Promise<{ ok: boolean; status: string }> {
  const order = await prisma.order.findUniqueOrThrow({
    where: { reference: input.orderRef },
    include: { payment: true },
  });
  if (order.status === "PAID") return { ok: true, status: "PAID" };
  if (order.status !== "PENDING") {
    throw new BookingError("ORDER_NOT_PAYABLE", "This order can no longer be paid.");
  }

  const intent = await paymentProvider.createIntent({
    orderRef: order.reference,
    amountCents: order.totalCents,
    currency: order.currency,
  });
  const result = await paymentProvider.confirm(intent.intentId, { simulate: input.simulate });

  if (!result.ok) {
    await prisma.payment.update({
      where: { orderId: order.id },
      data: { status: "FAILED", externalRef: result.externalRef },
    });
    return { ok: false, status: "FAILED" };
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { orderId: order.id },
      data: { status: "CAPTURED", externalRef: result.externalRef },
    }),
    prisma.order.update({ where: { id: order.id }, data: { status: "PAID" } }),
  ]);
  return { ok: true, status: "PAID" };
}

/** Cancel an order: release seats (delete OrderItems) and refund the payment. */
export async function cancelOrder(orderRef: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { reference: orderRef },
      include: { payment: true },
    });
    if (order.status === "CANCELLED") return;
    if (!ACTIVE_RIDER_ORDER.includes(order.status as (typeof ACTIVE_RIDER_ORDER)[number])) {
      throw new BookingError("NOT_CANCELLABLE", "This order cannot be cancelled.");
    }

    // Deleting OrderItems frees the seats back into the available pool (seat.orderItem becomes null).
    await tx.orderItem.deleteMany({ where: { orderId: order.id } });
    await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    if (order.payment && order.payment.status === "CAPTURED") {
      await tx.payment.update({ where: { orderId: order.id }, data: { status: "REFUNDED" } });
    }
  });
}
