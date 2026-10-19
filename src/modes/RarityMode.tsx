import { useRef, useState } from 'react';
import { FlashOverlay } from '../components/FlashOverlay';
import { TierBadge } from '../components/TierBadge';
import { buildPool, pickRandomCategory } from '../lib/rarity';
import { evaluateRarityGuess } from '../lib/rarity';
import { sfx } from '../lib/sound';
import { getRarityStats, recordRarityResult } from '../lib/storage';
import type { RarityItem, RarityPool, RarityTier } from '../types';

const TOTAL_ROUNDS = 10;
const TIER_FLASH: Record<RarityTier, string> = {
  common: '#8fd3ff',
  uncommon: '#39e0ff',
  rare: '#c084fc',
  ultra: '#ffd23f',
};
const TIER_SFX: Record<RarityTier, () => void> = {
  common: sfx.tierCommon,
  uncommon: sfx.tierUncommon,
  rare: sfx.tierRare,
  ultra: sfx.tierUltra,
};

interface RoundRecord {
  prompt: string;
  answer: string;
  outcome: 'correct' | 'duplicate' | 'invalid' | 'skipped';
  item?: RarityItem;
}

type RoundOutcome = {
  kind: 'correct' | 'duplicate' | 'invalid';
  item?: RarityItem;
} | null;

function newPool(excludeId?: string): RarityPool {
  const category = pickRandomCategory(excludeId ? new Set([excludeId]) : undefined);
  return buildPool(category);
}

