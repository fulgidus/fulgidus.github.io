# ADR-001: i18n Architecture Redesign

**Status:** Accepted
**Date:** 2026-03-10
**Deciders:** Alessio Corsi

## Context

The site currently uses a hand-rolled i18n system with these pain points:

1. **Full page duplication**: 13 page files are duplicated between `src/pages/` (EN) and `src/pages/it/` (IT). Most differ by only 1-6 lines (a `lang` parameter). This totals ~1,200 lines of nearly-identical code.
2. **Content image duplication**: ~32 images are duplicated between `src/content/blog/<topic>/` and `src/content/blog/it/<topic>/`.
3. **Fragile language switching**: `LanguageDropdown.vue` uses runtime `HEAD` fetch requests to check if a translation URL exists before navigating.
4. **Hardcoded static page pairs**: `hreflang.ts` maintains a manual `STATIC_PAGE_PAIRS` map that must be updated whenever pages are added.
5. **No `lang` in content schema**: Language is inferred from directory structure (`it/` prefix in slugs), not from frontmatter metadata.

### Current Architecture

```
src/pages/
  index.astro              # EN home (167 lines of hardcoded prose)
  blog/[...path].astro     # EN blog listing
  posts/[...slug].astro    # EN post detail
  tags/index.astro         # EN tags
  tags/[tag]/[...page].astro
  projects/index.astro
  search.astro             # 335 lines (325 identical to IT)
  cv/index.astro           # 474 lines of standalone HTML
  rss.xml.ts
  last-ten.xml.ts
  [...slug].astro          # generic pages
  it/                      # FULL DUPLICATE TREE
    index.astro            # IT home (172 lines of hardcoded prose)
    blog/[...path].astro   # differs by 6 lines from EN
    posts/[...slug].astro  # differs by ~10 lines
    ...etc (13 files total)

src/content/blog/
  <topic>/index.md + images  # EN posts
  it/<topic>/index.md + images  # IT posts (images duplicated)
```

Language detection: `getLangFromSlug(slug)` checks if the first path segment is a valid language code.

Astro's built-in i18n is now enabled with `prefixDefaultLocale: false` (EN at `/`, IT at `/it/`).

## Decision

### Strategy: Parameterized Pages + Content Layer Improvements

We will eliminate page duplication via **language-parameterized page generation** while keeping the existing URL structure intact. Content collections get a `lang` schema field. Images are shared via a convention. The language switcher gets a build-time translation map.

### 1. Dynamic Page Generation (eliminate folder duplication)

**Approach:** Each page file generates routes for ALL active languages using `getStaticPaths()`.

For pages that only differ by `lang` parameter (11 of 13 pairs), a single file replaces both EN and IT versions.

```
src/pages/
  blog/[...path].astro          # generates /blog/* AND /it/blog/*
  posts/[...slug].astro         # generates /posts/* AND /it/posts/*
  tags/index.astro              # generates /tags AND /it/tags
  tags/[tag]/[...page].astro    # generates /tags/foo AND /it/tags/foo
  projects/index.astro          # generates /projects AND /it/projects
  search.astro                  # generates /search AND /it/search
  rss.xml.ts                    # generates /rss.xml AND /it/rss.xml
  last-ten.xml.ts               # generates both feeds
  posts/[...slug]/[file].ts     # generates both
  [...slug].astro               # generates both
```

**Pattern for `getStaticPaths()`:**

```typescript
import { getActiveLanguages } from '@/i18n/utils';
import { defaultLang } from '@/i18n/ui';

export async function getStaticPaths() {
  const languages = getActiveLanguages(); // ['en', 'it']
  const paths = [];

  for (const lang of languages) {
    const posts = await getPosts({ lang });
    for (const post of posts) {
      paths.push({
        params: {
          slug: lang === defaultLang
            ? removeLangFromSlug(post.slug)
            : `${lang}/${removeLangFromSlug(post.slug)}`
        },
        props: { post, lang }
      });
    }
  }
  return paths;
}

// In template:
const { post, lang } = Astro.props;
const t = useTranslate(lang);
```

**Key constraint:** EN paths remain unprefixed (`/posts/foo`), IT paths get `/it/posts/foo`. This matches `prefixDefaultLocale: false`.

