# Project history

This file records user prompts and a concise summary of the work performed in response. Dates use the project session timezone (`Atlantic/Reykjavik`).

## 2026-08-05 — Initial application

### Prompt

> Create a new NextJS + Tailwind + SQLite app for learning phrases (in Icelandic) through flash cards

### Summary

- Scaffolded a greenfield Next.js 16 App Router project with TypeScript, Tailwind CSS 4, and ESLint.
- Added `better-sqlite3`, an automatically initialized phrase schema, and six seeded Icelandic phrases.
- Built a responsive flash-card study experience with flip interaction, pronunciation, categories, review scoring, progress statistics, keyboard support, and reduced-motion handling.
- Added a Server Action-powered form for saving custom phrases.
- Established an Icelandic field-notebook visual direction using glacial, volcanic, and lichen colors.
- Verified the implementation with a successful lint run and optimized production build.

## 2026-08-05 — Continue interrupted verification

### Prompt

> continue

### Summary

- Resumed without resetting completed work.
- Completed the React best-practices review.
- Confirmed both `npm run lint` and `npm run build` pass.

## 2026-08-05 — Project documentation

### Prompt

> Record every prompts and summary in a HISTORY.md file, record all commits and details in a CHANGELOG.md file, document the project in README.md

### Summary

- Added this chronological prompt and outcome record.
- Added a changelog with the existing scaffold commit and current unreleased application work.
- Replaced the starter README with project setup, usage, architecture, persistence, design, and verification documentation.

## 2026-08-05 — Structured expression dataset

### Prompt

> Use the attached data for the cards. One side is showing the Icelandic expression, the back of the card the english information (meaning en is the english equivalent, literal en is the literal translation, the why is the ethymology/context …)

The prompt included a large tab-separated collection under the columns `Phrase_IS`, `Literal_EN`, `Meaning_EN`, and `The_Why (Etymology/Context)`.

### Summary

- Expanded the SQLite phrase schema with meaning, literal translation, and etymology/context fields, including migration of existing databases.
- Redesigned the back of each flash card to present the three English information levels distinctly.
- Updated the add-phrase form for the richer content model.
- Added a transactional TSV importer with validation for the supplied column format.

## 2026-08-05 — Phrase sources

### Prompt

> Add a source column for these imports, which is "Tilvitnun". I'll import other expressions from other sources later

### Summary

- Added a source field to the SQLite schema, phrase model, flash-card back, and manual phrase form.
- Assigned `Tilvitnun` as the default source for the current dataset.
- Extended the TSV importer to accept an optional `Source` column or a per-import default source argument for future collections.

## 2026-08-05 — Tilvitnun dataset import

### Prompt

> Phrase_IS Literal_EN Meaning_EN The_Why (Etymology/Context) …

The prompt supplied the complete tab-separated Tilvitnun expression dataset inline.

### Summary

- Recovered the intact tab-separated payload from the local session record.
- Transactionally replaced the six starter cards with all 593 supplied expressions.
- Assigned `Tilvitnun` as the source and `Expressions` as the category for every imported row.
- Verified the imported count and the first and last expressions in SQLite.

## 2026-08-05 — Wiktionary dataset import

### Prompt

> import the following as "Wiktionary" source …

The prompt supplied 181 tab-separated Icelandic expressions with literal and idiomatic English translations.

### Summary

- Appended all 181 expressions without modifying the existing Tilvitnun collection.
- Assigned `Wiktionary` as the source and `Expressions` as the category for every new row.
- Preserved the empty etymology/context cells from the supplied data.
- Verified per-source and combined SQLite totals.

## 2026-08-05 — Visindavefir dataset import

### Prompt

> import the following as "Visindavefir" …

The prompt supplied 29 tab-separated expressions with literal translations, English meanings, and context notes.

### Summary

- Appended all 29 expressions while preserving the Tilvitnun and Wiktionary collections.
- Assigned `Visindavefir` as the source and `Expressions` as the category.
- Verified all three per-source totals and the combined SQLite total of 803 cards.

## 2026-08-05 — Mjólkursamsalan dataset import

### Prompt

> load the following as "Mjólkursamsalan" source …

The prompt supplied 418 Icelandic expressions without English or context values.

### Summary

