// Central affiliate config for uiotransfers.com.
//
// Fill the IDs below (see README → Affiliate programs). While a value still
// contains TODO, that parameter is omitted and the link stays a normal
// partner URL — never a broken or half-built tracking link.
//
// Link shapes follow each program's public docs:
// - GetYourGuide: ?partner_id= on any getyourguide.com URL (search: /s/?q=)
// - Viator: ?pid=&mcid=42383&medium=link (42383 is Viator's published link medium)
// - Civitatis: ?aid= on a civitatis.com URL
// - Discover Cars: ?a_aid= (Post Affiliate Pro)
// - Booking.com: ?aid= plus optional &label= for a Travelpayouts marker
// - Airalo: Impact dashboard URL, or the Ecuador eSIM page

export const AFFILIATE_DISCLOSURE =
  'We may earn a commission if you book through these links, at no extra cost to you.';

export const AFFILIATE_IDS = {
  getYourGuidePartnerId: 'GYG_PARTNER_ID_TODO',
  viatorPid: 'VIATOR_PID_TODO',
  civitatisAid: 'CIVITATIS_AID_TODO',
  discoverCarsAid: 'DISCOVERCARS_A_AID_TODO',
  /** Booking.com affiliate id (`aid`) from partnerships.booking.com or the aid inside a Travelpayouts Booking link. */
  bookingAid: 'BOOKING_AID_TODO',
  /** Travelpayouts partner marker. Sent as Booking.com's `label` once it is a real id. */
  travelpayoutsMarker: 'TRAVELPAYOUTS_MARKER_TODO',
  airaloPartnerId: 'AIRALO_PARTNER_ID_TODO',
  /**
   * Paste the full Impact tracking URL from the Airalo affiliate dashboard.
   * Preferred over airaloPartnerId — Airalo does not publish a stable query param.
   */
  airaloImpactUrl: 'AIRALO_IMPACT_URL_TODO',
};

export type AffiliateIds = { [K in keyof typeof AFFILIATE_IDS]: string };

/** Viator's published campaign id for ordinary text links. Not a publisher id. */
export const VIATOR_LINK_MCID = '42383';

export function isPlaceholderId(value: string | undefined | null): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  return /TODO|PLACEHOLDER|^YOUR_/i.test(trimmed);
}

function withParams(url: URL, params: Record<string, string | undefined>): string {
  for (const [key, value] of Object.entries(params)) {
    if (!isPlaceholderId(value)) url.searchParams.set(key, value as string);
  }
  return url.toString();
}

export function createAffiliateLinks(ids: AffiliateIds = AFFILIATE_IDS) {
  return {
    /** Documented search deep link: https://www.getyourguide.com/s/?q=&partner_id= */
    getYourGuide(query: string) {
      const url = new URL('https://www.getyourguide.com/s/');
      url.searchParams.set('q', query);
      return withParams(url, { partner_id: ids.getYourGuidePartnerId });
    },

    /**
     * Search URL plus Viator's pid / mcid / medium=link.
     * Destination d-codes are not hardcoded: Viator blocks unauthenticated checks,
     * so the public search URL is the stable deep link.
     */
    viator(text: string) {
      const url = new URL('https://www.viator.com/searchResults/all');
      url.searchParams.set('text', text);
      if (!isPlaceholderId(ids.viatorPid)) {
        url.searchParams.set('pid', ids.viatorPid);
        url.searchParams.set('mcid', VIATOR_LINK_MCID);
        url.searchParams.set('medium', 'link');
      }
      return url.toString();
    },

    /** path is a site path such as /en/quito/ — aid is Civitatis's published param. */
    civitatis(path: string) {
      const url = new URL(path, 'https://www.civitatis.com');
      return withParams(url, { aid: ids.civitatisAid });
    },

    /** Quito pickup page. a_aid is Discover Cars' Post Affiliate Pro id. */
    discoverCars(path = '/ecuador/quito') {
      const url = new URL(path, 'https://www.discovercars.com');
      return withParams(url, { a_aid: ids.discoverCarsAid });
    },

    bookingSearch(destination: string) {
      const url = new URL('https://www.booking.com/searchresults.html');
      url.searchParams.set('ss', destination);
      url.searchParams.set('lang', 'en-us');
      return withParams(url, {
        aid: ids.bookingAid,
        label: ids.travelpayoutsMarker,
      });
    },

    /** hotelPath like /hotel/ec/casa-gangotena-quito.html */
    bookingHotel(hotelPath: string) {
      const path = hotelPath.startsWith('/') ? hotelPath : `/${hotelPath}`;
      const url = new URL(path, 'https://www.booking.com');
      return withParams(url, {
        aid: ids.bookingAid,
        label: ids.travelpayoutsMarker,
      });
    },

    airalo() {
      if (!isPlaceholderId(ids.airaloImpactUrl)) return ids.airaloImpactUrl.trim();
      const url = new URL('https://www.airalo.com/ecuador-esim');
      return withParams(url, { partner_id: ids.airaloPartnerId });
    },
  };
}

