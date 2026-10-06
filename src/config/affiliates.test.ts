import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import {
  AFFILIATE_IDS,
  AIRALO_LINKS,
  createAffiliateLinks,
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

const placeholderLinks = createAffiliateLinks();

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

  assert.match(links.getYourGuide('Quito'), /partner_id=GYG123/);
  const viator = links.viator('Galapagos');
  assert.match(viator, /pid=P00012345/);
  assert.match(viator, /mcid=42383/);
  assert.match(viator, /medium=link/);
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
  assert.equal(catalog.mitad.href, KLOOK_LINKS.quito);
  assert.equal(catalog['day-trips'].href, KLOOK_LINKS.quito);
  assert.equal(catalog.mindo.href, KLOOK_LINKS.quito);
  assert.equal(catalog.banos.href, KLOOK_LINKS.quito);
  assert.equal(catalog.esim.href, AIRALO_LINKS.ecuadorEsim);
  assert.equal(catalog.esim.partner, 'airalo');
  assert.match(catalog['quito-tours'].href, /^https:\/\/www\.getyourguide\.com\//);
  assert.match(catalog.cotopaxi.href, /^https:\/\/www\.viator\.com\//);
  for (const card of Object.values(catalog)) {
    assert.equal(card.href.includes('civitatis.com'), false, card.id);
    assert.equal(card.href.includes('airalo.com'), false, card.id);
  }
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
    assert.match(html, /rel="sponsored noopener"/);
    assert.match(html, /target="_blank"/);
    assert.equal(html.includes('TODO'), false, slug);
    assert.equal(html.includes('commission') && html.includes('%'), false);
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
