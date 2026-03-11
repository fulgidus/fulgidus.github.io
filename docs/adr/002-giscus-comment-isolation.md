# ADR-002: Giscus Comment Isolation Strategy

**Status:** Accepted
**Date:** 2026-03-11
**Deciders:** Alessio Corsi

## Context

The site supports multiple languages (currently English and Italian) with a URL structure of `/posts/<slug>` for English and `/it/posts/<slug>` for Italian. The Giscus comments system maps page URLs to GitHub Discussions for comment storage.

When integrating Giscus with an i18n-enabled site, a key decision is whether comments should be:

1. **Shared across languages** — All language versions of the same post share one GitHub Discussion thread. A comment left on the English version appears on the Italian version and vice versa.
2. **Isolated per language** — Each language version has its own independent Discussion thread. Comments are separated by language.

### Considerations

| Factor | Shared | Isolated |
|--------|--------|----------|
| Community engagement | Higher — readers across languages see all comments | Lower — fragmented discussion |
| Context relevance | Risk of language mismatch (Italian comment on English page) | Comments always match the page language |
| Discussion volume | Concentrated — avoids empty-looking pages | Diluted — fewer comments per page |
| GitHub Discussions count | Fewer discussions (1 per post) | More discussions (1 per post per language) |
| Implementation complexity | Requires canonical path stripping | Simpler — use the full URL as-is |
| Maintenance burden | Low — one thread to moderate per post | Higher — multiple threads per post |

### Blog audience analysis

This is a personal technical blog with a relatively small audience. Most readers are developers who are comfortable with multilingual content. Fragmenting the already-small comment volume across language versions would make comment sections appear empty and reduce engagement.

## Decision

**Shared comments across languages**, implemented via:

- `data-mapping="specific"` — Uses an explicit term to map to a GitHub Discussion, rather than deriving it from the page URL or title.
- `data-term` set to the **canonical (language-stripped) path** — e.g., both `/posts/my-article` and `/it/posts/my-article` resolve to `/posts/my-article` as the discussion term.
- The Giscus **UI language** (`data-lang`) still matches the current page language, so the comment interface appears in the reader's language even though the discussion thread is shared.

### Implementation details

The canonical path is computed by `stripLangFromPath()` from `src/i18n/utils.ts`, which removes any recognized language prefix from the URL path. This function already exists for the i18n routing system and is reused here.

The `getCanonicalPath()` function in `GiscusComments.vue` calls `stripLangFromPath(window.location.pathname)` and passes the result as `data-term`.

When navigating between language versions via Astro View Transitions (`astro:page-load` event), only the Giscus UI language is updated via `postMessage` — the discussion thread remains the same because the canonical path is unchanged.

## Consequences

### Positive
- Comment sections appear more active — all comments are in one thread
- Cross-language community interaction is possible
- Fewer GitHub Discussions to manage
- Simpler moderation — one thread per post

### Negative
- Comments in one language may appear on a page in another language, which could confuse some readers
- If a post is significantly different between languages (not a direct translation), shared comments may lack context

### Mitigations
- GitHub Discussions support reactions and threading, so language-specific sub-conversations can form naturally
- If fragmentation ever becomes desirable (e.g., the blog gains a large non-English audience), switching to isolated comments requires only changing `getCanonicalPath()` to return the full pathname instead of stripping the language prefix — a one-line change

## References

- [Giscus configuration](https://giscus.app)
- [Giscus Advanced Usage — ISetConfigMessage](https://github.com/giscus/giscus/blob/main/ADVANCED-USAGE.md#isetconfigmessage)
- `src/components/GiscusComments.vue` — Implementation with inline documentation
- `src/i18n/utils.ts` — `stripLangFromPath()` and `getGiscusLocale()` utilities
