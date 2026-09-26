# qaddodi.github.io

The homepage for Mohammad Almeqdadi, MD's hepatology tools. GitHub Pages builds it with
Jekyll; there is nothing to install or run to publish. Push to `master` and it deploys.

## Where things live

| To change… | Edit |
|---|---|
| A project (title, summary, inputs/outputs, sources, dates) | `_data/projects.yml` |
| Tool types: names, colors, order, call-to-action wording | `_data/sections.yml` |
| "What's new" and the RSS feed | `_data/changelog.yml` |
| The daily "Today's panel" cases (and which lobule zone each lights up) | `_data/panels.yml` |
| Reference ranges and "why this lab" lines for the panel | `_data/labs.yml` |
| The "Start here" guided paths | `_data/paths.yml` |
| Dotted-underline definitions (HVPG, CSPH, …) | `_data/glossary.yml` |
| Portal Pressure Simulator card numbers | `_scripts/make-pressure-grid.mjs` → `_data/pressure_grid.json` |
| Page structure | `index.html`, `_layouts/base.html`, `_includes/` |
| Look and feel | `assets/site.css` |
| Interactive features | `assets/site.js` |
| Plate illustrations and the hero lobule | `_scripts/make-art.py` → `_includes/art/` |
| Small project icons | `_includes/glyphs/<name>.svg` |

The homepage grid, search, filters, JSON-LD, `/projects.json`, `/feed.xml`,
`/sitemap.xml`, and the 404 page are all generated from those data files, so a project is
only ever written down once.

## Design

The palette comes from the portal triad: portal-vein blue for simulators, hepatic-artery
red for cases, bile-duct green for research, and bilirubin amber for calculators, on a warm
porcelain ground (with a matching dark theme). Type is Fraunces (display), Geist (text), and
Geist Mono (data), all self-hosted in `assets/fonts/`. Each tool's plate carries a small
figure of what the tool does, drawn by `_scripts/make-art.py`.

## Add a project

1. Add an entry to `_data/projects.yml`. The comments at the top list every field.
2. Pick a `type` (`calculator`, `case`, `simulator`, `research`); it decides the section.
3. Pick a `glyph` (small icon): reuse one, or draw a 32×32 SVG into `_includes/glyphs/`.
4. Optional `art`: add a function to `_scripts/make-art.py` and run
   `python3 _scripts/make-art.py`. Without it, the plate shows the glyph large.
5. Add a `new` entry to the top of `_data/changelog.yml`.

The grid holds today's panel (two cells), the tools (a `wide: true` tool takes two cells),
and the "Latest" tile (two cells at 3 columns, one at 2). Today that is 15 cells at 3 columns
and 16 at 2, so both fill evenly; if you add a tool, check both widths (a new tool plus
`wide: false` on one flagship, or a third flagship, keeps things even). The grid packs densely,
so a single-width tool fills a gap next to a flagship.

## Try-it cards

A project with `try:` gets a live control on its card, computed with the tool's own math:
`vienna` (Vienna 3P coefficients), `backtrack` (the Backtracker's half-lives), or `pressure`
(a table sampled from the simulator's engine). If the simulator's model changes, clone it
and run `node _scripts/make-pressure-grid.mjs /path/to/portal-pressure-simulator`.

The "New" badge appears for 45 days after `added` (change `new_days` in `_config.yml`).
`updated` is a fallback: the page asks GitHub for each repo's latest commit date and uses
it when it's newer.

## Features that remember things

The shelf (pins and recently opened), guided-path progress, the daily-panel streak, "since your last visit",
and the theme choice are kept in the reader's own browser (`localStorage`, keys start with
`qd:`). Nothing is sent anywhere, and the page works fully without them.

## Preview locally

```sh
bundle install
bundle exec jekyll serve   # http://localhost:4000
```

## Roll back a redesign

Each homepage redesign arrived on `master` as a single merge commit
("Merge homepage redesign…" and "Merge lobule redesign…"). To undo one:

- **On GitHub:** open the merged pull request and click **Revert**, then merge the revert PR.
- **From a terminal:** `git revert -m 1 <merge-commit-sha> && git push`

The last commit before the redesign is `c0baff8` ("Add Auris to tools index"). To see or
restore any single file from it: `git show c0baff8:index.html` or
`git checkout c0baff8 -- index.html styles.css` (then remove `_config.yml` and `_data/`
if you want the fully static version back).
