import { DISCLOSURE } from '../config';

// Shared FAQ content — rendered by Faq.astro and emitted as FAQPage JSON-LD
// on the home page. One source so the structured data never drifts from the copy.
export const FAQ: { q: string; a: string }[] = [
  {
    q: 'What are the prepaid flat rates?',
    a: 'Two one-way luxury-SUV rates from Quito airport (UIO), paid up front in USD: $50 to Wyndham Quito Airport (the airport-area hotel in Tababela, a few minutes from the terminal) and $100 to anywhere in Quito city. The city rate covers hotels and addresses across town — including Hyatt, Oro Verde, Swissôtel, Casa Gangotena, and a city-center Wyndham if that is where you are staying (it is not the airport hotel). No meter, no surge, no airport surcharge.',
  },
  {
    q: 'Is the $50 Wyndham rate the airport hotel or a hotel in the city?',
    a: 'The $50 rate is only Wyndham Quito Airport in Tababela, next to UIO. Any other Quito address — including Hyatt, Oro Verde, Swissôtel, Casa Gangotena, or a distinct city Wyndham — is the $100 anywhere-in-Quito rate.',
  },
  {
    q: 'What vehicle do you use?',
    a: 'Every booking is a luxury SUV with a licensed, airport-authorized driver. It seats up to 5 passengers with room for about 4 bags. Actual model may vary; the class of vehicle does not.',
  },
  {
    q: 'How does prepaid pricing work?',
    a: 'You pay the flat rate up front at checkout, in USD. It covers the luxury SUV, licensed driver, tolls, parking, meet & greet, and flight tracking. Round trips are twice the one-way rate. Child seats and an extra stop are added at checkout if you need them.',
  },
  {
    q: 'What if my flight is delayed?',
    a: 'We track your flight by the number you enter at booking and adjust your pickup automatically. Wait time for flight delays is included, so your driver is there whenever you actually land.',
  },
  {
    q: 'Where will my driver meet me?',
    a: 'For arrivals at UIO, your driver waits in the arrivals hall with a sign showing your name, and helps with your luggage to the vehicle. For departures, the driver picks you up at your address at the scheduled time.',
  },
  {
    q: 'How do I pay, and is it secure?',
    a: "You pay online by card up front, in USD (Ecuador's official currency). Payment is processed securely and you receive a confirmation by email.",
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
    q: 'Do you go beyond Quito city?',
    a: 'The published prepaid rates are UIO → Wyndham Quito Airport ($50) and UIO → anywhere in Quito city ($100). Destinations outside the city — Cumbayá, Mitad del Mundo, Otavalo, Mindo, Papallacta, and similar — are quoted on request. Message us rather than guessing a city rate.',
  },
];
