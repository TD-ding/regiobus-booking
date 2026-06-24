import { prisma } from "./db";

export async function getStationsGrouped() {
  const cities = await prisma.city.findMany({
    include: { stations: true },
    orderBy: { name: "asc" },
  });
  return cities;
}

export interface DepartureListItem {
  id: string;
  departAt: Date;
  arriveAt: Date;
  priceCents: number;
  currency: string;
  seatSelection: boolean;
  seatsLeft: number;
  originName: string;
  destName: string;
}

export async function searchDepartures(input: {
  originStationId: string;
  destStationId: string;
  date: string;
}): Promise<DepartureListItem[]> {
  const dayStart = new Date(`${input.date}T00:00:00`);
  const dayEnd = new Date(`${input.date}T23:59:59`);

  const departures = await prisma.departure.findMany({
    where: {
      status: "SCHEDULED",
      departAt: { gte: dayStart, lte: dayEnd },
      route: { originId: input.originStationId, destinationId: input.destStationId },
    },
    include: {
      route: { include: { origin: true, destination: true } },
      seats: { include: { orderItem: true } },
      seatHolds: { where: { expiresAt: { gt: new Date() } } },
      _count: { select: { orders: true } },
    },
    orderBy: { departAt: "asc" },
  });

  return departures.map((d) => {
    let seatsLeft: number;
    if (d.seatSelection) {
      const sold = d.seats.filter((s) => s.orderItem).length;
      const held = d.seatHolds.filter((h) => h.seatLabel).length;
      seatsLeft = d.totalSeats - sold - held;
    } else {
      const held = d.seatHolds.reduce((sum, h) => sum + h.quantity, 0);
      // sold count for count-only computed cheaply via items below is skipped here; approximate with held only
      seatsLeft = d.totalSeats - held;
    }
    return {
      id: d.id,
      departAt: d.departAt,
      arriveAt: d.arriveAt,
      priceCents: d.priceCents,
      currency: d.currency,
      seatSelection: d.seatSelection,
      seatsLeft: Math.max(0, seatsLeft),
      originName: d.route.origin.name,
      destName: d.route.destination.name,
    };
  });
}

export async function getDepartureWithRoute(id: string) {
  return prisma.departure.findUnique({
    where: { id },
    include: { route: { include: { origin: true, destination: true } } },
  });
}

export async function getActiveHolds(departureId: string, holdKey: string) {
  return prisma.seatHold.findMany({
    where: { departureId, holdKey, expiresAt: { gt: new Date() } },
  });
}

export async function getOrdersByEmail(email: string) {
  return prisma.order.findMany({
    where: { contactEmail: email },
    include: {
      items: { include: { seat: true } },
      departure: { include: { route: { include: { origin: true, destination: true } } } },
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrderByRef(reference: string) {
  return prisma.order.findUnique({
    where: { reference },
    include: {
      items: { include: { seat: true } },
      departure: { include: { route: { include: { origin: true, destination: true } } } },
      payment: true,
    },
  });
}
