import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const HUB = { repo: 'ynaka-adobe/radix-design-system', pagesUrl: 'https://ynaka-adobe.github.io/radix-design-system/' };

// Self-contained tool bundle for tools/radix-designer/ in an EDS site repo:
// radix-designer.html, hashed assets (relative paths), tool.json, and a default hub.json.
const toolFiles = () => ({
  name: 'radix-designer-files',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'tool.json', source: `${JSON.stringify({ name: 'radix-designer', version: pkg.version, entry: 'radix-designer.html' }, null, 2)}\n` });
    this.emitFile({ type: 'asset', fileName: 'hub.json', source: `${JSON.stringify(HUB, null, 2)}\n` });
  },
});

export default defineConfig({
  base: './',
  plugins: [react(), toolFiles()],
  publicDir: false,
  build: { outDir: 'dist-tool', emptyOutDir: true, rollupOptions: { input: 'radix-designer.html' } },
});
