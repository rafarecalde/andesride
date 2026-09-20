// ─────────────────────────────────────────────────────────────────────────────
// Site-wide settings. Owner: edit these before launch (see README "Owner TODOs").
// ─────────────────────────────────────────────────────────────────────────────
export const SITE = {
  name: 'Quito Airport Transfer',
  descriptor: 'Prepaid luxury SUV · UIO',
  tagline: 'Prepaid luxury-SUV airport transfers from Quito (UIO).',
  // Chosen public origin: https://uiotransfer.com
  // Do not use andesride.com, quitoairporttransfers.com, or transfersfromuio.com.
  domain: 'https://uiotransfer.com',
  email: 'book@uiotransfer.com',
  whatsapp: '+593 99 000 0000',
  phone: '+593 99 000 0000',

  // Payments — keep "mock" until the Stripe + US-entity piece is live (README §Payments).
  paymentsMode: 'mock' as 'mock' | 'live',
  payProvider: 'stripe' as 'stripe' | 'payphone' | 'kushki' | 'pagoplux' | 'dlocal',

  // URL of the deployed serverless checkout function (used only in "live" mode).
  // e.g. 'https://uiotransfer-pay.<you>.workers.dev'  — leave blank for mock.
  paymentApiBase: '',

  cancelFreeHours: 24,

  // Social proof shown on the site — PLACEHOLDER until real reviews exist (README).
  // Do not surface these as live counts in UI or JSON-LD until they are verified.
  ratingValue: '4.9',
  ratingCount: '1200',
};

// Required intermediary disclosure (Expedia-style). Reused on footer, FAQ,
// the booking step, and the confirmation screen.
export const DISCLOSURE =
  'Quito Airport Transfer is a booking platform. Rides are provided by independent, licensed, ' +
  'airport-authorized carriers we coordinate. We collect payment as the carrier’s ' +
  'booking and payment channel.';
