import { TIER_LABEL } from '../lib/rarity';
import type { RarityTier } from '../types';

const TIER_STYLES: Record<RarityTier, string> = {
  common: 'bg-[var(--color-tier-common)] text-[var(--color-ink)] border-[var(--color-tier-common)]',
  uncommon: 'bg-[var(--color-tier-uncommon)] text-[var(--color-ink)] border-[var(--color-tier-uncommon)]',
  rare: 'bg-[var(--color-tier-rare)] text-[var(--color-ink)] border-[var(--color-tier-rare)]',
  ultra: 'tier-ultra-shimmer text-[var(--color-ink)] border-[var(--color-tier-ultra)]',
};

export function TierBadge({ tier, size = 'md' }: { tier: RarityTier; size?: 'sm' | 'md' | 'lg' }) {
  const sizeCls = size === 'lg' ? 'px-4 py-2 text-sm' : size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';
  return (
    <span className={`font-retro inline-block rounded-sm border-2 font-bold uppercase ${sizeCls} ${TIER_STYLES[tier]}`}>
      {TIER_LABEL[tier]}
    </span>
  );
}
