import { platformLabel } from './classification';
import type { AttributeResult, GuessResult, GuessTerm, MatchLevel, MediaEntry } from '../types';

interface Weighted {
  label: string;
  weight: number;
  level: MatchLevel;
  guessValue: string;
  secretValue: string;
}

function setOverlap(a: string[], b: string[]): { level: MatchLevel; shared: string[] } {
  const bSet = new Set(b.map((x) => x.toLowerCase()));
  const shared = a.filter((x) => bSet.has(x.toLowerCase()));
  if (shared.length === 0) return { level: 'none', shared: [] };
  const sameSet = a.length === b.length && shared.length === a.length;
  return { level: sameSet ? 'exact' : 'partial', shared };
}

export function compareEntries(guess: MediaEntry, secret: MediaEntry): Weighted[] {
  const genreOverlap = setOverlap(guess.genres, secret.genres);

  // Platform compares a single curated identity (PC/PlayStation/Xbox/
  // Nintendo/Arcade/Multiplatform for games; Cartoon Network/Nickelodeon/
  // Adult Swim/Toonami/Disney Channel/Fox/Comedy Central/Streaming for
  // cartoons) rather than a raw platform/network array -- a decisive
  // category instead of a messy list almost every modern game shares, or a
  // one-off broadcaster (TV Tokyo, MBS...) a player has no intuition for.
  const guessPlatformLabel = platformLabel(guess);
  const secretPlatformLabel = platformLabel(secret);
  const platformLevel: MatchLevel = guessPlatformLabel === secretPlatformLabel ? 'exact' : 'none';

  // Era compares actual release/start years directly: same year is exact,
  // within 5 years either direction is partial, anything further is none.
  // Always uses the START year (entry.year) even for cartoons/anime with a
  // multi-year run — endYear only affects the win/loss reveal's display,
  // never this comparison, to keep the signal unambiguous.
  const yearGap = Math.abs(secret.year - guess.year);
  const eraLevel: MatchLevel = yearGap === 0 ? 'exact' : yearGap <= 5 ? 'partial' : 'none';

  return [
    {
      label: 'Type',
      weight: 15,
      level: guess.type === secret.type ? 'exact' : 'none',
      guessValue: guess.type === 'game' ? 'Video Game' : 'Cartoon',
      secretValue: secret.type === 'game' ? 'Video Game' : 'Cartoon',
    },
    {
      label: 'Genre',
      weight: 25,
      level: genreOverlap.level,
      guessValue: guess.genres.join(', '),
      // On a miss, show the GUESS's own genres (not a blank) so a player can rule
      // them out for the secret — a true 'none' means zero overlap, confirmed.
      secretValue:
        genreOverlap.level === 'none'
          ? guess.genres.join(', ')
          : genreOverlap.shared.join(', ') + (genreOverlap.level === 'partial' ? ' (partial)' : ''),
    },
    {
      label: 'Publisher/Studio',
      weight: 10,
      level: guess.publisher === secret.publisher ? 'exact' : 'none',
      guessValue: guess.publisher,
      secretValue: guess.publisher === secret.publisher ? secret.publisher : guess.publisher,
    },
    {
      label: 'Platform',
      weight: 15,
      level: platformLevel,
      guessValue: guessPlatformLabel,
      secretValue: platformLevel === 'none' ? guessPlatformLabel : secretPlatformLabel,
    },
    {
      label: 'Era',
      weight: 15,
      level: eraLevel,
      // Always the GUESS's own actual year — already known to the player, so
      // showing it never leaks the secret's year, even on an exact match
      // (where it's necessarily identical anyway) or a within-5-years partial.
      guessValue: String(guess.year),
      secretValue: String(guess.year),
    },
  ];
}

const LEVEL_VALUE: Record<MatchLevel, number> = { exact: 1, partial: 0.5, none: 0 };

export function buildGuessResult(term: GuessTerm, entry: MediaEntry, secret: MediaEntry): GuessResult {
  const isWinningGuess = entry.id === secret.id;
  const weighted = compareEntries(entry, secret);
  const totalWeight = weighted.reduce((s, w) => s + w.weight, 0);
  const score = isWinningGuess
    ? 100
    : Math.round((weighted.reduce((s, w) => s + w.weight * LEVEL_VALUE[w.level], 0) / totalWeight) * 100);

  const attributes: AttributeResult[] = weighted.map((w) => ({
    label: w.label,
    level: isWinningGuess ? 'exact' : w.level,
    guessValue: w.guessValue,
    secretValue: isWinningGuess ? w.guessValue : w.secretValue,
  }));

  return {
    guessTerm: term.term,
    guessKind: term.kind,
    entry,
    isWinningGuess,
    overallScore: score,
    attributes,
  };
}
