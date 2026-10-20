import { entries } from '../data/entries';
import type { MediaEntry, MediaType } from '../types';
import type { MediaKind } from './verify';

/** The only pieces of a classification result actually needed to build an entry. */
interface ClassificationSummary {
  title?: string;
  kind: MediaKind;
  matchedCategories?: string[];
}

const KEY = 'pixel-guess:community-entries';

function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'untitled';
}

function mapKind(kind: MediaKind): MediaType {
  // 'both'/'unknown' (a Fandom hit never classifies further than "it's a wiki
  // hit") default to 'game' -- this dataset skews games (121 vs 51 cartoons),
  // and the Type attribute needs a definite value to compare against at all.
  return kind === 'show' ? 'cartoon' : 'game';
}

function extractYear(categories: string[] | undefined): number | undefined {
  for (const c of categories ?? []) {
    const m = c.match(/\b(19|20)\d{2}\b/);
    if (m) return Number(m[0]);
  }
  return undefined;
}

// Covers the case localStorage throws (private browsing, quota): the entry still
// counts as "added" for the rest of this session, just won't survive a reload.
let memoryFallback: MediaEntry[] = [];

export function getCommunityEntries(): MediaEntry[] {
  let stored: MediaEntry[] = [];
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) stored = JSON.parse(raw) as MediaEntry[];
  } catch {
    /* fall through to memory-only entries below */
  }
  if (memoryFallback.length === 0) return stored;
  const storedIds = new Set(stored.map((e) => e.id));
  return [...stored, ...memoryFallback.filter((e) => !storedIds.has(e.id))];
}

/**
 * Builds a minimal, honest MediaEntry from a confirmed classification. We only
 * actually know what the classification step tells us (title, broad type, and
 * sometimes a year parsed out of Wikipedia category text) -- genre, publisher,
 * platform, protagonists and settings all default to neutral placeholders
 * instead of guessed values, so this entry never falsely claims a match it
 * can't back up. The isCommunitySubmission flag keeps it out of the puzzle
 * target pool until someone hand-curates the rest of its data.
 */
export function buildCommunityEntry(rawTerm: string, wiki: ClassificationSummary): MediaEntry {
  const name = wiki.title ?? rawTerm.trim();
  const id = `community-${slugify(name)}`;
  const aliases = name.trim().toLowerCase() !== rawTerm.trim().toLowerCase() ? [rawTerm.trim()] : [];
  return {
    id,
    name,
    type: mapKind(wiki.kind),
    franchise: name,
    publisher: 'Unknown',
    genres: ['Unclassified'],
    platforms: ['Unknown'],
    year: extractYear(wiki.matchedCategories) ?? new Date().getFullYear(),
    protagonists: [],
    settings: [],
    aliases,
    isCommunitySubmission: true,
  };
}

/** Persists a community entry, skipping it if it's already curated or already added. */
export function addCommunityEntry(entry: MediaEntry): boolean {
  if (entries.some((e) => e.id === entry.id)) return false;
  const existing = getCommunityEntries();
  if (existing.some((e) => e.id === entry.id)) return false;
  try {
    localStorage.setItem(KEY, JSON.stringify([...existing, entry]));
  } catch {
    memoryFallback = [...memoryFallback, entry];
  }
  return true;
}
