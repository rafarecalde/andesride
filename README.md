# Quito Airport Transfer — UIO prepaid luxury SUV

A **US-facing** airport-transfer booking site for Quito's Mariscal Sucre
International Airport (UIO): prepaid luxury-SUV flat USD pricing, an online
booking widget, and a markdown blog as the SEO engine. Built with **Astro**,
deploys to **GitHub Pages**.

The GitHub repo remains `rafarecalde/andesride`; the public brand is
**Quito Airport Transfer**. The locked-in domain is **uiotransfers.com**
(plural — `SITE.domain` / `book@uiotransfers.com`). Do not use
`uiotransfer.com` (singular), `andesride.com`, `quitoairporttransfers.com`,
or `transfersfromuio.com`.

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

You can preview the entire site locally with `npm run dev` / `npm run preview`.
Production canonical URLs use **uiotransfers.com**.

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
functions/               # Cloudflare Worker: Stripe Checkout (deployed SEPARATELY)
```

## Editing rates (nothing is hardcoded)

All prices, zones, vehicles, and add-on costs live in **`src/data/rates.json`**.
The booking widget, the rates cards, the fleet card, and every route landing
page read from it. Edit one file and everything updates.

Published product (luxury SUV only):

- **$50** one-way — UIO ↔ **Wyndham Quito Airport** (Tababela / airport-area hotel)
- **$75** one-way — UIO ↔ **anywhere in Cumbayá** (Valle de Tumbaco)
- **$100** one-way — UIO ↔ **anywhere in Quito city** (Hyatt, Oro Verde, Swissôtel,
  Casa Gangotena, and any other city address)

Pickup dates need **3 calendar days’ notice** (`SITE.minLeadDays` in
`src/config.ts`). The booker greys out today and the next two days.

Price math:

```
total = zone.price × (roundTrip ? 2 : 1)
      + childSeat × qty
      + (extraStop ? extraStop × (roundTrip ? 2 : 1) : 0)
```

## Adding the hero image

The homepage hero is **paper, not a photo wallpaper**. It opens with eyebrow, h1,
short sub, and the three price rows, then a **large** owner meet-and-greet still
`src/assets/_source/meet-greet.webp` (chauffeur with name-sign tablet at UIO
arrivals) as a contained, captioned figure filling the copy column. Do not lead
the page with that photo alone. Do not use `door-holder.*` or
`cumbaya-valley.*` in components — both files are the broken curb/door still
(top-left crop artifact), not a valley landscape. The cabin still
`src/assets/_source/chauffeur-owner.webp` is the fleet / booker representative
photo. The terminal exterior
`src/assets/_source/uio-terminal.webp` is a smaller place photo in How far. The
route map
`src/assets/_source/route-map.webp` (UIO ↔ Old Town; Cumbayá on the path) also
feeds How far. Do not replace owner stills with generated lookalikes.

## Adding fleet photos

The fleet panel uses the cabin portrait `src/assets/_source/chauffeur-owner.webp`
(or a vehicle file in `src/assets/fleet/`). Do not wire `door-holder.*` or
`cumbaya-valley.*` back in.
Caption: **"Representative chauffeur and cabin — we do not show a stock SUV
exterior. Actual model may vary."** Do not generate an exterior stand-in.

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
2. **Deploy the Cloudflare Worker in `/functions`** with Wrangler — a static
   Pages site can't hold secret keys. The worker calls Stripe's HTTP API (no
   Node SDK). Set secrets/vars in Wrangler (see `.env.example` and
   `functions/README.md`). **Never commit keys.**
3. In `src/config.ts`, set `paymentsMode: 'live'` and `paymentApiBase` to the
   **real** workers.dev URL Wrangler prints after deploy. Leave mock mode until
   that URL exists.

Merchant-of-record obligations are already wired: the cancellation policy is
accepted at checkout (stored in booking metadata), and the
independent-licensed-carrier **disclosure** appears on the footer, FAQ, booking
step, and confirmation.

## Deploying to GitHub Pages

1. Create a GitHub repo and push this project.
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main` — `.github/workflows/deploy.yml` builds and deploys.

### Custom domain (uiotransfers.com)

`SITE.domain` is **https://uiotransfers.com** and the booking email placeholder
is **book@uiotransfers.com**. Do not use `andesride.com`,
`quitoairporttransfers.com`, or `transfersfromuio.com`.

`astro.config.mjs` is set to `site: 'https://uiotransfers.com'` and `base: '/'`.
GitHub Pages project sites with a custom domain are served at the **domain
root**, so assets and canonical URLs must not use the `/andesride/` project
path. `public/CNAME` contains `uiotransfers.com` so Pages can verify the
domain.

**github.io implication:** `https://rafarecalde.github.io/andesride/` is no
longer a working preview URL (asset paths would 404 under `/andesride/`).
Once DNS is attached, GitHub Pages typically redirects that project URL to
`uiotransfers.com`. Until then, use `npm run preview` locally.

Remaining DNS step: point `uiotransfers.com` at GitHub Pages (A records /
`CNAME` per GitHub's docs) and set the custom domain in repo Settings → Pages.

## Owner TODOs

1. **Source licensed, UIO-authorized carriers/drivers** — the launch gate. Local
   counsel to confirm the intermediary structure + carrier agreement.
2. Optionally replace the curb still with a vehicle-specific luxury SUV photo
   when you have one. Do not generate an exterior.
3. Confirm **final rates** in `src/data/rates.json` ($50 airport Wyndham / $75 anywhere in Cumbayá / $100 anywhere in Quito).
4. Stand up the **US entity + Stripe**; deploy `/functions` with Wrangler
   (`functions/README.md`); then set `paymentApiBase` + `paymentsMode: 'live'`.
5. **Point DNS** for `uiotransfers.com` at GitHub Pages (already in
   `SITE.domain` / `SITE.email`, `astro.config.mjs` `site` + `base: '/'`, and
   `public/CNAME`). Then set the custom domain in repo Settings → Pages.
   Phone stays hidden until a real number is set in `src/config.ts`
   (placeholder digits are not shown).
6. The homepage uses a quiet trust strip (`src/components/Reviews.astro`) —
   licensed · prepaid · flight tracking — not sample reviews. Add real,
   verifiable quotes only when they exist.
7. Add **analytics** (Plausible/GA4) + a privacy/cookie note (`/privacy`).
8. Keep destination guides beyond the three prepaid products (Otavalo, Mindo,
   Mitad del Mundo, Papallacta, etc.) as quote-on-request. Prepaid bookable
   products are airport-hotel ($50), anywhere in Cumbayá ($75), and Quito city ($100).

## What's included

- Booking widget (3 steps + confirmation), live USD pricing from `rates.json`,
  round trip, child seats, extra stops, validation, **mock** payment + reference.
- Blog: `/guide` index, seed posts with booking CTAs, 3 latest on the home page,
  `rss.xml`, sitemap, JSON-LD (`Article`, `FAQPage`, `TaxiService`/`LocalBusiness`,
  `Service`/`Offer` with prices).
- Route landing pages: `/quito-airport-to-<zone>` for every zone in `rates.json`
  (Wyndham Quito Airport, anywhere in Cumbayá, and anywhere in Quito).
- Legal: `/terms`, `/privacy`, `/cancellation` (templates for counsel review).
- Responsive (980 / 760 breakpoints), reduced-motion, keyboard-operable widget +
  menu, AA-minded contrast.
