import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import {
  AFFILIATE_IDS,
  AIRALO_LINKS,
  createAffiliateLinks,
  ECONOMYBOOKINGS_LINKS,
  inlineOfferHtml,
  KLOOK_LINKS,
  isPlaceholderId,
  LUXURY_STAYS,
  POST_AFFILIATES,
  postEndCards,
  tripCatalog,
  remarkInlineAffiliate,
  stayHref,
} from './affiliates.ts';

const placeholderLinks = createAffiliateLinks({
  ...AFFILIATE_IDS,
  getYourGuidePartnerId: 'GYG_PARTNER_ID_TODO',
  viatorPid: 'VIATOR_PID_TODO',
});
test('placeholder partner ids are recognized', () => {
  assert.equal(isPlaceholderId('GYG_PARTNER_ID_TODO'), true);
  assert.equal(isPlaceholderId(''), true);
  assert.equal(isPlaceholderId('ABC123'), false);
});

test('placeholder ids fall back to plain partner URLs', () => {
  const cases = [
    placeholderLinks.getYourGuide('Quito city tour'),
    placeholderLinks.viator('Cotopaxi'),
    placeholderLinks.civitatis('/en/quito/'),
    placeholderLinks.discoverCars(),
    placeholderLinks.bookingSearch('Quito'),
    placeholderLinks.bookingHotel('/hotel/ec/casa-gangotena-quito.html'),
    placeholderLinks.airalo(),
  ];
  for (const href of cases) {
    assert.equal(href.includes('TODO'), false, href);
    assert.equal(href.startsWith('https://'), true, href);
  }
  const gyg = placeholderLinks.getYourGuide('Quito');
  assert.equal(gyg.includes('partner_id'), false);
  assert.match(gyg, /^https:\/\/www\.getyourguide\.com\/s\/\?q=/);

  const viator = placeholderLinks.viator('Quito');
  assert.equal(viator.includes('pid='), false);
  assert.equal(viator.includes('mcid='), false);
  assert.match(viator, /^https:\/\/www\.viator\.com\/searchResults\/all\?text=/);

  assert.equal(placeholderLinks.civitatis('/en/otavalo/').includes('aid='), false);
  assert.equal(placeholderLinks.discoverCars().includes('a_aid='), false);
  assert.equal(placeholderLinks.bookingSearch('Cumbaya').includes('aid='), false);
  assert.match(placeholderLinks.bookingSearch('Cumbaya'), /label=786112/);
  assert.match(
    placeholderLinks.bookingHotel('/hotel/ec/casa-gangotena-quito.html'),
    /label=786112/,
  );
  assert.equal(AFFILIATE_IDS.travelpayoutsMarker, '786112');
  assert.equal(placeholderLinks.airalo(), AIRALO_LINKS.ecuadorEsim);
  assert.equal(placeholderLinks.klook('quito'), KLOOK_LINKS.quito);
  assert.equal(placeholderLinks.klook('galapagos'), KLOOK_LINKS.galapagos);
  assert.equal(placeholderLinks.klook('otavalo'), KLOOK_LINKS.otavalo);
  assert.equal(placeholderLinks.economybookings(), ECONOMYBOOKINGS_LINKS.quitoAirport);
});

