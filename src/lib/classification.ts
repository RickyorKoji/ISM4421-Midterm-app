import { entries } from '../data/entries';
import type { MediaEntry } from '../types';

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

/**
 * Display/comparison value for the Platform attribute. Uses the curated
 * primaryPlatform (PC/PlayStation/Xbox/Nintendo/Arcade/Multiplatform for
 * games; Cartoon Network/Nickelodeon/Adult Swim/Toonami/Disney Channel/Fox/
 * Comedy Central/Streaming for cartoons) when one was assigned, since a raw
 * network/platform list is either too broad (every modern game) or too
 * one-off (a Japanese TV network a player has no intuition for) to compare
 * meaningfully. Falls back to the real network/platform for the handful of
 * entries with no clean fit.
 */
export function platformLabel(entry: MediaEntry): string {
  return entry.primaryPlatform ?? entry.platforms[0] ?? 'Unknown';
}

/** Every distinct genre used anywhere in the dataset, alphabetized — the full "alphabet" a player is working with. */
export function allGenres(): string[] {
  const set = new Set<string>();
  for (const entry of entries) for (const genre of entry.genres) set.add(genre);
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Every distinct publisher/studio used anywhere in the dataset, alphabetized. */
export function allPublishers(): string[] {
  const set = new Set<string>();
  for (const entry of entries) set.add(entry.publisher);
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Every distinct curated platform category actually used in the dataset, split by medium for a clearer legend. */
export function allPlatformCategories(): { games: string[]; cartoons: string[] } {
  const games = new Set<string>();
  const cartoons = new Set<string>();
  for (const entry of entries) {
    if (!entry.primaryPlatform) continue;
    (entry.type === 'game' ? games : cartoons).add(entry.primaryPlatform);
  }
  return { games: [...games].sort((a, b) => a.localeCompare(b)), cartoons: [...cartoons].sort((a, b) => a.localeCompare(b)) };
}
