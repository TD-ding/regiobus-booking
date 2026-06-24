"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { holdSeats, createOrder, runPayment, cancelOrder, releaseHold, BookingError } from "@/lib/booking";
import { getHoldKey, setRiderEmail, resetHoldKey } from "@/lib/session";
import { holdSchema, passengersSchema, searchSchema, paymentSchema } from "@/lib/schemas";

export type ActionState = { error?: string } | undefined;

const DRAFT_COOKIE = "passengerDraft";

export async function searchAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = searchSchema.safeParse({
    originStationId: formData.get("originStationId"),
    destStationId: formData.get("destStationId"),
    date: formData.get("date"),
    pax: formData.get("pax"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  if (parsed.data.originStationId === parsed.data.destStationId) {
    return { error: "Origin and destination must differ." };
  }
  const { originStationId, destStationId, date, pax } = parsed.data;
  const qs = new URLSearchParams({ originStationId, destStationId, date, pax: String(pax) });
  redirect(`/search?${qs.toString()}`);
}

export async function holdAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const seatLabels = formData.getAll("seatLabels").map(String).filter(Boolean);
  const quantityRaw = formData.get("quantity");
  const parsed = holdSchema.safeParse({
    departureId: formData.get("departureId"),
    seatLabels: seatLabels.length > 0 ? seatLabels : undefined,
    quantity: quantityRaw ? Number(quantityRaw) : undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const holdKey = getHoldKey();
  try {
    await holdSeats({
      departureId: parsed.data.departureId,
      holdKey,
      seatLabels: parsed.data.seatLabels,
      quantity: parsed.data.quantity,
    });
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    throw e;
  }
  // Stash how many passengers we expect (seat count or quantity) for the checkout form.
  const pax = parsed.data.seatLabels?.length ?? parsed.data.quantity ?? 1;
  cookies().set("paxCount", String(pax), { httpOnly: true, sameSite: "lax", path: "/" });
  cookies().set("departureId", parsed.data.departureId, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/checkout");
}

export async function passengersAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const names = formData.getAll("name").map(String);
  const docs = formData.getAll("doc").map(String);
  const passengers = names.map((name, i) => ({ name, doc: docs[i] || undefined }));
  const parsed = passengersSchema.safeParse({
    passengers,
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  cookies().set(DRAFT_COOKIE, JSON.stringify(parsed.data), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  redirect("/checkout/review");
}

export async function confirmOrderAction(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  const draftRaw = cookies().get(DRAFT_COOKIE)?.value;
  const departureId = cookies().get("departureId")?.value;
  const holdKey = getHoldKey();
  if (!draftRaw || !departureId) return { error: "Your session expired. Please start again." };
  const draft = JSON.parse(draftRaw) as {
    passengers: { name: string; doc?: string }[];
    contactEmail: string;
    contactPhone?: string;
  };

  let reference: string;
  try {
    const res = await createOrder({
      holdKey,
      departureId,
      passengers: draft.passengers,
      contactEmail: draft.contactEmail,
      contactPhone: draft.contactPhone,
    });
    reference = res.reference;
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    throw e;
  }
  setRiderEmail(draft.contactEmail);
  redirect(`/checkout/payment?ref=${reference}`);
}

export async function payAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = paymentSchema.safeParse({
    orderRef: formData.get("orderRef"),
    simulate: formData.get("simulate") || "success",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  let result: { ok: boolean; status: string };
  try {
    result = await runPayment({ orderRef: parsed.data.orderRef, simulate: parsed.data.simulate });
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    throw e;
  }
  if (!result.ok) {
    return { error: "Payment failed. Please try again." };
  }
  // Clean up checkout cookies and rotate the holdKey for the next booking.
  cookies().delete(DRAFT_COOKIE);
  cookies().delete("paxCount");
  cookies().delete("departureId");
  resetHoldKey();
  redirect(`/orders/${parsed.data.orderRef}?booked=1`);
}

export async function cancelOrderAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ref = String(formData.get("orderRef") || "");
  if (!ref) return { error: "Order reference is missing." };
  try {
    await cancelOrder(ref);
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    throw e;
  }
  redirect(`/orders/${ref}?cancelled=1`);
}
