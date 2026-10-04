// POST /webhook — Stripe checkout.session.completed.
// Verifies Stripe-Signature with Web Crypto (no Node SDK), then e-mails the
// booking to the operator (NOTIFY_TO, default book@uiotransfers.com) and a
// confirmation to the customer. The event is never trusted until verified.
import {
  DEFAULT_NOTIFY_TO,
  buildBookingNotification,
  buildCustomerReceipt,
  customerEmailOf,
  sendEmail,
} from './email.js';

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

    const handled = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];
    if (!handled.includes(event.type)) {
      return new Response('ignored', { status: 200 });
    }

    const session = event.data?.object || {};
    // Card payments are 'paid' immediately; delayed methods complete as 'unpaid'
    // and arrive again later as async_payment_succeeded.
    if (session.payment_status !== 'paid') {
      return new Response('ignored (not paid)', { status: 200 });
    }

    // Operator notification. If it fails we return 500 so Stripe retries.
    const note = buildBookingNotification(session, event);
    try {
      await sendEmail(env, {
        to: env.NOTIFY_TO || DEFAULT_NOTIFY_TO,
        replyTo: customerEmailOf(session) || undefined,
        idempotencyKey: `booking-notify-${event.id}`,
        ...note,
      });
    } catch (err) {
      console.error('booking notification failed', session.id, err?.message || err);
      return new Response('notification failed', { status: 500 });
    }

    // Customer confirmation: best-effort, never causes a retry.
    const customer = customerEmailOf(session);
    if (customer && customer.includes('@') && env.SEND_CUSTOMER_RECEIPT !== 'false') {
      try {
        await sendEmail(env, {
          to: customer,
          replyTo: env.NOTIFY_TO || DEFAULT_NOTIFY_TO,
          idempotencyKey: `booking-receipt-${event.id}`,
          ...buildCustomerReceipt(session),
        });
      } catch (err) {
        console.error('customer receipt failed', session.id, err?.message || err);
      }
    }

    return new Response('ok', { status: 200 });
  } catch (err) {
    return new Response(String(err), { status: 500 });
  }
}
