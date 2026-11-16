// Shared helpers: load the design system, compute what a block depends on, render a brand-aware block preview.
export const CONTAINERS = { 1: '448px', 2: '688px', 3: '880px', 4: '1136px' };
const get = async (u) => { const r = await fetch(u, { cache: 'no-cache' }); return r.ok ? r.text() : ''; };

export async function loadDs() {
  const manifest = JSON.parse(await get('./manifest.json'));
  const brands = {};
  await Promise.all(manifest.brands.map(async (b) => { brands[b.id] = JSON.parse(await get(`./${b.file}`)); }));
  const registry = JSON.parse(await get('./registry.json'));
  const blocks = {};
  await Promise.all(registry.blocks.map(async (b) => {
    const n = b.name;
    const [css, js, jsx, sample, spec] = await Promise.all([get(`./eds/blocks/${n}/${n}.css`), get(`./eds/blocks/${n}/${n}.js`), get(`./eds/blocks/${n}/index.jsx`), get(`./eds/blocks/${n}/sample.html`), get(`./eds/blocks/${n}/spec.json`)]);
    blocks[n] = { name: n, tier: manifest.blocks?.[n] || b.tier || 'core', css, js, jsx, sample, spec: spec ? JSON.parse(spec) : {} };
  }));
  return { manifest, brands, blocks };
}

/** A brand with the design system's custom token defaults filled in. */
export function effective(brand, manifest) {
  const defaults = Object.fromEntries(Object.entries(manifest.tokens || {}).map(([k, v]) => [k, v.default]));
  return { ...brand, tokens: { ...defaults, ...(brand.tokens || {}) } };
}

/** Which brand-file field supplies each CSS variable (drives impact analysis). */
export function fieldOf(v, manifest) {
  if (/^--accent-/.test(v)) return 'theme.accentColor';
  if (/^--gray-/.test(v)) return 'theme.grayColor';
  if (/^--radius-/.test(v)) return 'theme.radius';
  if (/^--(space|font-size|line-height)-/.test(v)) return 'theme.scaling';
  if (/^--shadow-/.test(v)) return 'theme.appearance';
  if (manifest.tokens?.[v]) return `tokens.${v}`;
  return {
    '--default-font-family': 'typography.bodyFont',
    '--ds-heading-font': 'typography.headingFont',
    '--ds-heading-weight': 'typography.headingWeight',
    '--ds-heading-tracking': 'typography.headingTracking',
    '--ds-heading-transform': 'typography.headingTransform',
    '--ds-section-space': 'layout.sectionSpace',
    '--ds-container': 'layout.containerSize',
  }[v];
}

export const varsIn = (css) => [...new Set([...css.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]))].sort();
export const fieldsIn = (css, manifest) => [...new Set(varsIn(css).map((v) => fieldOf(v, manifest)).filter(Boolean))].sort();

/** Flat list of [path, value] for a brand. */
export const flat = (o, p = '') => Object.entries(o || {}).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));

const esc = (v) => String(v).replace(/[&"<>]/g, (c) => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' }[c]));

/** A standalone document that shows one block in one brand. Runs the block's EDS decorate(). */
export function previewDoc({ brand, manifest, name, css, js, sample }) {
  const b = effective(brand, manifest);
  const t = b.theme || {}; const ty = b.typography || {}; const l = b.layout || {};
  const vars = {
    '--default-font-family': ty.bodyFont,
    '--ds-heading-font': ty.headingFont,
    '--ds-heading-weight': ty.headingWeight,
    '--ds-heading-tracking': ty.headingTracking,
    '--ds-heading-transform': ty.headingTransform,
    '--ds-section-space': l.sectionSpace ? `var(--space-${l.sectionSpace})` : '',
    '--ds-container': CONTAINERS[l.containerSize] || '',
    ...Object.fromEntries(Object.entries(b.tokens).filter(([k]) => /^--ds-[\w-]+$/.test(k))),
  };
  const style = Object.entries(vars).filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(';');
  const attrs = [['data-accent-color', t.accentColor], ['data-gray-color', t.grayColor], ['data-radius', t.radius], ['data-scaling', t.scaling]]
    .filter(([, v]) => v).map(([k, v]) => `${k}="${esc(v)}"`).join(' ');
  const script = `const js = ${JSON.stringify(js || '').replace(/</g, '\\u003c')};
const name = ${JSON.stringify(name)};
if (js.trim()) {
  try {
    const m = await import(URL.createObjectURL(new Blob([js], { type: 'text/javascript' })));
    document.querySelectorAll('main .' + name).forEach((el) => m.default?.(el));
  } catch (e) { document.body.insertAdjacentHTML('beforeend', '<pre style="color:#c00;padding:8px">' + String(e.message).replace(/</g, '&lt;') + '</pre>'); }
}`;
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${esc(manifest.tokensCss)}"><style>
html,body{margin:0}main{min-height:100vh;font-family:var(--default-font-family,system-ui)}
main h1,main h2,main h3,main h4{font-family:var(--ds-heading-font,inherit);font-weight:var(--ds-heading-weight,700);letter-spacing:var(--ds-heading-tracking,normal);text-transform:var(--ds-heading-transform,none)}
main a{color:var(--accent-11)}
${css || ''}
</style></head><body><main class="radix-themes ${esc(t.appearance || 'light')}" data-has-background="true" ${attrs} style="${esc(style)}">${sample || ''}</main><script type="module">${script}</script></body></html>`;
}
