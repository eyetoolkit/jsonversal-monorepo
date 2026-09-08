import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://devops.jsonversal.com',
  output: 'static',
  build: { format: 'directory' },
  server: { port: 4321, host: true },
});