import { useEffect, useMemo, useRef, useState } from 'react';
import { AttributeBank } from '../components/AttributeBank';
import { FlashOverlay } from '../components/FlashOverlay';
import { AutocompleteInput } from '../components/AutocompleteInput';
import { GuessRow } from '../components/GuessRow';
import { entries } from '../data/entries';
import { allGenres, allPlatformCategories, allPublishers, platformLabel, runTimeLabel } from '../lib/classification';
import { addCommunityEntry, buildCommunityEntry } from '../lib/community';
import { getEntryById, makeGuessKey, refreshCommunityEntries, resolveGuess, suggest } from '../lib/match';
import { createSeededRandom, pickRandomIndex, todaySeedKey } from '../lib/random';
import { recordFranchiseResult, getFranchiseStats } from '../lib/storage';
import { buildGuessResult } from '../lib/similarity';
import { sfx } from '../lib/sound';
import { addSuggestionRecord } from '../lib/suggestions';
import { checkDuplicate, classifyTitle, validateFormat } from '../lib/verify';
import type { GuessResult, GuessTermKind, MediaEntry } from '../types';

const MAX_TRIES = 8;

type GameMode = 'daily' | 'practice';
type Status = 'playing' | 'won' | 'lost';

const TARGET_KINDS: GuessTermKind[] = ['title', 'character', 'setting'];
const KIND_LABEL: Record<GuessTermKind, string> = { title: 'TITLE', character: 'CHARACTER', setting: 'SETTING' };
const KIND_NOUN: Record<GuessTermKind, string> = { title: 'Title', character: 'Character', setting: 'Setting' };
const ALL_GENRES = allGenres();
const ALL_PUBLISHERS = allPublishers();
const PLATFORM_CATEGORIES = allPlatformCategories();

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

const PRACTICE_HISTORY_SIZE = 5;

