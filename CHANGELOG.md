# Changelog

All notable changes and repository commits are documented here. This project follows the spirit of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and uses Git commit identifiers as the source of truth.

## [Unreleased]

### Added

- SQLite phrase storage with automatic schema creation, WAL mode, and initial Icelandic seed content.
- Server Actions for adding phrases and recording remembered/still-learning reviews.
- Responsive flash-card study interface with two-sided card animation.
- Pronunciation hints, categories, mastery scoring, review totals, and study progress.
- Add-phrase modal with required-field validation and keyboard-accessible controls.
- Icelandic field-notebook design system with optimized Newsreader and Geist fonts.
- Project history, changelog, and comprehensive README documentation.
- Structured meaning, literal translation, and etymology/context fields for every phrase.
- Transactional `phrases:import` command for the supplied four-column TSV format.
- Phrase source attribution across SQLite, imports, card details, and manual entry.
- Tracked 1,380-card JSON seed dataset for reproducible database initialization.
- Stored 1–100 expression complexity scores for future balanced pack generation.

### Changed

- Replaced the default Create Next App screen, global styles, metadata, and layout.
- Configured the home route for dynamic rendering so SQLite updates are reflected on request.
- Extended `.gitignore` to exclude local SQLite database and WAL files.
- Redesigned card backs and the phrase form around the richer expression dataset.
- Defaulted the current expression collection to the `Tilvitnun` source while allowing future import-specific sources.
- Card backs now show the Icelandic expression directly above its English meaning for bilingual reference.
- Both sides of each card now display its stored complexity score.
- Expressions are organized into 69 persisted complexity levels of exactly 20 cards.
- Study sessions use weighted random spaced repetition and automatic level progression.
- Added temporary bounded previous/next level navigation for testing.
- Added a complete expression admin with search, filters, sorting, pagination, detailed editing, record creation, and editorial statuses.
- Added structured OpenAI and Gemini translation drafts through Vercel AI Gateway with model attribution and mandatory review status.
- Added documented `.env.example` and ignored `.env.local` environment templates.
- Admin filters and sorting now persist between visits, source counts are faceted, and filters can be cleared in one action.
- Added an editorial statistics dashboard with translation, review, completeness, source, and level progress views.
- Added multi-select batch translation from the admin list with bounded concurrency, provider selection, and per-batch results.
- SQLite initialization now serializes schema migration, seeding, complexity scoring, and level assignment across concurrent Next.js workers.

### Dependencies

- Added `better-sqlite3` 12.11.1.
- Added `@types/better-sqlite3` 9.6.0.

### Verification

- `npm run lint` passes.
- `npm run build` passes with Next.js 16.3.0 and Turbopack.
- The dynamic statistics route passes a fresh-database webpack build, and its source and level aggregates reconcile to all 1,380 expressions.
- SQLite contains all 593 supplied Tilvitnun expressions, from `Að aka seglum eftir vindi` through `Þyrnir í augum`.
- SQLite contains 181 Wiktionary expressions in addition to the Tilvitnun collection, for 774 cards total.
- SQLite contains 29 Visindavefir expressions, bringing the three-source collection to 803 cards total.
- SQLite contains 418 Mjólkursamsalan expressions with untranslated English fields, bringing the four-source collection to 1,221 cards total.
- SQLite contains 159 Íslensk orðtök expressions, bringing the five-source collection to 1,380 cards total.

## Commit history

### `89f05e1` — Initial commit from Create Next App

- Created the Next.js 16.3.0 application baseline.
- Enabled the App Router, TypeScript, Tailwind CSS 4, ESLint, the `src` directory layout, and the `@/*` import alias.
- Added the standard Create Next App assets and configuration.

### `feat: build Icelandic phrase flashcards with sourced datasets`

- Implements the complete application and the sourced 1,380-card seed collection described under **Unreleased**.
- Validated with ESLint, TypeScript, a production build, and isolated fresh-database initialization.

### `feat: add complexity levels and spaced repetition`

- Adds bilingual card details, persisted complexity scoring, 69 study levels, weighted spaced repetition, automatic progression, and temporary level navigation.
- Validated against a fresh 1,380-card database with exact level sizes and monotonic complexity ordering.

### `feat: add expression administration and AI translation workflow`

- Adds the expression admin, editorial statuses, remembered faceted filters, detailed editing, record creation, environment templates, and structured OpenAI/Gemini translation drafts.
- Hardens fresh SQLite initialization against concurrent build workers.
- Validated with ESLint, TypeScript, whitespace checks, a production build, and isolated database initialization.

### `feat: add translation progress statistics dashboard`