- Appended all 418 expressions while preserving the three existing source collections.
- Assigned `Mjólkursamsalan` as the source and `Expressions` as the category.
- Preserved every expression exactly, including parenthetical and slash-separated variants.
- Left literal translation, English meaning, and context blank as supplied.
- Verified a combined SQLite total of 1,221 cards across four sources.

## 2026-08-05 — Íslensk orðtök dataset import

### Prompt

> load the following for "Íslensk orðtök" …

The prompt supplied 159 expressions with English meanings and context notes.

### Summary

- Appended all 159 expressions while preserving the four existing collections.
- Assigned `Íslensk orðtök` as the source and `Expressions` as the category.
- Preserved one intentionally blank literal-translation value from the supplied data.
- Verified a combined SQLite total of 1,380 cards across five sources.

## 2026-08-05 — Phase validation and integration

### Prompt

> You can validate that phase: you can branch, commit, merge into main and push

### Summary

- Created the `feat/icelandic-flashcards-data` branch.
- Exported all 1,380 database records to a tracked JSON seed so fresh clones reproduce the complete collection.
- Added configurable `SQLITE_PATH` support for isolated validation and persistent-volume deployments.
- Passed ESLint, TypeScript, a webpack production build, and fresh SQLite initialization with the exact five-source totals.
- Prepared the feature branch for commit and merge into `main`.
- Found no configured Git remote, so pushing requires a repository remote URL.

## 2026-08-05 — Bilingual card back

### Prompt

> can you show the icelandic expression above the meaning, so we can see both icelandic and english?

### Summary

- Added the Icelandic expression above the English meaning on the reverse of every card.
- Kept the English meaning as the dominant typographic element while clearly labeling both languages.
- Added a helpful fallback for cards whose English translation has not yet been supplied.

## 2026-08-05 — Expression complexity scoring

### Prompt

> Is it possible to calculate some "Complexity" score based on the number of words (main criteria), then complexity/length of words, any other criteria? Save that to databse for future packing of expressions

### Summary

- Added a deterministic 1–100 complexity score with word count as the primary factor.
- Added secondary weighting for average word length, long compounds, total characters, and structural variants.
- Added the SQLite column and automatic backfill for the complete collection.
- Integrated scoring into fresh seeds, manual phrase creation, and TSV imports.
- Documented the formula separately from learner mastery for future pack-building logic.

## 2026-08-05 — Visible complexity score

### Prompt

> Can you display the score in the card ?

### Summary

- Added a compact complexity badge to both sides of every flash card.
- Kept the score in the card header so it remains visible without competing with the phrase content.

## 2026-08-05 — Complexity levels and spaced repetition

### Prompt

> Spread the expressions into buckets of 20 expressions that match "levels" (from level 1 to 69), that are more and more complex (use complexity level of expressions). User starts at level 1, display level, rotate randomly through the 20 expressions (Spaced repetition so expressions are reviewed at the right intervals, most complex appear a bit more frequently)

### Summary

- Ranked all 1,380 expressions by complexity and persisted exactly 69 levels of 20 cards.
- Added persistent study state beginning at level 1 and displayed the active level and progress.
- Added weighted random selection prioritizing due, low-mastery, and slightly more complex cards.
- Added expanding review intervals, short retry intervals, correct-answer streaks, and automatic progression after all 20 cards reach mastery 2.
- Verified exact bucket sizes and increasing complexity from the first through the final level.

## 2026-08-05 — Temporary level navigation

### Prompt

> Add extra buttons to navigate the different levels (will be removed later, just for testing)

### Summary

- Added temporary previous and next controls beside the active level indicator.
- Persisted test navigation through a bounded Server Action so levels remain between 1 and 69.
- Disabled navigation at the first and final levels and labeled the controls for later removal.

## 2026-08-05 — Learning-system phase validation

### Prompt

> Validate phase

### Summary

- Created the `feat/complexity-levels-spaced-repetition` branch.
- Passed ESLint, standalone TypeScript checking, import-script syntax checking, whitespace validation, and a production webpack build.
- Initialized an isolated database from the tracked seed and verified 1,380 scheduled cards across exactly 69 levels of 20.
- Verified increasing complexity, a 14–73 score range, and the persisted level-1 starting state.
- Prepared the validated phase for commit and merge into `main`.
