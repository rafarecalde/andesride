// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

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

// Base-aware rewrite of internal links inside markdown (href/src starting with
// "/"). No-op when BASE is '/'. Avoids a unist dependency by recursing manually.
function rehypeBase() {
  const base = BASE === '/' ? '' : BASE;
  if (!base) return () => {};
  const fix = (node) => {
    if (node.type === 'element' && node.properties) {
      for (const attr of ['href', 'src']) {
        const v = node.properties[attr];
        if (
          typeof v === 'string' &&
          v.startsWith('/') &&
          !v.startsWith('//') &&
          v !== base &&
          !v.startsWith(base + '/')
        ) {
          node.properties[attr] = base + v;
        }
      }
    }
    (node.children || []).forEach(fix);
  };
  return (tree) => fix(tree);
}

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  markdown: {
    rehypePlugins: [rehypeBase],
  },
  redirects: {
    '/quito-airport-to-puembo': withBase('/quito-airport-to-wyndham-airport'),
    '/quito-airport-to-norte': withBase('/quito-airport-to-quito'),
    '/quito-airport-to-centro': withBase('/quito-airport-to-quito'),
    '/quito-airport-to-sur': withBase('/quito-airport-to-quito'),
    // /quito-airport-to-cumbaya is a live prepaid product page now (see rates.json).
    '/quito-airport-to-mitad': withBase('/'),
    '/quito-airport-to-papallacta': withBase('/'),
    '/quito-airport-to-otavalo': withBase('/'),
    '/quito-airport-to-mindo': withBase('/'),
  },
});
