import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globalSetup: ['./vitest.global-setup.ts'],
		projects: ['./vitest.unit.config.ts', './vitest.browser.config.ts']
	}
});
