import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({ root: 'client', base: './', build: { outDir: '../dist', emptyOutDir: true, rollupOptions: { input: {main:resolve('client/index.html'),coop:resolve('client/coop.html')} } } });
