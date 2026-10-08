import {
	describe,
	expect,
	it
} from 'vitest';

import {
	resolveFilesystemBootstrapMode
} from './filesystem-bootstrap-mode';

describe(
	'resolveFilesystemBootstrapMode',
	() => {
		it(
			'defaults bootstrap installation to disabled',
			() => {
				expect(
					resolveFilesystemBootstrapMode(
						undefined
					)
				).toBe('disabled');
			}
		);

		it.each([
			'enabled',
			'disabled'
		] as const)(
			'accepts the %s release mode',
			(mode) => {
				expect(
					resolveFilesystemBootstrapMode(
						mode
					)
				).toBe(mode);
			}
		);

		it(
			'rejects an unsupported release mode',
			() => {
				expect(
					() =>
						resolveFilesystemBootstrapMode(
							'auto'
						)
				).toThrow(
					'Unsupported VITE_FILESYSTEM_BOOTSTRAP_MODE'
				);
			}
		);
	}
);
