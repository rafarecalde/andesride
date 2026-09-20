// Fleet photos: prefer a vehicle-specific file in src/assets/fleet/ (e.g. suv.webp).
// If none exists, use the owner chauffeur still at
// src/assets/_source/chauffeur-owner.webp — never a generated lookalike.
import type { ImageMetadata } from 'astro';

const files = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/fleet/*.{webp,avif,png,jpg,jpeg}',
  { eager: true },
);
const owner = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/_source/chauffeur-owner.{webp,avif,png,jpg,jpeg}',
  { eager: true },
);

const byKey: Record<string, ImageMetadata> = {};
for (const path in files) {
  const base = path.split('/').pop()!.replace(/\.[^.]+$/, '').toLowerCase();
  byKey[base] = files[path].default;
}
const ownerPhoto: ImageMetadata | undefined = Object.values(owner)[0]?.default;

export function imageFor(key: string): ImageMetadata | undefined {
  return byKey[key.toLowerCase()] ?? ownerPhoto;
}

export const REPRESENTATIVE_CAPTION =
  'Representative chauffeur and cabin — we do not show a stock SUV exterior. Actual model may vary.';
