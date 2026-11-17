// Installs or updates the Radix Designer tool in this site repo (tools/radix-designer/).
// Run by .github/workflows/ds-tool-sync.yml, which opens a pull request with the result.
//   node scripts/ds-tool-sync.mjs
// tools.lock.json: { "hub": "https://owner.github.io/radix-design-system/", "repo": "owner/radix-design-system",
//                    "version": null, "sha256": null, "pin": null }   (pin = a version to hold at, optional)
import {
  readFileSync, writeFileSync, existsSync, mkdirSync, rmSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = new URL('..', import.meta.url).pathname;
const lockPath = join(ROOT, 'tools.lock.json');
if (!existsSync(lockPath)) throw new Error('tools.lock.json is missing. Create it with "hub" and "repo" (see the README).');
const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
const hub = (process.env.DS_URL || lock.hub).replace(/\/?$/, '/');

const get = async (url) => { const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r; };
const entry = (await (await get(`${hub}tools.json`)).json()).tools?.['radix-designer'];
if (!entry) throw new Error(`${hub}tools.json does not list radix-designer`);
const want = lock.pin || entry.latest;
const rel = entry.versions.find((v) => v.version === want);
if (!rel) throw new Error(`Version ${want} is not listed in tools.json`);

let summary;
if (lock.version === rel.version && lock.sha256 === rel.sha256 && existsSync(join(ROOT, 'tools/radix-designer/radix-designer.html'))) {
  summary = `Radix Designer ${rel.version} is already installed. Nothing to do.`;
} else {
  const zip = Buffer.from(await (await get(rel.url)).arrayBuffer());
  const sha = createHash('sha256').update(zip).digest('hex');
  if (sha !== rel.sha256) throw new Error(`Checksum mismatch for ${rel.url}: expected ${rel.sha256}, got ${sha}`);
  const tmp = join(tmpdir(), `radix-designer-${rel.version}.zip`);
  writeFileSync(tmp, zip);
  const dir = join(ROOT, 'tools/radix-designer');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  execFileSync('unzip', ['-q', '-o', tmp, '-d', dir]);
  // The site's lockfile decides which hub the tool talks to.
  writeFileSync(join(dir, 'hub.json'), `${JSON.stringify({ repo: lock.repo, pagesUrl: hub }, null, 2)}\n`);
  summary = `## Radix Designer: ${lock.version || 'new'} → ${rel.version}\n\nsha256 \`${rel.sha256}\`\nSource: ${rel.url}`;
  lock.version = rel.version; lock.sha256 = rel.sha256;
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
}
writeFileSync(join(ROOT, 'ds-tool-sync-summary.md'), `${summary}\n`);
console.log(summary);
