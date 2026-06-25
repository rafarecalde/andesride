// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// ─────────────────────────────────────────────────────────────────────────────
// AndesRide is built AS andesride.com (root paths) so the day DNS is pointed
// nothing needs to change. You preview it locally right now with `npm run dev`
// (the domain is irrelevant for local dev).
//
// When you DON'T yet own the domain and want a public preview on GitHub Pages
// *project* hosting (https://<user>.github.io/andesride/), switch to:
//     site: 'https://<user>.github.io',
//     base: '/andesride',
// and the build will rewrite all asset/link paths under /andesride. Flip back
// to the two lines below once the custom domain is live (and add public/CNAME).
// ─────────────────────────────────────────────────────────────────────────────
export default defineConfig({
  site: 'https://andesride.com',
  base: '/',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
});
