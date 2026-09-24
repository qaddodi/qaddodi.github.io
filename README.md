# qaddodi.github.io

The homepage for Mohammad Almeqdadi, MD's hepatology tools. GitHub Pages builds it with
Jekyll; there is nothing to install or run to publish. Push to `master` and it deploys.

## Where things live

| To change… | Edit |
|---|---|
| A project (title, summary, inputs/outputs, sources, dates) | `_data/projects.yml` |
| Section names, order, and call-to-action wording | `_data/sections.yml` |
| The three "doors" under the headline | `_data/intents.yml` |
| "What's new" and the RSS feed | `_data/changelog.yml` |
| The daily "Today's panel" cases | `_data/panels.yml` |
| Page structure | `index.html`, `_layouts/base.html`, `_includes/` |
| Look and feel | `assets/site.css` |
| Interactive features | `assets/site.js` |
| Project glyphs | `_includes/glyphs/<name>.svg` |

The homepage rows, figure strip, search palette, JSON-LD, `/projects.json`, `/feed.xml`,
`/sitemap.xml`, and the 404 page are all generated from those data files, so a project is
only ever written down once.

## Add a project

1. Add an entry to `_data/projects.yml`. The comments at the top list every field.
2. Pick a `type` (`calculator`, `case`, `simulator`, `research`); it decides the section.
3. Pick a `glyph`: reuse one, or draw a 32×32 SVG into `_includes/glyphs/`. Give strokes
   `class="d" pathLength="1"` to have them draw in on hover.
4. Add a `new` entry to the top of `_data/changelog.yml`.
5. Optional: regenerate the link-preview image with `_scripts/make-og.js`.

The "New" badge appears for 45 days after `added` (change `new_days` in `_config.yml`).
`updated` is a fallback: the page asks GitHub for each repo's latest commit date and uses
it when it's newer.

## Features that remember things

The shelf (pins and recently opened), the daily-panel streak, "since your last visit",
and the theme choice are kept in the reader's own browser (`localStorage`, keys start with
`qd:`). Nothing is sent anywhere, and the page works fully without them.

## Preview locally

```sh
bundle install
bundle exec jekyll serve   # http://localhost:4000
```

## Roll back the homepage redesign

The redesign arrived as a single merge. To undo it:

- **On GitHub:** open the merged pull request and click **Revert**, then merge the revert PR.
- **From a terminal:** `git revert -m 1 <merge-commit-sha> && git push`

The last commit before the redesign is `c0baff8` ("Add Auris to tools index"). To see or
restore any single file from it: `git show c0baff8:index.html` or
`git checkout c0baff8 -- index.html styles.css` (then remove `_config.yml` and `_data/`
if you want the fully static version back).
