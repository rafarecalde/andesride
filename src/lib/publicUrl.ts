import { SITE } from '../config';
import { u } from './url';

/** Origin for canonical, OG, and JSON-LD. SITE.domain if set; else the Astro `site`. */
export function publicOrigin(site?: URL | string | undefined): string {
  const raw = SITE.domain || (site ? String(site) : '');
  if (!raw) return '';
  return raw.replace(/\/$/, '') + '/';
}

export function publicUrl(path: string, site?: URL | string | undefined): string {
  const origin = publicOrigin(site);
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!origin) return SITE.domain ? p : u(p);
  // When SITE.domain is set, canonical URLs are root-hosted on that domain
  // (no GitHub Pages /andesride prefix). In-page links still use u().
  if (SITE.domain) return new URL(p, origin).href;
  return new URL(u(p), origin).href;
}
