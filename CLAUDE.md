# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pelican-based personal blog hosted on GitHub Pages at tybug.dev.

## Build & Serve

```bash
pip install -r requirements.txt       # Install Python dependencies
pelican --listen                       # Build and serve at http://127.0.0.1:8000/
pelican content -s publishconf.py --fatal=errors  # Production build (used by CI)
```

Deployment is via GitHub Actions on push to master.

## Architecture

- **`content/articles/`** — Blog posts in Markdown with Pelican metadata header (Title, Date, Tags, Slug, etc.).
- **`content/thoughts/`** — Short-form posts. Files must be numbered (`1.md`, `2.md`, etc.). Only `Date` metadata is required. Rendered at `/thoughts/<id>/` via `thought.html`, with an index at `/thoughts/` via `thoughts.html`.
- **`content/pages/`** — Static pages (e.g., `about.md`, `contracting.html`).
- **`content/extra/`** — Files copied as-is to output (CNAME, PDF).
- **`theme/templates/`** — Jinja2 templates: `base.html` (shell with persistent header), `article.html` (post), `articles.html` (full article listing at `/articles/`), `index.html` (home — recent articles + recent thoughts), `tag.html` (tag listing), `page.html` (static pages), `thought.html`/`thoughts.html` (thoughts).
- **`theme/static/css/`** — SCSS source files. `theme.scss` imports `_base.scss` (shared definitions — design tokens and mixins), `_rouge.scss` (syntax highlighting), and `_figure.scss` (the figure/chart system); compiled to CSS at build time by the webassets plugin. The colour palette lives at the top of `_base.scss`.
- **`theme/static/js/mathjax/`** — Vendored MathJax for LaTeX math rendering.
- **`plugins/`** — Custom Pelican plugins:
  - `hidden_articles.py` — Articles with `Hidden: true` are accessible at their URL but excluded from the index and tag listings.
  - `redirect_generator.py` — Generates HTML redirect pages from the `REDIRECTS` dict in `pelicanconf.py` (maps old date-based URLs to current slugs).
  - `sidenotes.py` — Transforms Markdown footnotes (`[^1]`) into margin sidenotes at build time. Footnote references get a `<span class="sidenote">` injected after them; the bottom footnote section is removed.
  - `thoughts.py` — Separates thought files from regular articles, assigns them `/thoughts/<id>/` URLs, and generates the thoughts index page. Puts `thoughts` in the Jinja context.
- **`pelicanconf.py`** — Dev config. **`publishconf.py`** — Production config (sets SITEURL).

## Site Structure

- **Persistent header** on every page: site name (left) + nav links `articles | thoughts | about` (right). Active nav is set by JS in `base.html` matching `location.pathname`.
- **Homepage** (`index.html`): shows first 5 articles + last 3 thoughts. Generated as a `DIRECT_TEMPLATES` entry.
- **Articles listing** (`articles.html`): full article list at `/articles/`. Also a `DIRECT_TEMPLATES` entry.
- **Individual articles** at `/<slug>/`. On wide screens (≥62em), dates appear in the left margin (CSS Grid) and footnotes appear as sidenotes in the right margin (float with negative margin).

## Article Metadata

Always use `---` fences for front matter in Markdown files.

```
---
title: Post Title
date: 2024-01-15
tags: python, math
slug: post-slug
---
```

Optional: `hidden: true` (accessible but unlisted), `status: draft` (not published).

## Editing drafts

When editing an existing draft, never write prose (body sentences, intros, transitions, captions) unless explicitly asked to. The author writes the prose; you make the structural, figure, and code changes they request. If a change seems to need connecting prose, leave it to the author rather than inventing it.

## Figures (data visualizations)

D3-based charts for articles. Opt in per article with `Figures: true` in the front matter; `article.html` then loads vendored D3 + `figures.js` in the `<head>` (articles only — not pages or thoughts).

- **`theme/static/js/d3.min.js`** — vendored D3 (v7).
- **`theme/static/js/figures.js`** — the chart library. Global `Figures` with `Histogram`, `LineChart`, `ForceGraph`, `JointPlot`, `JointDensity`, `dist`, `figure`, and `mount`. Each chart is an idiomatic `d3.create('svg') → svg.node()` function and never names a colour. `JointPlot(points)` is empirical (scatter + KDE/histogram marginals); `JointDensity({x, y, joint, xDomain, yDomain})` is analytic (contour center + grid-collapsed marginal curves). `dist.normal/uniform/exponential` return pure pdfs — domains are the caller's responsibility. Common opts: cartesian charts (`Histogram`, `LineChart`, `JointPlot`, `JointDensity`) take optional `xLabel`/`yLabel` axis titles (margins auto-expand to fit); the joint plots also take `equal: true` to match px-per-unit on both axes (so a circular density reads as a circle — only meaningful when the axes share units), and a `decorate({ svg, x, y })` hook called after the marks are drawn (so its output layers on top) for annotating in data space — `x`/`y` are the final scales, so overlays never reconstruct the layout geometry. `JointDensity` additionally takes `levels` (number of contour bands, default 6) — a self-contained per-chart knob; the band opacity ramp is computed in JS, so SCSS owns only the band fill colour.
- **`theme/static/css/_figure.scss`** — the figure design system: chart marks and `$figure-*` geometry tokens. Page-integration styles (`.figure` wrapper, `.figure__caption`) live in `theme.scss`; figure colours (`$color-figure-rust`/`$color-figure-teal`/`$color-figure-gold`) in `_base.scss`. The full colour palette is bridged to CSS custom properties (`--color-figure-rust`, etc.) by a `:root` block in `_base.scss`, next to the `$color-*` tokens it mirrors — every `$color-*` token gets a matching `--color-*` custom property. This runtime bridge is the committed contract for article inline CSS: the named colours are public; non-colour tokens (`$content-inset-width`, stroke widths, etc.) stay SCSS-private. **An article's inline `<style>` is plain CSS and cannot see the `$color-figure-*` SCSS variables — reference the palette there via `var(--color-figure-*)`, never a hand-copied hex literal.** If a bespoke, one-off figure needs a colour the shared palette doesn't cover, inline the hex in that article's own `<style>` block — it's article-local, so keep it there rather than adding a `$color-figure-*` token to the shared theme.

