// Base-aware URL helper. Production on uiotransfers.com uses base '/', so this
// is a no-op. If the site is ever previewed again under a GitHub Pages project
// path (base '/andesride'), it prefixes internal links. Use u('/guide'),
// u('/#book'), etc. for ALL internal links so the site stays portable.
const RAW = import.meta.env.BASE_URL; // '/' (production) or '/andesride/'
export const BASE = RAW.replace(/\/$/, ''); // '' or '/andesride'

export function u(path = '/'): string {
  if (!path.startsWith('/')) path = '/' + path;
  return BASE + path;
}
