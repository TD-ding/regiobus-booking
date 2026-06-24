import { z } from "zod";

export const searchSchema = z.object({
  originStationId: z.string().min(1, "Choose an origin"),
  destStationId: z.string().min(1, "Choose a destination"),
  date: z.string().min(1, "Choose a date"), // yyyy-mm-dd
  pax: z.coerce.number().int().min(1).max(8).default(1),
});
export type SearchInput = z.infer<typeof searchSchema>;

// For assigned-seat departures: list of seat labels. For count-only: a quantity.
export const holdSchema = z
  .object({
    departureId: z.string().min(1),
    seatLabels: z.array(z.string().min(1)).optional(),
    quantity: z.coerce.number().int().min(1).max(8).optional(),
  })
  .refine((v) => (v.seatLabels && v.seatLabels.length > 0) || (v.quantity && v.quantity > 0), {
    message: "Select at least one seat or a ticket quantity",
  });
export type HoldInput = z.infer<typeof holdSchema>;

export const passengerSchema = z.object({
  name: z.string().min(2, "Enter a name"),
  doc: z.string().optional(),
});

export const passengersSchema = z.object({
  passengers: z.array(passengerSchema).min(1),
  contactEmail: z.string().email("Enter a valid email"),
  contactPhone: z.string().optional(),
});
export type PassengersInput = z.infer<typeof passengersSchema>;

export const paymentSchema = z.object({
  orderRef: z.string().min(1),
  simulate: z.enum(["success", "fail"]).default("success"),
});
