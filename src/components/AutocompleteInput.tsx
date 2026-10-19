import { useId, useRef, useState } from 'react';
import { sfx } from '../lib/sound';
import type { Suggestion } from '../lib/match';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  getSuggestions: (query: string) => Suggestion[];
  placeholder: string;
  disabled?: boolean;
  shake?: boolean;
}

export function AutocompleteInput({
  value,
  onChange,
  onSubmit,
  getSuggestions,
  placeholder,
  disabled,
  shake,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestions = value.trim().length > 0 ? getSuggestions(value) : [];

  function commit(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setOpen(false);
  }

  function chooseSuggestion(s: Suggestion) {
    onChange(s.label);
    sfx.click();
    setOpen(false);
    inputRef.current?.focus();
    commit(s.label);
  }

  return (
    <div className="relative w-full">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-controls={listId}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={disabled}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, Math.max(suggestions.length - 1, 0)));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              if (open && suggestions[highlight]) {
                chooseSuggestion(suggestions[highlight]);
              } else {
                commit(value);
              }
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          className={`min-w-0 flex-1 rounded-sm border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] outline-none focus:border-[var(--color-brand-2)] disabled:opacity-50 ${shake ? 'animate-shake' : ''}`}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => commit(value)}
          className="font-retro shrink-0 rounded-sm border-2 border-[var(--color-border)] bg-[var(--color-brand)] px-4 py-2 text-[10px] text-[var(--color-ink)] transition active:translate-y-0.5 disabled:opacity-40 sm:px-5"
        >
          GO
        </button>
      </div>
      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="pixel-border scrollbar-thin absolute z-20 mt-1 max-h-60 w-full overflow-y-auto bg-[var(--color-surface-2)]"
        >
          {suggestions.map((s, i) => (
            <li key={`${s.kind}-${s.label}-${i}`}>
              <button
                type="button"
                role="option"
                aria-selected={i === highlight}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => chooseSuggestion(s)}
                onMouseEnter={() => setHighlight(i)}
                className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm ${i === highlight ? 'bg-[var(--color-brand)] text-[var(--color-ink)]' : 'text-[var(--color-text)]'}`}
              >
                <span className="font-medium">{s.label}</span>
                <span className={`text-xs ${i === highlight ? 'text-[var(--color-ink)]/70' : 'text-[var(--color-muted)]'}`}>{s.sublabel}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
