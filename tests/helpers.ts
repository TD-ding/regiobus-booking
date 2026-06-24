import { execSync } from "node:child_process";
import { prisma } from "@/lib/db";

// Reset DB to a known seeded state once before the whole suite.
export async function resetDb() {
  execSync("npx tsx prisma/seed.ts", { stdio: "ignore" });
}

export async function firstSeatDeparture() {
  const d = await prisma.departure.findFirstOrThrow({
    where: { seatSelection: true },
    include: { seats: { orderBy: [{ rowIndex: "asc" }, { colIndex: "asc" }] } },
  });
  return d;
}

export async function firstCountDeparture() {
  return prisma.departure.findFirstOrThrow({ where: { seatSelection: false } });
}
