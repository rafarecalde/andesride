// POST /webhook — payment-provider webhook (stub).
// On a confirmed payment: email the customer + operator and append the booking to
// a Google Sheet / Airtable. ALWAYS verify the provider signature before trusting
// the event — an unverified webhook is a spoofing vector.

export async function onRequestPost({ request, env }) {
  try {
    const sig = request.headers.get('stripe-signature');
    const raw = await request.text();

    // ── Verify signature (required) ───────────────────────────────────────────
    // const stripe = require('stripe')(env.STRIPE_SECRET_KEY);
    // let event;
    // try {
    //   event = stripe.webhooks.constructEvent(raw, sig, env.STRIPE_WEBHOOK_SECRET);
    // } catch {
    //   return new Response('bad signature', { status: 400 });
    // }
    // if (event.type !== 'checkout.session.completed') return new Response('ignored', { status: 200 });
    // const booking = event.data.object.metadata;

    // ── Fulfilment (implement) ────────────────────────────────────────────────
    // 1. Email the CUSTOMER: reference, route, date/time, vehicle, total, policy.
    // 2. Email the OPERATOR (env.OPERATOR_EMAIL): the full booking record.
    // 3. Append the booking to a Sheet/Airtable (env.BOOKINGS_SHEET_WEBHOOK).
    // 4. (Optional, config-flagged TODO) WhatsApp message to operator/customer.

    void sig;
    void raw;
    return new Response('ok', { status: 200 });
  } catch (err) {
    return new Response(String(err), { status: 500 });
  }
}