export const affiliateLinks = createAffiliateLinks();

export interface AffiliateCard {
  id: string;
  kicker: string;
  title: string;
  href: string;
  partner: string;
  art: string;
  cta: string;
}

export function tripCatalog(links = affiliateLinks): Record<string, AffiliateCard> {
  return {
    'quito-tours': {
      id: 'quito-tours',
      kicker: 'Tours',
      title: 'Quito & the equator',
      href: links.getYourGuide('Quito city tour Mitad del Mundo'),
      partner: 'getyourguide',
      art: 'art-quito',
      cta: 'See tours',
    },
    'old-town-tour': {
      id: 'old-town-tour',
      kicker: 'Tours',
      title: 'Old Town walks',
      href: links.getYourGuide('Quito Old Town walking tour'),
      partner: 'getyourguide',
      art: 'art-quito',
      cta: 'See tours',
    },
    otavalo: {
      id: 'otavalo',
      kicker: 'Tours',
      title: 'Otavalo market',
      href: links.civitatis('/en/otavalo/'),
      partner: 'civitatis',
      art: 'art-market',
      cta: 'See tours',
    },
    mitad: {
      id: 'mitad',
      kicker: 'Tours',
      title: 'Mitad del Mundo',
      href: links.civitatis('/en/quito/middle-world-intinan-museum-tour/'),
      partner: 'civitatis',
      art: 'art-equator',
      cta: 'See the tour',
    },
    cotopaxi: {
      id: 'cotopaxi',
      kicker: 'Day trips',
      title: 'Cotopaxi & Quilotoa',
      href: links.viator('Cotopaxi Quilotoa day trip'),
      partner: 'viator',
      art: 'art-volcano',
      cta: 'See trips',
    },
    quilotoa: {
      id: 'quilotoa',
      kicker: 'Day trips',
      title: 'Quilotoa crater',
      href: links.getYourGuide('Quilotoa crater lake from Quito'),
      partner: 'getyourguide',
      art: 'art-lake',
      cta: 'See trips',
    },
    galapagos: {
      id: 'galapagos',
      kicker: 'Tours',
      title: 'Galápagos',
      href: links.civitatis('/en/galapagos-islands/'),
      partner: 'civitatis',
      art: 'art-sea',
      cta: 'See trips',
    },
    mindo: {
      id: 'mindo',
      kicker: 'Tours',
      title: 'Mindo cloud forest',
      href: links.civitatis('/en/mindo/'),
      partner: 'civitatis',
      art: 'art-forest',
      cta: 'See tours',
    },
    banos: {
      id: 'banos',
      kicker: 'Tours',
      title: 'Baños',
      href: links.civitatis('/en/banos-de-agua-santa/'),
      partner: 'civitatis',
      art: 'art-falls',
      cta: 'See tours',
    },
    papallacta: {
      id: 'papallacta',
      kicker: 'Tours',
      title: 'Papallacta springs',
      href: links.getYourGuide('Papallacta hot springs'),
      partner: 'getyourguide',
      art: 'art-springs',
      cta: 'See tours',
    },
    'day-trips': {
      id: 'day-trips',
      kicker: 'Day trips',
      title: 'Days out of Quito',
      href: links.civitatis('/en/quito/day-trips/'),
      partner: 'civitatis',
      art: 'art-volcano',
      cta: 'See trips',
    },
    teleferico: {
      id: 'teleferico',
      kicker: 'Tours',
      title: 'TelefériQo',
      href: links.getYourGuide('Teleferico Quito Pichincha'),
      partner: 'getyourguide',
      art: 'art-peak',
      cta: 'See tours',
    },
    pululahua: {
      id: 'pululahua',
      kicker: 'Tours',
      title: 'Pululahua crater',
      href: links.getYourGuide('Pululahua crater Quito'),
      partner: 'getyourguide',
      art: 'art-volcano',
      cta: 'See tours',
    },
    'food-tour': {
      id: 'food-tour',
      kicker: 'Tours',
      title: 'A food walk',
      href: links.getYourGuide('Quito food tour'),
      partner: 'getyourguide',
      art: 'art-market',
      cta: 'See tours',
    },
    car: {
      id: 'car',
      kicker: 'Car rental',
      title: 'A car at UIO',
      href: links.discoverCars(),
      partner: 'discovercars',
      art: 'art-car',
      cta: 'Compare cars',
    },
    esim: {
      id: 'esim',
      kicker: 'eSIM',
      title: 'Ecuador eSIM',
      href: links.airalo(),
      partner: 'airalo',
      art: 'art-esim',
      cta: 'Get an eSIM',
    },
  };
}

