# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

The project has two version lines:

- **Site and code**: versioned with [Semantic Versioning](https://semver.org/), under the headings below.
- **Edition data**: `w1913-<version>.jsonl` releases (0.0, 0.1, … 1.0), one per layer, as listed in DESIGN.md §3a. Each data release gets its own entry here, marked **Data**.

Design history (Drafts 2–5.4) is kept in DESIGN.md §9.

## [Unreleased]

### Added

- DESIGN.md Draft 5.4: the design document, checked against the canonical Project Gutenberg file (#29765).
- KICKOFF.md: the Claude Code prompt for Phase 0.
- Static interface mockups in `docs/ui/`: the entry page (Phase 1 and complete) and the cards page.
- Social card, `assets/og-image.png`.
- README, LICENSE (MIT, code and docs), LICENSE-DATA (CC0 1.0, edition data), `.nvmrc` (Node 24), `.gitignore`.
- `rebuild.sh` and `ecosystem.config.cjs`: manual deploys to the droplet under PM2, with side-by-side releases, a canary check, and automatic rollback.
