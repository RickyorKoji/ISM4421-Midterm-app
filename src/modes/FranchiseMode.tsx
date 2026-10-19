import { useMemo, useState } from 'react';
import { FlashOverlay } from '../components/FlashOverlay';
import { AutocompleteInput } from '../components/AutocompleteInput';
import { GuessRow } from '../components/GuessRow';
import { entries } from '../data/entries';
import { makeGuessKey, resolveGuess, suggest } from '../lib/match';
import { createSeededRandom, pickRandomIndex, todaySeedKey } from '../lib/random';
import { recordFranchiseResult, getFranchiseStats } from '../lib/storage';
import { buildGuessResult } from '../lib/similarity';
import { sfx } from '../lib/sound';
import type { GuessResult, GuessTermKind, MediaEntry } from '../types';

const MAX_TRIES = 8;

type GameMode = 'daily' | 'practice';
type Status = 'playing' | 'won' | 'lost';

const TARGET_KINDS: GuessTermKind[] = ['title', 'character', 'setting'];
const KIND_LABEL: Record<GuessTermKind, string> = { title: 'TITLE', character: 'CHARACTER', setting: 'SETTING' };
const KIND_NOUN: Record<GuessTermKind, string> = { title: 'Title', character: 'Character', setting: 'Setting' };

interface GuessTarget {
  kind: GuessTermKind;
  entry: MediaEntry;
  /** The exact character/setting name, or the entry's title for kind === 'title'. */
  label: string;
}

function itemPool(entry: MediaEntry, kind: GuessTermKind): string[] {
  if (kind === 'title') return [entry.name];
  return kind === 'character' ? entry.protagonists : entry.settings;
}

function buildTarget(entry: MediaEntry, kind: GuessTermKind, draw: () => number): GuessTarget {
  const pool = itemPool(entry, kind);
  const idx = pool.length > 1 ? Math.floor(draw() * pool.length) : 0;
  return { kind, entry, label: pool[idx] };
}

function pickTarget(mode: GameMode, excludeEntryId?: string): GuessTarget {
  if (mode === 'daily') {
    const draw = createSeededRandom(todaySeedKey());
    const entryIndex = Math.floor(draw() * entries.length);
    const kind = TARGET_KINDS[Math.floor(draw() * TARGET_KINDS.length)];
    return buildTarget(entries[entryIndex], kind, draw);
  }
  const excludeIndex = excludeEntryId ? entries.findIndex((e) => e.id === excludeEntryId) : undefined;
  const entryIndex = pickRandomIndex(entries.length, excludeIndex);
  const kind = TARGET_KINDS[Math.floor(Math.random() * TARGET_KINDS.length)];
  return buildTarget(entries[entryIndex], kind, Math.random);
}

