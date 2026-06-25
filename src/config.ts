// ─────────────────────────────────────────────────────────────────────────────
// Site-wide settings. Owner: edit these before launch (see README "Owner TODOs").
// ─────────────────────────────────────────────────────────────────────────────
export const SITE = {
  name: 'AndesRide',
  descriptor: 'Quito Airport Transfers — UIO',
  tagline: 'Private, flat-rate airport transfers to and from Quito (UIO).',
  domain: 'https://andesride.com',
  email: 'book@andesride.com',
  whatsapp: '+593 99 000 0000',
  phone: '+593 99 000 0000',

  // Payments — keep "mock" until the Stripe + US-entity piece is live (README §Payments).
  paymentsMode: 'mock' as 'mock' | 'live',
  payProvider: 'stripe' as 'stripe' | 'payphone' | 'kushki' | 'pagoplux' | 'dlocal',

  // URL of the deployed serverless checkout function (used only in "live" mode).
  // e.g. 'https://andesride-pay.<you>.workers.dev'  — leave blank for mock.
  paymentApiBase: '',

  cancelFreeHours: 24,

  // Social proof shown on the site — PLACEHOLDER until real reviews exist (README).
  ratingValue: '4.9',
  ratingCount: '1200',
};

// Required intermediary disclosure (Expedia-style). Reused on footer, FAQ,
// the booking step, and the confirmation screen.
export const DISCLOSURE =
  'AndesRide is a booking platform. Rides are provided by independent, licensed, ' +
  'airport-authorized carriers we coordinate. We collect payment as the carrier’s ' +
  'booking and payment channel.';
