import { DISCLOSURE } from '../config';

// Shared FAQ content — rendered by Faq.astro and emitted as FAQPage JSON-LD
// on the home page. One source so the structured data never drifts from the copy.
export const FAQ: { q: string; a: string }[] = [
  {
    q: 'What are the prepaid flat rates?',
    a: 'Three one-way luxury-SUV rates from Quito airport (UIO), paid up front in USD: $50 to Wyndham Quito Airport (the airport-area hotel in Tababela), $75 to anywhere in Cumbayá, and $100 to anywhere in Quito city. The city rate covers hotels and addresses across town — including Hyatt, Oro Verde, Swissôtel, Casa Gangotena, and a city-center Wyndham if that is where you are staying (it is not the airport hotel). No meter, no surge, no airport surcharge.',
  },
  {
    q: 'Is the $50 Wyndham rate the airport hotel or a hotel in the city?',
    a: 'The $50 rate is only Wyndham Quito Airport in Tababela, next to UIO. Anywhere in Cumbayá is the $75 valley rate. Any other Quito address — including Hyatt, Oro Verde, Swissôtel, Casa Gangotena, or a distinct city Wyndham — is the $100 anywhere-in-Quito rate.',
  },
  {
    q: 'What does the $75 anywhere-in-Cumbayá rate cover?',
    a: 'The $75 rate is a prepaid one-way luxury SUV between UIO and anywhere in Cumbayá (Valle de Tumbaco), typically 25–35 minutes. It is not the $100 Quito-city product and not the $50 airport-hotel product. Addresses in Quito city stay on the $100 rate.',
  },
  {
    q: 'What vehicle do you use?',
    a: 'Every booking is a luxury SUV with a licensed, airport-authorized driver. Each vehicle seats up to 4 passengers (driver extra) with room for about 4 bags. Parties of 5–8 book a second SUV at twice the prepaid destination rate. Actual model may vary; the class of vehicle does not.',
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
    a: 'The published prepaid rates are UIO → Wyndham Quito Airport ($50), UIO → anywhere in Cumbayá ($75), and UIO → anywhere in Quito city ($100). Destinations beyond those three — Mitad del Mundo, Otavalo, Mindo, Papallacta, and similar — are quoted on request. Message us rather than guessing a city rate.',
  },
  {
    q: 'How far in advance do I need to book?',
    a: 'At least 3 calendar days. The booker greys out today and the next two days; the earliest pickup is three days from today. That lead time is how we confirm a licensed, airport-authorized driver. Same-day and next-day pickups are not offered.',
  },
];
