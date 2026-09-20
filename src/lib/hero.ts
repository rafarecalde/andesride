// Real hero photo drop-in. src/assets/hero.webp is the chauffeur / luxury-cabin
// still. Replace that file (or drop hero.{jpg,png,avif}) to swap the photo —
// no code change. Until a file exists, public/hero-quito-placeholder.svg is used.
import type { ImageMetadata } from 'astro';

const files = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/hero.{webp,avif,png,jpg,jpeg}',
  { eager: true },
);

export const heroPhoto: ImageMetadata | undefined = Object.values(files)[0]?.default;
