const PREFIX = 'pixel-guess:';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private browsing, quota) */
  }
}

export interface FranchiseStats {
  played: number;
  wins: number;
  currentStreak: number;
  bestStreak: number;
  guessDistribution: number[]; // index 0..7 = number of guesses used to win
}

const DEFAULT_FRANCHISE_STATS: FranchiseStats = {
  played: 0,
  wins: 0,
  currentStreak: 0,
  bestStreak: 0,
  guessDistribution: [0, 0, 0, 0, 0, 0, 0, 0],
};

export function getFranchiseStats(): FranchiseStats {
  return read('franchise-stats', DEFAULT_FRANCHISE_STATS);
}

export function recordFranchiseResult(won: boolean, guessesUsed: number) {
  const stats = getFranchiseStats();
  stats.played += 1;
  if (won) {
    stats.wins += 1;
    stats.currentStreak += 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
    if (guessesUsed >= 1 && guessesUsed <= 8) {
      stats.guessDistribution[guessesUsed - 1] += 1;
    }
  } else {
    stats.currentStreak = 0;
  }
  write('franchise-stats', stats);
  return stats;
}

export interface RarityStats {
  highScore: number;
  gamesPlayed: number;
  bestTierStreak: number;
}

const DEFAULT_RARITY_STATS: RarityStats = { highScore: 0, gamesPlayed: 0, bestTierStreak: 0 };

export function getRarityStats(): RarityStats {
  return read('rarity-stats', DEFAULT_RARITY_STATS);
}

export function recordRarityResult(score: number) {
  const stats = getRarityStats();
  stats.gamesPlayed += 1;
  stats.highScore = Math.max(stats.highScore, score);
  write('rarity-stats', stats);
  return stats;
}

export function getMuted(): boolean {
  return read('muted', false);
}

export function setMutedPref(value: boolean) {
  write('muted', value);
}
