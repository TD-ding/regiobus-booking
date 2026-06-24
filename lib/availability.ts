import { prisma } from "./db";
import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export interface SeatState {
  label: string;
  rowIndex: number;
  colIndex: number;
  seatClass: string;
  status: "AVAILABLE" | "SOLD" | "HELD"; // HELD = held by someone else
}

export interface AvailabilitySummary {
  seatSelection: boolean;
  totalSeats: number;
  seatsLeft: number;
  seats: SeatState[]; // empty for count-only departures
}

/**
 * Availability is COMPUTED, never stored:
 *   available = totalSeats - sold - active holds owned by others.
 * A seat is selectable iff it has no sold OrderItem and no unexpired hold from another holdKey.
 *
 * `ownHoldKey` lets the current checkout still "see" its own held seats as available.
 */
export async function getAvailability(
  departureId: string,
  ownHoldKey?: string,
  db: Db = prisma,
): Promise<AvailabilitySummary> {
  const departure = await db.departure.findUniqueOrThrow({
    where: { id: departureId },
    include: {
      seats: { include: { orderItem: true }, orderBy: [{ rowIndex: "asc" }, { colIndex: "asc" }] },
    },
  });

  const now = new Date();
  const activeHolds = await db.seatHold.findMany({
    where: { departureId, expiresAt: { gt: now } },
  });

  if (departure.seatSelection) {
    const heldByOthers = new Set(
      activeHolds
        .filter((h) => h.seatLabel && h.holdKey !== ownHoldKey)
        .map((h) => h.seatLabel as string),
    );

    const seats: SeatState[] = departure.seats.map((s) => ({
      label: s.label,
      rowIndex: s.rowIndex,
      colIndex: s.colIndex,
      seatClass: s.seatClass,
      status: s.orderItem ? "SOLD" : heldByOthers.has(s.label) ? "HELD" : "AVAILABLE",
    }));

    const seatsLeft = seats.filter((s) => s.status === "AVAILABLE").length;
    return { seatSelection: true, totalSeats: departure.totalSeats, seatsLeft, seats };
  }

  // Count-only: subtract sold items + quantities held by others.
  const soldCount = await db.orderItem.count({
    where: { order: { departureId, status: { in: ["PENDING", "PAID"] } } },
  });
  const heldByOthers = activeHolds
    .filter((h) => h.holdKey !== ownHoldKey)
    .reduce((sum, h) => sum + h.quantity, 0);

  const seatsLeft = Math.max(0, departure.totalSeats - soldCount - heldByOthers);
  return { seatSelection: false, totalSeats: departure.totalSeats, seatsLeft, seats: [] };
}
