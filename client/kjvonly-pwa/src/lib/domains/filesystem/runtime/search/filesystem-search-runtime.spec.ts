import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	FilesystemSearchRuntime
} from './filesystem-search-runtime';

import type {
	FilesystemSearchWorkerRequest,
	FilesystemSearchWorkerResponse
} from './filesystem-search-worker-message';

class FakeWorker {
	readonly postMessage =
		vi.fn<(
			message: FilesystemSearchWorkerRequest
		) => void>();

	onmessage:
		((event: MessageEvent<FilesystemSearchWorkerResponse>) => void) |
		null =
		null;
}

describe(
	'FilesystemSearchRuntime',
	() => {
		it(
			'correlates worker search results with the pending request',
			async () => {
				const worker =
					new FakeWorker();

				const runtime =
					new FilesystemSearchRuntime(
						worker
					);

				const result =
					runtime.search(
						{
							index: 'dataType',
							value:
								'kjvonly.note/v1'
						},
						'grace'
					);

				expect(
					worker.postMessage
				).toHaveBeenCalledWith({
					action: 'search',
					id: '0',
					byIndex: {
						index: 'dataType',
						value:
							'kjvonly.note/v1'
					},
					text: 'grace'
				});

				const matches = [];

				worker.onmessage?.({
					data: {
						type: 'search-result',
						id: '0',
						matches
					}
				} as MessageEvent<FilesystemSearchWorkerResponse>);

				await expect(
					result
				).resolves.toBe(
					matches
				);
			}
		);

		it(
			'rejects the pending search when the worker reports an error',
			async () => {
				const worker =
					new FakeWorker();

				const runtime =
					new FilesystemSearchRuntime(
						worker
					);

				const result =
					runtime.search(
						{
							index: 'dataType',
							value:
								'kjvonly.note/v1'
						},
						'grace'
					);

				worker.onmessage?.({
					data: {
						type: 'search-error',
						id: '0',
						message: 'search failed'
					}
				} as MessageEvent<FilesystemSearchWorkerResponse>);

				await expect(
					result
				).rejects.toThrow(
					'search failed'
				);
			}
		);
	}
);
