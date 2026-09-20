// ─────────────────────────────────────────────────────────────────────────────
// Site-wide settings. Owner: edit these before launch (see README "Owner TODOs").
// ─────────────────────────────────────────────────────────────────────────────
export const SITE = {
  name: 'Quito Airport Transfer',
  descriptor: 'Prepaid luxury SUV · UIO',
  tagline: 'Prepaid luxury-SUV airport transfers from Quito (UIO).',
  // Locked public origin: uiotransfers.com (plural). Canonical / OG / JSON-LD
  // target it so the build is launch-ready. DNS may still be propagating.
  // Do not use andesride.com, quitoairporttransfers.com, or transfersfromuio.com.
  domain: 'https://uiotransfers.com',
  email: 'book@uiotransfers.com',
  // Leave blank until a real number exists — do not ship placeholder digits.
  whatsapp: '',
  phone: '',

  // Payments — keep "mock" until the Cloudflare Worker is deployed with real
  // Stripe keys (see functions/README.md). Do not invent a placeholder URL.
  paymentsMode: 'mock' as 'mock' | 'live',
  payProvider: 'stripe' as 'stripe' | 'payphone' | 'kushki' | 'pagoplux' | 'dlocal',

  // TODO: after `npx wrangler deploy` in /functions, set this to the real
  // workers.dev URL Wrangler prints (e.g. https://uiotransfers-pay.<account>.workers.dev)
  // with no trailing slash, then set paymentsMode: 'live'.
  paymentApiBase: '',

  cancelFreeHours: 24,

  // First bookable pickup is today + minLeadDays (local calendar days).
  // Today and the next (minLeadDays - 1) days are blocked in the booker.
  minLeadDays: 3,

  // Social proof — PLACEHOLDER until real reviews exist (README).
  // Do not surface these as live counts in UI or JSON-LD until they are verified.
  ratingValue: '',
  ratingCount: '',
};

function isRealPhone(value: string) {
  const digits = (value || '').replace(/\D/g, '');
  if (digits.length < 8) return false;
  // Reject obvious placeholders such as +593 99 000 0000.
  if (/0{5,}/.test(digits)) return false;
  return true;
}

export const hasPhone = isRealPhone(SITE.phone);
export const hasWhatsApp = isRealPhone(SITE.whatsapp);

// Required intermediary disclosure (Expedia-style). Reused on footer, FAQ,
// the booking step, and the confirmation screen.
export const DISCLOSURE =
  'Quito Airport Transfer is a booking platform. Rides are provided by independent, licensed, ' +
  'airport-authorized carriers we coordinate. We collect payment as the carrier’s ' +
  'booking and payment channel.';