test('real ids are appended with each partner’s documented parameter', () => {
  const links = createAffiliateLinks({
    ...AFFILIATE_IDS,
    getYourGuidePartnerId: 'GYG123',
    viatorPid: 'P00012345',
    civitatisAid: '10000',
    discoverCarsAid: 'packed',
    bookingAid: '325219',
    travelpayoutsMarker: '339296',
    airaloPartnerId: 'AIR1',
    airaloImpactUrl: 'AIRALO_IMPACT_URL_TODO',
  });

  assert.equal(
    links.getYourGuide('Quito'),
    'https://www.getyourguide.com/s/?q=Quito&partner_id=GYG123&utm_medium=online_publisher',
  );
  assert.equal(
    links.getYourGuideLocation('/quito-l2774/?partner_id=OLD'),
    'https://www.getyourguide.com/quito-l2774/?partner_id=GYG123&utm_medium=online_publisher',
  );
  assert.equal(
    links.viator('Cotopaxi'),
    'https://www.viator.com/searchResults/all?text=Cotopaxi&pid=P00012345&mcid=42383&medium=link',
  );
  assert.equal(
    links.viatorDestination('/Quito/d4427-ttd?pid=OLD'),
    'https://www.viator.com/Quito/d4427-ttd?pid=P00012345&mcid=42383&medium=link',
  );
  assert.match(links.civitatis('/en/galapagos-islands/'), /aid=10000/);
  assert.match(links.discoverCars(), /a_aid=packed/);
  const hotels = links.bookingSearch('Quito');
  assert.match(hotels, /aid=325219/);
  assert.match(hotels, /label=339296/);
  assert.match(links.bookingHotel('/hotel/ec/illa-experience.html'), /\/hotel\/ec\/illa-experience\.html/);
  assert.equal(links.airalo(), AIRALO_LINKS.ecuadorEsim);
  assert.equal(links.airalo().includes('airalo.com'), false);

  const impact = createAffiliateLinks({
    ...AFFILIATE_IDS,
    airaloImpactUrl: 'https://airalo.pxf.io/c/123/456',
  });
  assert.equal(impact.airalo(), 'https://airalo.pxf.io/c/123/456');
});

test('live tour and eSIM cards use tracked Travelpayouts links, not Civitatis', () => {
  const catalog = tripCatalog();
  assert.equal(catalog.otavalo.href, KLOOK_LINKS.otavalo);
  assert.equal(catalog.otavalo.partner, 'klook');
  assert.equal(catalog.galapagos.href, KLOOK_LINKS.galapagos);
  assert.equal(catalog.galapagos.partner, 'klook');
  assert.equal(catalog['mitad-klook'].href, KLOOK_LINKS.quito);
  assert.equal(catalog['day-trips'].href, KLOOK_LINKS.quito);
  assert.equal(catalog['mindo-klook'].href, KLOOK_LINKS.quito);
  assert.equal(catalog['banos-klook'].href, KLOOK_LINKS.quito);
  assert.equal(catalog.esim.href, AIRALO_LINKS.ecuadorEsim);
  assert.equal(catalog.esim.partner, 'airalo');
  assert.equal(catalog.car.href, ECONOMYBOOKINGS_LINKS.quitoAirport);
  assert.equal(catalog.car.partner, 'economybookings');
  assert.equal(
    catalog['quito-tours'].href,
    'https://www.getyourguide.com/quito-l2774/?partner_id=XMZLWQZ&utm_medium=online_publisher',
  );
  assert.equal(
    catalog.cotopaxi.href,
    'https://www.getyourguide.com/s/?q=Cotopaxi&partner_id=XMZLWQZ&utm_medium=online_publisher',
  );
  assert.equal(catalog.mitad.partner, 'getyourguide');
  assert.equal(catalog.mindo.partner, 'getyourguide');
  assert.equal(catalog.banos.partner, 'getyourguide');
  assert.equal(catalog['otavalo-gyg'].partner, 'getyourguide');
  assert.match(catalog['otavalo-gyg'].href, /q=Otavalo/);
  assert.equal(AFFILIATE_IDS.getYourGuidePartnerId, 'XMZLWQZ');
  assert.equal(AFFILIATE_IDS.viatorPid, 'P00324546');
  assert.equal(
    catalog['quito-viator'].href,
    'https://www.viator.com/Quito/d4427-ttd?pid=P00324546&mcid=42383&medium=link',
  );
  assert.equal(
    catalog['cotopaxi-viator'].href,
    'https://www.viator.com/searchResults/all?text=Cotopaxi&pid=P00324546&mcid=42383&medium=link',
  );
  for (const card of Object.values(catalog)) {
    if (!card.href.includes('viator.com')) continue;
    assert.match(card.href, /pid=P00324546/, card.id);
    assert.match(card.href, /mcid=42383/, card.id);
    assert.match(card.href, /medium=link/, card.id);
  }
  for (const card of Object.values(catalog)) {
    if (!card.href.includes('getyourguide.com')) continue;
    assert.match(card.href, /partner_id=XMZLWQZ/, card.id);
    assert.match(card.href, /utm_medium=online_publisher/, card.id);
    assert.equal(/-t\d+/.test(card.href), false, card.id);
  }
  for (const card of Object.values(catalog)) {
    assert.equal(card.href.includes('civitatis.com'), false, card.id);
    assert.equal(card.href.includes('airalo.com'), false, card.id);
    assert.equal(card.href.includes('discovercars.com'), false, card.id);
  }
});

