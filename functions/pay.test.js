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

async function sign(payload, secret = env.STRIPE_WEBHOOK_SECRET, ts = Math.floor(Date.now() / 1000)) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${ts}.${payload}`));
  const v1 = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `t=${ts},v1=${v1}`;
}

function paidEvent(overrides = {}) {
  return JSON.stringify({
    id: 'evt_123',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_live_abc',
        payment_status: 'paid',
        amount_total: 5000,
        currency: 'usd',
        payment_intent: 'pi_123',
        client_reference_id: 'UIO-424242',
        customer_details: { email: 'ada@example.com' },
        metadata: { ...checkoutBody.metadata, reference: 'UIO-424242', name: 'Ada <b>Lovelace</b>' },
        ...overrides,
      },
    },
  });
}

function webhookReq(payload, sig) {
  return new Request('https://uiotransfers-pay.example.workers.dev/webhook', {
    method: 'POST',
    headers: sig ? { 'stripe-signature': sig } : {},
    body: payload,
  });
}

function emailEnv() {
  const sent = [];
  return { sent, env: { ...env, EMAIL: { send: async (m) => { sent.push(m); return { messageId: 'm1' }; } } } };
}

test('webhook rejects unsigned, wrongly signed and stale payloads', async () => {
  const payload = paidEvent();
  const { env: e, sent } = emailEnv();
  assert.equal((await worker.fetch(webhookReq(payload), e)).status, 400);
  assert.equal((await worker.fetch(webhookReq(payload, await sign(payload, 'whsec_wrong')), e)).status, 400);
  const old = Math.floor(Date.now() / 1000) - 3600;
  assert.equal((await worker.fetch(webhookReq(payload, await sign(payload, undefined, old)), e)).status, 400);
  assert.equal(sent.length, 0);
});

test('verifyStripeSignature accepts a valid HMAC', async () => {
  const payload = paidEvent();
  await verifyStripeSignature(payload, await sign(payload), env.STRIPE_WEBHOOK_SECRET);
});

test('paid checkout.session.completed emails book@uiotransfers.com with booking details, then the customer', async () => {
  const payload = paidEvent();
  const { env: e, sent } = emailEnv();
  const res = await worker.fetch(webhookReq(payload, await sign(payload)), e);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'ok');
  assert.equal(sent.length, 2);

  const [ops, cust] = sent;
  assert.equal(ops.to, 'book@uiotransfers.com');
  assert.equal(ops.replyTo, 'ada@example.com');
  assert.match(ops.subject, /UIO-424242/);
  assert.match(ops.subject, /\$50\.00/);
  for (const needle of ['UIO-424242', '$50.00 USD', 'ada@example.com', 'UIO->quito', '2026-10-01', '09:00', 'AV123', 'pi_123', 'cs_live_abc']) {
    assert.ok(ops.text.includes(needle), `text missing ${needle}`);
  }
  assert.ok(!ops.html.includes('<b>Lovelace'), 'html must escape metadata');
  assert.ok(ops.html.includes('&lt;b&gt;Lovelace'));

  assert.equal(cust.to, 'ada@example.com');
  assert.equal(cust.replyTo, 'book@uiotransfers.com');
  assert.match(cust.subject, /UIO-424242/);
});

test('webhook uses the Resend REST API when only RESEND_API_KEY is set', async () => {
  const payload = paidEvent();
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ id: 'r1' }), { status: 200 });
  };
  try {
    const res = await worker.fetch(webhookReq(payload, await sign(payload)), {
      ...env,
      RESEND_API_KEY: 're_test',
      EMAIL_FROM: 'bookings@uiotransfers.com',
    });
    assert.equal(res.status, 200);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, 'https://api.resend.com/emails');
    assert.equal(calls[0].init.headers.Authorization, 'Bearer re_test');
    assert.equal(calls[0].init.headers['Idempotency-Key'], 'booking-notify-evt_123');
    const body = JSON.parse(calls[0].init.body);
    assert.deepEqual(body.to, ['book@uiotransfers.com']);
    assert.equal(body.from, 'bookings@uiotransfers.com');
  } finally {
    globalThis.fetch = original;
  }
});

test('webhook returns 500 (so Stripe retries) when the operator email cannot be sent', async () => {
  const payload = paidEvent();
  const res = await worker.fetch(webhookReq(payload, await sign(payload)), env); // no provider
  assert.equal(res.status, 500);
  const failing = { ...env, EMAIL: { send: async () => { throw new Error('boom'); } } };
  assert.equal((await worker.fetch(webhookReq(payload, await sign(payload)), failing)).status, 500);
});

test('a failing customer receipt does not make the webhook fail', async () => {
  const payload = paidEvent();
  let n = 0;
  const e = { ...env, EMAIL: { send: async () => { if (++n === 2) throw new Error('boom'); return {}; } } };
  assert.equal((await worker.fetch(webhookReq(payload, await sign(payload)), e)).status, 200);
  assert.equal(n, 2);
});

test('unpaid sessions and other event types are acknowledged without emailing', async () => {
  const { env: e, sent } = emailEnv();
  const unpaid = paidEvent({ payment_status: 'unpaid' });
  assert.equal((await worker.fetch(webhookReq(unpaid, await sign(unpaid)), e)).status, 200);
  const other = JSON.stringify({ id: 'evt_9', type: 'charge.succeeded', data: { object: {} } });
  const res = await worker.fetch(webhookReq(other, await sign(other)), e);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'ignored');
  assert.equal(sent.length, 0);
});
