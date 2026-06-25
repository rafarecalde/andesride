# AndesRide — Quito (UIO) Airport Transfers

A fast, premium, **US-facing** airport-transfer booking site for Quito's Mariscal
Sucre International Airport (UIO): flat USD pricing, an online booking widget, and
a markdown blog as the SEO engine. Built with **Astro**, deploys to **GitHub
Pages**.

---

## 🚦 THE launch gate (read first)

The **only hard prerequisite** before accepting real bookings is sourcing
**licensed, UIO-airport-authorized carriers/drivers** — ANT/AMT authority,
commercial plates, commercial insurance, and airport landside-pickup
authorization. The premium pricing exists to pay them properly and still profit.

Have a local transport-law attorney confirm the **intermediary structure** and a
**carrier agreement** (independent-contractor status, licensing/insurance reps &
warranties, indemnity, additional-insured, and payment-agent language). Everything
else in this repo ships now; this is the gate.

---

## Local development

```bash
npm install
npm run dev      # http://localhost:4321  — full site, no domain needed
npm run build    # production build → dist/
npm run preview  # serve the production build locally
```

You can preview the entire site locally today even though the domain isn't live
yet — the domain only matters for the deployed URL.

## Project structure

```
src/
  config.ts              # site-wide settings (name, contacts, payments mode) — EDIT THIS
  data/rates.json        # ⭐ single source of truth: zones, vehicles, extras, prices
  data/faq.ts            # FAQ copy (also feeds FAQPage JSON-LD)
  lib/payments.ts        # createCheckout() — mock | live abstraction
  lib/fleet.ts           # resolves real fleet photos when added (astro:assets)
  components/            # Nav, Hero, Booker (widget), Rates, Fleet, Faq, …
  layouts/               # BaseLayout, BlogPost
  content/blog/*.md      # blog posts (the SEO engine)
  pages/                 # index, /guide, /quito-airport-to-[zone], /success, legal, rss
functions/               # serverless payment + webhook stub (deployed SEPARATELY)
```

## Editing rates (nothing is hardcoded)

All prices, zones, vehicles, and add-on costs live in **`src/data/rates.json`**.
The booking widget, the rates table, the fleet cards, and every route landing
page read from it. Edit one file and everything updates. Price math:

```
total = vehicleRate × (roundTrip ? 2 : 1)
      + childSeat × qty
      + (extraStop ? extraStop × (roundTrip ? 2 : 1) : 0)
```

## Adding the hero image

The hero shows an on-brand Quito **placeholder** (`public/hero-quito-placeholder.svg`)
with a "Sample image" feel. To use a real photo (El Panecillo, the UIO terminal,
the Andes at dawn), drop ONE landscape image at `src/assets/hero.webp` (or
`.jpg`/`.png`, ≥1600×900). It replaces the placeholder automatically — no code
change. A light wash keeps the headline readable over any photo.

## Adding fleet photos

Drop representative photos into `src/assets/fleet/` named exactly
`sedan.webp`, `suv.webp`, `van.webp` (WebP preferred; PNG/JPG also work). They're
picked up automatically via `astro:assets` — no code change. Until then, neutral
placeholders show with the caption **"Representative vehicle — actual model may
vary."** Recommended: landscape ~16:10 / 3:2, ≥1200×800, clean neutral background.
(Optional: a logo, an Andes/Quito hero image, and a custom favicon.)

## Adding a blog post

Create `src/content/blog/<slug>.md` with frontmatter:

```yaml
---
title: "…"
description: "…"
category: "Arrival tips"
publishDate: 2026-03-01
tags: ["Quito airport", "UIO"]
# draft: true   # hide from index/sitemap/RSS until ready
---
```

It appears automatically on `/guide`, in the homepage "latest" row, in `rss.xml`,
and in the sitemap. A booking CTA is appended to every post automatically.

## Payments (mock now → live later)

Payments ship in **mock** mode: the widget runs end-to-end and shows a clean
simulated confirmation (`AR-UIO-######`) — never a broken card form. To go live:

1. **Stand up a US entity + Stripe.** Stripe doesn't operate in Ecuador; since the
   site is US-facing and USD-priced, the recommended path is **Stripe Checkout in
   USD via a US entity**. (Local fallbacks — PayPhone / Kushki / PagoPlux /
   dLocal — slot behind the same interface for an Ecuadorian entity.)
2. **Deploy the function in `/functions`** (Cloudflare Worker / Netlify / Vercel)
   — a static Pages site can't hold secret keys. Wire your provider into
   `functions/create-checkout.js` + `functions/webhook.js`. Set env vars in the
   platform secret store (see `.env.example` and `functions/README.md`). **Never
   commit keys.**
3. In `src/config.ts`, set `paymentsMode: 'live'` and `paymentApiBase` to the
   deployed function URL.

Merchant-of-record obligations are already wired: the cancellation policy is
accepted at checkout (stored in booking metadata), and the
independent-licensed-carrier **disclosure** appears on the footer, FAQ, booking
step, and confirmation.

## Deploying to GitHub Pages

1. Create a GitHub repo and push this project.
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main` — `.github/workflows/deploy.yml` builds and deploys.

### Custom domain (when you own andesride.com)

The site is already built **as** `andesride.com` (root paths). When the domain is
yours:

1. Add a file `public/CNAME` containing just `andesride.com`.
2. Point DNS at GitHub Pages (A records / `CNAME` per GitHub's docs).
3. That's it — `astro.config.mjs` already has `site: 'https://andesride.com'`.

**Want a public preview before owning the domain?** Deploy to the project path:
in `astro.config.mjs` set `site: 'https://<user>.github.io'` and `base:
'/andesride'` (and the matching `with:` in the workflow). Flip back to the
custom-domain values above once the domain is live.

## Owner TODOs

1. **Source licensed, UIO-authorized carriers/drivers** — the launch gate. Local
   counsel to confirm the intermediary structure + carrier agreement.
2. Send **vehicle photos** (Sedan / SUV / Van, representative) → `src/assets/fleet/`.
3. Confirm **final rates** in `src/data/rates.json` (premium US-facing values set).
4. Stand up the **US entity + Stripe** (or pick a local gateway); add keys to the
   function's secret store; set `paymentsMode: 'live'`.
5. Set real **domain, email, WhatsApp/phone** in `src/config.ts`; decide where
   bookings land (operator email / Google Sheet / Airtable) in the function.
6. Replace **placeholder reviews/ratings** (`src/components/Reviews.astro`,
   `ratingValue`/`ratingCount` in `src/config.ts`) with real, verifiable ones.
7. Add **analytics** (Plausible/GA4) + a privacy/cookie note (`/privacy`).
8. Write the **next 3 blog posts** (route angles: UIO ↔ Cumbayá / Mitad del Mundo
   / Otavalo, "every option compared", altitude tips).

## What's included

- Booking widget (3 steps + confirmation), live USD pricing from `rates.json`,
  round trip, child seats, extra stops, validation, **mock** payment + reference.
- Blog: `/guide` index, 5 seed posts with booking CTAs, 3 latest on the home page,
  `rss.xml`, sitemap, JSON-LD (`Article`, `FAQPage`, `TaxiService`/`LocalBusiness`,
  `Service`/`Offer` with prices).
- Route landing pages: `/quito-airport-to-<zone>` for every zone in `rates.json`.
- Legal: `/terms`, `/privacy`, `/cancellation` (templates for counsel review).
- Responsive (980 / 760 breakpoints), reduced-motion, keyboard-operable widget +
  menu, AA-minded contrast.
