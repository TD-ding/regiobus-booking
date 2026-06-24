// Payment abstraction. MVP ships MockProvider; a real gateway implements the same interface later.

export interface PaymentIntent {
  intentId: string;
  amountCents: number;
  currency: string;
}

export interface PaymentResult {
  ok: boolean;
  status: "CAPTURED" | "FAILED";
  externalRef: string;
}

export interface PaymentProvider {
  createIntent(o: { orderRef: string; amountCents: number; currency: string }): Promise<PaymentIntent>;
  confirm(intentId: string, opts?: { simulate?: "success" | "fail" }): Promise<PaymentResult>;
}

export class MockProvider implements PaymentProvider {
  async createIntent(o: { orderRef: string; amountCents: number; currency: string }) {
    return {
      intentId: `mock_pi_${o.orderRef}_${Date.now()}`,
      amountCents: o.amountCents,
      currency: o.currency,
    };
  }

  async confirm(intentId: string, opts?: { simulate?: "success" | "fail" }) {
    // Simulate gateway latency.
    await new Promise((r) => setTimeout(r, 300));
    const ok = (opts?.simulate ?? "success") === "success";
    return {
      ok,
      status: ok ? ("CAPTURED" as const) : ("FAILED" as const),
      externalRef: intentId.replace("pi", "txn"),
    };
  }
}

export const paymentProvider: PaymentProvider = new MockProvider();