export interface HotelQuery {
  query: string;
  label: string;
}

export function hotelCard(hotel: HotelQuery, links = affiliateLinks): AffiliateCard {
  return {
    id: `hotels-${hotel.query}`,
    kicker: 'Hotels',
    title: hotel.label,
    href: links.bookingSearch(hotel.query),
    partner: 'booking',
    art: 'art-stay',
    cta: 'Check rates',
  };
}

export const HOME_TRIP_IDS = ['quito-tours', 'otavalo', 'cotopaxi', 'galapagos', 'car', 'esim'] as const;

export interface LuxuryStay {
  id: string;
  name: string;
  area: string;
  /**
   * Verified Booking.com property path. Null means we could not confirm a
   * property URL, so Check rates uses destination search instead.
   */
  bookingPath: string | null;
  searchQuery: string;
}

export const LUXURY_STAYS: LuxuryStay[] = [
  {
    id: 'gangotena',
    name: 'Casa Gangotena',
    area: 'Quito Old Town',
    bookingPath: '/hotel/ec/casa-gangotena-quito.html',
    searchQuery: 'Casa Gangotena Quito',
  },
  {
    id: 'illa',
    name: 'Illa Experience',
    area: 'Quito Old Town',
    bookingPath: '/hotel/ec/illa-experience.html',
    searchQuery: 'Illa Experience Hotel Quito',
  },
  {
    id: 'plaza-grande',
    name: 'Plaza Grande',
    area: 'Quito Old Town',
    bookingPath: '/hotel/ec/plaza-grande.html',
    searchQuery: 'Plaza Grande Hotel Quito',
  },
  {
    id: 'jw-marriott',
    name: 'JW Marriott Quito',
    area: 'Quito',
    bookingPath: '/hotel/ec/jw-marriott-quito.html',
    searchQuery: 'JW Marriott Quito',
  },
  {
    id: 'zuleta',
    name: 'Hacienda Zuleta',
    area: 'Near Otavalo',
    // Telegraph lists Booking.com as the rate source, but no stable /hotel/ec/ path was verified.
    bookingPath: null,
    searchQuery: 'Hacienda Zuleta',
  },
  {
    id: 'cusin',
    name: 'Hacienda Cusín',
    area: 'Otavalo',
    bookingPath: '/hotel/ec/hacienda-cusin.html',
    searchQuery: 'Hacienda Cusin Otavalo',
  },
  {
    id: 'mirage',
    name: 'La Mirage',
    area: 'Cotacachi',
    bookingPath: '/hotel/ec/la-mirage-garden-spa.html',
    searchQuery: 'La Mirage Garden Hotel Cotacachi',
  },
  {
    id: 'callo',
    name: 'San Agustín de Callo',
    area: 'Cotopaxi',
    bookingPath: '/hotel/ec/hacienda-san-agustin-de-callo.html',
    searchQuery: 'Hacienda San Agustin de Callo',
  },
  {
    id: 'porvenir',
    name: 'Hacienda El Porvenir',
    area: 'Cotopaxi',
    bookingPath: '/hotel/ec/hacienda-el-porvenir-tierra-del-volcan.html',
    searchQuery: 'Hacienda El Porvenir Cotopaxi',
  },
  {
    id: 'mashpi',
    name: 'Mashpi Lodge',
    area: 'Cloud forest',
    // No verified Booking.com or Expedia property URL. Search the area by name.
    bookingPath: null,
    searchQuery: 'Mashpi Lodge',
  },
  {
    id: 'bellavista',
    name: 'Bellavista Lodge',
    area: 'Mindo',
    bookingPath: '/hotel/ec/bellavista-cloud-forest-lodge.html',
    searchQuery: 'Bellavista Cloud Forest Lodge',
  },
];

