# qaddodi.github.io

The homepage for Mohammad Almeqdadi, MD's hepatology tools. GitHub Pages builds it with
Jekyll; there is nothing to install or run to publish. Push to `master` and it deploys.

## Where things live

| To change… | Edit |
|---|---|
| A project (title, summary, inputs/outputs, sources, dates) | `_data/projects.yml` |
| Tool types: names, colors, order, call-to-action wording | `_data/sections.yml` |
| Homepage groups (Learn, At the bedside, Research) | `_data/groups.yml` |
| The RSS feed (not linked from the page) | `_data/changelog.yml` |
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

Each tool shows as a plain row: its small glyph in ink, the title (the whole row is the link),
and one sentence, with a thin line between rows. Two per row on a laptop, one on a phone.
No cards, tinted boxes, pills, or scroll animation; the one accent color marks "New" and hover.
The plate art in `_includes/art/` is not shown on the page; the glyph is what each row uses.

## Try-it cards

A project with `try:` gets a live control on its card, computed with the tool's own math:
`vienna` (Vienna 3P coefficients), `backtrack` (the Backtracker's half-lives), or `pressure`
(a table sampled from the simulator's engine). If the simulator's model changes, clone it
and run `node _scripts/make-pressure-grid.mjs /path/to/portal-pressure-simulator`.

The "New" badge appears for 45 days after `added` (change `new_days` in `_config.yml`).
`updated` is a fallback: the page asks GitHub for each repo's latest commit date and uses
it when it's newer.

## The tools' shared look

The standalone tools (the calculators first) link `/assets/tool.css` and `/assets/tool.js`
from this site, so they share its palette, fonts, dark theme, header, and footer. Each tool
keeps its own layout styles, mapped onto the shared `--qd-*` tokens. The theme toggle uses the
same saved choice as this page. Changing `tool.css` restyles every tool that links it, so
check them after editing it. Because the files load from the site root, a tool opened straight
from disk (`file://`) shows unstyled; preview it through a local server with this site at `/`.

## Features that remember things

Guided-path progress
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

## Copyright

© 2026 Mohammad Almeqdadi. All rights reserved.
