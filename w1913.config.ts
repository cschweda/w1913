// =============================================================================
// w1913.config.ts — the one place to change W1913's main settings.
// =============================================================================
//
// Who reads this file
//   - The site (apps/site): nuxt.config.ts, the server routes, the pages.
//   - The database import (apps/site/scripts/db-import.ts).
//   - pnpm dev (scripts/dev.sh) and the droplet deploy (rebuild.sh), through
//     scripts/config-get.ts, which prints a single value.
//   - ecosystem.config.cjs (PM2) does NOT read it directly: rebuild.sh reads
//     the values here and passes them to PM2 as environment variables.
//
// How to change a setting
//   1. Edit the value below. Keep the shape (names, nesting, types) as it is.
//   2. Run `pnpm test` and `pnpm typecheck`. Most mistakes fail there.
//   3. Commit and push to main, then deploy (Forge "Deploy" or ./rebuild.sh).
//      Settings take effect on the next deploy, not before.
//
// What NOT to change here
//   - Anything marked "DO NOT CHANGE" below: those values are baked into
//     published URLs, the edition, or the droplet, and changing them breaks
//     links or deploys. Each says why.
//   - Rules about the dictionary text itself (how entries are split, folded,
//     or linked). Those live in packages/data with their tests, and a change
//     there is a new parser version, not a setting.
//   - Secrets. This file is public on GitHub. W1913 has no secrets; if one is
//     ever needed, it goes in the droplet's environment, never here.
//
// Environment variables still win
//   rebuild.sh and dev.sh accept the W1913_* variables documented in
//   `./rebuild.sh --help` (W1913_PORT, W1913_DEPLOY_ROOT, ...). Use them for a
//   one-off override on one machine; change this file for a lasting change.
// =============================================================================

