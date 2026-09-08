import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://codegen.jsonversal.com',
  output: 'static',
  build: { format: 'directory' },
  server: { port: 4322, host: true },
});