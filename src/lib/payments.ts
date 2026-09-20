// ─────────────────────────────────────────────────────────────────────────────
// Payment abstraction. The booking widget calls `createCheckout()` and never
// talks to a provider directly, so the provider can be swapped without touching
// the UI.
//
//   PAYMENTS_MODE = 'mock'  → clean simulated success (no network, no keys).
//                             Used for local dev and pre-launch demos. It must
//                             NEVER look like a broken card form.
//   PAYMENTS_MODE = 'live'  → POST to the serverless checkout function, which
//                             holds the secret keys and creates a real Stripe
//                             Checkout Session (or a local-gateway equivalent).
//
// A static GitHub Pages site cannot hold secret keys, so "live" delegates to a
// separately-deployed function (see /functions and README §Payments).
// ─────────────────────────────────────────────────────────────────────────────
import { SITE } from '../config';

export interface CheckoutInput {
  amountUSD: number;
  metadata: Record<string, string | number | boolean>;
}

export interface CheckoutResult {
  ok: boolean;
  mode: 'mock' | 'live';
  reference: string;              // UIO-######
  checkoutUrl?: string;           // present in live mode → redirect the customer here
  error?: string;
}

function makeReference(): string {
  // UIO-###### — 6 digits. crypto.getRandomValues for an unbiased value.
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const n = 100000 + (buf[0] % 900000);
  return `UIO-${n}`;
}

export async function createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const reference = makeReference();

  if (SITE.paymentsMode === 'mock') {
    // Simulate provider latency, then succeed cleanly.
    await new Promise((r) => setTimeout(r, 600));
    return { ok: true, mode: 'mock', reference };
  }

  // ── live ──────────────────────────────────────────────────────────────────
  if (!SITE.paymentApiBase) {
    return {
      ok: false,
      mode: 'live',
      reference,
      error: 'paymentApiBase is not configured in src/config.ts',
    };
  }
  try {
    const res = await fetch(`${SITE.paymentApiBase}/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, reference }),
    });
    if (!res.ok) throw new Error(`checkout function returned ${res.status}`);
    const data = (await res.json()) as { checkoutUrl: string; reference?: string };
    return {
      ok: true,
      mode: 'live',
      reference: data.reference ?? reference,
      checkoutUrl: data.checkoutUrl,
    };
  } catch (err) {
    return { ok: false, mode: 'live', reference, error: String(err) };
  }
}
