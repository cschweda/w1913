// Structured data (schema.org JSON-LD) and page metadata defaults, so search
// engines and AI systems can tell what each page is, who made it, and when
// it changed. Built from w1913.config.ts.
import config from "../../../w1913.config.ts";

const site = config.site;

/** The dictionary itself, as a printed book: the source every entry belongs to. */
export const DICTIONARY_BOOK = {
  "@type": "Book",
  name: "Webster's Revised Unabridged Dictionary",
  datePublished: "1913",
  editor: { "@type": "Person", name: "Noah Porter" },
  publisher: { "@type": "Organization", name: "G. & C. Merriam Co." },
  inLanguage: "en",
  sameAs: site.source.url,
};

export const PUBLISHER = { "@type": "Person", name: site.author.name, url: site.author.url };

/** The site as a whole, with its search (the browser search-engine address). */
export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${site.url}/#website`,
    name: site.name,
    url: `${site.url}/`,
    description: site.description,
    inLanguage: "en",
    publisher: PUBLISHER,
    isBasedOn: DICTIONARY_BOOK,
    license: "https://creativecommons.org/publicdomain/zero/1.0/",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${site.url}/w/go?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

/** A page of the site: its address, dates, and maker. `type` is WebPage, AboutPage, CollectionPage... */
export function webPageLd(opts: { url: string; name: string; description: string; modified: string; type?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": opts.type ?? "WebPage",
    "@id": opts.url,
    url: opts.url,
    name: opts.name,
    description: opts.description,
    inLanguage: "en",
    isPartOf: { "@id": `${site.url}/#website` },
    author: PUBLISHER,
    datePublished: site.launched,
    dateModified: opts.modified,
  };
}

/** An entry page: a defined term in the 1913 dictionary, on its own web page. */
export function definedTermLd(opts: { url: string; headword: string; description: string; modified: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    "@id": `${opts.url}#term`,
    name: opts.headword,
    description: opts.description,
    url: opts.url,
    inDefinedTermSet: { "@type": "DefinedTermSet", name: DICTIONARY_BOOK.name + " (1913)", url: `${site.url}/`, isBasedOn: DICTIONARY_BOOK },
    mainEntityOfPage: webPageLd({ url: opts.url, name: opts.headword, description: opts.description, modified: opts.modified }),
  };
}

/** A JSON-LD <script> for useHead; `key` lets a page replace the default. */
export function ldScript(data: unknown, key: string) {
  return { key, type: "application/ld+json" as const, innerHTML: JSON.stringify(data).replace(/</g, "\\u003c") };
}
