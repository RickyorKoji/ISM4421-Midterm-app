import type { MediaEntry } from '../types';

/** Buckets a year into a 5-year span, e.g. 2011 -> "2010–2014". */
export function eraBand(year: number): string {
  const start = eraBandStart(year);
  return `${start}–${start + 4}`;
}

export function eraBandStart(year: number): number {
  return Math.floor(year / 5) * 5;
}

/**
 * Games show their single release year. Cartoons/anime show their full
 * run — an end year if the show has wrapped, or "present" if it (or this
 * dataset's knowledge of it) is still ongoing — since a single start year
 * undersells how long-running most of these actually are.
 */
export function runTimeLabel(entry: MediaEntry): string {
  if (entry.type === 'game') return String(entry.year);
  return entry.endYear ? `${entry.year}–${entry.endYear}` : `${entry.year}–present`;
}

/** Display/comparison value for the Platform attribute. */
export function platformLabel(entry: MediaEntry): string {
  if (entry.type === 'game') return entry.primaryPlatform ?? entry.platforms[0] ?? 'Unknown';
  return entry.platforms.join(', ');
}
