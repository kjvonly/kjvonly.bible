import {
	describe,
	expect,
	it
} from 'vitest';

import {
	resolveApplicationBootstrapMode
} from './application-bootstrap-mode';

describe(
	'resolveApplicationBootstrapMode',
	() => {
		it(
			'defaults development composition to enabled',
			() => {
				expect(
					resolveApplicationBootstrapMode(
						true,
						undefined
					)
				).toBe('enabled');
			}
		);

		it.each([
			'enabled',
			'disabled'
		] as const)(
			'accepts the %s development mode',
			(mode) => {
				expect(
					resolveApplicationBootstrapMode(
						true,
						mode
					)
				).toBe(mode);
			}
		);

		it(
			'forces bootstrap installation outside development builds',
			() => {
				expect(
					resolveApplicationBootstrapMode(
						false,
						'disabled'
					)
				).toBe('enabled');
			}
		);

		it(
			'rejects an unsupported development mode',
			() => {
				expect(
					() =>
						resolveApplicationBootstrapMode(
							true,
							'skip'
						)
				).toThrow(
					'Unsupported VITE_APPLICATION_BOOTSTRAP_DEV_MODE'
				);
			}
		);
	}
);
