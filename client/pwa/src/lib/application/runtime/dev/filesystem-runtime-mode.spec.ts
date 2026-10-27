import {
	describe,
	expect,
	it
} from 'vitest';

import {
	resolveFilesystemRuntimeMode
} from './filesystem-runtime-mode';

describe(
	'resolveFilesystemRuntimeMode',
	() => {
		it(
			'defaults development composition to IndexedDB',
			() => {
				expect(
					resolveFilesystemRuntimeMode(
						true,
						undefined
					)
				).toBe('indexeddb');
			}
		);

		it.each([
			'indexeddb',
			'mock'
		] as const)(
			'accepts the %s development mode',
			(mode) => {
				expect(
					resolveFilesystemRuntimeMode(
						true,
						mode
					)
				).toBe(mode);
			}
		);

		it(
			'forces IndexedDB outside development builds',
			() => {
				expect(
					resolveFilesystemRuntimeMode(
						false,
						'mock'
					)
				).toBe('indexeddb');
			}
		);

		it(
			'rejects an unsupported development mode',
			() => {
				expect(
					() =>
						resolveFilesystemRuntimeMode(
							true,
							'filesystem-smoke'
						)
				).toThrow(
					'Unsupported VITE_FILESYSTEM_DEV_MODE'
				);
			}
		);
	}
);
