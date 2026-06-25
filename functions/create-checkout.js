// POST /create-checkout — provider-agnostic stub.
// Deploy separately (Cloudflare Worker / Netlify / Vercel). Secrets come from the
// platform store via `env` — never hardcode keys. Returns { checkoutUrl, reference }.
//
// This is intentionally a stub: drop in the Stripe SDK call where marked. Keep
// the request/response shape so src/lib/payments.ts needs no changes.

const json = (body, status, env) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': (env && env.ALLOWED_ORIGIN) || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });

export async function onRequestPost({ request, env }) {
  try {
    const { amountUSD, metadata, reference } = await request.json();
    if (!amountUSD || amountUSD <= 0) return json({ error: 'invalid amount' }, 400, env);

    // ── Stripe Checkout (USD) — uncomment and configure with a US entity ──────
    //
    // const stripe = require('stripe')(env.STRIPE_SECRET_KEY);
    // const session = await stripe.checkout.sessions.create({
    //   mode: 'payment',
    //   line_items: [{
    //     quantity: 1,
    //     price_data: {
    //       currency: 'usd',
    //       unit_amount: Math.round(amountUSD * 100),
    //       product_data: { name: `AndesRide transfer ${reference}` },
    //     },
    //   }],
    //   success_url: `${env.SUCCESS_URL}?ref=${reference}`,
    //   cancel_url: env.CANCEL_URL,
    //   metadata: { reference, ...flatten(metadata) },
    //   client_reference_id: reference,
    // });
    // return json({ checkoutUrl: session.url, reference }, 200, env);

    return json(
      { error: 'Payment function not configured. Add a provider in functions/create-checkout.js.' },
      501,
      env,
    );
  } catch (err) {
    return json({ error: String(err) }, 500, env);
  }
}

// CORS preflight
export async function onRequestOptions({ env }) {
  return json({}, 204, env);
}
