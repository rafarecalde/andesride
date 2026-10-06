// Place photographs. Commons files live in src/assets/photos and are credited
// in src/data/photo-credits.json. Owner stills that stay on the site:
// src/assets/_source/uio-terminal.webp and route-map.webp.
// Do not publish generated pictures of drivers, name signs, or our vehicles.
import type { ImageMetadata } from 'astro';
import creditsJson from '../data/photo-credits.json';

import banos from '../assets/photos/banos.jpg';
import basilica from '../assets/photos/basilica.jpg';
import cotopaxi from '../assets/photos/cotopaxi.jpg';
import cumbaya from '../assets/photos/cumbaya.jpg';
import mindo from '../assets/photos/mindo.jpg';
import mitad from '../assets/photos/mitad.jpg';
import otavalo from '../assets/photos/otavalo.jpg';
import papallacta from '../assets/photos/papallacta.jpg';
import plaza from '../assets/photos/plaza.jpg';
import pululahua from '../assets/photos/pululahua.jpg';
import quilotoa from '../assets/photos/quilotoa.jpg';
import suv from '../assets/photos/suv.jpg';
import teleferico from '../assets/photos/teleferico.jpg';
import uio from '../assets/photos/uio.jpg';
import terminal from '../assets/_source/uio-terminal.webp';
import routeMap from '../assets/_source/route-map.webp';

export type PhotoCredit = {
  id: string;
  alt: string;
  author: string;
  license: string;
  licenseUrl?: string;
  sourceUrl?: string;
  file?: string;
  publicPath?: string;
  owner?: boolean;
  kind?: 'photo' | 'map';
};

const files: Record<string, ImageMetadata> = {
  banos,
  basilica,
  cotopaxi,
  cumbaya,
  mindo,
  mitad,
  otavalo,
  papallacta,
  plaza,
  pululahua,
  quilotoa,
  suv,
  teleferico,
  uio,
  terminal,
  'route-map': routeMap,
};

const credits = creditsJson as PhotoCredit[];

export type Photo = PhotoCredit & { src?: ImageMetadata };

export function getPhoto(id: string): Photo & { src: ImageMetadata } {
  const credit = credits.find((item) => item.id === id);
  const src = files[id];
  if (!credit || !src) throw new Error(`Unknown photo: ${id}`);
  return { ...credit, src };
}

export function allCredits(): Photo[] {
  return credits.map((credit) => ({ ...credit, src: files[credit.id] }));
}

export function altForPublicPath(src?: string): string {
  if (!src) return '';
  return credits.find((credit) => credit.publicPath === src)?.alt ?? '';
}

export const terminalPhoto = terminal;
export const routeMapPhoto = routeMap;
