export type MediaType = 'game' | 'cartoon';

/**
 * A game's defining platform identity (which ecosystem it's really "of"),
 * not just every system it's ever shipped on — almost every modern game
 * ships on 3+ platforms, which made a raw platforms-array comparison
 * rarely distinguish anything.
 */
export type GamePlatformCategory = 'PC' | 'PlayStation' | 'Xbox' | 'Nintendo' | 'Arcade' | 'Multiplatform';

/**
 * A cartoon/anime's defining distribution identity, same idea as
 * GamePlatformCategory — a show's real broadcast network is often a
 * one-off a player can't recognize (TV Tokyo, MBS, Discovery Family...),
 * which made the old raw-network comparison rarely distinguish anything
 * either. Entries without a clean fit (no recognizable English-language
 * home) simply omit `primaryPlatform` and fall back to their real network.
 */
export type CartoonPlatformCategory =
  | 'Cartoon Network'
  | 'Nickelodeon'
  | 'Adult Swim'
  | 'Toonami'
  | 'Disney Channel'
  | 'Fox'
  | 'Comedy Central'
  | 'Streaming';

export interface MediaEntry {
  id: string;
  name: string;
  type: MediaType;
  franchise: string;
  publisher: string;
  genres: string[];
  platforms: string[];
  /** See GamePlatformCategory / CartoonPlatformCategory. Omitted when neither cleanly fits. */
  primaryPlatform?: GamePlatformCategory | CartoonPlatformCategory;
  year: number;
  /** For cartoons/anime still airing as of this dataset, omit this. */
  endYear?: number;
  /** Notable characters, most iconic first. */
  protagonists: string[];
  /** Notable settings / stages / areas, most iconic first. */
  settings: string[];
  /** Alternate spellings/short names that should resolve to this entry. */
  aliases: string[];
  /**
   * Set on a title a player suggested and had confirmed via Wikipedia/Fandom,
   * not yet hand-curated. It's guessable (by title) but excluded from puzzle
   * target selection, since it has no real genre/publisher/platform/cast data.
   */
  isCommunitySubmission?: boolean;
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
