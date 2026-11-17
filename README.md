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

## Parity tab
Rows are every block in the hub (first column: the block name and tier). There is one column per brand in `manifest.json`, and each cell is a visual render of the block using the real EDS block code of the site `https://main--ew-radix-brands--ynaka-adobe.aem.page/` (a constant in `src/ParityPanel.jsx`) with that brand's tokens, plus the parity check (missing brand fields, hardcoded colours). Each row also shows whether the site's block hash matches the registry. The site sends no CORS headers, so its block code is read from the site repo on GitHub (main).

## Manual apply workflow (no token in the browser)
`.github/workflows/apply.yml` runs the privileged steps in GitHub Actions. It is started by hand, never from the browser: Actions tab > **Apply design update** > Run workflow, or the `gh` commands the Apply bar shows after Save draft. It uses `GITHUB_TOKEN` for this repo and the repository secret `SITE_REPO_TOKEN` for `ynaka-adobe/ew-radix-brands`.

| action | what it does |
| --- | --- |
| `refresh-site-branch` | Copies the draft's changed block code onto a site branch with the same name, so Edge Delivery serves it at `https://<branch>--ew-radix-brands--ynaka-adobe.aem.page/`. |
| `merge-and-publish` | Merges the draft pull request (opens it if missing), deletes the site branch, runs the Pages deploy and waits for it, then (if blocks changed) runs the site sync. The site pull request stays open for review unless `merge_site_pr=true`. |
| `cleanup` | Deletes the site branch and closes the draft pull request and branch. |

`branch` must match `^design-update-[0-9]+$` or `^block-[a-z0-9-]+$`. Example: `gh workflow run apply.yml --repo ynaka-adobe/radix-design-system -f action=merge-and-publish -f branch=design-update-202611161200`.

**One-time setup** (you create the token yourself; it is never typed into the app):
1. Create a fine-grained personal access token limited to `ynaka-adobe/ew-radix-brands` with **Contents**, **Pull requests** and **Actions**: read and write.
2. `gh secret set SITE_REPO_TOKEN --repo ynaka-adobe/radix-design-system` and paste the token.
3. In this repo's Settings > Actions > General, allow GitHub Actions to create and approve pull requests (needed when the workflow has to open the draft pull request).

The browser flow with a token in the Apply bar still works and is optional.

## Radix Designer as an installable EDS tool
The hub UI can also run inside an Edge Delivery site repo at `tools/radix-designer/radix-designer.html`. It reads `hub.json` next to it (`{ "repo", "pagesUrl" }`) and loads `manifest.json`, `brands/*.json` and `registry.json` from that hub at runtime, so the hub stays the source of truth.

- `npm run build:tool` builds the bundle into `dist-tool/` (relative paths, hashed assets, `tool.json`, default `hub.json`).
- **Release:** bump `version` in `package.json`, then push a tag `v<version>`. `.github/workflows/release-tool.yml` builds the bundle, publishes `radix-designer-<version>.zip` as a GitHub Release, and lists the version with its sha256 in `public/tools.json`, which Pages serves next to `manifest.json`.
- **Install in a site repo (once):** copy `templates/ds-tool-sync/ds-tool-sync.mjs` to `scripts/`, `ds-tool-sync.yml` to `.github/workflows/`, and `tools.lock.json` to the repo root (edit `hub` and `repo` if needed). Run the "Design system tool sync" workflow. It opens a pull request on branch `design-system-tool` with `tools/radix-designer/` and the updated lockfile (version and sha256). Merge it, then open `/tools/radix-designer/radix-designer.html` on the site.
- **Update:** the workflow runs hourly and opens a new pull request when `tools.json` lists a newer version. The download is checked against the listed sha256. Set `"pin": "<version>"` in `tools.lock.json` to hold at a version.


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