function pickTarget(mode: GameMode, excludeEntryIds?: string[]): GuessTarget {
  if (mode === 'daily') {
    const draw = createSeededRandom(todaySeedKey());
    const entryIndex = Math.floor(draw() * entries.length);
    const kind = TARGET_KINDS[Math.floor(draw() * TARGET_KINDS.length)];
    return buildTarget(entries[entryIndex], kind, draw);
  }
  const excludeIndices = new Set(
    (excludeEntryIds ?? []).map((id) => entries.findIndex((e) => e.id === id)).filter((i) => i !== -1),
  );
  const entryIndex = pickRandomIndex(entries.length, excludeIndices);
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
  const [checkingGuess, setCheckingGuess] = useState(false);

  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const recentTargetIdsRef = useRef<string[]>([]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const targetKey = makeGuessKey(target.entry.id, target.kind, target.label);
  const guessedKeys = useMemo(
    () => new Set(guesses.map((g) => makeGuessKey(g.entry.id, g.guessKind, g.guessTerm))),
    [guesses],
  );
  const triesLeft = MAX_TRIES - guesses.length;

  // Which genres this round's guesses have confirmed are (or aren't) in the secret —
  // a true miss on a guess's Genre attribute means NONE of that guess's genres are
  // shared, so every genre it lists can be safely marked eliminated, Wordle-keyboard-style.
  const genreKnowledge = useMemo(() => {
    const confirmed = new Set<string>();
    const eliminated = new Set<string>();
    for (const g of guesses) {
      for (const genre of g.entry.genres) {
        if (target.entry.genres.includes(genre)) confirmed.add(genre);
        else eliminated.add(genre);
      }
    }
    return { confirmed, eliminated };
  }, [guesses, target]);

  // Platform and Publisher/Studio are single-valued now, so each guess directly
  // confirms or eliminates exactly one category/studio for the secret.
  const platformKnowledge = useMemo(() => {
    const confirmed = new Set<string>();
    const eliminated = new Set<string>();
    const secretLabel = platformLabel(target.entry);
    for (const g of guesses) {
      const label = platformLabel(g.entry);
      if (label === secretLabel) confirmed.add(label);
      else eliminated.add(label);
    }
    return { confirmed, eliminated };
  }, [guesses, target]);

  const publisherKnowledge = useMemo(() => {
    const confirmed = new Set<string>();
    const eliminated = new Set<string>();
    for (const g of guesses) {
      if (g.entry.publisher === target.entry.publisher) confirmed.add(g.entry.publisher);
      else eliminated.add(g.entry.publisher);
    }
    return { confirmed, eliminated };
  }, [guesses, target]);

  function triggerFlash(color: string) {
    setFlash((f) => ({ id: f.id + 1, color }));
  }

  function triggerShake() {
    setShake(true);
    window.setTimeout(() => setShake(false), 360);
  }

  function startNewGame(nextMode: GameMode) {
    requestIdRef.current += 1;
    abortRef.current?.abort();
    setCheckingGuess(false);
    setMode(nextMode);
    const nextTarget = pickTarget(nextMode, nextMode === 'practice' ? recentTargetIdsRef.current : undefined);
    if (nextMode === 'practice') {
      recentTargetIdsRef.current = [...recentTargetIdsRef.current, nextTarget.entry.id].slice(-PRACTICE_HISTORY_SIZE);
    }
    setTarget(nextTarget);
    setGuesses([]);
    setStatus('playing');
    setMessage(null);
    setInput('');
  }

  /**
   * An unresolved guess isn't necessarily wrong — it might be a real title
   * this dataset just doesn't have yet. Rather than reject it outright, run
   * it through the same verification pipeline Suggest-a-Title uses (format
   * check -> local duplicate/typo check -> Wikipedia/Fandom classification)
   * so a confirmed-real title gets auto-logged there instead of just being
   * told "not recognized", without costing the player a try.
   */
  async function verifyUnresolvedGuess(raw: string) {
    const trimmed = raw.trim();

    const format = validateFormat(trimmed);
    if (!format.ok) {
      sfx.invalid();
      triggerShake();
      setMessage(format.reason ?? `"${raw}" isn't a recognized title, character, or setting.`);
      return;
    }

    const dup = checkDuplicate(trimmed);
    if (dup.isDuplicate) {
      sfx.invalid();
      triggerShake();
      setMessage(`Close! "${dup.matchedName}" is already in the game — check your spelling and try again.`);
      return;
    }

    requestIdRef.current += 1;
    const myId = requestIdRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setCheckingGuess(true);
    setMessage(`Checking "${trimmed}" against Wikipedia/Fandom…`);
    const wiki = await classifyTitle(trimmed, controller.signal);
    if (myId !== requestIdRef.current) return; // superseded by a newer guess/round
    setCheckingGuess(false);

    if (wiki.isGameOrShow) {
      const sourceLabel = wiki.source === 'fandom' ? 'a Fandom wiki' : 'Wikipedia';
      addSuggestionRecord({
        term: trimmed,
        status: 'verified',
        note: `Auto-logged from a Franchise Guess attempt — confirmed via ${sourceLabel} and added as a guessable title.`,
        wikiTitle: wiki.title,
        wikiSnippet: wiki.snippet,
        wikiUrl: wiki.url,
        wikiCategories: wiki.matchedCategories,
      });
      const communityEntry = buildCommunityEntry(trimmed, wiki);
      const added = addCommunityEntry(communityEntry);
      if (added) refreshCommunityEntries();
      sfx.invalid();
      triggerShake();
      setMessage(
        `"${communityEntry.name}" looks real (confirmed via ${sourceLabel}) — it's now a guessable title! Its genre/publisher/platform aren't known yet, so it won't be a strong clue until someone fills those in. This attempt didn't cost you a try.`,
      );
    } else if (wiki.found) {
      sfx.invalid();
      triggerShake();
      setMessage(`Found "${wiki.title}" on Wikipedia, but it isn't a video game or animated/TV show. Try something else.`);
    } else {
      sfx.invalid();
      triggerShake();
      setMessage(`"${raw}" isn't a recognized title, character, or setting. Try the suggestions list.`);
    }
  }

  function handleSubmit(raw: string) {
    if (status !== 'playing' || checkingGuess) return;
    const term = resolveGuess(raw);
    if (!term) {
      void verifyUnresolvedGuess(raw);
      return;
    }
    const entry = getEntryById(term.entryId)!;
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

      <AttributeBank
        title="GENRE BANK"
        items={ALL_GENRES}
        confirmed={genreKnowledge.confirmed}
        eliminated={genreKnowledge.eliminated}
        defaultOpen
      />
      <AttributeBank
        title="PLATFORM BANK"
        groups={[
          { label: 'Games', items: PLATFORM_CATEGORIES.games },
          { label: 'Cartoons', items: PLATFORM_CATEGORIES.cartoons },
        ]}
        confirmed={platformKnowledge.confirmed}
        eliminated={platformKnowledge.eliminated}
      />
      <AttributeBank
        title="PUBLISHER/STUDIO BANK"
        items={ALL_PUBLISHERS}
        confirmed={publisherKnowledge.confirmed}
        eliminated={publisherKnowledge.eliminated}
      />

      {status === 'playing' && (
        <AutocompleteInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          getSuggestions={(q) => suggest(q, 8, guessedKeys)}
          placeholder={checkingGuess ? 'Checking…' : 'Type a title, character, or setting...'}
          disabled={checkingGuess}
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
            {target.entry.genres.join(', ')} · {runTimeLabel(target.entry)}
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
