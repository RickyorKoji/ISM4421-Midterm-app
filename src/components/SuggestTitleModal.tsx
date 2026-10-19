import { useEffect, useRef, useState } from 'react';
import { addSuggestionRecord, getSuggestionLog } from '../lib/suggestions';
import type { SuggestionRecord, SuggestionStatus } from '../lib/suggestions';
import { checkDuplicate, classifyTitle, validateFormat } from '../lib/verify';
import type { MediaKind } from '../lib/verify';
import { sfx } from '../lib/sound';

const COOLDOWN_MS = 4000;
const LIVE_LOOKUP_DEBOUNCE_MS = 600;

const STATUS_STYLE: Record<SuggestionStatus, string> = {
  duplicate: 'border-[var(--color-partial)] text-[var(--color-partial)]',
  verified: 'border-[var(--color-exact)] text-[var(--color-exact)]',
  'off-topic': 'border-[var(--color-none)] text-[var(--color-muted)]',
  unverified: 'border-[var(--color-brand-2)] text-[var(--color-brand-2)]',
  rejected: 'border-[#ff3b57] text-[#ff3b57]',
};

const STATUS_LABEL: Record<SuggestionStatus, string> = {
  duplicate: 'Already Known',
  verified: 'Verified',
  'off-topic': 'Not a Game/Show',
  unverified: 'Needs Review',
  rejected: 'Rejected',
};

const STATUS_TEXT_COLOR: Record<SuggestionStatus, string> = {
  duplicate: 'text-[var(--color-partial)]',
  verified: 'text-[var(--color-exact)]',
  'off-topic': 'text-[var(--color-muted)]',
  unverified: 'text-[var(--color-brand-2)]',
  rejected: 'text-[#ff3b57]',
};

const KIND_WORD: Record<MediaKind, string> = {
  game: 'video game',
  show: 'animated/TV show',
  both: 'video game and show',
  unknown: 'title',
};

interface LiveCheck {
  kind: SuggestionStatus | 'checking';
  forTerm: string;
  note: string;
  matchedEntryName?: string;
  wikiTitle?: string;
  wikiSnippet?: string;
  wikiUrl?: string;
  wikiCategories?: string[];
}

