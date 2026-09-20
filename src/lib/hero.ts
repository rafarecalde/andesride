// Display encode of the owner chauffeur still.
// Source of truth: src/assets/_source/chauffeur-owner.webp — never a generated lookalike.
// src/assets/hero.webp is a 1920×1080 crop (y=40, keep the cap) of that file.
// Fallback: the owner file itself.
import type { ImageMetadata } from 'astro';

const encoded = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/hero.{webp,avif,png,jpg,jpeg}',
  { eager: true },
);
const owner = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/_source/chauffeur-owner.{webp,avif,png,jpg,jpeg}',
  { eager: true },
);

export const heroPhoto: ImageMetadata | undefined =
  Object.values(encoded)[0]?.default ?? Object.values(owner)[0]?.default;
