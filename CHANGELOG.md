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

### Changed

- Replaced the default Create Next App screen, global styles, metadata, and layout.
- Configured the home route for dynamic rendering so SQLite updates are reflected on request.
- Extended `.gitignore` to exclude local SQLite database and WAL files.
- Redesigned card backs and the phrase form around the richer expression dataset.
- Defaulted the current expression collection to the `Tilvitnun` source while allowing future import-specific sources.

### Dependencies

- Added `better-sqlite3` 12.11.1.
- Added `@types/better-sqlite3` 9.6.0.

### Verification

- `npm run lint` passes.
- `npm run build` passes with Next.js 16.3.0 and Turbopack.
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
