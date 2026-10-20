import type { GuessResult, MatchLevel } from '../types';

const LEVEL_STYLES: Record<MatchLevel, string> = {
  exact: 'bg-[var(--color-exact)] text-[var(--color-ink)] border-[var(--color-exact)]',
  partial: 'bg-[var(--color-partial)] text-[var(--color-ink)] border-[var(--color-partial)]',
  none: 'bg-[var(--color-none)]/40 text-[var(--color-muted)] border-[var(--color-border)]',
};

const KIND_LABEL: Record<GuessResult['guessKind'], string> = {
  title: 'Title',
  character: 'Character',
  setting: 'Setting',
};

export function GuessRow({ result, index, note }: { result: GuessResult; index: number; note?: string }) {
  return (
    <li className="pixel-border animate-pop bg-[var(--color-surface)] p-3">
      {note && (
        <p className="mb-2 rounded-sm border border-[var(--color-partial)] bg-[var(--color-partial)]/10 px-2 py-1 text-xs text-[var(--color-partial)]">
          {note}
        </p>
      )}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-retro text-[9px] text-[var(--color-muted)]">#{index + 1}</span>
          <span className="font-semibold text-[var(--color-text)]">{result.entry.name}</span>
          <span className="rounded-sm border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] text-[var(--color-muted)]">
            via {KIND_LABEL[result.guessKind]}
            {result.guessKind !== 'title' ? `: ${result.guessTerm}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-[var(--color-ink)] sm:w-32">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${result.overallScore}%`,
                background:
                  result.overallScore === 100
                    ? 'var(--color-exact)'
                    : result.overallScore >= 50
                      ? 'var(--color-partial)'
                      : 'var(--color-brand)',
              }}
            />
          </div>
          <span className="font-retro text-[10px] text-[var(--color-text)]">{result.overallScore}%</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
        {result.attributes.map((attr) => (
          <div
            key={attr.label}
            className={`flex flex-col gap-0.5 rounded-sm border-2 px-2 py-1.5 ${LEVEL_STYLES[attr.level]}`}
            title={`${attr.label}: ${attr.secretValue}`}
          >
            <span className="text-[9px] font-bold uppercase tracking-wide opacity-80">{attr.label}</span>
            <span className="truncate text-xs font-semibold">{attr.level === 'none' ? '???' : attr.secretValue}</span>
          </div>
        ))}
      </div>
    </li>
  );
}
