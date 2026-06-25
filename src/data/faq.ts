import { DISCLOSURE } from '../config';

// Shared FAQ content — rendered by Faq.astro and emitted as FAQPage JSON-LD
// on the home page. One source so the structured data never drifts from the copy.
export const FAQ: { q: string; a: string }[] = [
  {
    q: 'How does the flat rate work?',
    a: 'You pay one fixed price for your area, confirmed before checkout. It covers the vehicle, driver, tolls, parking, meet & greet, and flight tracking. No meter and no airport surcharge — the price you see is the price you pay.',
  },
  {
    q: 'What if my flight is delayed?',
    a: 'We track your flight by the number you enter at booking and adjust your pickup automatically. Wait time for flight delays is included free, so your driver is there whenever you actually land.',
  },
  {
    q: 'Where will my driver meet me?',
    a: 'For arrivals at UIO, your driver waits in the arrivals hall with a sign showing your name, and helps with your luggage to the vehicle. For departures, the driver picks you up at your address at the scheduled time.',
  },
  {
    q: 'How do I pay, and is it secure?',
    a: "You pay online by card at checkout, in USD (Ecuador's official currency). Payment is processed securely and you receive an instant confirmation by email.",
  },
  {
    q: 'Can I cancel or change my booking?',
    a: 'Yes — cancel free up to 24 hours before pickup for a full refund. Within 24 hours of pickup, or for a no-show, the booking is non-refundable because the carrier has been committed. To change a time or pickup point, reply to your confirmation or message us on WhatsApp.',
  },
  {
    q: 'Who actually provides the ride?',
    a: DISCLOSURE + ' Every carrier is licensed and authorized to pick up at the airport, carries commercial insurance, and is accountable for your ride.',
  },
  {
    q: 'Do you go beyond Quito?',
    a: 'Yes. We run flat-rate transfers from UIO to Cumbayá, Tumbaco, Puembo, Mitad del Mundo, Papallacta, Otavalo, Mindo and more. Don’t see your destination? Message us for a flat quote.',
  },
];
