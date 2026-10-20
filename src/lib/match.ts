import { entries } from '../data/entries';
import { getCommunityEntries } from './community';
import type { GuessTerm, GuessTermKind, MediaEntry } from '../types';

export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

let communityEntries: MediaEntry[] = getCommunityEntries();

function buildGuessIndex(): GuessTerm[] {
  const terms: GuessTerm[] = [];
  for (const entry of [...entries, ...communityEntries]) {
    const titleVariants = [entry.name, ...entry.aliases];
    for (const t of titleVariants) {
      terms.push({ term: entry.name, normalized: normalize(t), kind: 'title', entryId: entry.id });
    }
    for (const c of entry.protagonists) {
      terms.push({ term: c, normalized: normalize(c), kind: 'character', entryId: entry.id });
    }
    for (const s of entry.settings) {
      terms.push({ term: s, normalized: normalize(s), kind: 'setting', entryId: entry.id });
    }
  }
  return terms;
}

/** Flat, searchable index of every title/character/setting across all entries (curated + community). */
export let guessIndex: GuessTerm[] = buildGuessIndex();

/** Re-reads community entries from storage and rebuilds the index — call right after addCommunityEntry(). */
export function refreshCommunityEntries(): void {
  communityEntries = getCommunityEntries();
  guessIndex = buildGuessIndex();
}

/** Looks up an entry by id across both the curated dataset and community submissions. */
export function getEntryById(id: string): MediaEntry | undefined {
  return entries.find((e) => e.id === id) ?? communityEntries.find((e) => e.id === id);
}

/**
 * Identity key for "this specific guessable thing". All aliases of a title
 * collapse to the same key (guessing any alias "uses up" that title), but
 * each character/setting of the same entry gets its own distinct key — so a
 * franchise can be identified via one guess while a *specific* character or
 * setting still takes a separate, correct guess.
 */
export function makeGuessKey(entryId: string, kind: GuessTermKind, term: string): string {
  return kind === 'title' ? `title:${entryId}` : `${kind}:${entryId}:${normalize(term)}`;
}

export function resolveGuess(raw: string): GuessTerm | null {
  const norm = normalize(raw);
  if (!norm) return null;
  const exact = guessIndex.find((t) => t.normalized === norm);
  if (exact) return exact;
  return null;
}

export interface Suggestion {
  label: string;
  sublabel: string;
  kind: GuessTerm['kind'];
  entryId: string;
  normalized: string;
}

/** Autocomplete suggestions: collapse to one suggestion per unique display term. */
export function suggest(query: string, limit = 8, excludeKeys: Set<string> = new Set()): Suggestion[] {
  const norm = normalize(query);
  if (!norm) return [];
  const seen = new Set<string>();
  const results: Suggestion[] = [];
  for (const t of guessIndex) {
    if (excludeKeys.has(makeGuessKey(t.entryId, t.kind, t.term))) continue;
    if (!t.normalized.includes(norm)) continue;
    const entry = getEntryById(t.entryId);
    if (!entry) continue;
    const label = t.kind === 'title' ? entry.name : t.term;
    const key = `${t.kind}:${label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const sublabel =
      t.kind === 'title'
        ? `${entry.type === 'game' ? 'Game' : 'Cartoon'} · ${entry.franchise}`
        : t.kind === 'character'
          ? `Character · ${entry.name}`
          : `Setting · ${entry.name}`;
    results.push({ label, sublabel, kind: t.kind, entryId: t.entryId, normalized: t.normalized });
    if (results.length >= limit) break;
  }
  // Prioritize matches that start with the query over mid-string matches.
  results.sort((a, b) => {
    const aStarts = a.normalized.startsWith(norm) ? 0 : 1;
    const bStarts = b.normalized.startsWith(norm) ? 0 : 1;
    return aStarts - bStarts;
  });
  return results;
}