export const HOME_LUXURY_IDS = ['gangotena', 'illa', 'zuleta', 'callo', 'mashpi', 'mirage'];

export function stayById(id: string): LuxuryStay | undefined {
  return LUXURY_STAYS.find((stay) => stay.id === id);
}

export function stayHref(stay: LuxuryStay, links = affiliateLinks): string {
  if (stay.bookingPath) return links.bookingHotel(stay.bookingPath);
  return links.bookingSearch(stay.searchQuery);
}

export interface PostAffiliatePlan {
  inline: string;
  inlineTitle?: string;
  hotel: HotelQuery;
  tour: string;
  luxury?: string[];
}

const QUITO: HotelQuery = { query: 'Quito', label: 'Quito hotels' };
const OLD_TOWN: HotelQuery = { query: 'Quito Old Town', label: 'Old Town hotels' };
const CUMBAYA: HotelQuery = { query: 'Cumbaya', label: 'Cumbayá hotels' };
const AIRPORT: HotelQuery = { query: 'Tababela', label: 'Airport hotels' };
const MARISCAL: HotelQuery = { query: 'La Mariscal Quito', label: 'La Mariscal hotels' };
const OTAVALO: HotelQuery = { query: 'Otavalo', label: 'Otavalo hotels' };
const COTOPAXI: HotelQuery = { query: 'Cotopaxi', label: 'Cotopaxi stays' };
const MINDO: HotelQuery = { query: 'Mindo', label: 'Mindo lodges' };
const BANOS: HotelQuery = { query: 'Banos Ecuador', label: 'Baños hotels' };
const PAPALLACTA: HotelQuery = { query: 'Papallacta', label: 'Papallacta stays' };
const QUILOTOA: HotelQuery = { query: 'Quilotoa', label: 'Quilotoa stays' };

const QUITO_LUXURY = ['gangotena', 'illa', 'plaza-grande'];

