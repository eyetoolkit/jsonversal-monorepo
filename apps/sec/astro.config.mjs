import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://sec.jsonversal.com',
  output: 'static',
  build: { format: 'directory' },
  server: { port: 4323, host: true },
});