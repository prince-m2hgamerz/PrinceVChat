import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.join(__dirname, 'client'),
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: path.join(__dirname, 'dist'),
    emptyOutDir: true,
    minify: 'esbuild',
    sourcemap: false,
  },
  base: './',
});