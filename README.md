# Orðspor

Orðspor is a small, local-first flash-card app for learning useful Icelandic phrases. It combines a focused card-flipping study flow with a personal phrase notebook backed by SQLite.

## What it does

- Supports a structured Icelandic expression dataset with meaning, literal translation, and cultural context.
- Flips each card between Icelandic and English, with a pronunciation hint.
- Records whether a phrase was remembered and adjusts its mastery score.
- Prioritizes less-mastered phrases when the page reloads.
- Tracks phrase, review, and mastery totals.
- Adds custom phrases through an accessible modal form.
- Persists phrases and study progress in a local SQLite database.
- Supports the Space key for flipping cards and reduced-motion preferences.

## Tech stack

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS 4
- SQLite through `better-sqlite3`
- Next.js Server Actions for mutations

## Getting started

Requirements: Node.js 20.19+, 22.13+, or 24+ is recommended. The project was generated on Node.js 20.18, which produces a non-blocking engine warning from ESLint's dependencies.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other commands:

```bash
npm run lint
npm run build
npm start
```

## How studying works

1. Read the Icelandic phrase aloud.
2. Click the card or press Space to reveal its meaning.
3. Choose **Still learning** or **I remembered**.
4. The app schedules the next review and selects another expression from the active level.

Mastery ranges from 0 to 5. A remembered response adds one; a still-learning response subtracts one without going below zero. Cards at level 4 or higher count as mastered.

## Levels and spaced repetition

The 1,380 expressions are sorted by complexity and stored in 69 levels of exactly 20 cards. Level 1 starts with the simplest expressions; each subsequent level becomes progressively more complex. A new learner starts at level 1, and the current level is persisted in SQLite.

Within a level, selection is random and weighted:

- Cards whose review time has arrived are selected before cards scheduled for later.
- Lower-mastery cards receive extra weight.
- More complex cards receive a modest frequency boost of up to 60%.
- The card just reviewed is excluded when another card is available.

Successful reviews use expanding intervals of 10 minutes, 1 day, 3 days, 7 days, 14 days, and 30 days. A missed card returns after 2 minutes and resets its correct-answer streak. The next level unlocks automatically after all 20 cards in the active level reach mastery 2.

## Complexity scoring

Every expression has a deterministic complexity score from 1–100 stored in SQLite. This supports future creation of balanced study packs without conflating linguistic complexity with a learner's mastery.

- Word count is the main factor and contributes up to 65 points.
- Average word length contributes up to 16 points.
- The proportion of long words (nine or more characters) contributes up to 10 points.
- Total character count contributes up to 5 points.
- Slashes and parenthetical variants contribute up to 4 points.

Scores are recalculated when the database opens, assigned when a phrase is added, and included by the TSV importer. The formula lives in `src/lib/complexity.ts`.

## Project structure

```text
src/
├── app/
│   ├── actions.ts       # Server Actions for adds and reviews
│   ├── globals.css      # Tailwind import, tokens, and flip animation
│   ├── layout.tsx       # Fonts and site metadata
│   └── page.tsx         # Server-rendered dashboard data
├── components/
│   └── flashcard-app.tsx # Interactive study interface
└── lib/
    └── db.ts            # SQLite schema, seed data, and queries
data/
├── phrases.json         # Tracked seed collection
└── phrases.db           # Created automatically; ignored by Git
```

## SQLite data

The database is created at `data/phrases.db` on the first request. Its WAL companion files and the database itself are excluded from Git. On an empty database, the app loads the complete tracked collection from `data/phrases.json`, so fresh clones receive every source collection.

Set `SQLITE_PATH` to use another database location, which is useful for isolated tests or hosts with a persistent volume.

To replace the cards from a tab-separated export, use the columns `Phrase_IS`, `Literal_EN`, `Meaning_EN`, and `The_Why (Etymology/Context)`. An optional `Source` column supports mixed-source files. Then run:

```bash
npm run phrases:import -- path/to/phrases.tsv
```

The importer validates the headers and replaces the current phrase collection in one transaction. Rows without a `Source` value default to `Tilvitnun`. To set another default source for a file, pass it after the path:

```bash
npm run phrases:import -- path/to/phrases.tsv "Another source"
```

SQLite is intentionally local in this project. On serverless hosting, an instance filesystem is ephemeral, so production persistence requires a durable database service or a host with a persistent volume.

## Design

The interface is inspired by an Icelandic field notebook: glacial blue, volcanic ink, lichen green, and a restrained topographic texture. The large two-sided study card is the central interaction, with `Newsreader` for phrase display and Geist for interface text.

## Project records

- [HISTORY.md](./HISTORY.md) records user prompts and implementation summaries.
- [CHANGELOG.md](./CHANGELOG.md) records commits and noteworthy project changes.