export const config = {
  // ---------------------------------------------------------------------------
  // The site's identity: page titles, link previews, the About page.
  // Safe to change at any time. Takes effect on the next deploy.
  // ---------------------------------------------------------------------------
  site: {
    /** Short name, used in page titles ("Sublime · W1913"). */
    name: "W1913",
    /**
     * The public address, without a trailing slash. Used for canonical links,
     * link previews, and the browser search-engine file (opensearch.xml).
     * Change it only if the site really moves to another domain.
     */
    url: "https://w1913.com",
    /** Title of the home page and of link previews for it. */
    title: "W1913: Webster's 1913, for writers",
    /**
     * Default meta description (search results, link previews, AI summaries)
     * for pages without their own. Keep it between 80 and 155 characters.
     */
    description:
      "Webster's Revised Unabridged Dictionary (1913), read the way a writer reads it: definitions, etymologies, synonyms, and essays on near-synonyms.",
    /**
     * The site's maker: <meta name="author"> and the publisher in the
     * structured data. Change or empty it here; it appears on every page.
     */
    author: { name: "Christopher Schweda", url: "https://metaincognita.com" },
    /** The day w1913.com first went live (datePublished in the structured data). DO NOT CHANGE. */
    launched: "2026-11-27",
    /** The source repository, linked from the footer and the About page. */
    repo: "https://github.com/cschweda/w1913",
    /**
     * The canonical source text, linked from the About page and the footer.
     * DO NOT CHANGE the eBook number: every word on the site comes from it
     * (DESIGN.md §2), and its checksum is pinned in packages/data/checksums.json.
     */
    source: { name: "Project Gutenberg eBook #29765", url: "https://www.gutenberg.org/ebooks/29765" },
    /** The maker's workshop of apps, linked from the footer. */
    workshop: { name: "Metaincognita Workshop", url: "https://metaincognita.com" },
    /**
     * Words offered as examples on the home page. They must be headwords in
     * the 1913 dictionary (a test checks each against the pinned edition);
     * modern coinages such as "petrichor" (1964) are not.
     */
    examples: ["sublime", "saunter", "amanuensis", "susurrus", "gossamer", "lambent"],
  },

  // ---------------------------------------------------------------------------
  // The edition the site serves (DESIGN.md §3a).
  // ---------------------------------------------------------------------------
  edition: {
    /**
     * The data release the site pins. db:import refuses any other, so the site
     * never changes data by accident. Raise it (for example to "0.3") only when
     * the site has a feature that needs the new release's layer, and only to a
     * version packages/data/src/edition/build.ts can build (its RELEASES list).
     * A wrong value fails the deploy at the import step; the live site is
     * unaffected.
     */
    version: "0.6",
  },

  // ---------------------------------------------------------------------------
  // Network ports on the droplet and on your machine.
  // ---------------------------------------------------------------------------
  server: {
    /**
     * The port the site listens on in production. nginx on the droplet proxies
     * to it (Forge site 3524816, site.conf: proxy_pass http://127.0.0.1:3913).
     * If you change it, change nginx IN THE SAME DEPLOY, or the site goes down.
     * Must not collide with other apps on the droplet (pictures uses 3100).
     */
    port: 3913,
    /**
     * A spare port where rebuild.sh test-runs each new release before it goes
     * live. Must differ from `port` and be free on the droplet. Never exposed
     * by nginx.
     */
    canaryPort: 3914,
    /** The port `pnpm dev` uses on your machine. Change freely. */
    devPort: 3913,
    /** DO NOT CHANGE: the site listens only on the droplet itself; nginx is the public face. */
    host: "127.0.0.1",
  },

  // ---------------------------------------------------------------------------
  // Files, relative to the repository root.
  // DO NOT CHANGE the cache/ paths without also changing .gitignore, dev.sh,
  // rebuild.sh and the KICKOFF deploy contract: cache/ is gitignored, and
  // cache/sources holds the hand-placed canonical text, which must never be
  // committed or deleted.
  // ---------------------------------------------------------------------------
  paths: {
    /** The dictionary database built by db:import, for `pnpm dev`. (rebuild.sh puts it inside each release.) */
    devDatabase: "cache/db/w1913.sqlite",
    /** Built edition releases (packages/data writes them, db:import reads them). */
    editions: "cache/editions",
  },

  // ---------------------------------------------------------------------------
  // Deploying to the droplet (rebuild.sh, DESIGN.md §3 "Deploying").
  // ---------------------------------------------------------------------------
  deploy: {
    /**
     * Where releases live on the droplet, under the forge user's home.
     * DO NOT CHANGE once the site is live: PM2 runs `<root>/current`, and a new
     * root strands the running release. If it must move, change it, deploy,
     * then delete the old directory by hand.
     */
    root: "~/w1913-deploy",
    /** How many past releases to keep for rollback. More costs disk (~250 MB each). Minimum 2. */
    keepReleases: 5,
    /**
     * Paths every new release must answer with 200 before it goes live, and
     * again once it is live. Add a path when a new page type ships. Every path
     * must work on every deploy, or every deploy fails safe and rolls back.
     */
    smokePaths: ["/", "/sublime"],
    /** PM2 restarts the site if it uses more memory than this. The droplet has 4 GB. */
    maxMemory: "450M",
    /** Deploy logs on the droplet (the last 30 runs are kept). */
    logDir: "~/deploy-logs/w1913",
    /** DO NOT CHANGE: the PM2 process name; rebuild.sh only ever touches this name, so other apps are safe. */
    pm2Name: "w1913",
  },

  // ---------------------------------------------------------------------------
  // How the interface behaves (DESIGN.md §4). Safe to tune.
  // ---------------------------------------------------------------------------
  features: {
    /** Words kept in the trail (the words visited in this tab). DESIGN.md says 12. */
    trailMax: 12,
    /** Neighbors shown on each side of the current word in the rail. DESIGN.md says 5. */
    neighbors: 5,
    /** Autocomplete suggestions shown under the search box. */
    suggestions: 8,
    /** "Did you mean" suggestions on a page for a word that is not in the dictionary. */
    didYouMean: 6,
    /** Milliseconds to wait after typing before asking for suggestions. */
    suggestDelayMs: 120,
    /**
     * Unusual-word previews: a word in a definition is marked when it is a
     * headword used in at most this many entries' definitions. 3 marks about
     * 9% of senses. Higher marks more; the database must be re-imported.
     */
    unusualMaxEntries: 3,
    /** At most this many unusual words are marked in one sense. */
    unusualPerSense: 2,
    /**
     * In a short definition (six words or fewer, like "The yaffle."), the
     * meaning rests on its few words, so a looser limit applies: a word is
     * linked when at most this many entries' definitions use it. 40 links
     * yaffle (16), chaise and burdock, and skips rough, talk and plant.
     * Raise it to link more ordinary words; lower it for fewer.
     */
    unusualShortMaxEntries: 40,
    /** Milliseconds to wait before showing a preview on pointer hover. */
    previewDelayMs: 250,
    /** Cards in a deck (DESIGN.md says 20). The trail deck holds at most this many too. */
    deckSize: 20,
    /** Results per page of definition search and label pages. */
    resultsPerPage: 30,
  },

  // ---------------------------------------------------------------------------
  // Route words the site uses for its own pages (DESIGN.md §3, "URLs").
  // An entry whose slug is one of these lives at /w/<word> instead of /<word>.
  // ADD a word here BEFORE shipping a page at that address (for example "cards"
  // before the cards page); otherwise the entry for that word owns the URL.
  // DO NOT REMOVE a word once its page is live: links to /w/<word> would move.
  // ---------------------------------------------------------------------------
  reservedWords: ["search", "author", "label", "synonyms", "check", "cards", "about", "data", "w"],

  // ---------------------------------------------------------------------------
  // Caching of pages and lookups by browsers and nginx, in seconds.
  // Higher is faster and lighter on the droplet; lower shows corrections
  // sooner. Deploys empty the nginx cache anyway.
  // ---------------------------------------------------------------------------
  cache: {
    entrySeconds: 300,
    suggestSeconds: 3600,
  },

  // ---------------------------------------------------------------------------
  // Theme: the colour tokens of DESIGN.md §4a. The site turns these into CSS
  // variables at build time.
  // If you change a colour, keep its contrast against --bg at or above the
  // ratio in the comment (WCAG 2.2 AA), and re-run the accessibility check
  // (axecap/contrastcap). `ln` is decorative only and is never a control's
  // edge, so it has no minimum.
  // ---------------------------------------------------------------------------
  theme: {
    /** The theme a first-time visitor sees: "dark" or "light". Visitors can switch; their choice is remembered. */
    default: "dark" as "dark" | "light",
    dark: {
      bg: "#0d0d0d", // page ground
      fg: "#f2f2f2", // text, strong rules (17.4:1; keep >= 7)
      mu: "#a3a3a3", // secondary text (7.7:1; keep >= 4.5)
      ln: "#303030", // hairline rules (decorative)
      ac: "#ff5a47", // accent (6.3:1; keep >= 4.5)
      on: "#0d0d0d", // text on an accent fill (6.3:1 on ac; keep >= 4.5)
    },
    light: {
      bg: "#fafafa",
      fg: "#111111", // 18.1:1
      mu: "#595959", // 6.7:1
      ln: "#d0d0d0",
      ac: "#c8102e", // 5.6:1
      on: "#ffffff", // 5.9:1 on ac
    },
  },
} as const;

export type W1913Config = typeof config;
export default config;
