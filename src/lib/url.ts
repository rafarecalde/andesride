// Base-aware URL helper. Production on uiotransfers.com uses base '/', so the
// prefix is a no-op. If the site is ever previewed again under a GitHub Pages
// project path (base '/andesride'), it prefixes internal links. Use u('/guide'),
// u('/#book'), etc. for ALL internal links so the site stays portable.
//
// trailingSlash is 'always', and Astro 404s page URLs that omit the slash.
// Page paths get one. Assets, the site root, and /#hash or /?query stay as-is.
const RAW = import.meta.env.BASE_URL; // '/' (production) or '/andesride/'
export const BASE = RAW.replace(/\/$/, ''); // '' or '/andesride'

function withPageSlash(path: string): string {
  const cut = path.search(/[?#]/);
  const pathname = cut === -1 ? path : path.slice(0, cut);
  const suffix = cut === -1 ? '' : path.slice(cut);
  if (pathname === '/' || pathname === '') return (pathname || '/') + suffix;
  if (pathname.endsWith('/')) return pathname + suffix;
  if (/\.[a-zA-Z0-9]{2,8}$/.test(pathname)) return pathname + suffix;
  return `${pathname}/${suffix}`;
}

export function u(path = '/'): string {
  if (!path.startsWith('/')) path = '/' + path;
  return BASE + withPageSlash(path);
}
