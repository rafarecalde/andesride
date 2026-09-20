# Quito Airport Transfer — Stripe Checkout worker

A static GitHub Pages site **cannot hold secret keys**, so prepaid checkout runs
in a **Cloudflare Worker** deployed separately from the site. The booking widget
(`src/lib/payments.ts`) calls this worker only when `SITE.paymentsMode === 'live'`.

This worker uses Stripe's **HTTP API** (`fetch` + `application/x-www-form-urlencoded`).
Do **not** `require('stripe')` — the Node SDK does not run on Cloudflare Workers.
There are **no npm dependencies** in this folder.

The site stays in **mock** payment mode until you deploy this worker and paste the
real `workers.dev` URL into `src/config.ts`. Do not invent a placeholder URL.

## Endpoints

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| `OPTIONS` | `/create-checkout` | — | `204` CORS preflight |
| `POST` | `/create-checkout` | `{ amountUSD, metadata, reference }` | `{ checkoutUrl, reference }` |
| `POST` | `/webhook` | Stripe event (raw body) | `ok` / `ignored` after signature check |

`POST /create-checkout` matches `src/lib/payments.ts`: the widget POSTs JSON and
redirects the customer to `checkoutUrl`. After payment, Stripe sends the customer
to `SUCCESS_URL?ref=<reference>` (`src/pages/success.astro` reads `ref`). Cancel
returns to `CANCEL_URL` (the booking widget).

## Environment

Set these in Wrangler / the Cloudflare dashboard. **Never commit real keys.**

| Name | Kind | Purpose |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | **secret** | Stripe secret key (`sk_test_…` for test mode, `sk_live_…` for live) |
| `STRIPE_WEBHOOK_SECRET` | **secret** | Verify `Stripe-Signature` on `/webhook` (`whsec_…`) |
| `SUCCESS_URL` | var | `https://uiotransfers.com/success` |
| `CANCEL_URL` | var | `https://uiotransfers.com/#book` |
| `ALLOWED_ORIGIN` | var | `https://uiotransfers.com` (CORS for the booking widget) |

Optional (fulfilment, not required to open Checkout): `OPERATOR_EMAIL`,
`EMAIL_API_KEY`, `BOOKINGS_SHEET_WEBHOOK`.

Suggested production defaults are already in `wrangler.toml` `[vars]`. Use Stripe
**test** keys until you are ready to charge real cards.

## Deploy with Wrangler

From this folder (`functions/`):

```bash
# 1. Log in to Cloudflare (once)
npx wrangler login

# 2. Put the Stripe secret (test-mode ready: use sk_test_…)
npx wrangler secret put STRIPE_SECRET_KEY
# optional, for /webhook:
npx wrangler secret put STRIPE_WEBHOOK_SECRET

# 3. Deploy. Wrangler prints the workers.dev URL — that is paymentApiBase.
npx wrangler deploy
```

Local development (uses gitignored `.dev.vars` for secrets):

```bash
cp .dev.vars.example .dev.vars   # then paste sk_test_… into .dev.vars
npx wrangler dev                 # http://127.0.0.1:8787
```

Smoke-test Checkout create (no browser CORS):

```bash
curl -sS -X POST http://127.0.0.1:8787/create-checkout \
  -H 'Content-Type: application/json' \
  -d '{"amountUSD":50,"reference":"UIO-123456","metadata":{"route":"UIO->quito","email":"test@example.com","roundTrip":false}}'
```

You should get `{ "checkoutUrl": "https://checkout.stripe.com/...", "reference": "UIO-123456" }`.

## Flip the site to live

1. Copy the deployed base URL Wrangler printed (example shape:
   `https://uiotransfers-pay.<your-subdomain>.workers.dev` — use the real one).
2. In `src/config.ts`:
   - `paymentApiBase: '<that URL>'`  (no trailing slash)
   - `paymentsMode: 'live'`
3. Redeploy the GitHub Pages site.

Until step 2, leave `paymentsMode: 'mock'` and `paymentApiBase: ''`.

## Stripe Dashboard (test mode)

1. Create a Stripe account with a **US entity** (Stripe does not operate in Ecuador).
2. Developers → API keys → **test** secret key → `wrangler secret put STRIPE_SECRET_KEY`.
3. Developers → Webhooks → Add endpoint
   `https://uiotransfers-pay.<your-subdomain>.workers.dev/webhook`
   for `checkout.session.completed`. Put the signing secret in
   `STRIPE_WEBHOOK_SECRET`.
4. `/webhook` verifies the signature with Web Crypto. Email / Google Sheet
   fulfilment is still a sketch inside `webhook.js`.

## Why a US entity + Stripe

Stripe does **not** operate in Ecuador. The site is US-facing and priced in USD,
so the path is **Stripe Checkout in USD via a US entity**. Local-gateway fallbacks
(PayPhone / Kushki / PagoPlux / dLocal) can still sit behind the same
`create-checkout` contract later.

## Merchant-of-record obligations (we collect the fare)

- **Refund / cancellation policy** is accepted at checkout (the widget stores
  `cancellationAccepted` in metadata): free cancel ≥24h before pickup; within 24h
  / no-show non-refundable. Honor it in your refund handling.
- **Funds timing:** collect upfront, pay the carrier post-ride; always keep
  enough to cover a refund/chargeback.
- Keep the **independent-licensed-carrier disclosure** visible (already on the
  site footer, FAQ, booking step, and confirmation).
