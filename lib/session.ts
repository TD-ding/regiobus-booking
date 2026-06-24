import { cookies } from "next/headers";

const HOLD_COOKIE = "holdKey";
const RIDER_COOKIE = "riderEmail";

function randomKey() {
  return `hk_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/** Get the current checkout holdKey, creating one if absent. */
export function getHoldKey(): string {
  const store = cookies();
  let key = store.get(HOLD_COOKIE)?.value;
  if (!key) {
    key = randomKey();
    store.set(HOLD_COOKIE, key, { httpOnly: true, sameSite: "lax", path: "/" });
  }
  return key;
}

export function peekHoldKey(): string | undefined {
  return cookies().get(HOLD_COOKIE)?.value;
}

export function resetHoldKey(): void {
  cookies().set(HOLD_COOKIE, randomKey(), { httpOnly: true, sameSite: "lax", path: "/" });
}

/** Thin identity: we remember the rider's email after checkout so /orders works. */
export function getRiderEmail(): string | undefined {
  return cookies().get(RIDER_COOKIE)?.value;
}

export function setRiderEmail(email: string): void {
  cookies().set(RIDER_COOKIE, email, { httpOnly: true, sameSite: "lax", path: "/" });
}
