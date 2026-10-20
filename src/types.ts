export type MediaType = 'game' | 'cartoon';

export interface MediaEntry {
  id: string;
  name: string;
  type: MediaType;
  franchise: string;
  publisher: string;
  genres: string[];
  platforms: string[];
  year: number;
  /** Notable characters, most iconic first. */
  protagonists: string[];
  /** Notable settings / stages / areas, most iconic first. */
  settings: string[];
  /** Alternate spellings/short names that should resolve to this entry. */
  aliases: string[];
  /** 0-100 relative popularity (ratings/sales proxy), 100 = extremely mainstream. */
  popularity: number;
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