test('tour guides offer tracked Viator beside GetYourGuide and Klook', () => {
  const partners = (slug: string) => postEndCards(slug).map((card) => card.partner);
  assert.deepEqual(
    postEndCards('things-to-do-in-otavalo').filter((card) => card.partner !== 'booking' && card.partner !== 'economybookings' && card.partner !== 'airalo').map((card) => card.partner),
    ['klook', 'viator'],
  );
  assert.match(inlineOfferHtml('things-to-do-in-otavalo'), /getyourguide\.com/);
  assert.ok(partners('visiting-mitad-del-mundo').includes('klook'));
  assert.ok(partners('visiting-mitad-del-mundo').includes('viator'));
  assert.match(inlineOfferHtml('visiting-mitad-del-mundo'), /q=Mitad\+del\+Mundo/);
  assert.ok(partners('mindo-cloud-forest-guide').includes('klook'));
  assert.ok(partners('banos-de-agua-santa-guide').includes('viator'));
  assert.ok(partners('cotopaxi-national-park-day-trip').includes('viator'));
  assert.match(inlineOfferHtml('cotopaxi-national-park-day-trip'), /getyourguide\.com/);
  assert.match(inlineOfferHtml('teleferico-quito-pichincha'), /getyourguide\.com/);
  assert.ok(partners('teleferico-quito-pichincha').includes('viator'));
  assert.ok(partners('quilotoa-crater-lake-guide').includes('viator'));
  assert.match(inlineOfferHtml('quilotoa-crater-lake-guide'), /getyourguide\.com/);
  const quito = postEndCards('how-far-is-quito-airport-from-the-city');
  assert.ok(quito.some((card) => card.href.includes('/Quito/d4427-ttd')));
  assert.match(inlineOfferHtml('how-far-is-quito-airport-from-the-city'), /quito-l2774/);
});

test('named hotels use a Booking.com property page with the Travelpayouts marker', () => {
  const gangotena = LUXURY_STAYS.find((stay) => stay.id === 'gangotena');
  const pinsaqui = LUXURY_STAYS.find((stay) => stay.id === 'pinsaqui');
  const mashpi = LUXURY_STAYS.find((stay) => stay.id === 'mashpi');
  assert.equal(LUXURY_STAYS.some((stay) => stay.id === 'zuleta'), false);
  assert.ok(gangotena?.bookingPath?.includes('/hotel/ec/casa-gangotena-quito.html'));
  assert.match(stayHref(gangotena!), /\/hotel\/ec\/casa-gangotena-quito\.html/);
  assert.match(stayHref(gangotena!), /label=786112/);
  assert.equal(pinsaqui?.bookingPath, '/hotel/ec/hosteria-hacienda-pinsaqui.html');
  assert.match(stayHref(pinsaqui!), /\/hotel\/ec\/hosteria-hacienda-pinsaqui\.html/);
  assert.equal(mashpi?.bookingPath, '/hotel/ec/mashpi-lodge.html');
  assert.match(stayHref(mashpi!), /\/hotel\/ec\/mashpi-lodge\.html/);
  assert.equal(stayHref(mashpi!).includes('searchresults'), false);
  for (const stay of LUXURY_STAYS) {
    const href = stayHref(stay);
    assert.equal(href.includes('TODO'), false, stay.id);
    assert.equal(href.includes('searchresults'), false, stay.id);
    assert.match(href, /^https:\/\/www\.booking\.com\/hotel\/ec\/[a-z0-9-]+\.html/);
    assert.match(href, /label=786112/);
  }
  for (const slug of Object.keys(POST_AFFILIATES)) {
    for (const card of postEndCards(slug)) {
      if (card.partner !== 'booking') continue;
      assert.equal(card.href.includes('searchresults'), false, slug);
      assert.match(card.href, /\/hotel\/ec\/[a-z0-9-]+\.html/, slug);
      assert.match(card.href, /label=786112/, slug);
    }
  }
});

