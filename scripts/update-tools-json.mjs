// Adds a released version of the Radix Designer tool to public/tools.json (published next to manifest.json).
//   node scripts/update-tools-json.mjs <version> <sha256> <zip-url> [path/to/tools.json]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const [version, sha256, url, file = 'public/tools.json'] = process.argv.slice(2);
if (!version || !/^[0-9a-f]{64}$/.test(sha256 || '') || !url) throw new Error('usage: update-tools-json.mjs <version> <sha256> <zip-url> [file]');

const data = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { tools: {} };
data.tools ||= {};
const tool = data.tools['radix-designer'] ||= { versions: [] };
tool.versions = [{ version, sha256, url, released: new Date().toISOString() }, ...tool.versions.filter((v) => v.version !== version)];
tool.latest = version;
writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
console.log(`radix-designer ${version} listed in ${file}`);
