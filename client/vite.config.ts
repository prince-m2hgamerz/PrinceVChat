import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '', []);
  
  return {
    server: {
      port: 5173,
      host: true,
    },
    build: {
      outDir: 'dist',
      minify: 'esbuild',
      sourcemap: false,
    },
    define: {
      'import.meta.env.VITE_WS_URL': JSON.stringify(env.VITE_WS_URL || 'ws://localhost:3001'),
    },
  };
});