test('every guide has one inline offer and sponsored attributes', () => {
  const slugs = readdirSync(new URL('../content/blog/', import.meta.url))
    .filter((name) => name.endsWith('.md'))
    .map((name) => name.replace(/\.md$/, ''));
  assert.ok(slugs.length > 30);
  for (const slug of slugs) {
    assert.ok(POST_AFFILIATES[slug], `missing plan for ${slug}`);
    const html = inlineOfferHtml(slug);
    assert.match(html, /rel="sponsored nofollow noopener"/);
    assert.match(html, /target="_blank"/);
    assert.equal(html.includes('TODO'), false, slug);
    assert.equal(/\b\d+\s*%/.test(html), false, slug);
  }
});

test('destination cards use local photos and icons stay a fallback', () => {
  const catalog = tripCatalog();
  assert.equal(catalog['quito-tours'].photo, '/images/affiliates/equator.webp');
  assert.equal(catalog.otavalo.photo, '/images/affiliates/otavalo.webp');
  assert.equal(catalog.cotopaxi.photo, '/images/affiliates/cotopaxi.webp');
  assert.equal(catalog.quilotoa.photo, '/images/affiliates/quilotoa.webp');
  assert.equal(catalog.galapagos.photo, '/images/affiliates/galapagos.webp');
  assert.equal(catalog['food-tour'].photo?.includes('otavalo'), false);
  assert.equal(catalog.car.photo, undefined);
  assert.equal(catalog.esim.photo, undefined);
  const photoHtml = inlineOfferHtml('arriving-quito-airport-late-at-night');
  assert.match(photoHtml, /src="\/images\/affiliates\/equator\.webp"/);
  assert.equal(/src="https?:/.test(photoHtml), false);
  const iconHtml = inlineOfferHtml('quito-airport-arrival-guide');
  assert.equal(iconHtml.includes('<img'), false);
  for (const stay of LUXURY_STAYS) {
    assert.match(stay.photo, /^\/images\/affiliates\/[a-z0-9-]+\.webp$/);
  }
});

test('remark plugin inserts the card mid-document once', () => {
  const plugin = remarkInlineAffiliate();
  const tree = {
    children: [
      { type: 'paragraph' },
      { type: 'paragraph' },
      { type: 'heading' },
      { type: 'paragraph' },
      { type: 'list' },
      { type: 'paragraph' },
    ],
  };
  plugin(tree, { path: '/workspace/src/content/blog/arriving-quito-airport-late-at-night.md' });
  const htmlNodes = tree.children.filter((node) => node.type === 'html');
  assert.equal(htmlNodes.length, 1);
  assert.ok(htmlNodes[0].value?.includes('Tomorrow in Quito'));
  assert.ok(tree.children.findIndex((node) => node.type === 'html') > 2);
  plugin(tree, { path: '/workspace/src/content/blog/arriving-quito-airport-late-at-night.md' });
  assert.equal(tree.children.filter((node) => node.type === 'html').length, 1);
});
