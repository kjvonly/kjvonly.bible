import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	NodeBlossomPublicationClient
} from './node-blossom-publication-client.js';


describe(
	'NodeBlossomPublicationClient',
	() => {

		it(
			'returns already-present when the artifact already exists',
			async () => {

				const fetcher =
					vi.fn<
						typeof fetch
					>()
						.mockResolvedValueOnce(
							new Response(
								null,
								{
									status:
										200
								}
							)
						);

const logger = {
	verbose:
		vi.fn()
};

				const client =
					new NodeBlossomPublicationClient(
						{
							sign:
								vi.fn()
						} as never,

						{
							nowEpochSeconds:
								() =>
									1000
						},

						logger,

						fetcher
					);


				const result =
					await client.ensure({
						serverUrl:
							'https://blossom.example',

						artifactPath:
							'/tmp/artifact',

						sha256:
							'a'.repeat(
								64
							),

						size:
							100,

						mediaType:
							'application/octet-stream'
					});


				expect(
					result
				).toBe(
					'already-present'
				);


				expect(
					fetcher
				).toHaveBeenCalledTimes(
					1
				);


				expect(
					fetcher
				).toHaveBeenCalledWith(
					`https://blossom.example/${'a'.repeat(
						64
					)}`,

					{
						method:
							'HEAD'
					}
				);
			}
		);


		it(
			'uploads when the artifact is missing',
			async () => {

				const signedEvent = {
					id:
						'a'.repeat(
							64
						),

					pubkey:
						'b'.repeat(
							64
						),

					created_at:
						1000,

					kind:
						24242,

					tags:
						[],

					content:
						'Authorize upload',

					sig:
						'c'.repeat(
							128
						)
				};


				const signer = {
					sign:
						vi.fn(
							async () =>
								signedEvent
						)
				};


				const fetcher =
					vi.fn<
						typeof fetch
					>()
						.mockResolvedValueOnce(
							new Response(
								null,
								{
									status:
										404
								}
							)
						)
						.mockResolvedValueOnce(
							new Response(
								JSON.stringify({
									sha256:
										'a'.repeat(
											64
										)
								}),
								{
									status:
										201,

									headers: {
										'Content-Type':
											'application/json'
									}
								}
							)
						);

				const logger = {
					verbose:
						vi.fn()
				};
				const client =
					new NodeBlossomPublicationClient(
						signer as never,

						{
							nowEpochSeconds:
								() =>
									1000
						},

						logger,

						fetcher
					);


				const result =
					await client.ensure({
						serverUrl:
							'https://blossom.example',

						artifactPath:
							import.meta.filename,

						sha256:
							'a'.repeat(
								64
							),

						size:
							100,

						mediaType:
							'application/octet-stream'
					});


				expect(
					result
				).toBe(
					'uploaded'
				);


				expect(
					fetcher
				).toHaveBeenCalledTimes(
					2
				);


				expect(
					signer.sign
				).toHaveBeenCalledOnce();


				expect(
					signer.sign
				).toHaveBeenCalledWith(
					expect.objectContaining({
						kind:
							24242,

						content:
							'Authorize upload'
					})
				);


				const uploadCall =
					fetcher.mock.calls[
					1
					];


				expect(
					uploadCall?.[
					0
					]
				).toBe(
					'https://blossom.example/upload'
				);


				expect(
					uploadCall?.[
					1
					]
				).toEqual(
					expect.objectContaining({
						method:
							'PUT',

						headers:
							expect.objectContaining({
								'Content-Type':
									'application/octet-stream',

								'X-SHA-256':
									'a'.repeat(
										64
									)
							})
					})
				);
			}
		);


		it(
			'fails when the existence check returns an unexpected status',
			async () => {

				const fetcher =
					vi.fn<
						typeof fetch
					>()
						.mockResolvedValueOnce(
							new Response(
								null,
								{
									status:
										500
								}
							)
						);

				const logger = {
					verbose:
						vi.fn()
				};

				const client =
					new NodeBlossomPublicationClient(
						{} as never,

						{
							nowEpochSeconds:
								() =>
									1000
						},

						logger,

						fetcher
					);


				await expect(
					client.ensure({
						serverUrl:
							'https://blossom.example',

						artifactPath:
							'/tmp/artifact',

						sha256:
							'a'.repeat(
								64
							),

						size:
							100,

						mediaType:
							'application/octet-stream'
					})
				).rejects.toThrow(
					'HTTP 500'
				);
			}
		);


		it(
			'fails when the upload response SHA does not match',
			async () => {

				const fetcher =
					vi.fn<
						typeof fetch
					>()
						.mockResolvedValueOnce(
							new Response(
								null,
								{
									status:
										404
								}
							)
						)
						.mockResolvedValueOnce(
							new Response(
								JSON.stringify({
									sha256:
										'b'.repeat(
											64
										)
								}),
								{
									status:
										201,

									headers: {
										'Content-Type':
											'application/json'
									}
								}
							)
						);

				const logger = {
					verbose:
						vi.fn()
				};

				const client =
					new NodeBlossomPublicationClient(
						{
							sign:
								async () => ({
									id:
										'a'.repeat(
											64
										),

									pubkey:
										'b'.repeat(
											64
										),

									created_at:
										1000,

									kind:
										24242,

									tags:
										[],

									content:
										'Authorize upload',

									sig:
										'c'.repeat(
											128
										)
								})
						} as never,

						{
							nowEpochSeconds:
								() =>
									1000
						},

						logger,

						fetcher
					);


				await expect(
					client.ensure({
						serverUrl:
							'https://blossom.example',

						artifactPath:
							import.meta.filename,

						sha256:
							'a'.repeat(
								64
							),

						size:
							100,

						mediaType:
							'application/octet-stream'
					})
				).rejects.toThrow(
					'SHA-256 mismatch'
				);
			}
		);
	}
);