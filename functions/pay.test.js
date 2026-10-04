import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.js';
import { stringifyMetadata, encodeStripeForm } from './create-checkout.js';
import { verifyStripeSignature } from './webhook.js';
import { buildBookingNotification, buildCustomerReceipt } from './email.js';

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
    hotel: 'Casa Gangotena · Quito',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '+15555550100',
    notes: 'Two large bags',
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

test('stringifyMetadata keeps passenger fields inside Stripe limits', () => {
  const many = { name: 'Ada Lovelace', phone: '+15555550100', notes: 'n'.repeat(800) };
  for (let i = 0; i < 60; i++) many[`extra${i}`] = `v${i}`;
  const meta = stringifyMetadata(many, 'UIO-9');
  assert.equal(Object.keys(meta).length, 50);
  assert.equal(meta.reference, 'UIO-9');
  assert.equal(meta.name, 'Ada Lovelace');
  assert.equal(meta.phone, '+15555550100');
  assert.equal(meta.notes, 'n'.repeat(500));
  const longKey = 'k'.repeat(50);
  const trimmed = stringifyMetadata({ [longKey]: 'value', name: 'Ada' }, 'UIO-1');
  assert.equal(trimmed[longKey.slice(0, 40)], 'value');
  assert.equal(trimmed.name, 'Ada');
  assert.equal(Object.hasOwn(trimmed, longKey), false);
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
    assert.equal(form.get('metadata[name]'), 'Ada Lovelace');
    assert.equal(form.get('metadata[phone]'), '+15555550100');
    assert.equal(form.get('metadata[flight]'), 'AV123');
    assert.equal(form.get('metadata[time]'), '09:00');
    assert.equal(form.get('metadata[hotel]'), 'Casa Gangotena · Quito');
    assert.equal(form.get('metadata[pax]'), '2');
    assert.equal(form.get('metadata[notes]'), 'Two large bags');
    const metaKeys = [...form.keys()].filter((key) => key.startsWith('metadata['));
    assert.ok(metaKeys.length > 0 && metaKeys.length <= 50);
    for (const key of metaKeys) assert.ok((form.get(key) || '').length <= 500, key);
  } finally {
    mock.restore();
  }
});

test('POST /create-checkout requires pickup name, phone, flight, time, hotel, and passenger count', async () => {
  const cases = [
    ['name', '   ', /passenger name/i],
    ['phone', undefined, /phone is required/i],
    ['flight', undefined, /flight number/i],
    ['time', undefined, /pickup time/i],
    ['hotel', undefined, /drop-off\/hotel/i],
    ['pax', undefined, /passenger count/i],
  ];
  for (const [key, value, pattern] of cases) {
    const metadata = { ...checkoutBody.metadata };
    if (value === undefined) delete metadata[key];
    else metadata[key] = value;
    const res = await worker.fetch(
      new Request('https://uiotransfers-pay.example.workers.dev/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUSD: 50, reference: 'UIO-1', metadata }),
      }),
      env,
    );
    assert.equal(res.status, 400, key);
    const body = await res.json();
    assert.match(body.error, pattern, key);
  }
});

