import { eraBand, eraBandStart, platformLabel } from './classification';
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

  // Games compare by defining platform identity (PC/PlayStation/Xbox/
  // Nintendo/Arcade/Multiplatform) — a single, decisive category instead of
  // a messy array almost every modern multiplatform game would share.
  // Cartoons keep comparing their platforms array (broadcast networks) as
  // an overlap, same as before.
  const platformIsCategorical = guess.type === 'game' && secret.type === 'game';
  const platformOverlap = setOverlap(guess.platforms, secret.platforms);
  const guessPlatformLabel = platformLabel(guess);
  const secretPlatformLabel = platformLabel(secret);
  const platformLevel: MatchLevel = platformIsCategorical
    ? guessPlatformLabel === secretPlatformLabel
      ? 'exact'
      : 'none'
    : platformOverlap.level;

  // Era compares 5-year bands rather than a raw year difference: same band
  // is exact, one band over/under is partial, anything further is none.
  const guessBandStart = eraBandStart(guess.year);
  const secretBandStart = eraBandStart(secret.year);
  const bandGap = (secretBandStart - guessBandStart) / 5;
  const eraLevel: MatchLevel = bandGap === 0 ? 'exact' : Math.abs(bandGap) === 1 ? 'partial' : 'none';

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
      level: platformLevel,
      guessValue: guessPlatformLabel,
      secretValue:
        platformLevel === 'none'
          ? '???'
          : platformIsCategorical
            ? secretPlatformLabel
            : platformOverlap.shared.join(', ') + (platformLevel === 'partial' ? ' (partial)' : ''),
    },
    {
      label: 'Era',
      weight: 15,
      level: eraLevel,
      guessValue: eraBand(guess.year),
      secretValue: bandGap === 0 ? eraBand(secret.year) : bandGap > 0 ? 'Newer band ↑' : 'Older band ↓',
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
