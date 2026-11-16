# Radix Design System

A standalone design system built on [Radix Themes](https://www.radix-ui.com/themes/docs/overview/getting-started). The UX team works here. Edge Delivery sites consume it at runtime through the Radix Brand Themes app for Experience Workspace.

## How it works
- A **brand** is a JSON file in `public/brands/`: Radix `<Theme>` props (`accentColor`, `grayColor`, `radius`, `scaling`, `appearance`), `typography` and `layout`.
- `public/manifest.json` lists the brands and the Radix tokens CSS (`@radix-ui/themes/tokens.css`) that consumers load.
- This app edits brands with real Radix Themes components, previews them (compare any two), and exports the JSON.
- Pushing to `main` publishes everything to GitHub Pages. Sites that read the published manifest pick up changes immediately.

## Workflow for the UX team
1. `npm install && npm run dev`
2. Pick a brand, change settings, check the preview (use Compare to see two brands together).
3. Click **Copy JSON** and paste it into `public/brands/<id>.json`. To add a brand, create the file and add it to `public/manifest.json`.
4. Commit and push to `main`. GitHub Pages deploys in about a minute.

## Brand file
```json
{
  "name": "OEM",
  "theme": { "accentColor": "red", "grayColor": "gray", "radius": "full", "scaling": "100%", "appearance": "light" },
  "typography": { "headingFont": "...", "bodyFont": "...", "headingWeight": "700", "headingTracking": "0", "headingTransform": "none" },
  "layout": { "sectionSpace": "8", "containerSize": "3" }
}
```
`sectionSpace` is a Radix space step (1 to 9) and `containerSize` is a Radix container size (1 to 4).

## EDS blocks (the Edge Delivery spoke)
The hub owns the EDS blocks too, just as it owns React components.
- `eds/blocks/<name>/` holds each block: `<name>.js`, `<name>.css` and a `spec.json` (title, status, description, authoring guidance).
- `npm run registry` (also run by `dev` and `build`) writes `registry.json` (blocks, content hashes, and the design system fields each block uses) and `changes.json` (what changed since the last published version, and which blocks it affects). Both are published with the site.
- **Token changed:** the change report lists the field, old and new value, and every block that uses it. Sites read brands live, so they update with no code change. The EW app flags the affected blocks.
- **New or changed block:** EDS sites run `scripts/ds-sync.mjs`, which opens a pull request in the site repo with the new block files. The EW app shows the block as "new" or "update available" until it is merged.
- Bump `version` in `package.json` for each release. The spec is changed here only; the EW app reflects it.

## Publish
In the GitHub repo settings, set Pages to deploy from **GitHub Actions** once. The workflow in `.github/workflows/pages.yml` does the rest.

Not affiliated with or endorsed by Radix or WorkOS.

## Panels and roles

The app has three panels. Each block previews in the selected brand, and Compare shows two brands side by side.

| Panel | Who | What |
|---|---|---|
| Brands and tokens | Designer | Edit theme, typography, layout and **custom tokens** (`--ds-*`). Create a new token and optionally bind it to a block (adds a CSS rule to that block). |
| Primitives and block collection | Developer | Register or update a block with `index.jsx` (Radix reference), `style.css` and the EDS script. Previews run the EDS script in each brand. |
| Components (boilerplate) | Read only | Atomic blocks (hero, cards, teaser, button) maintained by the design system team. |

**Apply** (bar at the bottom) creates a git branch from `main` with every changed file: brand JSON, `manifest.json`
(custom tokens, block registry) and block files. The commit message lists the blocks each change impacts.
It uses your own GitHub token (Contents: read and write), kept only in the tab.

Block files live in `eds/blocks/<name>/`: `<name>.css`, `<name>.js`, `index.jsx`, `sample.html`, `spec.json`.
`public/manifest.json` lists blocks with a tier (`core` or `collection`) and defines custom tokens.

## Authors: live or branch

The Experience Workspace app has a **Design system source** selector: Live, or any branch. A branch is read from
`raw.githubusercontent.com`, so brands, custom tokens and block CSS can be previewed before merge.
Open the site with `?ds=<branch url>&brand=<id>`; `?ds=live` returns to live.
