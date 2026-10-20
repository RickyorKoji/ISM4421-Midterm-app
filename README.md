# Pixel Guess

A retro 8-bit Wordle-style guessing arcade for games and cartoons.

Each round picks one specific secret — a **title**, a **character**, or a **setting** (stage, map, DLC area, location) — and shows which kind it is. You have 8 guesses, and can type any title, character, or setting to search: each guess resolves to its parent title and compares it against the secret across six attributes (type, genre, publisher/studio, platform, era, popularity), colored green (exact match), yellow (related/overlapping), or gray (no relation), so you can narrow down the franchise this way. But identifying the franchise isn't enough — only guessing the exact item asked for wins. Includes a daily seeded puzzle and an unlimited practice mode, with streak tracking.

Built as an installable PWA (works offline, "Add to Home Screen" on iPhone/Mac/desktop) with 8-bit sound effects and flash feedback via the Web Audio API — no external assets required.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4 (CSS-first config, no `tailwind.config.js`)
- `vite-plugin-pwa` for the manifest/service worker
- All game data is local (`src/data/entries.ts`) — no backend

## Development

```bash
npm install
npm run dev      # start dev server
npm run build    # type-check + production build
npm run preview  # preview the production build
npm run lint     # oxlint
```

## Adding content

To add more games/cartoons, add an entry to `src/data/entries.ts` (title, franchise, genres, platforms, year, protagonists, settings, popularity 0–100 — see the methodology note at the top of that file). New entries are automatically searchable and guessable. Players can also propose missing titles in-app via "+ Suggest", which checks the submission against the dataset and against Wikipedia before logging it for review.
