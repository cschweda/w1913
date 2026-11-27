![w1913.com: W for Webster's, 1913 for the Revised Unabridged edition. A dictionary for writers.](assets/og-image.png)

[![Code: MIT](https://img.shields.io/badge/code-MIT-111111.svg)](LICENSE)
[![Data: CC0 1.0](https://img.shields.io/badge/data-CC0%201.0-111111.svg)](LICENSE-DATA)
[![Node 24](https://img.shields.io/badge/node-24-111111.svg)](.nvmrc)
[![Status: Phase 0](https://img.shields.io/badge/status-phase%200-c8102e.svg)](DESIGN.md#6-phases)

# W1913

A writer's tool built on *Webster's Revised Unabridged Dictionary* (1913, ed. Noah Porter), parsed from Project Gutenberg's public-domain plain-text edition.

The 1913 Webster's is loved for its discursive definitions, its literary quotations, and its short essays on how near-synonyms differ. Existing sites show it as a lookup box and a block of text. W1913 treats it as structured data and builds what that structure makes possible.

**Status: Phase 0.** Nothing is built yet. This repository holds the design, the mockups, and the kickoff prompt for the first phase of work. Planned home: `w1913.com`.

## What it will do

| A writer asks | W1913 answers with |
|---|---|
| What does this word really mean? | A readable entry, one step from the address bar: `w1913.com/sublime` |
| Is there a better word? | A thesaurus view, with the dictionary's own essays on how near-synonyms differ |
| What's the word for…? | Search inside definitions |
| I need a word with this rhythm. | Filters by syllable count and stress pattern |
| Would my 1890s narrator say this? | A period check: paste a passage, see which words this dictionary does not contain |
| How did the masters use it? | Quotations, searchable and browsable by author |
| Show me something I didn't know I wanted. | Browsing by label: obsolete, poetic, nautical, heraldic |
| Teach me a word. | Cards: decks drawn at random, by label, by search, or from your own lists |
| What sits next to it, and how did I get here? | The neighbouring entries, as on the printed page, and a trail of the words you visited |

## How it is built

Two packages in one pnpm workspace:

- **`packages/data`** turns Project Gutenberg eBook #29765 into a versioned, layered edition of the dictionary: `w1913-<version>.jsonl`, one entry per line. Each phase adds one layer (senses, synonyms, labels, prosody, quotations).
- **`apps/site`** is a Nuxt 4 site that imports a pinned edition release into SQLite with full-text search and serves it.

Every published word comes from #29765, which Project Gutenberg catalogues as public domain. The older tagged edition (#660–670) is used only to measure the parser's accuracy and never supplies data. DESIGN.md §2 explains why.

## Documents

- [DESIGN.md](DESIGN.md): scope, sources, data model, interface, accessibility, and phases. The source of truth.
- [KICKOFF.md](KICKOFF.md): the Claude Code prompt for Phase 0.
- [docs/ui/](docs/ui/): static mockups of the entry page and the cards page. Open them in a browser.
- [CHANGELOG.md](CHANGELOG.md)

## Development

Requires Node 24 (`nvm use`) and pnpm. Setup instructions arrive with the Phase 0 scaffold.

The canonical source is not committed. The download step fetches it, or uses a copy placed by hand at `cache/sources/29765.txt`, and verifies its SHA-256 either way.

## Deploying

The site runs under PM2 on a Forge-provisioned DigitalOcean droplet. After a push to `main`, on the droplet:

```bash
cd ~/w1913.com          # the checkout
./rebuild.sh --check    # preflight only
./rebuild.sh            # build a release, test it on a spare port, switch, health-check
./rebuild.sh --rollback # back to the previous release
```

`./rebuild.sh --help` lists the settings. DESIGN.md §3 "Deploying" explains the release layout.

## Licence

- Code, documentation, and design: [MIT](LICENSE).
- The published edition: [CC0 1.0](LICENSE-DATA). The 1913 text is in the US public domain; CC0 covers this project's tagging and corrections.

W1913 is independent of websters1913.com, Merriam-Webster, and every other dictionary site.
