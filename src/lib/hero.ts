// Real hero photo drop-in. Put ONE image at src/assets/hero.{webp,jpg,png,…}
// (e.g. a shot of El Panecillo or the UIO terminal, landscape, ≥1600×900) and
// it replaces the placeholder automatically — no code change. Until then,
// public/hero-quito-placeholder.svg is used.
import type { ImageMetadata } from 'astro';

const files = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/hero.{webp,avif,png,jpg,jpeg}',
  { eager: true },
);

export const heroPhoto: ImageMetadata | undefined = Object.values(files)[0]?.default;
