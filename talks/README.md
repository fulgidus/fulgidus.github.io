# Talks

One folder per deck. Each deck is built before `astro build` by `scripts/build-talks.mjs`
and published at `/talks/<slug>/`.

| Folder contents | Engine | Notes |
| --- | --- | --- |
| `index.html` (+ any assets) | ready-made HTML | copied as is |
| `slides.md` with `marp: true` in the front matter | Marp (`marp-cli`) | `theme: site` uses `src/styles/marp-theme.css`; other files in the folder are copied next to the deck |
| `slides.md` without `marp: true` | Slidev | must set `routerMode: hash` (GitHub Pages has no SPA fallback) |

Slidev and its themes are dependencies of this folder's `package.json` (a pnpm workspace
package), so they don't touch the site's own Vite/Vue. Add extra Slidev themes or addons there.

To show a deck in a post, add to its front matter:

```yaml
slides:
  src: /talks/<slug>/
  byHeading: [2, 3, 5]   # optional: slide shown for each h2, in order
```

and embed it where it should appear:

```html
<iframe src="/talks/<slug>/" title="…" loading="lazy" style="width:100%;aspect-ratio:16/9;border:0;border-radius:8px;" allowfullscreen></iframe>
```

The SlideDock pins that iframe while reading and follows the headings.

`pnpm talks` rebuilds only the decks; `pnpm dev` and `pnpm build` run it first.
