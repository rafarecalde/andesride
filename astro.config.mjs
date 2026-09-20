// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// ─────────────────────────────────────────────────────────────────────────────
// PREVIEW vs PRODUCTION
//
// This is currently configured for a GitHub Pages PROJECT preview, served under
// a subpath: https://rafarecalde.github.io/andesride/  (base '/andesride').
// The GitHub repo path stays andesride; that is not the public brand.
//
// Intended production host is https://uiotransfer.com (SITE.domain).
// Until DNS is live, keep this GitHub Pages project preview, then flip:
//     site: 'https://uiotransfer.com',
//     base: '/',
// and add public/CNAME. Do not use andesride.com, quitoairporttransfers.com,
// or transfersfromuio.com.
// All internal links go through u() (src/lib/url.ts) and markdown links are
// base-prefixed automatically, so the flip needs no other edits.
// ─────────────────────────────────────────────────────────────────────────────
const SITE = 'https://rafarecalde.github.io';
const BASE = '/andesride';
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
    '/quito-airport-to-cumbaya': withBase('/'),
    '/quito-airport-to-mitad': withBase('/'),
    '/quito-airport-to-papallacta': withBase('/'),
    '/quito-airport-to-otavalo': withBase('/'),
    '/quito-airport-to-mindo': withBase('/'),
  },
});
