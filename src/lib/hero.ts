// Owner chauffeur still is the only hero source:
//   src/assets/_source/chauffeur-owner.webp
// Do not substitute a generated lookalike. If this file is missing, the
// public/hero-quito-placeholder.svg fallback in Hero.astro is used.
import type { ImageMetadata } from 'astro';

const owner = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/_source/chauffeur-owner.{webp,avif,png,jpg,jpeg}',
  { eager: true },
);

export const heroPhoto: ImageMetadata | undefined = Object.values(owner)[0]?.default;