`figure(builder, { caption })` builds a chart and drops it where the inline `<script>` sits — no placeholder div or id to manage. For laid-out groups (charts side by side) use explicit `<div class="figure" id="…">` containers + `mount(target, node)`. The palette is rust (primary) + teal (secondary) on ink structure.

Authoring (python-markdown preserves an inline `<script>` verbatim):

```html
<script>
  Figures.figure(() => {
    const series = [{ role: 'a', values: [] }]; // {x, y} points
    return Figures.LineChart(series, { yScale: 'log' });
  }, { caption: 'A caption.' });
</script>
```

One-off bespoke diagrams (e.g. a Galois lattice) are **not** part of `figures.js` — define them inline on their own article with an inline `<script>`, never in the shared system.

All article CSS lives in a **single `<style>` block at the top of the article** (right after the front matter), never per-figure — even when several figures each need their own rules, and even when only one figure uses them. Keep the inline `<script>` next to the prose it illustrates, but hoist its styles up to the shared block. This keeps every selector for an article in one place and lets figures share rules (e.g. a common `.bug-region__*` palette) without implicit coupling between blocks.

## Tooltips

A reusable hover/tap tooltip primitive, available on every page (no opt-in).

- **`theme/static/css/_tooltip.scss`** — styling, imported by `theme.scss`. Colours come from `$color-tooltip-background` / `$color-tooltip-border` in `_base.scss`.
- **`theme/static/js/tooltip.js`** — behaviour, loaded globally in `base.html`. Early-returns when a page has no `.tooltip`, so it costs nothing where unused.

Authoring is plain inline HTML (works in Markdown pages and articles):

```html
<span class="tooltip">
    <span class="tooltip__trigger">note</span>
    <span class="tooltip__body">Free HTML, including <a href="…">links</a>.</span>
</span>
```

The trigger is currently styled as a small "note" tag. The JS positions `__body` with `position: fixed` (so it escapes multi-column/overflow clipping), flips it below when it would overflow the top, clamps it to the viewport, and sets `--caret-x`/`--bridge`. Devices with a hovering pointer get hover + keyboard focus; touch devices fall back to tap-to-toggle (outside-tap / Escape dismiss). This is distinct from the `sidenotes` system (footnote → article margin note): tooltips are inline reveals that work on any page, including narrow/non-article ones.

## Key Conventions

- MathJax is enabled globally (vendored, not CDN): use `$...$` for inline math, `$$...$$` for display math (via pymdownx.arithmatex).
- Python-Markdown with footnotes, fenced_code, codehilite, tables extensions. Footnotes are converted to sidenotes by the `sidenotes` plugin.
- Font: Source Serif 4 via Google Fonts. SCSS color variables: `$color-body`, `$color-secondary`, `$color-accent`, etc. at the top of `_base.scss`.
- No JavaScript frameworks — plain HTML/CSS with minimal JS (MathJax + active nav highlight).
- HTML markup: use plain `<div>`/`<span>` (and SVG) and build all styling from CSS classes. Avoid elements that carry built-in behavior or user-agent default styling (e.g. `<figure>`, `<figcaption>`, `<details>`, `<button>`) — do not rely on semantic-element defaults.
- SCSS: 4-space indentation. Name classes with BEM (`block`, `block__element`, `block--modifier`) and nest elements/modifiers under their block with `&__` / `&--` rather than writing flat `.block__element` selectors.
- SCSS: always write rules expanded across lines, one declaration per line, never collapsed onto a single line — this applies even to rules with a single declaration (write `.axis line {\n    stroke: $figure-tick;\n}`, not `.axis line { stroke: $figure-tick; }`).
- SCSS/CSS: never write the three- or four-value compact shorthand form of `margin:`, `padding:`, etc. Spell out the individual longhand properties instead (`margin: 0 auto 1em` becomes `margin-top: 0; margin-right: auto; margin-bottom: 1em; margin-left: auto;`). One-value (`margin: 0`, `padding: 4px`) and two-value x/y (`padding: 0.4em 1em`, `margin: 1.5em auto`) shorthands are fine and may stay.