export const POST_AFFILIATES: Record<string, PostAffiliatePlan> = {
  'why-licensed-airport-drivers-matter-quito': { inline: 'esim', hotel: QUITO, tour: 'quito-tours' },
  'teleferico-quito-pichincha': {
    inline: 'teleferico',
    hotel: QUITO,
    tour: 'teleferico',
    luxury: ['gangotena', 'illa'],
  },
  'quito-old-town-guide': {
    inline: 'old-town-tour',
    hotel: OLD_TOWN,
    tour: 'old-town-tour',
    luxury: QUITO_LUXURY,
  },
  'taxi-or-uber-from-quito-airport-at-night': { inline: 'esim', inlineTitle: 'Data when you land', hotel: QUITO, tour: 'quito-tours' },
  'renting-a-car-vs-private-transfer-quito': { inline: 'car', hotel: QUITO, tour: 'quito-tours' },
  'united-ua1002-houston-to-quito-night': {
    inline: 'quito-tours',
    inlineTitle: 'Tomorrow in Quito',
    hotel: QUITO,
    tour: 'quito-tours',
  },
  'dont-arrive-to-an-empty-airport': { inline: 'esim', inlineTitle: 'A working phone', hotel: QUITO, tour: 'quito-tours' },
  'copa-cm211-panama-city-to-quito-night': {
    inline: 'quito-tours',
    inlineTitle: 'Tomorrow in Quito',
    hotel: QUITO,
    tour: 'quito-tours',
  },
  'quilotoa-crater-lake-guide': { inline: 'quilotoa', hotel: QUILOTOA, tour: 'quilotoa' },
  'how-far-is-quito-airport-from-the-city': { inline: 'quito-tours', hotel: QUITO, tour: 'quito-tours' },
  'avianca-av8396-bogota-to-quito-night': {
    inline: 'quito-tours',
    inlineTitle: 'Tomorrow in Quito',
    hotel: QUITO,
    tour: 'quito-tours',
  },
  'quito-airport-to-cumbaya-transfer': { inline: 'hotels-cumbaya', hotel: CUMBAYA, tour: 'quito-tours' },
  'quito-airport-to-wyndham-do-you-need-a-car': { inline: 'car', hotel: AIRPORT, tour: 'quito-tours' },
  'how-much-is-a-taxi-from-quito-airport': { inline: 'esim', hotel: QUITO, tour: 'quito-tours' },
  'cumbaya-tumbaco-guide': { inline: 'hotels-cumbaya', hotel: CUMBAYA, tour: 'quito-tours' },
  'papallacta-hot-springs-guide': { inline: 'papallacta', hotel: PAPALLACTA, tour: 'papallacta' },
  'uber-from-quito-airport': { inline: 'esim', inlineTitle: 'Data when you land', hotel: QUITO, tour: 'quito-tours' },
  'la-mariscal-quito-guide': {
    inline: 'food-tour',
    hotel: MARISCAL,
    tour: 'food-tour',
    luxury: ['jw-marriott'],
  },
  'quito-airport-arrival-guide': { inline: 'esim', inlineTitle: 'An eSIM before you fly', hotel: QUITO, tour: 'quito-tours' },
  'is-uber-safe-in-quito': { inline: 'esim', hotel: QUITO, tour: 'quito-tours' },
  'latam-la1443-bogota-to-quito-night': {
    inline: 'quito-tours',
    inlineTitle: 'Tomorrow in Quito',
    hotel: QUITO,
    tour: 'quito-tours',
  },
  'first-trip-to-quito-from-the-us': {
    inline: 'esim',
    inlineTitle: 'An eSIM before you fly',
    hotel: QUITO,
    tour: 'quito-tours',
    luxury: ['gangotena', 'illa', 'jw-marriott', 'zuleta'],
  },
  'getting-from-quito-airport-to-city': { inline: 'quito-tours', hotel: QUITO, tour: 'quito-tours' },
  'things-to-do-in-otavalo': {
    inline: 'otavalo',
    hotel: OTAVALO,
    tour: 'otavalo',
    luxury: ['zuleta', 'cusin', 'mirage'],
  },
  'visiting-mitad-del-mundo': {
    inline: 'mitad',
    hotel: QUITO,
    tour: 'mitad',
    luxury: ['gangotena', 'illa'],
  },
  'altitude-in-quito-what-to-expect': {
    inline: 'quito-tours',
    inlineTitle: 'An easy first day',
    hotel: QUITO,
    tour: 'quito-tours',
  },
  'paying-for-quito-airport-rides': { inline: 'esim', hotel: QUITO, tour: 'quito-tours' },
  'pululahua-crater-guide': { inline: 'pululahua', hotel: QUITO, tour: 'pululahua' },
  'banos-de-agua-santa-guide': { inline: 'banos', hotel: BANOS, tour: 'banos' },
  'where-to-stay-near-quito-airport': { inline: 'hotels-airport', hotel: AIRPORT, tour: 'quito-tours' },
  'arriving-quito-airport-late-at-night': {
    inline: 'quito-tours',
    inlineTitle: 'Tomorrow in Quito',
    hotel: QUITO,
    tour: 'quito-tours',
  },
  'quito-airport-to-old-town-hotels': {
    inline: 'stay-gangotena',
    hotel: OLD_TOWN,
    tour: 'old-town-tour',
    luxury: QUITO_LUXURY,
  },
  'american-airlines-aa833-miami-to-quito-night': {
    inline: 'quito-tours',
    inlineTitle: 'Tomorrow in Quito',
    hotel: QUITO,
    tour: 'quito-tours',
  },
  'quito-airport-transfer-for-families': { inline: 'quito-tours', hotel: QUITO, tour: 'quito-tours' },
  'best-day-trips-from-quito': {
    inline: 'day-trips',
    hotel: QUITO,
    tour: 'day-trips',
    luxury: ['zuleta', 'callo', 'mashpi', 'gangotena'],
  },
  'private-transfer-vs-taxi-quito': { inline: 'quito-tours', hotel: QUITO, tour: 'quito-tours' },
  'avianca-av125-bogota-to-quito-night': {
    inline: 'quito-tours',
    inlineTitle: 'Tomorrow in Quito',
    hotel: QUITO,
    tour: 'quito-tours',
  },
  'cotopaxi-national-park-day-trip': {
    inline: 'cotopaxi',
    hotel: COTOPAXI,
    tour: 'cotopaxi',
    luxury: ['callo', 'porvenir'],
  },
  'quito-layover-guide': {
    inline: 'quito-tours',
    inlineTitle: 'If you leave the airport',
    hotel: QUITO,
    tour: 'quito-tours',
    luxury: ['gangotena', 'illa'],
  },
  'aeroservicios-bus-vs-private-transfer': { inline: 'quito-tours', hotel: QUITO, tour: 'quito-tours' },
  'mindo-cloud-forest-guide': {
    inline: 'mindo',
    hotel: MINDO,
    tour: 'mindo',
    luxury: ['mashpi', 'bellavista'],
  },
};

