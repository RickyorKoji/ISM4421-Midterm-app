import { useEffect, useRef, useState } from 'react';
import { addSuggestionRecord, getSuggestionLog } from '../lib/suggestions';
import type { SuggestionRecord, SuggestionStatus } from '../lib/suggestions';
import { checkDuplicate, validateFormat, verifyExists } from '../lib/verify';
import { sfx } from '../lib/sound';

const COOLDOWN_MS = 4000;

const STATUS_STYLE: Record<SuggestionStatus, string> = {
  duplicate: 'border-[var(--color-partial)] text-[var(--color-partial)]',
  verified: 'border-[var(--color-exact)] text-[var(--color-exact)]',
  unverified: 'border-[var(--color-brand-2)] text-[var(--color-brand-2)]',
  rejected: 'border-[#ff3b57] text-[#ff3b57]',
};

const STATUS_LABEL: Record<SuggestionStatus, string> = {
  duplicate: 'Already Known',
  verified: 'Verified',
  unverified: 'Needs Review',
  rejected: 'Rejected',
};

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
  const [checking, setChecking] = useState(false);
  const [lastResult, setLastResult] = useState<SuggestionRecord | null>(null);
  const [log, setLog] = useState<SuggestionRecord[]>(() => getSuggestionLog());
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const panelRef = useRef<HTMLDivElement>(null);

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

  function record(partial: Omit<SuggestionRecord, 'id' | 'timestamp'>) {
    const full = addSuggestionRecord(partial);
    setLog((l) => [full, ...l].slice(0, 30));
    setLastResult(full);
  }

  async function handleSubmit() {
    const term = input.trim();
    if (!term || checking || cooling) return;

    const format = validateFormat(term);
    if (!format.ok) {
      sfx.invalid();
      record({ term, status: 'rejected', note: format.reason ?? 'Rejected.' });
      setCooldownUntil(Date.now() + COOLDOWN_MS);
      setInput('');
      return;
    }

    const dup = checkDuplicate(term);
    if (dup.isDuplicate) {
      sfx.partial();
      record({
        term,
        status: 'duplicate',
        note: `Already in the game as "${dup.matchedName}" — try guessing it!`,
        matchedEntryName: dup.matchedName,
      });
      setCooldownUntil(Date.now() + COOLDOWN_MS);
      setInput('');
      return;
    }

    setChecking(true);
    sfx.click();
    const wiki = await verifyExists(term);
    setChecking(false);

    if (wiki.found) {
      sfx.exact();
      record({
        term,
        status: 'verified',
        note: 'Confirmed as a real title — queued for review before it can be added to the game.',
        wikiTitle: wiki.title,
        wikiSnippet: wiki.snippet,
        wikiUrl: wiki.url,
      });
    } else {
      sfx.partial();
      record({
        term,
        status: 'unverified',
        note: wiki.error ?? "Couldn't confirm this automatically — flagged for manual review instead of being rejected outright.",
      });
    }
    setCooldownUntil(Date.now() + COOLDOWN_MS);
    setInput('');
  }

  const cooldownSecondsLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={panelRef} className="pixel-border scrollbar-thin max-h-[90vh] w-full max-w-lg overflow-y-auto bg-[var(--color-surface)] p-5">
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
          Think we're missing a game or show? Type it below. We'll check it against what's already in the game, then
          try to confirm it's a real title (via Wikipedia) before it goes into the review queue below — so the list
          stays made of actual titles, not random text.
        </p>

        <div className="mb-2 flex gap-2">
          <input
            autoFocus
            value={input}
            disabled={checking || cooling}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="e.g. Hades II"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-sm border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-brand-2)] disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim() || checking || cooling}
            className="font-retro shrink-0 rounded-sm border-2 border-[var(--color-border)] bg-[var(--color-brand)] px-3 py-2 text-[10px] text-[var(--color-ink)] disabled:opacity-40"
          >
            {checking ? '...' : cooling ? `${cooldownSecondsLeft}s` : 'CHECK'}
          </button>
        </div>
        <p className="mb-4 text-[10px] text-[var(--color-muted)]">
          {checking ? 'Checking the dataset, then looking it up…' : ' '}
        </p>

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
