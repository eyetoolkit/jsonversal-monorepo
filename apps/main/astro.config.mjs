import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://jsonversal.com',
  output: 'static',
  build: {
    format: 'directory',
  },
  server: { port: 4320, host: true },
  vite: {
    resolve: {
      preserveSymlinks: false,
    },
  },
});