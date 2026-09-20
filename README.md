# Quito Airport Transfer — UIO prepaid luxury SUV

A **US-facing** airport-transfer booking site for Quito's Mariscal Sucre
International Airport (UIO): prepaid luxury-SUV flat USD pricing, an online
booking widget, and a markdown blog as the SEO engine. Built with **Astro**,
deploys to **GitHub Pages**.

The GitHub repo remains `rafarecalde/andesride`; the public brand is
**Quito Airport Transfer**. The chosen domain is **quitoairporttransfers.com**
(`SITE.domain` / `book@quitoairporttransfers.com`). It may not be registered or
DNS-pointed yet; config still targets it so the build is ready. Do not use
`andesride.com` — that domain belongs to an unrelated Chilean brand.

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
The booking widget, the rates cards, the fleet card, and every route landing
page read from it. Edit one file and everything updates.

Published product (luxury SUV only):

- **$50** one-way — UIO ↔ **Wyndham Quito Airport** (Tababela / airport-area hotel)
- **$100** one-way — UIO ↔ **anywhere in Quito city** (Hyatt, Oro Verde, Swissôtel,
  Casa Gangotena, and any other city address)

Price math:

```
total = zone.price × (roundTrip ? 2 : 1)
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

Drop a representative photo into `src/assets/fleet/` named exactly
`suv.webp` (WebP preferred; PNG/JPG also work). It's picked up automatically via
`astro:assets` — no code change. Until then, a neutral placeholder shows with the
caption **"Representative vehicle — actual model may vary."** Recommended:
landscape ~16:10 / 3:2, ≥1200×800, clean neutral background.
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
simulated confirmation (`UIO-######`) — never a broken card form. To go live:

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

### Custom domain (quitoairporttransfers.com)

`SITE.domain` is **https://quitoairporttransfers.com** and the booking email
placeholder is **book@quitoairporttransfers.com**. The domain may not be
registered or DNS-pointed yet — config already targets it so canonical/OG/JSON-LD
are launch-ready. **Do not use `andesride.com`.**

Until DNS is live, this repo still deploys as a GitHub Pages project preview at
`https://rafarecalde.github.io/andesride/` (`base: '/andesride'`). That path is
the repo name, not the brand. In-page links stay base-aware; canonical URLs use
the chosen domain at the root.

When DNS is pointed at GitHub Pages:

1. Add a file `public/CNAME` containing just `quitoairporttransfers.com`.
2. Point DNS at GitHub Pages (A records / `CNAME` per GitHub's docs).
3. In `astro.config.mjs` set `site: 'https://quitoairporttransfers.com'` and `base: '/'`.

## Owner TODOs

1. **Source licensed, UIO-authorized carriers/drivers** — the launch gate. Local
   counsel to confirm the intermediary structure + carrier agreement.
2. Send a **luxury SUV photo** (representative) → `src/assets/fleet/suv.webp`.
3. Confirm **final rates** in `src/data/rates.json` ($50 airport Wyndham / $100 Quito).
4. Stand up the **US entity + Stripe** (or pick a local gateway); add keys to the
   function's secret store; set `paymentsMode: 'live'`.
5. **Register / point DNS** for `quitoairporttransfers.com` (already in
   `SITE.domain` / `SITE.email`). Then add `public/CNAME` and flip
   `astro.config.mjs` to `site` + `base: '/'`. WhatsApp/phone are still placeholders.
6. Replace **placeholder reviews/ratings** (`src/components/Reviews.astro`,
   `ratingValue`/`ratingCount` in `src/config.ts`) with real, verifiable ones.
7. Add **analytics** (Plausible/GA4) + a privacy/cookie note (`/privacy`).
8. Keep destination guides (Cumbayá, Otavalo, etc.) as quote-on-request;
   prepaid bookable products stay airport-hotel vs. Quito city.

## What's included

- Booking widget (3 steps + confirmation), live USD pricing from `rates.json`,
  round trip, child seats, extra stops, validation, **mock** payment + reference.
- Blog: `/guide` index, seed posts with booking CTAs, 3 latest on the home page,
  `rss.xml`, sitemap, JSON-LD (`Article`, `FAQPage`, `TaxiService`/`LocalBusiness`,
  `Service`/`Offer` with prices).
- Route landing pages: `/quito-airport-to-<zone>` for every zone in `rates.json`
  (Wyndham Quito Airport + anywhere in Quito).
- Legal: `/terms`, `/privacy`, `/cancellation` (templates for counsel review).
- Responsive (980 / 760 breakpoints), reduced-motion, keyboard-operable widget +
  menu, AA-minded contrast.