**For search.astro** (which has 325 lines of duplicated CSS/JS): the page generates both `/search` and `/it/search`. The ~10 translated strings are injected via `useTranslate(lang)`. The CSS and JS are written once.

#### Content-heavy pages: homepage and CV

The homepage (`index.astro`) and CV (`cv/index.astro`) contain extensive translated prose (not translation keys). These CANNOT be trivially parameterized.

**Approach for homepage:** Extract translated content blocks into `src/i18n/` content files or markdown partials. The page template renders the appropriate content based on `lang`. Alternatively, keep both files but extract shared CSS/layout into a component.

**Approach for CV:** This is a standalone HTML page (~474 lines) with ~160 lines of shared CSS. Extract the CSS to a shared stylesheet. The translated content stays in per-language files (this is acceptable since CVs genuinely differ by language). Keep `src/pages/cv/index.astro` (EN) and `src/pages/it/cv/index.astro` (IT) but refactor shared CSS into `src/styles/cv.css`.

**Decision:** Homepage and CV remain as separate per-language files. They are the only 2 files where this is justified (prose-heavy, genuinely different content). All other 11 pairs are unified.

### 2. Content Collection Refactor

**Add `lang` to the Zod schema:**

```typescript
const blog = defineCollection({
  schema: ({ image }) => z.object({
    // ... existing fields ...
    lang: z.enum(['en', 'it']).default('en'),
  }),
});
```

This makes language explicit in the data layer rather than inferred from directory structure. The `getPosts()` function can filter on `data.lang` instead of `getLangFromSlug(slug)`.

**Add `translationOf` field:**

```typescript
translationOf: z.string().optional(), // slug of the canonical (EN) post
```

Italian posts reference their English counterpart: `translationOf: "Auto-Dino"`. This creates an explicit link between translations, enabling:
- Build-time translation map generation (for language switcher)
- Hreflang generation without hardcoded maps
- Query: "find all translations of post X"

**Directory structure stays the same** (`src/content/blog/it/<topic>/`) for now. The `it/` prefix convention is still useful for content organization, but language is now authoritative from frontmatter, not from the path.

### 3. Shared Image Assets

**Problem:** Italian posts duplicate cover images from English posts (~32 images, potentially MBs of wasted space).

**Approach:** Italian posts reference English post images using relative paths:

```yaml
# src/content/blog/it/Auto-Dino/index.md
image: ../../Auto-Dino/cover.png  # references EN post's image
```

This requires NO code changes -- Astro's image optimization already resolves relative paths from the content file's location. The IT post directory only contains the `.md` file; images live in the EN directory.

**Migration:** For each IT post that has a duplicate image, replace the local image with a `../../<en-topic>/<image>` reference and delete the duplicate file.

**Constraint:** Posts that have IT-specific images (e.g., localized screenshots) keep their own images. Only truly identical images are shared.

### 4. Language Switcher Upgrade

**Replace HEAD fetch with build-time translation map.**

Create a utility that generates a `translationMap` at build time:

```typescript
// src/utils/translations.ts
export async function getTranslationMap(): Promise<Map<string, Map<Languages, string>>> {
  const posts = await getCollection('blog');
  const map = new Map<string, Map<Languages, string>>();

  for (const post of posts) {
    const baseSlug = post.data.translationOf ?? removeLangFromSlug(post.slug);
    if (!map.has(baseSlug)) map.set(baseSlug, new Map());
    const lang = post.data.lang ?? getLangFromSlug(post.slug);
    const url = lang === defaultLang
      ? `/posts/${removeLangFromSlug(post.slug)}/`
      : `/${lang}/posts/${removeLangFromSlug(post.slug)}/`;
    map.get(baseSlug)!.set(lang, url);
  }
  return map;
}
```

**For static pages:** Since we generate all language variants from `getStaticPaths()`, we know at build time which languages exist for each URL pattern. Inject the available translations as a data attribute or inline JSON on the page.

**LanguageDropdown.vue** reads this data instead of making `HEAD` requests:

```vue
// Read from data attribute set by Astro on the page
const translations = JSON.parse(
  document.querySelector('[data-translations]')?.getAttribute('data-translations') ?? '{}'
);
```

### 5. Hreflang Simplification

With `translationOf` in content and parameterized pages, `hreflang.ts` no longer needs:
- `STATIC_PAGE_PAIRS` (all static pages are generated for all languages)
- Slug caching (translation links come from the `translationOf` field)

The hreflang logic becomes: "For the current page's base slug, look up all available translations in the translation map."

## Migration Plan

### Phase 1: Content Schema + Shared Images
1. Add `lang` and `translationOf` fields to content config schema
2. Add `lang` frontmatter to all existing posts (EN posts get `lang: en`, IT posts get `lang: it`)
3. Add `translationOf` to IT posts referencing their EN counterparts
4. Replace duplicated IT images with relative references to EN images
5. Verify build passes, all pages render correctly

### Phase 2: Page Deduplication
1. Start with the simplest pair: `projects/index.astro` (1 line difference)
2. Convert to `getStaticPaths()` generating both `/projects` and `/it/projects`
3. Delete `src/pages/it/projects/index.astro`
4. Verify build, verify both URLs work
5. Repeat for each pair in order of complexity:
   - `tags/index.astro`
   - `tags/[tag]/[...page].astro`
   - `[...slug].astro`
   - `posts/[...slug]/[file].ts`
   - `blog/[...path].astro`
   - `rss.xml.ts`, `last-ten.xml.ts`
   - `posts/[...slug].astro`
   - `search.astro`
6. Keep `index.astro` and `cv/index.astro` as separate per-language files
7. Move `projects/data.ts` translations into `ui.ts` or a dedicated data file

### Phase 3: Language Switcher + Hreflang
1. Build the translation map utility
2. Inject translation data into pages
3. Update `LanguageDropdown.vue` to use build-time data
4. Simplify `hreflang.ts` to use translation map
5. Remove `STATIC_PAGE_PAIRS`

### Phase 4: Testing
1. Full build verification
2. Compare old vs new URL list (no 404s)
3. Verify RSS feeds per language
4. Verify sitemap with hreflang
5. Verify OG meta tags
6. Verify language switcher navigates correctly
7. Test with 3rd language stub (nl) to verify extensibility

## URL Preservation

All existing URLs are preserved exactly:
- EN: `/`, `/blog`, `/posts/<slug>`, `/tags`, `/tags/<tag>`, `/projects`, `/search`, `/cv`, `/rss.xml`
- IT: `/it`, `/it/blog`, `/it/posts/<slug>`, `/it/tags`, `/it/tags/<tag>`, `/it/projects`, `/it/search`, `/it/cv`, `/it/rss.xml`

No redirects needed because the URL scheme is unchanged.

## Trade-offs

### Accepted
- Homepage and CV remain duplicated (justified: prose-heavy, genuinely different)
- `projects/data.ts` content stays per-language (project descriptions are translated prose)
- Migration requires touching every content file's frontmatter (one-time cost)
- `getStaticPaths()` functions become slightly more complex (loop over languages)

### Rejected Alternatives
- **Astro content-layer i18n routing**: Astro 4.x doesn't have built-in content collection locale support. The `i18n` config only handles page routing, not content association.
- **Heavy i18n libraries (i18next)**: Overkill for a static site with 2 languages. Build-time translation keys are sufficient.
- **CMS-based translation**: Not needed. Content is managed in Git.
- **Move IT content out of `it/` subdirectory**: Would break the organizational convention and make the content directory harder to navigate.

## Consequences

### Positive
- ~1,000 lines of duplicated page code eliminated
- Adding a 3rd language requires: adding translation keys to `ui.ts`, adding content files, and zero page file changes
- Language switcher becomes reliable (no network requests)
- Hreflang generation is automatic (no manual map)
- Images are not duplicated (save disk space and build time)

### Negative
- One-time migration effort (~4-6 hours)
- `getStaticPaths()` functions are slightly more complex
- Developers must remember to add `lang` and `translationOf` to new IT posts

### Neutral
- Content directory structure unchanged (`blog/it/` stays)
- Astro's built-in i18n config unchanged
- Build output unchanged (same static files produced)
