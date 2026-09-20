// Owner-supplied stills. Never replace with generated lookalikes.
// Sources live in src/assets/_source/ (chauffeur-owner, uio-terminal, route-map).
import type { ImageMetadata } from 'astro';

function pick(
  files: Record<string, { default: ImageMetadata }>,
): ImageMetadata | undefined {
  const entries = Object.entries(files);
  const webp = entries.find(([p]) => p.endsWith('.webp'));
  return (webp ?? entries[0])?.[1]?.default;
}

const chauffeur = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/_source/chauffeur-owner.{webp,avif,png,jpg,jpeg}',
  { eager: true },
);
const terminal = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/_source/uio-terminal.{webp,avif,png,jpg,jpeg}',
  { eager: true },
);
const routeMap = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/_source/route-map.{webp,avif,png,jpg,jpeg}',
  { eager: true },
);

export const chauffeurPhoto = pick(chauffeur);
export const terminalPhoto = pick(terminal);
export const routeMapPhoto = pick(routeMap);