- Adds a live editorial dashboard for translation status, review status, publish readiness, field completeness, source progress, and level coverage.
- Links every actionable dashboard segment back to the corresponding filtered administrative records.
- Uses request-time rendering so the statistics always reflect the current SQLite database.

### `feat: add bulk expression translation`

- Adds page-level multi-selection and select-visible controls to the expression list.
- Sends up to 50 selected records to OpenAI or Gemini in bounded concurrent groups and stores successful results as drafts requiring review.
- Preserves active filters after processing and reports successful and failed records without overwriting failures.

### `fix: restore original values for translated records`

- Adds a transactional `phrases:restore-originals` command for the 20 requested expressions.
- Restores tracked source values and resets those records to imported `translated` / `unreviewed` state.

### `chore: add SQLite backup command`

- Adds `npm run phrases:backup` to create timestamped backups under `data/backup/`.
- Verifies the initial backup with SQLite integrity and collection-count checks; local backup files remain ignored by Git.

### `fix: show batch translation progress`

- Adds per-expression translation actions so selected batches can show actual completion counts.
- Displays an accessible determinate progress bar with completed/total count and percentage, including failed requests.

### `feat: add partly missing translation status`

- Adds `partly_missing` for records with one or two empty translation fields.
- Applies the rule consistently to database migrations, editor saves, new records, imports, restores, filters, and statistics.

### `feat: choose fields for batch translation`

- Adds the same Meaning, Literal translation, and Why/context picker to multi-expression translation.
- Preserves unchecked fields while processing up to 50 selected expressions.

### `fix: show batch progress after field selection`

- Closes the field picker immediately when generation starts.
- Keeps the per-expression completion percentage visible while the batch runs.

### `fix: synchronize filter controls after navigation`

- Remounts the admin filter form when URL-derived filters change.
- Ensures active translation, review, level, source, search, and sort values are visibly selected.

### `merge: validate admin translation workflow`

- Validated lint, TypeScript, production build, and diff integrity.
- Merged the feature branch into `main`.

### `feat: add Icelandic pronunciation audio`

- Adds editor upload, preview, replacement, and removal for audio recordings.
- Stores the audio URL in SQLite and provides a Listen/Pause control on study cards.
- Validates common audio formats and limits uploads to 15 MB; local audio files are ignored by Git.

### `feat: add audio controls to expression list`

- Adds compact play/pause buttons to the left of expressions that have pronunciation audio.

### `fix: align audio controls in expression list`

- Gives audio controls their own centered table column for consistent row alignment.

### `feat: add level quiz mode`

- Adds 20-question multiple-choice quizzes for the active level.
- Uses two distractors from the same level, gives immediate feedback, and requires 80% to advance.

### `fix: stabilize quiz layout width`

- Uses a fixed single-column quiz container so question content does not resize the display.

### `feat: add expression archive workflow`

- Adds SQLite archive state, an `/admin/archive` page, and Archive/Un-archive controls in list and detail views.
- Excludes archived expressions from study cards, quizzes, active levels, and statistics.
- Trims search values before querying.

### `fix: confirm archive actions`

- Adds a shared confirmation modal before archiving or un-archiving from list and detail views.

### `fix: align archive row actions`

- Keeps Edit and Archive/Un-archive controls on one horizontal action row.

### `chore: validate archive workflow and backup database`

- Validated lint, TypeScript, production build, and archive route generation.
- Created an integrity-checked SQLite backup under `data/backup/`.

### `feat: generate Icelandic audio with Google Cloud TTS`

- Adds a confirmation modal and editor button for generating Icelandic MP3 audio.
- Sends only the expression text to Google Cloud Text-to-Speech using `GOOGLE_TTS_API_KEY`.
- Saves generated audio locally, updates SQLite, and removes a replaced local recording.

### `feat: add batch Google TTS generation`

- Adds a confirmation modal and progress percentage for selected expressions.
- Generates audio in small concurrent groups, reports failures, and refreshes the list when complete.

### `fix: filter expressions without audio`

- Adds `Without audio` to the translation filter dropdown.
- Improves contrast for the batch Generate audio action.

### `feat: add slow flashcard audio playback`

- Adds a 0.5× playback option next to the flashcard Listen button.
- Keeps normal speed as the default and applies the selected rate on playback.
- Labels the controls Normal and Slow, with Slow using a 0.7× playback rate.

### `feat: add audio controls to quiz cards`

- Adds Listen/ Pause and Normal/Slow controls to quiz questions with audio.
- Keeps the quiz card layout fixed while positioning controls inside the card.

### `fix: prevent flashcard content overflow`

- Keeps long English notes inside the fixed card height with an internal scroll area.
- Prevents rating controls from being overlapped by card content.
