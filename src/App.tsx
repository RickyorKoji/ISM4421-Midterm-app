import { useState } from 'react';
import { FranchiseMode } from './modes/FranchiseMode';
import { RarityMode } from './modes/RarityMode';
import { SuggestTitleModal } from './components/SuggestTitleModal';
import { getMuted, setMutedPref } from './lib/storage';
import { setMuted, sfx } from './lib/sound';

type Tab = 'franchise' | 'rarity';

function App() {
  const [tab, setTab] = useState<Tab>('franchise');
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

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                if (tab !== 'franchise') sfx.click();
                setTab('franchise');
              }}
              className={`font-retro min-w-0 rounded-sm border-2 px-2 py-2.5 text-[9px] leading-relaxed transition sm:px-3 sm:text-xs ${
                tab === 'franchise'
                  ? 'border-[var(--color-brand)] bg-[var(--color-brand)] text-[var(--color-ink)]'
                  : 'border-[var(--color-border)] text-[var(--color-muted)]'
              }`}
            >
              Franchise Guess
            </button>
            <button
              type="button"
              onClick={() => {
                if (tab !== 'rarity') sfx.click();
                setTab('rarity');
              }}
              className={`font-retro min-w-0 rounded-sm border-2 px-2 py-2.5 text-[9px] leading-relaxed transition sm:px-3 sm:text-xs ${
                tab === 'rarity'
                  ? 'border-[var(--color-brand-2)] bg-[var(--color-brand-2)] text-[var(--color-ink)]'
                  : 'border-[var(--color-border)] text-[var(--color-muted)]'
              }`}
            >
              Rarity Challenge
            </button>
          </div>

          {showHelp && (
            <div className="pixel-border animate-bounce-in bg-[var(--color-surface)] p-3 text-xs text-[var(--color-muted)]">
              {tab === 'franchise' ? (
                <>
                  <p className="mb-1 font-semibold text-[var(--color-text)]">Franchise Guess</p>
                  <p>
                    A secret game or cartoon is chosen. You have 8 guesses. Type any <b>title</b>, <b>character</b>, or{' '}
                    <b>setting</b> (a stage, map, or location) &mdash; each guess reveals how close that entry's
                    attributes are to the secret's: <span className="text-[var(--color-exact)]">green</span> = exact
                    match, <span className="text-[var(--color-partial)]">yellow</span> = related/overlapping (same
                    genre, nearby era, shared platform), <span className="text-[var(--color-muted)]">gray</span> = no
                    relation.
                  </p>
                </>
              ) : (
                <>
                  <p className="mb-1 font-semibold text-[var(--color-text)]">Rarity Challenge</p>
                  <p>
                    Each round gives a prompt like &ldquo;Name a fighting game stage.&rdquo; Type any valid answer.
                    Obvious, mainstream answers score low (<TierWord tier="Common" />); obscure, less-popular answers
                    score big (<TierWord tier="Ultra Rare" />). Rarity is estimated from each title's relative
                    popularity.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="py-6">{tab === 'franchise' ? <FranchiseMode /> : <RarityMode />}</main>

      <footer className="mx-auto max-w-3xl px-4 pb-8 text-center text-[10px] text-[var(--color-muted)]">
        Built for fluid play on iPhone, Mac, and desktop browsers &mdash; add to your home screen for the full arcade feel.
      </footer>

      {showSuggest && <SuggestTitleModal onClose={() => setShowSuggest(false)} />}
    </div>
  );
}

function TierWord({ tier }: { tier: string }) {
  return <span className="font-semibold text-[var(--color-text)]">{tier}</span>;
}

export default App;
