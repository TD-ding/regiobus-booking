import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Simple seat-map layout generator: rows x cols with an aisle.
function buildLayout(rows: number, cols: number) {
  const seats: { label: string; row: number; col: number; class: string }[] = [];
  const colLetters = ["A", "B", "C", "D", "E", "F"];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      seats.push({ label: `${r + 1}${colLetters[c]}`, row: r, col: c, class: "STANDARD" });
    }
  }
  return { rows, cols, aisleAfterCol: Math.floor(cols / 2) - 1, seats };
}

async function main() {
  // Idempotent: clear in FK-safe order.
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.seatHold.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.departure.deleteMany();
  await prisma.route.deleteMany();
  await prisma.station.deleteMany();
  await prisma.city.deleteMany();

  const cityDefs = [
    { name: "Springfield", region: "Central Valley", station: { name: "Springfield Central", code: "SPG" } },
    { name: "Rivertown", region: "Central Valley", station: { name: "Rivertown Hub", code: "RVT" } },
    { name: "Lakeside", region: "Eastern Lakes", station: { name: "Lakeside Terminal", code: "LKS" } },
    { name: "Hillford", region: "Eastern Lakes", station: { name: "Hillford Station", code: "HLF" } },
    { name: "Pinecrest", region: "Western Hills", station: { name: "Pinecrest Depot", code: "PNC" } },
    { name: "Maple Bay", region: "Western Hills", station: { name: "Maple Bay Coachpark", code: "MPB" } },
  ];

  const stations: Record<string, { id: string; cityName: string }> = {};
  for (const c of cityDefs) {
    const city = await prisma.city.create({
      data: {
        name: c.name,
        region: c.region,
        stations: { create: { name: c.station.name, code: c.station.code } },
      },
      include: { stations: true },
    });
    stations[c.station.code] = { id: city.stations[0].id, cityName: c.name };
  }

  // Routes (origin -> destination). Last one is count-only (open seating).
  const routeDefs = [
    { o: "SPG", d: "RVT", min: 90, price: 1800, seatSelection: true, rows: 10, cols: 4 },
    { o: "RVT", d: "SPG", min: 90, price: 1800, seatSelection: true, rows: 10, cols: 4 },
    { o: "SPG", d: "LKS", min: 150, price: 2600, seatSelection: true, rows: 12, cols: 4 },
    { o: "LKS", d: "HLF", min: 60, price: 1200, seatSelection: true, rows: 8, cols: 4 },
    { o: "HLF", d: "PNC", min: 210, price: 3200, seatSelection: true, rows: 12, cols: 4 },
    { o: "PNC", d: "MPB", min: 75, price: 1500, seatSelection: true, rows: 10, cols: 4 },
    { o: "MPB", d: "SPG", min: 240, price: 3500, seatSelection: false, rows: 0, cols: 0 }, // count-only
    { o: "LKS", d: "SPG", min: 150, price: 2600, seatSelection: false, rows: 0, cols: 0 }, // count-only
  ];

  const departureTimes = ["07:30", "11:00", "15:30", "19:00"]; // local times
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const r of routeDefs) {
    const route = await prisma.route.create({
      data: {
        originId: stations[r.o].id,
        destinationId: stations[r.d].id,
        durationMinutes: r.min,
        basePriceCents: r.price,
      },
    });

    const totalSeats = r.seatSelection ? r.rows * r.cols : 50;
    const layout = r.seatSelection ? buildLayout(r.rows, r.cols) : null;

    // 3 days of departures.
    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
      for (const t of departureTimes) {
        const [hh, mm] = t.split(":").map(Number);
        const departAt = new Date(today);
        departAt.setDate(departAt.getDate() + dayOffset);
        departAt.setHours(hh, mm, 0, 0);
        const arriveAt = new Date(departAt.getTime() + r.min * 60000);

        const departure = await prisma.departure.create({
          data: {
            routeId: route.id,
            departAt,
            arriveAt,
            priceCents: r.price,
            seatSelection: r.seatSelection,
            totalSeats,
            layout: layout ?? undefined,
          },
        });

        if (r.seatSelection && layout) {
          await prisma.seat.createMany({
            data: layout.seats.map((s) => ({
              departureId: departure.id,
              label: s.label,
              rowIndex: s.row,
              colIndex: s.col,
              seatClass: s.class,
            })),
          });
        }
      }
    }
  }

  const counts = {
    cities: await prisma.city.count(),
    stations: await prisma.station.count(),
    routes: await prisma.route.count(),
    departures: await prisma.departure.count(),
    seats: await prisma.seat.count(),
  };
  console.log("Seeded:", counts);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
