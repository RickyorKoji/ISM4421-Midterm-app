import { useState } from 'react';
import { FranchiseMode } from './modes/FranchiseMode';
import { SuggestTitleModal } from './components/SuggestTitleModal';
import { getMuted, setMutedPref } from './lib/storage';
import { setMuted } from './lib/sound';

function App() {
  const [muted, setMutedState] = useState(() => {
    const m = getMuted();
    setMuted(m);
    return m;
  });
  const [showHelp, setShowHelp] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);

  function toggleMute() {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
    setMutedPref(next);
  }

  return (
    <div className="crt-bg min-h-[100dvh]">
      <header className="sticky top-0 z-30 border-b-2 border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-retro flex items-center gap-2 text-xs text-[var(--color-brand)] sm:text-sm">
              <span aria-hidden="true">🕹️</span> PIXEL GUESS
            </h1>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSuggest(true)}
                className="font-retro rounded-sm border-2 border-[var(--color-border)] px-2 py-1.5 text-[9px] text-[var(--color-muted)]"
              >
                + Suggest
              </button>
              <button
                type="button"
                onClick={() => setShowHelp((v) => !v)}
                aria-expanded={showHelp}
                className="font-retro rounded-sm border-2 border-[var(--color-border)] px-2.5 py-1.5 text-[10px] text-[var(--color-muted)]"
              >
                ?
              </button>
              <button
                type="button"
                onClick={toggleMute}
                aria-pressed={muted}
                className="font-retro rounded-sm border-2 border-[var(--color-border)] px-2.5 py-1.5 text-[10px] text-[var(--color-muted)]"
              >
                {muted ? '🔇' : '🔊'}
              </button>
            </div>
          </div>

          {showHelp && (
            <div className="pixel-border animate-bounce-in bg-[var(--color-surface)] p-3 text-xs text-[var(--color-muted)]">
              <p className="mb-1 font-semibold text-[var(--color-text)]">Franchise Guess</p>
              <p>
                Each round picks a specific secret <b>title</b>, <b>character</b>, or <b>setting</b> &mdash; shown at
                the top as this round's target kind. You have 8 guesses, and you can type any title, character, or
                setting to search: each one reveals how close that entry's attributes are to the secret's entry (
                <span className="text-[var(--color-exact)]">green</span> = exact match,{' '}
                <span className="text-[var(--color-partial)]">yellow</span> = related/overlapping,{' '}
                <span className="text-[var(--color-muted)]">gray</span> = no relation), so you can narrow down the
                franchise this way. But identifying the franchise isn't enough to win &mdash; only guessing the exact
                character/setting/title asked for does.
              </p>
            </div>
          )}
        </div>
      </header>

      <main className="py-6">
        <FranchiseMode />
      </main>

      <footer className="mx-auto max-w-3xl px-4 pb-8 text-center text-[10px] text-[var(--color-muted)]">
        Built for fluid play on iPhone, Mac, and desktop browsers &mdash; add to your home screen for the full arcade feel.
      </footer>

      {showSuggest && <SuggestTitleModal onClose={() => setShowSuggest(false)} />}
    </div>
  );
}

export default App;
