// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// ─────────────────────────────────────────────────────────────────────────────
// PREVIEW vs PRODUCTION
//
// This is currently configured for a GitHub Pages PROJECT preview, served under
// a subpath: https://rafarecalde.github.io/andesride/  (base '/andesride').
//
// When the custom domain andesride.com is live, flip to root hosting — change
// these two lines and add public/CNAME:
//     site: 'https://andesride.com',
//     base: '/',
// All internal links go through u() (src/lib/url.ts) and markdown links are
// base-prefixed automatically, so the flip needs no other edits.
// ─────────────────────────────────────────────────────────────────────────────
const SITE = 'https://rafarecalde.github.io';
const BASE = '/andesride';

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
    '/quito-airport-to-puembo': '/quito-airport-to-wyndham-airport',
    '/quito-airport-to-norte': '/quito-airport-to-quito',
    '/quito-airport-to-centro': '/quito-airport-to-quito',
    '/quito-airport-to-sur': '/quito-airport-to-quito',
    '/quito-airport-to-cumbaya': '/',
    '/quito-airport-to-mitad': '/',
    '/quito-airport-to-papallacta': '/',
    '/quito-airport-to-otavalo': '/',
    '/quito-airport-to-mindo': '/',
  },
});
