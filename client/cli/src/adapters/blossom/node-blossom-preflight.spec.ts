import {
	afterEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	NodeBlossomPreflight
} from './node-blossom-preflight.js';
import { beforeEach } from 'node:test';

afterEach(
	() => {

		vi.unstubAllGlobals();
	}
);


describe(
	'NodeBlossomPreflight',
	() => {

		it(
			'checks every configured Blossom URL',
			async () => {

				const fetchMock =
					vi.fn<
						typeof fetch
					>(
						async () =>
							new Response(
								null,
								{
									status:
										200
								}
							)
					);


				vi.stubGlobal(
					'fetch',
					fetchMock
				);

				const logger = {
					verbose:
						vi.fn()
				};
				const preflight =
					new NodeBlossomPreflight(logger);


				await preflight.check({
					type:
						'blossom',

					urls: [
						'https://blossom-a.example',
						'https://blossom-b.example'
					]
				});


				expect(
					fetchMock
				).toHaveBeenCalledTimes(
					2
				);


				expect(
					fetchMock
				).toHaveBeenCalledWith(
					'https://blossom-a.example',

					expect.objectContaining({
						method:
							'HEAD'
					})
				);


				expect(
					fetchMock
				).toHaveBeenCalledWith(
					'https://blossom-b.example',

					expect.objectContaining({
						method:
							'HEAD'
					})
				);
			}
		);


		it(
			'fails when any configured Blossom URL is unavailable',
			async () => {

				const fetchMock =
					vi.fn<
						typeof fetch
					>(
						async input => {

							if (
								String(
									input
								) ===
								'https://blossom-b.example'
							) {
								throw new Error(
									'offline'
								);
							}


							return new Response(
								null,
								{
									status:
										200
								}
							);
						}
					);


				vi.stubGlobal(
					'fetch',
					fetchMock
				);

				const logger = {
					verbose:
						vi.fn()
				};

				const preflight =
					new NodeBlossomPreflight(logger);


				await expect(
					preflight.check({
						type:
							'blossom',

						urls: [
							'https://blossom-a.example',
							'https://blossom-b.example'
						]
					})
				).rejects.toThrow(
					'Unable to reach Blossom server "https://blossom-b.example"'
				);


				expect(
					fetchMock
				).toHaveBeenCalledTimes(
					2
				);
			}
		);
	}
);