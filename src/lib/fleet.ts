// Resolves real fleet photos when the owner drops them into src/assets/fleet/
// (e.g. suv.webp). Until then `imageFor()` returns undefined and components
// fall back to the neutral inline-SVG placeholder + "representative vehicle"
// caption. Dropping in suv.webp just works — no code change needed (this is
// the astro:assets wiring from the brief).
import type { ImageMetadata } from 'astro';

const files = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/fleet/*.{webp,avif,png,jpg,jpeg}',
  { eager: true },
);

const byKey: Record<string, ImageMetadata> = {};
for (const path in files) {
  const base = path.split('/').pop()!.replace(/\.[^.]+$/, '').toLowerCase();
  byKey[base] = files[path].default;
}

export function imageFor(key: string): ImageMetadata | undefined {
  return byKey[key.toLowerCase()];
}

export const REPRESENTATIVE_CAPTION = 'Representative vehicle — actual model may vary';
