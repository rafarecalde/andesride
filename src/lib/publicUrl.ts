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
  const rel = u(path.startsWith('/') ? path : `/${path}`);
  if (!origin) return rel;
  return new URL(rel, origin).href;
}
