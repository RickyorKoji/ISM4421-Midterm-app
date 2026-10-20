import { useState } from 'react';

type ChipState = 'confirmed' | 'eliminated' | 'unknown';

const CHIP_STYLES: Record<ChipState, string> = {
  confirmed: 'border-[var(--color-exact)] bg-[var(--color-exact)]/15 text-[var(--color-exact)]',
  eliminated: 'border-[var(--color-border)] text-[var(--color-muted)] opacity-50 line-through',
  unknown: 'border-[var(--color-border)] text-[var(--color-text)]',
};

function chipState(item: string, confirmed: Set<string>, eliminated: Set<string>): ChipState {
  if (confirmed.has(item)) return 'confirmed';
  if (eliminated.has(item)) return 'eliminated';
  return 'unknown';
}

function ChipRow({ items, confirmed, eliminated }: { items: string[]; confirmed: Set<string>; eliminated: Set<string> }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className={`rounded-sm border px-1.5 py-0.5 text-[10px] ${CHIP_STYLES[chipState(item, confirmed, eliminated)]}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

interface AttributeBankProps {
  title: string;
  /** Genre-confirmed/eliminated-shared info computed by the caller from this round's guesses. */
  confirmed: Set<string>;
  eliminated: Set<string>;
  /** A flat vocabulary (e.g. all genres or all publishers). */
  items?: string[];
  /** A vocabulary split into labeled sub-groups (e.g. game platforms vs cartoon networks). */
  groups?: { label: string; items: string[] }[];
  defaultOpen?: boolean;
}

/**
 * A Wordle-keyboard-style reference legend: every possible value for one
 * attribute, with values this round's guesses have confirmed (green) or
 * ruled out (struck through) highlighted, so a player always has the full
 * vocabulary to reason with instead of guessing blind.
 */
export function AttributeBank({ title, confirmed, eliminated, items, groups, defaultOpen = false }: AttributeBankProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="pixel-border bg-[var(--color-surface)] p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="font-retro flex w-full items-center justify-between text-[9px] text-[var(--color-muted)] sm:text-[10px]"
      >
        <span>{title}</span>
        <span>{open ? 'HIDE ▲' : 'SHOW ▼'}</span>
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2">
          {items && <ChipRow items={items} confirmed={confirmed} eliminated={eliminated} />}
          {groups?.map((g) => (
            <div key={g.label} className="flex flex-col gap-1">
              <span className="font-retro text-[8px] uppercase tracking-wide text-[var(--color-muted)]">{g.label}</span>
              <ChipRow items={g.items} confirmed={confirmed} eliminated={eliminated} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
