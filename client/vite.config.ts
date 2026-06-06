import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import fs from 'fs';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    host: 'localhost',
    https: {
      key: fs.readFileSync('./.certs/app.local.key'),
      cert: fs.readFileSync('./.certs/app.local.crt')
    }
  },
  plugins: [tailwindcss(), sveltekit()],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    pool: 'forks' // or 'vmForks'
  },
  build: {
    target: 'es2022'
  },
  worker: {
    format: 'es'
  }
});
