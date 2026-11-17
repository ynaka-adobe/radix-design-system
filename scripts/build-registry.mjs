// Builds the block registry and the change report that EDS sites consume.
//   registry.json  - every EDS block: files, content hash, the design tokens it uses, status
//   changes.json   - what changed since the previously published version, and which blocks it affects
// PREVIOUS_URL points at the last published design system (set in CI) so changes can be diffed.
import {
  readFileSync, writeFileSync, readdirSync, cpSync, rmSync, mkdirSync, existsSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'eds/blocks');
const PUB = join(ROOT, 'public');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const PREVIOUS = process.env.PREVIOUS_URL ? process.env.PREVIOUS_URL.replace(/\/?$/, '/') : '';

/** Which brand-file field supplies each CSS variable a block uses. */
const manifest = JSON.parse(readFileSync(join(PUB, 'manifest.json'), 'utf8'));
function fieldOf(v) {
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
const flat = (o, p = '') => Object.entries(o || {}).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
const getJson = async (url) => { try { const r = await fetch(url, { cache: 'no-store' }); return r.ok ? await r.json() : null; } catch (e) { return null; } };

// --- blocks ---
const outBlocks = join(PUB, 'eds/blocks');
rmSync(outBlocks, { recursive: true, force: true });
mkdirSync(outBlocks, { recursive: true });
const blocks = readdirSync(SRC, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => {
  const dir = join(SRC, d.name);
  const files = readdirSync(dir).sort();
  const hash = createHash('sha1');
  // sample.html and index.jsx are hub-side references; sites consume only what changes their output
  files.filter((f) => !['sample.html', 'index.jsx'].includes(f)).forEach((f) => hash.update(`${f}\n${readFileSync(join(dir, f))}`));
  const css = existsSync(join(dir, `${d.name}.css`)) ? readFileSync(join(dir, `${d.name}.css`), 'utf8') : '';
  const tokens = [...new Set([...css.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]))].sort();
  const fields = [...new Set(tokens.map(fieldOf).filter(Boolean))].sort();
  const spec = existsSync(join(dir, 'spec.json')) ? JSON.parse(readFileSync(join(dir, 'spec.json'), 'utf8')) : {};
  cpSync(dir, join(outBlocks, d.name), { recursive: true });
  return { name: d.name, title: spec.title || d.name, status: spec.status || 'stable', tier: manifest.blocks?.[d.name] || 'core', description: spec.description || '', authoring: spec.authoring || '', hash: hash.digest('hex').slice(0, 12), files, tokens, fields };
});

// --- current brands ---
const brands = Object.fromEntries(manifest.brands.map((b) => [b.id, JSON.parse(readFileSync(join(PUB, b.file), 'utf8'))]));

const registry = { version: pkg.version, generatedAt: new Date().toISOString(), blocks };

// --- changes since the previously published version ---
const changes = { from: null, to: pkg.version, generatedAt: registry.generatedAt, tokenChanges: [], blockChanges: [] };
if (PREVIOUS) {
  const prevReg = await getJson(`${PREVIOUS}registry.json`);
  const prevMan = await getJson(`${PREVIOUS}manifest.json`);
  if (prevReg) {
    changes.from = prevReg.version;
    const prev = new Map(prevReg.blocks.map((b) => [b.name, b]));
    blocks.forEach((b) => {
      if (!prev.has(b.name)) changes.blockChanges.push({ name: b.name, kind: 'added' });
      else if (prev.get(b.name).hash !== b.hash) changes.blockChanges.push({ name: b.name, kind: 'changed' });
    });
    prevReg.blocks.forEach((b) => { if (!blocks.find((x) => x.name === b.name)) changes.blockChanges.push({ name: b.name, kind: 'removed' }); });
  }
  if (prevMan) {
    const prevBrands = {};
    await Promise.all(prevMan.brands.map(async (b) => { prevBrands[b.id] = await getJson(`${PREVIOUS}${b.file}`); }));
    [...new Set([...Object.keys(brands), ...Object.keys(prevBrands)])].forEach((id) => {
      const now = Object.fromEntries(flat(brands[id])); const was = Object.fromEntries(flat(prevBrands[id]));
      [...new Set([...Object.keys(now), ...Object.keys(was)])].filter((f) => f !== 'name' && now[f] !== was[f]).forEach((field) => {
        changes.tokenChanges.push({ brand: id, field, from: was[field] ?? null, to: now[field] ?? null, affectedBlocks: blocks.filter((b) => b.fields.includes(field)).map((b) => b.name) });
      });
    });
  }
}

writeFileSync(join(PUB, 'registry.json'), `${JSON.stringify(registry, null, 2)}\n`);
writeFileSync(join(PUB, 'changes.json'), `${JSON.stringify(changes, null, 2)}\n`);
console.log(`registry v${registry.version}: ${blocks.length} blocks; changes since ${changes.from || 'n/a'}: ${changes.tokenChanges.length} token, ${changes.blockChanges.length} block`);
