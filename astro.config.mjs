// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { remarkInlineAffiliate } from './src/config/affiliates.ts';

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTION HOST
//
// Canonical site is https://uiotransfers.com (SITE.domain in src/config.ts).
// GitHub Pages *project* sites with a custom domain are served at the domain
// root, so `base` is '/'. The GitHub repo path remains andesride; that is
// not the public brand.
//
// Implication: https://rafarecalde.github.io/andesride/ is no longer a
// working asset base (paths would 404 under /andesride/). After the custom
// domain is attached, GitHub Pages typically redirects that project URL to
// uiotransfers.com. Until DNS propagates, use `npm run preview` locally.
//
// Do not use andesride.com, quitoairporttransfers.com, or transfersfromuio.com.
// All internal links go through u() (src/lib/url.ts); with base '/' that helper
// is a no-op.
// ─────────────────────────────────────────────────────────────────────────────
const SITE = 'https://uiotransfers.com';
const BASE = '/';
const withBase = (path) => (BASE === '/' ? path : `${BASE}${path === '/' ? '/' : path}`);

// Page paths need a trailing slash (trailingSlash: 'always'). Assets do not.
function withPageSlash(path) {
  const cut = path.search(/[?#]/);
  const pathname = cut === -1 ? path : path.slice(0, cut);
  const suffix = cut === -1 ? '' : path.slice(cut);
  if (pathname === '/' || pathname === '') return (pathname || '/') + suffix;
  if (pathname.endsWith('/')) return pathname + suffix;
  if (/\.[a-zA-Z0-9]{2,8}$/.test(pathname)) return pathname + suffix;
  return `${pathname}/${suffix}`;
}

// Base-aware rewrite of internal links inside markdown (href/src starting with
// "/"). Also adds the trailing slash Astro requires on page URLs. Avoids a
// unist dependency by recursing manually.
function rehypeBase() {
  const base = BASE === '/' ? '' : BASE;
  const fix = (node) => {
    if (node.type === 'element' && node.properties) {
      for (const attr of ['href', 'src']) {
        const v = node.properties[attr];
        if (typeof v !== 'string' || !v.startsWith('/') || v.startsWith('//')) continue;
        let next = v;
        if (base && next !== base && !next.startsWith(base + '/')) next = base + next;
        if (attr === 'href') next = withPageSlash(next);
        if (next !== v) node.properties[attr] = next;
      }
    }
    (node.children || []).forEach(fix);
  };
  return (tree) => fix(tree);
}

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'always',
  integrations: [
    sitemap({
      // Confirmation page is transactional; keep it out of the index.
      filter: (page) => !page.includes('/success'),
    }),
  ],
  markdown: {
    remarkPlugins: [remarkInlineAffiliate],
    rehypePlugins: [rehypeBase],
  },
  redirects: {
    // Destinations include the trailing slash. These targets are concrete URLs,
    // not route patterns, so Astro will not append the slash itself.
    '/quito-airport-to-puembo': withBase('/quito-airport-to-wyndham-airport/'),
    '/quito-airport-to-norte': withBase('/quito-airport-to-quito/'),
    '/quito-airport-to-centro': withBase('/quito-airport-to-quito/'),
    '/quito-airport-to-sur': withBase('/quito-airport-to-quito/'),
    // /quito-airport-to-cumbaya is a live prepaid product page now (see rates.json).
    '/quito-airport-to-mitad': withBase('/'),
    '/quito-airport-to-papallacta': withBase('/'),
    '/quito-airport-to-otavalo': withBase('/'),
    '/quito-airport-to-mindo': withBase('/'),
  },
});