export function RarityMode() {
  const usedKeysRef = useRef<Set<string>>(new Set());
  const [round, setRound] = useState(1);
  const [pool, setPool] = useState<RarityPool>(() => newPool());
  const [answer, setAnswer] = useState('');
  const [outcome, setOutcome] = useState<RoundOutcome>(null);
  const [score, setScore] = useState(0);
  const [history, setHistory] = useState<RoundRecord[]>([]);
  const [finished, setFinished] = useState(false);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState<{ id: number; color: string | null }>({ id: 0, color: null });
  const [bestScore, setBestScore] = useState(() => getRarityStats().highScore);

  function triggerFlash(color: string) {
    setFlash((f) => ({ id: f.id + 1, color }));
  }
  function triggerShake() {
    setShake(true);
    window.setTimeout(() => setShake(false), 360);
  }

  function handleSubmit() {
    if (outcome) return;
    const result = evaluateRarityGuess(pool, answer, usedKeysRef.current);
    if (!result.valid) {
      sfx.invalid();
      triggerShake();
      setOutcome({ kind: 'invalid' });
      return;
    }
    if (result.alreadyUsed) {
      sfx.invalid();
      setOutcome({ kind: 'duplicate', item: result.item });
      return;
    }
    const item = result.item!;
    TIER_SFX[item.tier]();
    triggerFlash(TIER_FLASH[item.tier]);
    setScore((s) => s + item.points);
    setOutcome({ kind: 'correct', item });
  }

  function handleSkip() {
    if (outcome) return;
    setOutcome({ kind: 'invalid' });
  }

  function finalizeRound() {
    setHistory((h) => [
      ...h,
      {
        prompt: pool.category.prompt,
        answer,
        outcome: outcome?.kind === 'correct' ? 'correct' : outcome?.kind === 'duplicate' ? 'duplicate' : answer.trim() ? 'invalid' : 'skipped',
        item: outcome?.item,
      },
    ]);
    if (round >= TOTAL_ROUNDS) {
      const stats = recordRarityResult(score);
      setBestScore(stats.highScore);
      setFinished(true);
      return;
    }
    setRound((r) => r + 1);
    setPool(newPool(pool.category.id));
    setAnswer('');
    setOutcome(null);
  }

  function restart() {
    usedKeysRef.current = new Set();
    setRound(1);
    setPool(newPool());
    setAnswer('');
    setOutcome(null);
    setScore(0);
    setHistory([]);
    setFinished(false);
  }

  if (finished) {
    const tierTotals: Record<RarityTier, number> = { common: 0, uncommon: 0, rare: 0, ultra: 0 };
    for (const h of history) if (h.outcome === 'correct' && h.item) tierTotals[h.item.tier] += 1;
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 pb-24 text-center">
        <div className="pixel-border animate-bounce-in flex flex-col items-center gap-3 bg-[var(--color-surface)] p-6">
          <p className="font-retro text-xs text-[var(--color-muted)]">FINAL SCORE</p>
          <p className="font-retro text-4xl text-[var(--color-brand)]">{score}</p>
          <p className="text-sm text-[var(--color-muted)]">Best: {Math.max(bestScore, score)}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {(['common', 'uncommon', 'rare', 'ultra'] as RarityTier[]).map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <TierBadge tier={t} size="sm" />
                <span className="text-xs text-[var(--color-muted)]">x{tierTotals[t]}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={restart}
            className="font-retro mt-3 rounded-sm border-2 border-[var(--color-border)] bg-[var(--color-brand)] px-5 py-2.5 text-[10px] text-[var(--color-ink)]"
          >
            Play Again
          </button>
        </div>
        <ol className="scrollbar-thin flex max-h-96 flex-col gap-2 overflow-y-auto text-left">
          {history.map((h, i) => (
            <li key={i} className="pixel-border flex items-center justify-between bg-[var(--color-surface)] p-3 text-sm">
              <div>
                <p className="text-[var(--color-muted)]">{h.prompt}</p>
                <p className="font-medium text-[var(--color-text)]">
                  {h.outcome === 'skipped' ? <span className="italic text-[var(--color-muted)]">Skipped</span> : h.answer}
                  {h.outcome === 'correct' && h.item ? ` → ${h.item.entry.name}` : ''}
                </p>
              </div>
              {h.item && h.outcome === 'correct' ? (
                <div className="flex items-center gap-2">
                  <TierBadge tier={h.item.tier} size="sm" />
                  <span className="font-retro text-xs text-[var(--color-exact)]">+{h.item.points}</span>
                </div>
              ) : (
                <span className="font-retro text-xs text-[var(--color-muted)]">+0</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 pb-24">
      <FlashOverlay flashId={flash.id} color={flash.color} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-retro text-[10px] text-[var(--color-muted)]">
          Round {round}/{TOTAL_ROUNDS}
        </span>
        <span className="font-retro text-sm text-[var(--color-brand)]">Score: {score}</span>
      </div>

      <div className="flex flex-wrap justify-center gap-2 text-[9px]">
        {(['common', 'uncommon', 'rare', 'ultra'] as RarityTier[]).map((t) => (
          <TierBadge key={t} tier={t} size="sm" />
        ))}
      </div>

      <div className="pixel-border flex flex-col items-center gap-2 bg-[var(--color-surface)] p-6 text-center">
        <p className="font-retro text-[10px] text-[var(--color-brand-2)]">PROMPT</p>
        <p className="text-xl font-bold text-[var(--color-text)]">{pool.category.prompt}</p>
        <p className="text-xs text-[var(--color-muted)]">
          Rarer, more obscure answers score more points &mdash; common answers still count, just for less.
        </p>
      </div>

      {!outcome ? (
        <div className="flex gap-2">
          <input
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Type your answer..."
            className={`min-w-0 flex-1 rounded-sm border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-brand-2)] ${shake ? 'animate-shake' : ''}`}
          />
          <button
            type="button"
            onClick={handleSubmit}
            className="font-retro shrink-0 rounded-sm border-2 border-[var(--color-border)] bg-[var(--color-brand)] px-4 py-2 text-[10px] text-[var(--color-ink)]"
          >
            SUBMIT
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="font-retro shrink-0 rounded-sm border-2 border-[var(--color-border)] px-3 py-2 text-[10px] text-[var(--color-muted)]"
          >
            SKIP
          </button>
        </div>
      ) : (
        <div className="pixel-border animate-bounce-in flex flex-col items-center gap-3 bg-[var(--color-surface)] p-5 text-center">
          {outcome.kind === 'correct' && outcome.item ? (
            <>
              <TierBadge tier={outcome.item.tier} size="lg" />
              <p className="text-lg font-bold">{outcome.item.answer}</p>
              <p className="text-sm text-[var(--color-muted)]">from {outcome.item.entry.name}</p>
              <p className="font-retro text-2xl text-[var(--color-exact)]">+{outcome.item.points} pts</p>
            </>
          ) : outcome.kind === 'duplicate' ? (
            <>
              <p className="font-retro text-xs text-[var(--color-partial)]">ALREADY SCORED</p>
              <p className="text-sm text-[var(--color-muted)]">
                {outcome.item?.answer} was already used for this prompt type &mdash; no extra points.
              </p>
            </>
          ) : (
            <>
              <p className="font-retro text-xs text-[var(--color-brand)]">{answer.trim() ? 'NOT A MATCH' : 'SKIPPED'}</p>
              <p className="text-sm text-[var(--color-muted)]">No valid answer found for that prompt this round.</p>
            </>
          )}
          <button
            type="button"
            onClick={finalizeRound}
            className="font-retro mt-1 rounded-sm border-2 border-[var(--color-border)] bg-[var(--color-brand-2)] px-5 py-2 text-[10px] text-[var(--color-ink)]"
          >
            {round >= TOTAL_ROUNDS ? 'See Results' : 'Next Round'}
          </button>
        </div>
      )}
    </div>
  );
}
