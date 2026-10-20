export type MediaType = 'game' | 'cartoon';

/**
 * A game's defining platform identity (which ecosystem it's really "of"),
 * not just every system it's ever shipped on — almost every modern game
 * ships on 3+ platforms, which made a raw platforms-array comparison
 * rarely distinguish anything. Games only; cartoons keep comparing their
 * `platforms` array (broadcast network/streaming service names) as-is.
 */
export type GamePlatformCategory = 'PC' | 'PlayStation' | 'Xbox' | 'Nintendo' | 'Arcade' | 'Multiplatform';

export interface MediaEntry {
  id: string;
  name: string;
  type: MediaType;
  franchise: string;
  publisher: string;
  genres: string[];
  platforms: string[];
  /** Games only — see GamePlatformCategory. Absent on cartoon entries. */
  primaryPlatform?: GamePlatformCategory;
  year: number;
  /** For cartoons/anime still airing as of this dataset, omit this. */
  endYear?: number;
  /** Notable characters, most iconic first. */
  protagonists: string[];
  /** Notable settings / stages / areas, most iconic first. */
  settings: string[];
  /** Alternate spellings/short names that should resolve to this entry. */
  aliases: string[];
}

export type GuessTermKind = 'title' | 'character' | 'setting';

export interface GuessTerm {
  term: string;
  normalized: string;
  kind: GuessTermKind;
  entryId: string;
}

export type MatchLevel = 'exact' | 'partial' | 'none';

export interface AttributeResult {
  label: string;
  level: MatchLevel;
  guessValue: string;
  secretValue: string;
}

export interface GuessResult {
  guessTerm: string;
  guessKind: GuessTermKind;
  entry: MediaEntry;
  isWinningGuess: boolean;
  overallScore: number;
  attributes: AttributeResult[];
}
