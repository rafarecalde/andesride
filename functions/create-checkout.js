// POST /create-checkout — Cloudflare Worker handler (also works as a Pages Function).
// Creates a Stripe Checkout Session via Stripe's HTTP API (no Node SDK — Workers
// cannot `require('stripe')`). Secrets come from `env` — never hardcode keys.
//
// Request  (from src/lib/payments.ts): { amountUSD, metadata, reference }
// Response: { checkoutUrl, reference }

const STRIPE_SESSIONS_URL = 'https://api.stripe.com/v1/checkout/sessions';

export function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': (env && env.ALLOWED_ORIGIN) || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function json(body, status, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(env),
    },
  });
}

// Stripe Checkout metadata: 50 keys, key names ≤40 characters, values ≤500 characters.
const STRIPE_MAX_KEYS = 50;
const STRIPE_MAX_KEY = 40;
const STRIPE_MAX_VALUE = 500;

// Driver-critical fields stay even when the payload is trimmed to 50 keys.
const METADATA_PRIORITY = [
  'name',
  'phone',
  'flight',
  'time',
  'hotel',
  'pax',
  'notes',
  'email',
  'date',
  'route',
  'vehicle',
  'vehicles',
  'roundTrip',
  'childSeats',
  'extraStop',
  'cancellationAccepted',
];

const REQUIRED_PASSENGER_FIELDS = [
  ['name', 'passenger name'],
  ['phone', 'phone'],
  ['flight', 'flight number'],
  ['time', 'pickup time'],
  ['hotel', 'drop-off/hotel'],
  ['pax', 'passenger count'],
];

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Trim passenger strings. Drop a blank notes value so it does not consume a key. */
export function normalizeMetadata(metadata) {
  if (!isPlainObject(metadata)) return {};
  const out = { ...metadata };
  for (const key of ['name', 'phone', 'flight', 'time', 'hotel', 'notes', 'email', 'pax']) {
    if (typeof out[key] === 'string') out[key] = out[key].trim();
    else if (key === 'pax' && (typeof out[key] === 'number' || typeof out[key] === 'boolean')) {
      out[key] = String(out[key]);
    }
  }
  if (typeof out.notes === 'string' && out.notes === '') delete out.notes;
  return out;
}

/** Null when the booking has the fields the driver needs. Notes stay optional. */
export function passengerFieldError(metadata) {
  if (!isPlainObject(metadata)) return 'passenger name is required';
  for (const [key, label] of REQUIRED_PASSENGER_FIELDS) {
    const value = metadata[key];
    if (value === undefined || value === null || String(value).trim() === '') {
      return `${label} is required`;
    }
  }
  return null;
}

/**
 * Stripe metadata values must be strings. Booleans and numbers are stringified.
 * Priority passenger fields are kept first so a 50-key cap cannot drop them.
 */
export function stringifyMetadata(metadata, reference) {
  const source = isPlainObject(metadata) ? metadata : {};
  const ordered = ['reference'];
  for (const key of METADATA_PRIORITY) {
    if (key in source && !ordered.includes(key)) ordered.push(key);
  }
  for (const key of Object.keys(source)) {
    if (!ordered.includes(key)) ordered.push(key);
  }

  const out = {};
  for (const key of ordered) {
    if (Object.keys(out).length >= STRIPE_MAX_KEYS) break;
    const safeKey = String(key).slice(0, STRIPE_MAX_KEY);
    if (!safeKey || Object.prototype.hasOwnProperty.call(out, safeKey)) continue;

    let raw;
    if (key === 'reference') {
      const fromMeta = source.reference;
      raw =
        fromMeta !== undefined && fromMeta !== null && String(fromMeta).trim() !== ''
          ? fromMeta
          : reference ?? '';
    } else {
      raw = source[key];
    }
    if (raw === undefined || raw === null) continue;
    const str = typeof raw === 'string' ? raw : String(raw);
    if (key !== 'reference' && str.trim() === '') continue;
    out[safeKey] = str.length > STRIPE_MAX_VALUE ? str.slice(0, STRIPE_MAX_VALUE) : str;
  }
  return out;
}

/**
 * Encode a nested object as application/x-www-form-urlencoded for Stripe.
 * Arrays become key[0]; objects become key[subkey].
 */
export function encodeStripeForm(data) {
  const params = new URLSearchParams();
  const append = (key, value) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((item, i) => append(`${key}[${i}]`, item));
      return;
    }
    if (typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) append(`${key}[${k}]`, v);
      return;
    }
    params.append(key, String(value));
  };
  for (const [k, v] of Object.entries(data)) append(k, v);
  return params;
}

function withRef(successUrl, reference) {
  try {
    const u = new URL(successUrl);
    u.searchParams.set('ref', reference);
    return u.toString();
  } catch {
    const sep = successUrl.includes('?') ? '&' : '?';
    return `${successUrl}${sep}ref=${encodeURIComponent(reference)}`;
  }
}

export async function onRequestOptions({ env }) {
  return new Response(null, { status: 204, headers: corsHeaders(env) });
}

export async function onRequestPost({ request, env }) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'invalid JSON body' }, 400, env);
    }

    const amountUSD = Number(body?.amountUSD);
    if (!Number.isFinite(amountUSD) || amountUSD <= 0) {
      return json({ error: 'invalid amountUSD: must be a number greater than 0' }, 400, env);
    }

    const unitAmount = Math.round(amountUSD * 100);
    if (unitAmount < 1) {
      return json({ error: 'invalid amountUSD: must be at least $0.01' }, 400, env);
    }

    const reference =
      typeof body.reference === 'string' && body.reference.trim()
        ? body.reference.trim()
        : `UIO-${100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000)}`;

    if (!env?.STRIPE_SECRET_KEY) {
      return json({ error: 'STRIPE_SECRET_KEY is not configured' }, 500, env);
    }
    if (!env.SUCCESS_URL || !env.CANCEL_URL) {
      return json({ error: 'SUCCESS_URL and CANCEL_URL must be configured' }, 500, env);
    }

    const metadataIn = normalizeMetadata(body.metadata);
    const fieldError = passengerFieldError(metadataIn);
    if (fieldError) return json({ error: fieldError }, 400, env);

    const metadata = stringifyMetadata(metadataIn, reference);
    const payload = {
      mode: 'payment',
      success_url: withRef(env.SUCCESS_URL, reference),
      cancel_url: env.CANCEL_URL,
      client_reference_id: reference,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: unitAmount,
            product_data: { name: `Quito Airport Transfer ${reference}` },
          },
        },
      ],
      metadata,
    };

    if (typeof metadataIn.email === 'string' && metadataIn.email.includes('@')) {
      payload.customer_email = metadataIn.email;
    }

    const stripeRes = await fetch(STRIPE_SESSIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': reference,
      },
      body: encodeStripeForm(payload),
    });

    let session;
    try {
      session = await stripeRes.json();
    } catch {
      return json({ error: 'Stripe returned a non-JSON response' }, 502, env);
    }

    if (!stripeRes.ok) {
      const message = session?.error?.message || 'Stripe session create failed';
      return json({ error: message }, 502, env);
    }
    if (!session?.url) {
      return json({ error: 'Stripe did not return a checkout URL' }, 502, env);
    }

    return json({ checkoutUrl: session.url, reference }, 200, env);
  } catch (err) {
    return json({ error: String(err && err.message ? err.message : err) }, 500, env);
  }
}
