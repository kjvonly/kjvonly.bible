import {
	fileURLToPath
} from 'node:url';

import {
	defineConfig
} from 'vitest/config';

/**
 * Maps the CLI package import aliases to source while Vitest executes TypeScript
 * directly. Runtime package imports continue to target dist through package.json;
 * tests must not depend on a previously-built dist tree being present or current.
 */
const sourceAlias = (
	path: string
): string =>
	fileURLToPath(
		new URL(
			path,
			import.meta.url
		)
	);

export default defineConfig({
	resolve: {
		alias: {
			'#adapters':
				sourceAlias(
					'./src/adapters'
				),
			'#application':
				sourceAlias(
					'./src/application'
				),
			'#cli':
				sourceAlias(
					'./src/cli'
				),
			'#composition':
				sourceAlias(
					'./src/composition'
				),
			'#domain':
				sourceAlias(
					'./src/domain'
				),
			'#ports':
				sourceAlias(
					'./src/ports'
				)
		}
	},
	test: {
		environment:
			'node',

		include: [
			'src/**/*.spec.ts'
		]
	}
});