export function FranchiseMode() {
  const [mode, setMode] = useState<GameMode>('daily');
  const [target, setTarget] = useState<GuessTarget>(() => pickTarget('daily'));

  const [input, setInput] = useState('');
  const [guesses, setGuesses] = useState<GuessResult[]>([]);
  const [status, setStatus] = useState<Status>('playing');
  const [message, setMessage] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState<{ id: number; color: string | null }>({ id: 0, color: null });
  const [stats, setStats] = useState(getFranchiseStats());

  const targetKey = makeGuessKey(target.entry.id, target.kind, target.label);
  const guessedKeys = useMemo(
    () => new Set(guesses.map((g) => makeGuessKey(g.entry.id, g.guessKind, g.guessTerm))),
    [guesses],
  );
  const triesLeft = MAX_TRIES - guesses.length;

  function triggerFlash(color: string) {
    setFlash((f) => ({ id: f.id + 1, color }));
  }

  function triggerShake() {
    setShake(true);
    window.setTimeout(() => setShake(false), 360);
  }

  function startNewGame(nextMode: GameMode) {
    setMode(nextMode);
    setTarget(pickTarget(nextMode, nextMode === 'practice' ? target.entry.id : undefined));
    setGuesses([]);
    setStatus('playing');
    setMessage(null);
    setInput('');
  }

  function handleSubmit(raw: string) {
    if (status !== 'playing') return;
    const term = resolveGuess(raw);
    if (!term) {
      sfx.invalid();
      triggerShake();
      setMessage(`"${raw}" isn't a recognized title, character, or setting. Try the suggestions list.`);
      return;
    }
    const entry = entries.find((e) => e.id === term.entryId)!;
    const guessKey = makeGuessKey(entry.id, term.kind, term.term);
    if (guessedKeys.has(guessKey)) {
      sfx.invalid();
      triggerShake();
      setMessage(`You already tried that ${term.kind}. Try something else.`);
      return;
    }

    setMessage(null);
    const result = buildGuessResult(term, entry, target.entry);
    const nextGuesses = [...guesses, result];
    setGuesses(nextGuesses);
    setInput('');

    if (guessKey === targetKey) {
      sfx.win();
      triggerFlash('#39ff6a');
      setStatus('won');
      setStats(recordFranchiseResult(true, nextGuesses.length));
      return;
    }

    if (result.overallScore >= 65) {
      sfx.exact();
      triggerFlash('#ffd23f');
    } else if (result.overallScore >= 35) {
      sfx.partial();
      triggerFlash('#39e0ff');
    } else {
      sfx.none();
      triggerFlash('#ff3b57');
    }

    if (nextGuesses.length >= MAX_TRIES) {
      sfx.lose();
      setStatus('lost');
      setStats(recordFranchiseResult(false, 0));
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 pb-24">
      <FlashOverlay flashId={flash.id} color={flash.color} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => mode !== 'daily' && startNewGame('daily')}
            className={`font-retro rounded-sm border-2 px-2.5 py-1.5 text-[9px] sm:text-[10px] ${mode === 'daily' ? 'border-[var(--color-brand)] bg-[var(--color-brand)] text-[var(--color-ink)]' : 'border-[var(--color-border)] text-[var(--color-muted)]'}`}
          >
            Daily
          </button>
          <button
            type="button"
            onClick={() => startNewGame('practice')}
            className={`font-retro rounded-sm border-2 px-2.5 py-1.5 text-[9px] sm:text-[10px] ${mode === 'practice' ? 'border-[var(--color-brand-2)] bg-[var(--color-brand-2)] text-[var(--color-ink)]' : 'border-[var(--color-border)] text-[var(--color-muted)]'}`}
          >
            Practice (random)
          </button>
        </div>
        <div className="font-retro text-[9px] text-[var(--color-muted)] sm:text-[10px]">
          Streak {stats.currentStreak} · Best {stats.bestStreak}
        </div>
      </div>

      <div className="pixel-border flex items-center justify-between bg-[var(--color-surface)] px-4 py-3">
        <p className="text-sm text-[var(--color-muted)]">
          This round's target is a specific{' '}
          <span className="font-retro text-[var(--color-brand-2)]">{KIND_LABEL[target.kind]}</span>. Try any title,
          character, or setting to narrow down the franchise &mdash; colors show how close it is &mdash; but only
          the exact {target.kind} wins.
        </p>
        <div className="font-retro ml-3 shrink-0 text-lg text-[var(--color-brand)]">
          {triesLeft}<span className="text-xs text-[var(--color-muted)]">/{MAX_TRIES}</span>
        </div>
      </div>

      {status === 'playing' && (
        <AutocompleteInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          getSuggestions={(q) => suggest(q, 8, guessedKeys)}
          placeholder="Type a title, character, or setting..."
          shake={shake}
        />
      )}

      {message && <p className="text-xs text-[var(--color-brand)]">{message}</p>}

      {status !== 'playing' && (
        <div
          className={`pixel-border animate-bounce-in flex flex-col items-center gap-2 p-5 text-center ${status === 'won' ? 'bg-[var(--color-exact)]/10' : 'bg-[#ff3b57]/10'}`}
        >
          <p className="font-retro text-xs text-[var(--color-muted)]">{status === 'won' ? 'SOLVED!' : 'OUT OF TRIES'}</p>
          <p className="font-retro text-[9px] text-[var(--color-brand-2)]">THE {KIND_LABEL[target.kind]} WAS</p>
          <p className="text-xl font-bold">{target.label}</p>
          {target.kind !== 'title' && (
            <p className="text-sm text-[var(--color-muted)]">{KIND_NOUN[target.kind]} from {target.entry.name}</p>
          )}
          <p className="text-sm text-[var(--color-muted)]">
            {target.entry.genres.join(', ')} · {target.entry.year}
          </p>
          <button
            type="button"
            onClick={() => startNewGame('practice')}
            className="font-retro mt-2 rounded-sm border-2 border-[var(--color-border)] bg-[var(--color-brand)] px-4 py-2 text-[10px] text-[var(--color-ink)]"
          >
            Play Again
          </button>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {[...guesses].reverse().map((g, i) => {
          const rowKey = makeGuessKey(g.entry.id, g.guessKind, g.guessTerm);
          const sameFranchiseNotExact = g.isWinningGuess && rowKey !== targetKey;
          return (
            <GuessRow
              key={`${g.entry.id}-${g.guessKind}-${g.guessTerm}-${i}`}
              result={g}
              index={guesses.length - 1 - i}
              note={
                sameFranchiseNotExact
                  ? `Right franchise (${g.entry.name}) — but we need the exact ${target.kind} this round!`
                  : undefined
              }
            />
          );
        })}
      </ul>
    </div>
  );
}