test('POST /create-checkout allows a booking without notes', async () => {
  const mock = installStripeMock();
  try {
    const metadata = { ...checkoutBody.metadata, notes: '   ' };
    const res = await worker.fetch(
      new Request('https://uiotransfers-pay.example.workers.dev/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...checkoutBody, metadata }),
      }),
      env,
    );
    assert.equal(res.status, 200);
    const form = new URLSearchParams(mock.calls[0].init.body);
    assert.equal(form.get('metadata[notes]'), null);
    assert.equal(form.get('metadata[name]'), 'Ada Lovelace');
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
  const pickupHead = ops.text.slice(0, ops.text.indexOf('Amount paid'));
  for (const needle of [
    'Pickup name',
    'Ada <b>Lovelace</b>',
    'Phone',
    '+15555550100',
    'Flight number',
    'Pickup time',
    'Drop-off / hotel',
    'Casa Gangotena · Quito',
    'Passenger count',
    'Notes',
    'Two large bags',
  ]) {
    assert.ok(pickupHead.includes(needle), `pickup block missing ${needle}`);
  }
  assert.ok(pickupHead.indexOf('Pickup name') < pickupHead.indexOf('Phone'));
  assert.ok(pickupHead.indexOf('Phone') < pickupHead.indexOf('Flight number'));
  assert.ok(pickupHead.indexOf('Drop-off / hotel') < pickupHead.indexOf('Passenger count'));
  assert.ok(pickupHead.indexOf('Passenger count') < pickupHead.indexOf('Notes'));
  assert.match(ops.subject, /Ada <b>Lovelace<\/b>/);
  assert.ok(!ops.html.includes('<b>Lovelace'), 'html must escape metadata');
  assert.ok(ops.html.includes('&lt;b&gt;Lovelace'));
  assert.ok(ops.html.indexOf('Pickup name') < ops.html.indexOf('Amount paid'));

  assert.equal(cust.to, 'ada@example.com');
  assert.equal(cust.replyTo, 'book@uiotransfers.com');
  assert.match(cust.subject, /UIO-424242/);
  assert.match(cust.subject, /Ada <b>Lovelace<\/b>/);
  assert.match(cust.text, /Pickup name/);
  assert.match(cust.text, /We will pick up Ada <b>Lovelace<\/b>/);
  assert.match(cust.text, /\+15555550100/);
  assert.ok(cust.text.indexOf('Pickup name') < cust.text.indexOf('Amount paid'));
  assert.ok(!cust.html.includes('<b>Lovelace'), 'customer html must escape the pickup name');
  assert.ok(cust.html.includes('&lt;b&gt;Lovelace'));
});

test('emails include the pickup name and include phone only when it was collected', () => {
  const session = {
    id: 'cs_nophone',
    payment_status: 'paid',
    amount_total: 5000,
    currency: 'usd',
    client_reference_id: 'UIO-111111',
    metadata: {
      reference: 'UIO-111111',
      name: 'Grace Hopper',
      flight: 'AV1',
      time: '14:00',
      hotel: 'Swissôtel · Quito',
      pax: '1',
      notes: 'Gate 3',
    },
  };
  const ops = buildBookingNotification(session, { id: 'evt_x' });
  assert.match(ops.text, /Pickup name/);
  assert.match(ops.text, /Grace Hopper/);
  assert.match(ops.text, /Drop-off \/ hotel/);
  assert.match(ops.text, /Passenger count/);
  assert.match(ops.text, /Notes/);
  assert.ok(!ops.text.includes('Phone'));
  assert.ok(ops.text.indexOf('Pickup name') < ops.text.indexOf('Amount paid'));

  const cust = buildCustomerReceipt(session);
  assert.match(cust.text, /Thank you, Grace Hopper/);
  assert.match(cust.text, /We will pick up Grace Hopper/);
  assert.match(cust.text, /Pickup name/);
  assert.match(cust.subject, /Grace Hopper/);
  assert.ok(!cust.text.includes('Phone'));

  session.metadata.phone = '+15555550100';
  const withPhone = buildBookingNotification(session, { id: 'evt_x' });
  const head = withPhone.text.slice(0, withPhone.text.indexOf('Amount paid'));
  assert.match(head, /Phone/);
  assert.match(head, /\+15555550100/);
  assert.ok(head.indexOf('Pickup name') < head.indexOf('Phone'));
  const receipt = buildCustomerReceipt(session);
  assert.match(receipt.text, /Phone/);
  assert.match(receipt.text, /\+15555550100/);
});

test('operator email flags a missing pickup name', () => {
  const session = {
    payment_status: 'paid',
    amount_total: 1000,
    currency: 'usd',
    metadata: { reference: 'UIO-2', phone: '+15555550100' },
  };
  const ops = buildBookingNotification(session, { id: 'evt_y' });
  assert.match(ops.text, /Pickup name\s+\(missing\)/);
  assert.match(ops.text, /\+15555550100/);
  const cust = buildCustomerReceipt(session);
  assert.match(cust.text, /Thank you!/);
  assert.match(cust.text, /\+15555550100/);
  assert.ok(!cust.text.includes('Pickup name'));
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
