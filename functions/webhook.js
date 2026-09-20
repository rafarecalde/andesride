// POST /webhook — Stripe checkout.session.completed.
// Verifies Stripe-Signature with Web Crypto (no Node SDK). Fulfilment
// (email / Sheet) is left as a sketch — do not trust the event until verified.

function hex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Stripe-Signature: t=<unix>,v1=<hex>[,v1=<hex>…]
 * Signed payload is `${t}.${rawBody}` HMAC-SHA256 with the webhook secret.
 */
export async function verifyStripeSignature(rawBody, header, secret, toleranceSec = 300) {
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  if (!header) throw new Error('missing Stripe-Signature header');

  const parts = header.split(',').map((p) => p.trim());
  const timestamp = parts.find((p) => p.startsWith('t='))?.slice(2);
  const signatures = parts.filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  if (!timestamp || signatures.length === 0) throw new Error('malformed Stripe-Signature header');

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) throw new Error('invalid signature timestamp');
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > toleranceSec) throw new Error('signature timestamp too old');

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${rawBody}`));
  const expected = hex(new Uint8Array(mac));
  if (!signatures.some((sig) => timingSafeEqual(expected, sig))) {
    throw new Error('bad signature');
  }
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env?.STRIPE_WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: 'STRIPE_WEBHOOK_SECRET is not configured' }), {
        status: 501,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const sig = request.headers.get('stripe-signature');
    const raw = await request.text();

    try {
      await verifyStripeSignature(raw, sig, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return new Response(err.message || 'bad signature', { status: 400 });
    }

    let event;
    try {
      event = JSON.parse(raw);
    } catch {
      return new Response('invalid JSON', { status: 400 });
    }

    if (event.type !== 'checkout.session.completed') {
      return new Response('ignored', { status: 200 });
    }

    const booking = event.data?.object?.metadata || {};

    // ── Fulfilment (implement later) ──────────────────────────────────────────
    // 1. Email the CUSTOMER: reference, route, date/time, vehicle, total, policy.
    // 2. Email the OPERATOR (env.OPERATOR_EMAIL): the full booking record.
    // 3. Append the booking to a Sheet/Airtable (env.BOOKINGS_SHEET_WEBHOOK).
    // 4. (Optional, config-flagged TODO) WhatsApp message to operator/customer.
    void booking;

    return new Response('ok', { status: 200 });
  } catch (err) {
    return new Response(String(err), { status: 500 });
  }
}
