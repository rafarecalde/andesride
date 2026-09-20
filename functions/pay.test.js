import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.js';
import { stringifyMetadata, encodeStripeForm } from './create-checkout.js';
import { verifyStripeSignature } from './webhook.js';

const env = {
  STRIPE_SECRET_KEY: 'sk_test_123',
  SUCCESS_URL: 'https://uiotransfers.com/success',
  CANCEL_URL: 'https://uiotransfers.com/#book',
  ALLOWED_ORIGIN: 'https://uiotransfers.com',
  STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
};

const checkoutBody = {
  amountUSD: 100,
  reference: 'UIO-424242',
  metadata: {
    route: 'UIO->quito',
    vehicle: 'suv',
    pax: '2',
    date: '2026-10-01',
    time: '09:00',
    roundTrip: false,
    childSeats: 1,
    extraStop: false,
    flight: 'AV123',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '+15555550100',
    cancellationAccepted: true,
  },
};

function installStripeMock(session = { url: 'https://checkout.stripe.com/c/pay/cs_test_abc' }) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(session), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  return {
    calls,
    restore() {
      globalThis.fetch = original;
    },
  };
}

test('stringifyMetadata turns non-strings into strings', () => {
  const meta = stringifyMetadata(
    { roundTrip: false, childSeats: 1, cancellationAccepted: true },
    'UIO-1',
  );
  assert.equal(meta.reference, 'UIO-1');
  assert.equal(meta.roundTrip, 'false');
  assert.equal(meta.childSeats, '1');
  assert.equal(meta.cancellationAccepted, 'true');
});

test('encodeStripeForm uses Stripe bracket notation', () => {
  const form = encodeStripeForm({
    mode: 'payment',
    line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: 5000 } }],
    metadata: { reference: 'UIO-1' },
  });
  assert.equal(form.get('mode'), 'payment');
  assert.equal(form.get('line_items[0][quantity]'), '1');
  assert.equal(form.get('line_items[0][price_data][currency]'), 'usd');
  assert.equal(form.get('line_items[0][price_data][unit_amount]'), '5000');
  assert.equal(form.get('metadata[reference]'), 'UIO-1');
});

test('OPTIONS /create-checkout returns CORS headers for the site origin', async () => {
  const res = await worker.fetch(
    new Request('https://uiotransfers-pay.example.workers.dev/create-checkout', { method: 'OPTIONS' }),
    env,
  );
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://uiotransfers.com');
  assert.match(res.headers.get('Access-Control-Allow-Methods') || '', /POST/);
  assert.match(res.headers.get('Access-Control-Allow-Headers') || '', /Content-Type/i);
});

test('POST /create-checkout rejects amountUSD <= 0', async () => {
  const res = await worker.fetch(
    new Request('https://uiotransfers-pay.example.workers.dev/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountUSD: 0, reference: 'UIO-1', metadata: {} }),
    }),
    env,
  );
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /amountUSD/i);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://uiotransfers.com');
});

test('POST /create-checkout creates a USD Checkout Session and returns { checkoutUrl, reference }', async () => {
  const mock = installStripeMock();
  try {
    const res = await worker.fetch(
      new Request('https://uiotransfers-pay.example.workers.dev/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutBody),
      }),
      env,
    );
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.deepEqual(data, {
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_abc',
      reference: 'UIO-424242',
    });
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://uiotransfers.com');

    assert.equal(mock.calls.length, 1);
    const call = mock.calls[0];
    assert.equal(call.url, 'https://api.stripe.com/v1/checkout/sessions');
    assert.equal(call.init.method, 'POST');
    assert.equal(call.init.headers.Authorization, 'Bearer sk_test_123');
    assert.equal(call.init.headers['Content-Type'], 'application/x-www-form-urlencoded');
    assert.equal(call.init.headers['Idempotency-Key'], 'UIO-424242');

    const form = new URLSearchParams(call.init.body);
    assert.equal(form.get('mode'), 'payment');
    assert.equal(form.get('cancel_url'), 'https://uiotransfers.com/#book');
    assert.equal(form.get('success_url'), 'https://uiotransfers.com/success?ref=UIO-424242');
    assert.equal(form.get('client_reference_id'), 'UIO-424242');
    assert.equal(form.get('customer_email'), 'ada@example.com');
    assert.equal(form.get('line_items[0][quantity]'), '1');
    assert.equal(form.get('line_items[0][price_data][currency]'), 'usd');
    assert.equal(form.get('line_items[0][price_data][unit_amount]'), '10000');
    assert.equal(
      form.get('line_items[0][price_data][product_data][name]'),
      'Quito Airport Transfer UIO-424242',
    );
    assert.equal(form.get('metadata[reference]'), 'UIO-424242');
    assert.equal(form.get('metadata[roundTrip]'), 'false');
    assert.equal(form.get('metadata[childSeats]'), '1');
    assert.equal(form.get('metadata[cancellationAccepted]'), 'true');
    assert.equal(form.get('metadata[email]'), 'ada@example.com');
  } finally {
    mock.restore();
  }
});

test('POST /create-checkout surfaces Stripe errors as JSON', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: { message: 'No such API key' } }), { status: 401 });
  try {
    const res = await worker.fetch(
      new Request('https://uiotransfers-pay.example.workers.dev/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutBody),
      }),
      env,
    );
    assert.equal(res.status, 502);
    const body = await res.json();
    assert.equal(body.error, 'No such API key');
  } finally {
    globalThis.fetch = original;
  }
});

test('unknown paths 404; GET /create-checkout is 405', async () => {
  const missing = await worker.fetch(
    new Request('https://uiotransfers-pay.example.workers.dev/nope', { method: 'POST' }),
    env,
  );
  assert.equal(missing.status, 404);
  const get = await worker.fetch(
    new Request('https://uiotransfers-pay.example.workers.dev/create-checkout', { method: 'GET' }),
    env,
  );
  assert.equal(get.status, 405);
});

test('webhook rejects unsigned payloads and accepts a valid HMAC', async () => {
  const payload = JSON.stringify({
    type: 'checkout.session.completed',
    data: { object: { metadata: { reference: 'UIO-424242' } } },
  });

  const bad = await worker.fetch(
    new Request('https://uiotransfers-pay.example.workers.dev/webhook', {
      method: 'POST',
      body: payload,
    }),
    env,
  );
  assert.equal(bad.status, 400);

  const ts = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${ts}.${payload}`),
  );
  const v1 = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');

  await verifyStripeSignature(payload, `t=${ts},v1=${v1}`, env.STRIPE_WEBHOOK_SECRET);

  const ok = await worker.fetch(
    new Request('https://uiotransfers-pay.example.workers.dev/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': `t=${ts},v1=${v1}` },
      body: payload,
    }),
    env,
  );
  assert.equal(ok.status, 200);
  assert.equal(await ok.text(), 'ok');
});
