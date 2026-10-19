import { entries } from '../data/entries';
import { promptCategories } from '../data/prompts';
import { normalize } from './match';
import type { MediaEntry, PromptCategory, RarityItem, RarityPool, RarityTier } from '../types';

export const TIER_POINTS: Record<RarityTier, number> = {
  common: 10,
  uncommon: 25,
  rare: 50,
  ultra: 100,
};

export const TIER_LABEL: Record<RarityTier, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  ultra: 'Ultra Rare',
};

function tierFor(effectivePopularity: number): RarityTier {
  if (effectivePopularity >= 70) return 'common';
  if (effectivePopularity >= 45) return 'uncommon';
  if (effectivePopularity >= 25) return 'rare';
  return 'ultra';
}

function itemsFor(entry: MediaEntry, kind: PromptCategory['kind']): { answer: string; index: number }[] {
  if (kind === 'title') return [{ answer: entry.name, index: 0 }];
  if (kind === 'character') return entry.protagonists.map((p, i) => ({ answer: p, index: i }));
  return entry.settings.map((s, i) => ({ answer: s, index: i }));
}

export function buildPool(category: PromptCategory): RarityPool {
  const items: RarityItem[] = [];
  for (const entry of entries) {
    if (!category.filter(entry)) continue;
    for (const { answer, index } of itemsFor(entry, category.kind)) {
      const effectivePopularity = Math.max(0, Math.min(100, entry.popularity - index * 20));
      const tier = tierFor(effectivePopularity);
      items.push({
        answer,
        normalized: normalize(answer),
        entry,
        kind: category.kind,
        effectivePopularity,
        tier,
        points: TIER_POINTS[tier],
      });
    }
  }
  return { category, items };
}

export function pickRandomCategory(excludeIds: Set<string> = new Set()): PromptCategory {
  const pool = promptCategories.filter((c) => !excludeIds.has(c.id));
  const list = pool.length > 0 ? pool : promptCategories;
  return list[Math.floor(Math.random() * list.length)];
}

export interface RarityGuessOutcome {
  valid: boolean;
  alreadyUsed: boolean;
  item?: RarityItem;
}

export function evaluateRarityGuess(
  pool: RarityPool,
  rawAnswer: string,
  usedKeys: Set<string>,
): RarityGuessOutcome {
  const norm = normalize(rawAnswer);
  if (!norm) return { valid: false, alreadyUsed: false };
  const item = pool.items.find((i) => i.normalized === norm);
  if (!item) return { valid: false, alreadyUsed: false };
  const key = `${pool.category.id}::${item.normalized}`;
  if (usedKeys.has(key)) return { valid: true, alreadyUsed: true, item };
  usedKeys.add(key);
  return { valid: true, alreadyUsed: false, item };
}
