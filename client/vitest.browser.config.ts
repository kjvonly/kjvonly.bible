import {
	playwright
} from '@vitest/browser-playwright';

import {
	defineConfig
} from 'vitest/config';

import {
	sveltekit
} from '@sveltejs/kit/vite';


export default defineConfig({
	plugins: [
		sveltekit()
	],

	test: {
		include: [
			'tests/browser/**/*.test.ts'
		],

		browser: {
			enabled: true,

			provider:
				playwright(),

			headless: true,

			instances: [
				{
					browser:
						'chromium'
				}
			]
		}
	}
});