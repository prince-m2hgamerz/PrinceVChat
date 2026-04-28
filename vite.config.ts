import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname, 'client'),
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: resolve(__dirname, 'client', 'dist'),
    emptyOutDir: true,
    minify: 'esbuild',
    sourcemap: false,
  },
  base: './',
});