function timeAgo(ts: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export function SuggestTitleModal({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState('');
  const [liveCheck, setLiveCheck] = useState<LiveCheck | null>(null);
  const [lastResult, setLastResult] = useState<SuggestionRecord | null>(null);
  const [log, setLog] = useState<SuggestionRecord[]>(() => getSuggestionLog());
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const cooling = now < cooldownUntil;

  useEffect(() => {
    if (!cooling) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [cooling]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Clean up any pending debounce/fetch if the modal closes mid-check.
  useEffect(
    () => () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    },
    [],
  );

  function runLiveCheck(value: string) {
    requestIdRef.current += 1;
    const myId = requestIdRef.current;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setLiveCheck(null);
      return;
    }

    const format = validateFormat(trimmed);
    if (!format.ok) {
      setLiveCheck({ kind: 'rejected', forTerm: trimmed, note: format.reason ?? 'Rejected.' });
      return;
    }

    const dup = checkDuplicate(trimmed);
    if (dup.isDuplicate) {
      setLiveCheck({
        kind: 'duplicate',
        forTerm: trimmed,
        note: `Already in the game as "${dup.matchedName}" — try guessing it!`,
        matchedEntryName: dup.matchedName,
      });
      return;
    }

    setLiveCheck({ kind: 'checking', forTerm: trimmed, note: 'Checking…' });
    debounceRef.current = window.setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      classifyTitle(trimmed, controller.signal).then((wiki) => {
        if (myId !== requestIdRef.current) return; // superseded by a newer keystroke

        if (wiki.isGameOrShow) {
          const kindWord = KIND_WORD[wiki.kind];
          const categoryHint = wiki.matchedCategories && wiki.matchedCategories.length > 0 ? ` (Wikipedia category: "${wiki.matchedCategories[0]}")` : '';
          setLiveCheck({
            kind: 'verified',
            forTerm: trimmed,
            note: `Confirmed as a real ${kindWord} on Wikipedia${categoryHint}.`,
            wikiTitle: wiki.title,
            wikiSnippet: wiki.snippet,
            wikiUrl: wiki.url,
            wikiCategories: wiki.matchedCategories,
          });
        } else if (wiki.found) {
          setLiveCheck({
            kind: 'off-topic',
            forTerm: trimmed,
            note: `Found "${wiki.title}" on Wikipedia, but it isn't categorized as a video game or animated/TV show.`,
            wikiTitle: wiki.title,
            wikiSnippet: wiki.snippet,
            wikiUrl: wiki.url,
          });
        } else {
          setLiveCheck({
            kind: 'unverified',
            forTerm: trimmed,
            note: wiki.error ?? 'No confident match found on Wikipedia — flagged for manual review.',
          });
        }
      });
    }, LIVE_LOOKUP_DEBOUNCE_MS);
  }

  function handleInputChange(value: string) {
    setInput(value);
    runLiveCheck(value);
  }

  function commit() {
    const term = input.trim();
    if (!term || cooling || !liveCheck || liveCheck.kind === 'checking' || liveCheck.forTerm !== term) return;

    sfx[liveCheck.kind === 'verified' ? 'exact' : liveCheck.kind === 'rejected' ? 'invalid' : 'partial']();
    const full = addSuggestionRecord({
      term,
      status: liveCheck.kind,
      note: liveCheck.note,
      matchedEntryName: liveCheck.matchedEntryName,
      wikiTitle: liveCheck.wikiTitle,
      wikiSnippet: liveCheck.wikiSnippet,
      wikiUrl: liveCheck.wikiUrl,
      wikiCategories: liveCheck.wikiCategories,
    });
    setLog((l) => [full, ...l].slice(0, 30));
    setLastResult(full);
    setCooldownUntil(Date.now() + COOLDOWN_MS);
    setInput('');
    setLiveCheck(null);
  }

  const trimmedInput = input.trim();
  const canCommit = Boolean(trimmedInput) && !cooling && liveCheck !== null && liveCheck.kind !== 'checking' && liveCheck.forTerm === trimmedInput;
  const cooldownSecondsLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pixel-border scrollbar-thin max-h-[90vh] w-full max-w-lg overflow-y-auto bg-[var(--color-surface)] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-retro text-xs text-[var(--color-brand)]">SUGGEST A TITLE</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="font-retro rounded-sm border-2 border-[var(--color-border)] px-2 py-1 text-[10px] text-[var(--color-muted)]"
          >
            X
          </button>
        </div>

        <p className="mb-4 text-xs text-[var(--color-muted)]">
          Think we're missing a game or show? Start typing below &mdash; we'll check it against what's already in the
          game, then search Wikipedia and look at that article's own categories to confirm it's actually tagged as a{' '}
          <b>video game</b> or an <b>animated/TV series</b> (not just that some page with similar words exists).
          Press CHECK to log the result below.
        </p>

        <div className="mb-1 flex gap-2">
          <input
            autoFocus
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commit()}
            placeholder="e.g. Hades II"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-sm border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-brand-2)]"
          />
          <button
            type="button"
            onClick={commit}
            disabled={!canCommit}
            className="font-retro shrink-0 rounded-sm border-2 border-[var(--color-border)] bg-[var(--color-brand)] px-3 py-2 text-[10px] text-[var(--color-ink)] disabled:opacity-40"
          >
            {cooling ? `${cooldownSecondsLeft}s` : 'CHECK'}
          </button>
        </div>

        <div className="mb-4 min-h-[18px]">
          {liveCheck && (
            <p className={`flex items-center gap-1.5 text-[11px] ${liveCheck.kind === 'checking' ? 'text-[var(--color-muted)]' : STATUS_TEXT_COLOR[liveCheck.kind]}`}>
              {liveCheck.kind === 'checking' ? <span className="animate-caret">looking it up&hellip;</span> : <span>{liveCheck.note}</span>}
            </p>
          )}
        </div>

        {lastResult && (
          <div className={`animate-bounce-in mb-4 rounded-sm border-2 bg-[var(--color-surface-2)] p-3 ${STATUS_STYLE[lastResult.status]}`}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-retro text-[9px] uppercase">{STATUS_LABEL[lastResult.status]}</span>
              <span className="truncate text-xs font-semibold text-[var(--color-text)]">{lastResult.term}</span>
            </div>
            <p className="text-xs text-[var(--color-muted)]">{lastResult.note}</p>
            {lastResult.wikiSnippet && <p className="mt-1 text-xs italic text-[var(--color-muted)]">"{lastResult.wikiSnippet}"</p>}
          </div>
        )}

        <h3 className="font-retro mb-2 text-[9px] text-[var(--color-muted)]">SUBMISSION LOG (this device)</h3>
        <ul className="scrollbar-thin flex max-h-56 flex-col gap-1.5 overflow-y-auto">
          {log.length === 0 && <li className="text-xs text-[var(--color-muted)]">No submissions yet.</li>}
          {log.map((r) => (
            <li
              key={r.id}
              className={`flex items-center justify-between gap-2 rounded-sm border px-2 py-1.5 text-xs ${STATUS_STYLE[r.status]} bg-[var(--color-ink)]/40`}
            >
              <span className="truncate text-[var(--color-text)]">{r.term}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-retro text-[8px]">{STATUS_LABEL[r.status]}</span>
                <span className="text-[10px] text-[var(--color-muted)]">{timeAgo(r.timestamp)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
