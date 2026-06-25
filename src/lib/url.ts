// Base-aware URL helper. On the real domain (base '/') this is a no-op; on a
// GitHub Pages project preview (base '/andesride') it prefixes internal links so
// navigation works under the subpath. Use u('/guide'), u('/#book'), etc. for ALL
// internal links so the site is portable between root-domain and project hosting.
const RAW = import.meta.env.BASE_URL; // '/andesride/' or '/'
export const BASE = RAW.replace(/\/$/, ''); // '/andesride' or ''

export function u(path = '/'): string {
  if (!path.startsWith('/')) path = '/' + path;
  return BASE + path;
}