const HOTEL_OFFERS: Record<string, HotelQuery> = {
  'hotels-cumbaya': CUMBAYA,
  'hotels-airport': AIRPORT,
};

export function planForPost(slug: string): PostAffiliatePlan | undefined {
  return POST_AFFILIATES[slug];
}

export function luxuryIdsForPost(slug: string): string[] {
  return POST_AFFILIATES[slug]?.luxury ?? [];
}

export function cardForOffer(id: string, links = affiliateLinks): AffiliateCard | undefined {
  if (id === 'stay-gangotena') {
    const stay = stayById('gangotena');
    if (!stay) return undefined;
    return {
      id: 'stay-gangotena',
      kicker: 'Stay',
      title: stay.name,
      href: stayHref(stay, links),
      partner: 'booking',
      art: 'art-stay',
      cta: 'Check rates',
    };
  }
  const hotel = HOTEL_OFFERS[id];
  if (hotel) return hotelCard(hotel, links);
  return tripCatalog(links)[id];
}

export function homeTripCards(links = affiliateLinks): AffiliateCard[] {
  const catalog = tripCatalog(links);
  return HOME_TRIP_IDS.map((id) => catalog[id]);
}

export function postEndCards(slug: string, links = affiliateLinks): AffiliateCard[] {
  const plan = POST_AFFILIATES[slug] ?? {
    inline: 'quito-tours',
    hotel: QUITO,
    tour: 'quito-tours',
  };
  const tour = cardForOffer(plan.tour, links) ?? tripCatalog(links)['quito-tours'];
  const catalog = tripCatalog(links);
  return [hotelCard(plan.hotel, links), catalog.car, tour, catalog.esim];
}

export function inlineCardForPost(slug: string, links = affiliateLinks): AffiliateCard | undefined {
  const plan = POST_AFFILIATES[slug];
  if (!plan) return undefined;
  const card = cardForOffer(plan.inline, links);
  if (!card) return undefined;
  return plan.inlineTitle ? { ...card, title: plan.inlineTitle } : card;
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function inlineOfferHtml(slug: string, links = affiliateLinks): string {
  const card = inlineCardForPost(slug, links);
  if (!card) return '';
  return `<aside class="offer" data-inline-offer="${esc(card.id)}">
<a href="${esc(card.href)}" rel="sponsored noopener" target="_blank" data-affiliate="${esc(card.partner)}" data-affiliate-label="${esc(card.id)}">
<span class="art ${esc(card.art)}" aria-hidden="true"></span>
<span class="offer-copy"><span class="offer-kicker">${esc(card.kicker)}</span><strong>${esc(card.title)}</strong></span>
<span class="offer-go">${esc(card.cta)}</span>
</a>
<p class="offer-note">${esc(AFFILIATE_DISCLOSURE)}</p>
</aside>`;
}

interface MdastNode {
  type: string;
  value?: string;
}

interface MdastTree {
  children: MdastNode[];
}

interface MdastFile {
  path?: string;
  history?: string[];
}

/** Insert one contextual affiliate card partway through each guide. */
export function remarkInlineAffiliate() {
  return (tree: MdastTree, file: MdastFile) => {
    const source = file.path || file.history?.[0] || '';
    const slug = source.split(/[/\\]/).pop()?.replace(/\.mdx?$/, '') ?? '';
    if (!slug) return;
    const html = inlineOfferHtml(slug);
    if (!html) return;
    if (tree.children.some((node) => node.type === 'html' && node.value?.includes('data-inline-offer'))) {
      return;
    }
    let seen = 0;
    let insertAt = tree.children.length;
    for (let i = 0; i < tree.children.length; i++) {
      const type = tree.children[i].type;
      if (type === 'paragraph' || type === 'heading' || type === 'list') seen += 1;
      if (seen >= 4) {
        insertAt = i + 1;
        break;
      }
    }
    tree.children.splice(insertAt, 0, { type: 'html', value: html });
  };
}
