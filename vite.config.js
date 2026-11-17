import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Relative base so the build works from any GitHub Pages path.
export default defineConfig({ base: './',
  define: { __BUILD__: JSON.stringify(`v${pkg.version} · ${(process.env.GITHUB_SHA || 'local').slice(0, 7)}`) },
  plugins: [react()] });
