# Pixel Guess

A retro 8-bit guessing arcade for games and cartoons, with two modes:

- **Franchise Guess** — a Wordle-style mode. A secret game or cartoon is chosen and you have 8 guesses. Guess any *title*, *character*, or *setting* (stage, map, DLC area, location); each guess resolves to its parent title and compares it against the secret across six attributes (type, genre, publisher/studio, platform, era, popularity), colored green (exact match), yellow (related/overlapping), or gray (no relation). Includes a daily seeded puzzle and an unlimited practice mode, with streak tracking.
- **Rarity Challenge** — a Krillion-style trivia mode. Each round gives a prompt ("Name a fighting game stage", "Name a JRPG hero") and you type any valid answer from memory. Obvious answers score low (Common); obscure ones score big (Uncommon / Rare / Ultra Rare), estimated from each title's relative popularity.

Built as an installable PWA (works offline, "Add to Home Screen" on iPhone/Mac/desktop) with 8-bit sound effects and flash feedback via the Web Audio API — no external assets required.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4 (CSS-first config, no `tailwind.config.js`)
- `vite-plugin-pwa` for the manifest/service worker
- All game data is local (`src/data/entries.ts`, `src/data/prompts.ts`) — no backend

## Development

```bash
npm install
npm run dev      # start dev server
npm run build    # type-check + production build
npm run preview  # preview the production build
npm run lint     # oxlint
```

## Adding content

To add more games/cartoons, add an entry to `src/data/entries.ts` (title, franchise, genres, platforms, year, protagonists, settings, popularity 0–100). New entries are automatically searchable in Franchise Guess and pulled into Rarity Challenge prompts via the filters in `src/data/prompts.ts`.
