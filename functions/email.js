// Booking e-mails for the Stripe webhook. No dependencies, no secrets in code.
//
// Provider selection (first one configured wins):
//   1. env.EMAIL          — Cloudflare Email Service `send_email` binding
//                           (needs the sending domain onboarded in Cloudflare).
//   2. env.RESEND_API_KEY — Resend REST API (secret). EMAIL_FROM must be an
//                           address on a domain verified in that Resend account.
// If neither is configured, sendEmail() throws so the webhook returns 500 and
// Stripe retries delivery (for up to ~3 days) until e-mail is configured.

export const DEFAULT_NOTIFY_TO = 'book@uiotransfers.com';
export const DEFAULT_FROM = 'Quito Airport Transfer <bookings@uiotransfers.com>';

const LABELS = {
  reference: 'Reference',
  route: 'Route',
  date: 'Date',
  time: 'Pickup time',
  flight: 'Flight',
  pax: 'Passengers',
  vehicle: 'Vehicle',
  roundTrip: 'Round trip',
  childSeats: 'Child seats',
  extraStop: 'Extra stop',
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  cancellationAccepted: 'Cancellation policy accepted',
};
// Show these first, in this order; any other metadata keys follow alphabetically.
const ORDER = [
  'reference', 'route', 'date', 'time', 'flight', 'pax', 'vehicle', 'roundTrip',
  'childSeats', 'extraStop', 'name', 'email', 'phone', 'cancellationAccepted',
];

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Single-line header-safe string (blocks CR/LF header injection from metadata). */
function oneLine(value) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
}

export function formatAmount(session) {
  const cents = Number(session?.amount_total);
  const currency = String(session?.currency || 'usd').toUpperCase();
  if (!Number.isFinite(cents)) return 'unknown amount';
  const value = (cents / 100).toFixed(2);
  return currency === 'USD' ? `$${value} USD` : `${value} ${currency}`;
}

export function customerEmailOf(session) {
  const meta = session?.metadata || {};
  return oneLine(session?.customer_details?.email || session?.customer_email || meta.email || '');
}

export function referenceOf(session) {
  return oneLine(session?.metadata?.reference || session?.client_reference_id || session?.id || '');
}

function metadataRows(session) {
  const meta = { ...(session?.metadata || {}) };
  const keys = [
    ...ORDER.filter((k) => k in meta),
    ...Object.keys(meta).filter((k) => !ORDER.includes(k)).sort(),
  ];
  return keys.map((k) => [LABELS[k] || k, String(meta[k])]);
}

function allRows(session, event) {
  const pi = typeof session?.payment_intent === 'string' ? session.payment_intent : '';
  const rows = [
    ['Reference', referenceOf(session)],
    ['Amount paid', formatAmount(session)],
    ['Payment status', session?.payment_status || 'unknown'],
    ['Customer email', customerEmailOf(session) || '(none)'],
  ];
  const seen = new Set(['Reference']);
  for (const [label, value] of metadataRows(session)) {
    if (seen.has(label)) continue;
    seen.add(label);
    rows.push([label, value]);
  }
  rows.push(['Stripe session', session?.id || '']);
  if (pi) rows.push(['Stripe payment', `https://dashboard.stripe.com/payments/${pi}`]);
  if (event?.id) rows.push(['Stripe event', event.id]);
  return rows;
}

function textTable(rows) {
  const width = Math.max(...rows.map(([l]) => l.length));
  return rows.map(([l, v]) => `${l.padEnd(width)}  ${v}`).join('\n');
}

function htmlTable(rows) {
  const tr = rows
    .map(
      ([l, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#555;vertical-align:top;white-space:nowrap">${escapeHtml(l)}</td>` +
        `<td style="padding:4px 0;font-weight:600">${escapeHtml(v)}</td></tr>`,
    )
    .join('');
  return `<table style="border-collapse:collapse;font:14px/1.4 -apple-system,Segoe UI,Arial,sans-serif">${tr}</table>`;
}

/** Operator notification → book@uiotransfers.com */
export function buildBookingNotification(session, event) {
  const meta = session?.metadata || {};
  const ref = referenceOf(session);
  const trip = [meta.route, meta.date, meta.time].filter(Boolean).join(' · ');
  const subject = oneLine(`New paid booking ${ref} — ${formatAmount(session)}${trip ? ` — ${trip}` : ''}`);
  const rows = allRows(session, event);
  return {
    subject,
    text: `New PAID booking (Stripe checkout.session.completed)\n\n${textTable(rows)}\n`,
    html:
      `<p style="font:16px -apple-system,Segoe UI,Arial,sans-serif"><strong>New paid booking</strong> — ${escapeHtml(ref)}</p>` +
      htmlTable(rows),
  };
}

/** Customer confirmation (best-effort; independent of the operator notification). */
export function buildCustomerReceipt(session) {
  const meta = session?.metadata || {};
  const ref = referenceOf(session);
  const rows = [
    ['Reference', ref],
    ['Amount paid', formatAmount(session)],
    ...[['route', 'Route'], ['date', 'Date'], ['time', 'Pickup time'], ['flight', 'Flight'], ['pax', 'Passengers']]
      .filter(([k]) => meta[k])
      .map(([k, l]) => [l, String(meta[k])]),
  ];
  const intro = `Thank you${meta.name ? `, ${oneLine(meta.name)}` : ''}! Your payment was received and your Quito airport transfer is booked.`;
  const outro = 'Questions or changes? Just reply to this email or write to book@uiotransfers.com. Free cancellation up to 24 hours before pickup.';
  return {
    subject: oneLine(`Booking confirmed ${ref} — Quito Airport Transfer`),
    text: `${intro}\n\n${textTable(rows)}\n\n${outro}\n`,
    html:
      `<p style="font:16px -apple-system,Segoe UI,Arial,sans-serif">${escapeHtml(intro)}</p>` +
      htmlTable(rows) +
      `<p style="font:14px -apple-system,Segoe UI,Arial,sans-serif;color:#555">${escapeHtml(outro)}</p>`,
  };
}

export function emailConfigured(env) {
  return Boolean(env?.EMAIL?.send || env?.RESEND_API_KEY);
}

/**
 * Send one email. `idempotencyKey` is passed to providers that support it so a
 * Stripe retry does not duplicate a message that already went out.
 */
export async function sendEmail(env, { to, subject, text, html, replyTo, idempotencyKey }) {
  const from = env?.EMAIL_FROM || DEFAULT_FROM;

  if (env?.EMAIL?.send) {
    return env.EMAIL.send({ to, from, subject, text, html, ...(replyTo ? { replyTo } : {}) });
  }

  if (env?.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!res.ok) {
      let detail = '';
      try {
        detail = (await res.json())?.message || '';
      } catch {
        /* ignore */
      }
      throw new Error(`Resend ${res.status}${detail ? `: ${detail}` : ''}`);
    }
    return res.json().catch(() => ({}));
  }

  throw new Error('no email provider configured (need EMAIL binding or RESEND_API_KEY)');
}
