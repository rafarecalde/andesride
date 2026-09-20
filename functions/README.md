# Quito Airport Transfer payment + notification function

A static GitHub Pages site **cannot hold secret keys**, so online payment runs in
a small serverless function deployed **separately** from the site. The booking
widget (`src/lib/payments.ts`) calls it only when `SITE.paymentsMode === 'live'`.

This folder is a **provider-agnostic stub** — `create-checkout.js` and
`webhook.js` are written for a Cloudflare Worker / Netlify / Vercel function
runtime. Wire in your provider, deploy, set the env vars in the platform's secret
store, then put the deployed base URL in `src/config.ts → paymentApiBase` and set
`paymentsMode: 'live'`.

## Endpoints

- `POST /create-checkout` — body `{ amountUSD, metadata, reference }` → returns
  `{ checkoutUrl, reference }`. Creates a Stripe Checkout Session in USD (or a
  local-gateway equivalent) and returns the hosted-checkout URL.
- `POST /webhook` — provider webhook for `checkout.session.completed`. On a
  confirmed payment: email the customer + operator, and append the booking to a
  Google Sheet / Airtable. **Verify the webhook signature** before trusting it.

## Why a US entity + Stripe (recommended)

Stripe does **not** operate in Ecuador. Because the site is US-facing and priced
in USD, the recommended path is **Stripe Checkout in USD via a US entity**.
Local-gateway fallbacks (PayPhone / Kushki / PagoPlux / dLocal) fit an Ecuadorian
entity and slot behind the same `create-checkout` contract.

## Merchant-of-record obligations (we collect the fare)

- **Refund / cancellation policy** is accepted at checkout (the widget stores
  `cancellationAccepted` in metadata): free cancel ≥24h before pickup; within 24h
  / no-show non-refundable. Honor it in your refund handling.
- **Funds timing:** collect upfront, pay the carrier post-ride; always keep
  enough to cover a refund/chargeback.
- Keep the **independent-licensed-carrier disclosure** visible (already on the
  site footer, FAQ, booking step, and confirmation).

## Environment variables (set in the platform secret store — NEVER commit)

| Var | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret key (live or test) |
| `STRIPE_WEBHOOK_SECRET` | Verify webhook signatures |
| `SUCCESS_URL` | e.g. `https://uiotransfers.com/success` |
| `CANCEL_URL` | e.g. `https://uiotransfers.com/#book` |
| `OPERATOR_EMAIL` | Where operator booking emails go |
| `EMAIL_API_KEY` | Transactional email provider (Resend/Postmark/SES) |
| `BOOKINGS_SHEET_WEBHOOK` | Google Sheet / Airtable append endpoint |
| `ALLOWED_ORIGIN` | `https://uiotransfers.com` (CORS) |

See `.env.example` in the project root for the full list.
