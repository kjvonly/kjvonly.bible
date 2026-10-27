import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import fs from 'fs';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		name: 'unit',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		pool: 'forks' // or 'vmForks'
	}
});
