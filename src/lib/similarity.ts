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

function closeness(diff: number, exactMax: number, partialMax: number): MatchLevel {
  const abs = Math.abs(diff);
  if (abs <= exactMax) return 'exact';
  if (abs <= partialMax) return 'partial';
  return 'none';
}

export function compareEntries(guess: MediaEntry, secret: MediaEntry): Weighted[] {
  const genreOverlap = setOverlap(guess.genres, secret.genres);
  const platformOverlap = setOverlap(guess.platforms, secret.platforms);
  const yearDiff = secret.year - guess.year;
  const popDiff = secret.popularity - guess.popularity;

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
      secretValue:
        genreOverlap.level === 'none' ? '???' : genreOverlap.shared.join(', ') + (genreOverlap.level === 'partial' ? ' (partial)' : ''),
    },
    {
      label: 'Publisher/Studio',
      weight: 10,
      level: guess.publisher === secret.publisher ? 'exact' : 'none',
      guessValue: guess.publisher,
      secretValue: guess.publisher === secret.publisher ? secret.publisher : '???',
    },
    {
      label: 'Platform',
      weight: 15,
      level: platformOverlap.level,
      guessValue: guess.platforms.join(', '),
      secretValue:
        platformOverlap.level === 'none' ? '???' : platformOverlap.shared.join(', ') + (platformOverlap.level === 'partial' ? ' (partial)' : ''),
    },
    {
      label: 'Era',
      weight: 15,
      level: closeness(yearDiff, 2, 8),
      guessValue: String(guess.year),
      secretValue: yearDiff === 0 ? String(secret.year) : yearDiff > 0 ? 'Newer ↑' : 'Older ↓',
    },
    {
      label: 'Popularity',
      weight: 20,
      level: closeness(popDiff, 8, 25),
      guessValue: `${guess.popularity}/100`,
      secretValue: popDiff === 0 ? `${secret.popularity}/100` : popDiff > 0 ? 'More popular ↑' : 'Less popular ↓',
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
