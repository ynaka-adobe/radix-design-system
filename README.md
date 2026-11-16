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
  "name": "Toyota",
  "theme": { "accentColor": "red", "grayColor": "gray", "radius": "full", "scaling": "100%", "appearance": "light" },
  "typography": { "headingFont": "...", "bodyFont": "...", "headingWeight": "700", "headingTracking": "0", "headingTransform": "none" },
  "layout": { "sectionSpace": "8", "containerSize": "3" }
}
```
`sectionSpace` is a Radix space step (1 to 9) and `containerSize` is a Radix container size (1 to 4).

## Publish
In the GitHub repo settings, set Pages to deploy from **GitHub Actions** once. The workflow in `.github/workflows/pages.yml` does the rest.

Not affiliated with or endorsed by Radix or WorkOS.
