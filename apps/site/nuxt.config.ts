// W1913 site (DESIGN.md §3, §4a). SSR on the droplet under PM2.
// Settings come from w1913.config.ts at the repository root; change them there.
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import config from "../../w1913.config.ts";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
// The one W1913 version (root package.json); see CHANGELOG.md "How versions work".
const version = (JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8")) as { version: string }).version;
const t = config.theme;
const tokens = (v: Record<string, string>) => Object.entries(v).map(([k, c]) => `--${k}:${c}`).join(";");
// The colour tokens, generated from w1913.config.ts: light on :root, dark on .dark.
const themeCss = `:root{${tokens(t.light)}}.dark{${tokens(t.dark)}}`;

export default defineNuxtConfig({
  compatibilityDate: "2026-11-01",
  modules: ["@nuxt/ui"],
  css: ["~/assets/css/main.css"],
  devtools: { enabled: false },
  // Inter is self-hosted from public/fonts; the site never calls a font host.
  ui: { fonts: false },
  colorMode: { preference: t.default, fallback: t.default, storageKey: "w1913-theme" },
  // Icons come from the installed collection, served by this server; never
  // from the public Iconify API.
  icon: { serverBundle: { collections: ["lucide"] }, fallbackToApi: false },
  runtimeConfig: {
    // W1913_DB_PATH overrides this at runtime (rebuild.sh, dev.sh).
    dbPath: resolve(repoRoot, config.paths.devDatabase),
    // buildDate: when this release was built (dateModified in the structured data).
    public: { version, buildDate: new Date().toISOString().slice(0, 10) },
  },
  app: {
    head: {
      htmlAttrs: { lang: "en" },
      title: config.site.title,
      meta: [
        { name: "description", content: config.site.description },
        { name: "author", content: config.site.author.name },
        { property: "og:image", content: `${config.site.url}/og-image.png` },
        { property: "og:site_name", content: config.site.name },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      link: [
        { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
        { rel: "preload", as: "font", href: "/fonts/InterVariable-4.1-latin.woff2", type: "font/woff2", crossorigin: "" },
        { rel: "search", type: "application/opensearchdescription+xml", href: "/opensearch.xml", title: config.site.name },
      ],
      style: [{ key: "w1913-tokens", innerHTML: themeCss }],
    },
  },
  nitro: { preset: "node-server" },
  // Browser caching for files in public/. Fonts carry their version in the
  // file name, so they can be kept for a year; the rest for a day.
  routeRules: {
    "/fonts/**": { headers: { "cache-control": "public, max-age=31536000, immutable" } },
    "/favicon.svg": { headers: { "cache-control": "public, max-age=86400" } },
    "/og-image.png": { headers: { "cache-control": "public, max-age=86400" } },
    "/opensearch.xml": { headers: { "cache-control": "public, max-age=86400" } },
    "/robots.txt": { headers: { "cache-control": "public, max-age=86400" } },
  },
  devServer: { port: config.server.devPort },
  typescript: { strict: true },
  hooks: {
    // Browser bundle: libraries in their own chunks (Vue; Nuxt UI and reka-ui;
    // the rest), so a release that changes only the site's code leaves them
    // cached, and no chunk passes 500 kB. Client build only.
    "vite:extendConfig"(viteConfig, { isClient }) {
      if (!isClient) return;
      const vc = viteConfig as { build?: Record<string, unknown> };
      const build = (vc.build ??= {});
      build.rolldownOptions = {
        ...(build.rolldownOptions as object),
        output: {
          codeSplitting: {
            groups: [
              { name: "vue", test: /node_modules[\\/](?:@vue|vue|vue-router)[\\/]/, priority: 30 },
              { name: "ui", test: /node_modules[\\/](?:reka-ui|@nuxt[\\/]ui|@floating-ui|@internationalized|@tanstack|tailwind-variants|@vueuse)[\\/]/, priority: 20 },
              { name: "vendor", test: /node_modules[\\/]/, priority: 10 },
            ],
          },
        },
      };
    },
    // PM2 shows the version in the server's package.json, which Nitro writes
    // as 0.0.0; give it the W1913 version.
    "nitro:init"(nitro) {
      nitro.hooks.hook("compiled", () => {
        const file = resolve(nitro.options.output.serverDir, "package.json");
        if (!existsSync(file)) return;
        const pkg = JSON.parse(readFileSync(file, "utf8")) as { version?: string };
        pkg.version = version;
        writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n");
      });
    },
  },
});
