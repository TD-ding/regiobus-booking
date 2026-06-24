import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/db";
import { holdSeats, createOrder, runPayment, cancelOrder, BookingError } from "@/lib/booking";
import { getAvailability } from "@/lib/availability";
import { resetDb, firstSeatDeparture, firstCountDeparture } from "./helpers";

beforeAll(async () => {
  await resetDb();
}, 60000);

describe("seat-hold -> confirm happy path", () => {
  it("holds, confirms (promote hold->sold), pays, and the order is PAID", async () => {
    const dep = await firstSeatDeparture();
    const seat = dep.seats[0].label;
    const holdKey = "hk_happy";

    const { expiresAt } = await holdSeats({ departureId: dep.id, holdKey, seatLabels: [seat] });
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    // Seat is HELD for others, AVAILABLE for its own holder.
    const availOther = await getAvailability(dep.id, "someone_else");
    expect(availOther.seats.find((s) => s.label === seat)?.status).toBe("HELD");
    const availSelf = await getAvailability(dep.id, holdKey);
    expect(availSelf.seats.find((s) => s.label === seat)?.status).toBe("AVAILABLE");

    const { reference } = await createOrder({
      holdKey,
      departureId: dep.id,
      passengers: [{ name: "Ada Lovelace" }],
      contactEmail: "ada@example.com",
    });
    expect(reference).toMatch(/^BX-[A-Z0-9]{6}$/);

    // Hold is consumed; seat is now SOLD globally.
    expect(await prisma.seatHold.count({ where: { departureId: dep.id, holdKey } })).toBe(0);
    const availSold = await getAvailability(dep.id, holdKey);
    expect(availSold.seats.find((s) => s.label === seat)?.status).toBe("SOLD");

    let order = await prisma.order.findUniqueOrThrow({ where: { reference } });
    expect(order.status).toBe("PENDING");

    const pay = await runPayment({ orderRef: reference, simulate: "success" });
    expect(pay.ok).toBe(true);

    order = await prisma.order.findUniqueOrThrow({ where: { reference } });
    expect(order.status).toBe("PAID");
    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: order.id } });
    expect(payment.status).toBe("CAPTURED");
  });
});

describe("concurrency: no double-booking", () => {
  it("a second checkout cannot hold a seat already held by another", async () => {
    const dep = await firstSeatDeparture();
    const seat = dep.seats[5].label;

    await holdSeats({ departureId: dep.id, holdKey: "hk_A", seatLabels: [seat] });

    await expect(
      holdSeats({ departureId: dep.id, holdKey: "hk_B", seatLabels: [seat] }),
    ).rejects.toMatchObject({ code: "SEAT_TAKEN" });
  });

  it("a checkout cannot confirm a seat that another already SOLD", async () => {
    const dep = await firstSeatDeparture();
    const seat = dep.seats[6].label;

    // Both A and B manage to place a hold row only if timing differs; simulate the dangerous case:
    // A holds and confirms first, then B (with a stale hold row) tries to confirm the same seat.
    await holdSeats({ departureId: dep.id, holdKey: "hk_A2", seatLabels: [seat] });
    // Force a stale hold for B directly (bypassing the hold guard) to exercise the confirm-time re-check.
    await prisma.seatHold.create({
      data: {
        departureId: dep.id,
        holdKey: "hk_B2",
        seatLabel: seat,
        expiresAt: new Date(Date.now() + 600000),
      },
    });

    await createOrder({
      holdKey: "hk_A2",
      departureId: dep.id,
      passengers: [{ name: "First Winner" }],
      contactEmail: "winner@example.com",
    });

    // B's confirm must abort because the seat is now SOLD.
    await expect(
      createOrder({
        holdKey: "hk_B2",
        departureId: dep.id,
        passengers: [{ name: "Too Late" }],
        contactEmail: "late@example.com",
      }),
    ).rejects.toBeInstanceOf(BookingError);
  });
});

describe("cancel releases the seat", () => {
  it("cancels a paid order, refunds, and frees the seat back to AVAILABLE", async () => {
    const dep = await firstSeatDeparture();
    const seat = dep.seats[10].label;
    const holdKey = "hk_cancel";

    await holdSeats({ departureId: dep.id, holdKey, seatLabels: [seat] });
    const { reference } = await createOrder({
      holdKey,
      departureId: dep.id,
      passengers: [{ name: "Grace Hopper" }],
      contactEmail: "grace@example.com",
    });
    await runPayment({ orderRef: reference, simulate: "success" });

    // Sold before cancel.
    let avail = await getAvailability(dep.id);
    expect(avail.seats.find((s) => s.label === seat)?.status).toBe("SOLD");

    await cancelOrder(reference);

    const order = await prisma.order.findUniqueOrThrow({ where: { reference } });
    expect(order.status).toBe("CANCELLED");
    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: order.id } });
    expect(payment.status).toBe("REFUNDED");

    // Seat is available again.
    avail = await getAvailability(dep.id);
    expect(avail.seats.find((s) => s.label === seat)?.status).toBe("AVAILABLE");
  });
});

describe("count-only departures", () => {
  it("holds a quantity, confirms multiple passengers, and decrements availability", async () => {
    const dep = await firstCountDeparture();
    const before = await getAvailability(dep.id);
    expect(before.seatSelection).toBe(false);

    const holdKey = "hk_count";
    await holdSeats({ departureId: dep.id, holdKey, quantity: 3 });

    // Held quantity is reflected for other shoppers.
    const other = await getAvailability(dep.id, "other_shopper");
    expect(other.seatsLeft).toBe(before.seatsLeft - 3);

    const { reference } = await createOrder({
      holdKey,
      departureId: dep.id,
      passengers: [{ name: "P1" }, { name: "P2" }, { name: "P3" }],
      contactEmail: "group@example.com",
    });
    await runPayment({ orderRef: reference, simulate: "success" });

    const after = await getAvailability(dep.id);
    expect(after.seatsLeft).toBe(before.seatsLeft - 3);

    const order = await prisma.order.findUniqueOrThrow({
      where: { reference },
      include: { items: true },
    });
    expect(order.items).toHaveLength(3);
    expect(order.items.every((it) => it.seatId === null)).toBe(true);
  });

  it("rejects a quantity larger than seats left", async () => {
    const dep = await firstCountDeparture();
    const avail = await getAvailability(dep.id);
    await expect(
      holdSeats({ departureId: dep.id, holdKey: "hk_over", quantity: avail.seatsLeft + 5 }),
    ).rejects.toMatchObject({ code: "SOLD_OUT" });
  });
});

describe("payment failure keeps order payable", () => {
  it("a failed payment leaves the order PENDING and retryable", async () => {
    const dep = await firstSeatDeparture();
    const seat = dep.seats[15].label;
    const holdKey = "hk_payfail";

    await holdSeats({ departureId: dep.id, holdKey, seatLabels: [seat] });
    const { reference } = await createOrder({
      holdKey,
      departureId: dep.id,
      passengers: [{ name: "Retry Rider" }],
      contactEmail: "retry@example.com",
    });

    const failed = await runPayment({ orderRef: reference, simulate: "fail" });
    expect(failed.ok).toBe(false);
    let order = await prisma.order.findUniqueOrThrow({ where: { reference } });
    expect(order.status).toBe("PENDING");

    // Retry succeeds.
    const ok = await runPayment({ orderRef: reference, simulate: "success" });
    expect(ok.ok).toBe(true);
    order = await prisma.order.findUniqueOrThrow({ where: { reference } });
    expect(order.status).toBe("PAID");
  });
});
