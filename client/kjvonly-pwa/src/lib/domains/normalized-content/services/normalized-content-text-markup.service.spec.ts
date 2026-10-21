import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	ResourceDescriptor,
	ResourcePublication
} from '$lib/resource';

import type {
	NormalizedContentTextMarkup
} from '../models/normalized-content-text-markup.model';

import type {
	NormalizedContentTextMarkupWriteStores
} from '../resources/text-markup/normalized-content-text-markup-write-stores';

import {
	NormalizedContentTextMarkupService
} from './normalized-content-text-markup.service';

const descriptor:
	ResourceDescriptor = {
		metadata: {
			publisher:
				'document-publisher',
			resourceId:
				'articles/sermon',
			resourceType:
				'sermon',
			dataType:
				'kjvonly.normalized-document',
			dataVersion:
				1,
			modifiedAt:
				42,
			representation:
				'content',
			mediaType:
				'application/json+gzip+hex'
		},
		strategy: {
			type:
				'nostr',
			data:
				{}
		}
	};

describe(
	'NormalizedContentTextMarkupService',
	() => {
		it(
			'creates stable empty markup for one exact document snapshot',
			() => {
				const service =
					createService();

				expect(
					service.create(
						'markup-publisher',
						descriptor
					)
				).toEqual({
					id:
						'markup-publisher/document-publisher/articles%2Fsermon/42',
					document: {
						publisher:
							'document-publisher',
						resourceId:
							'articles/sermon',
						modifiedAt:
							42
					},
					markings:
						{}
				});
			}
		);

		it(
			'checks the relay before returning a saved local copy',
			async () => {
				const existing =
					createTextMarkup();

				const get =
					vi.fn()
						.mockResolvedValue(
							existing
						);

				const load =
					vi.fn().mockResolvedValue(false);

				const service =
					createService({ get, load });

				await expect(
					service.get('markup-publisher', descriptor)
				).resolves.toEqual(existing);

				expect(load).toHaveBeenCalledOnce();
				expect(get).toHaveBeenCalledOnce();
			}
		);

		it('checks saved local markup without contacting the relay or creating a draft', async () => {
			const existing = createTextMarkup();
			const get = vi.fn().mockResolvedValueOnce(existing).mockResolvedValueOnce(undefined);
			const load = vi.fn();
			const service = createService({ get, load });
			await expect(service.getLocal('markup-publisher', descriptor)).resolves.toEqual(existing);
			await expect(service.getLocal('markup-publisher', descriptor)).resolves.toBeUndefined();
			expect(get).toHaveBeenCalledWith(existing.id);
			expect(load).not.toHaveBeenCalled();
		});

		it(
			'loads the exact user-owned markup Resource on a local miss',
			async () => {
				const get =
					vi.fn()
						.mockResolvedValue(
							undefined
						);

				const load =
					vi.fn()
						.mockResolvedValue(
							false
						);

				const service =
					createService({
						get,
						load
					});

				await expect(
					service.get(
						'markup-publisher',
						descriptor
					)
				).resolves.toEqual(
					service.create(
						'markup-publisher',
						descriptor
					)
				);

				expect(
					load
				).toHaveBeenCalledWith(
					{
						publisher:
							'markup-publisher',
						resourceId:
							'kjvonly/normalized-content/text-markup/document-publisher/articles%2Fsermon'
					},
					'42'
				);
			}
		);

		it.each([
			['no local copy', undefined],
			['saved local copy', createTextMarkup()]
		] as const)(
			'propagates relay failure with %s so Edit can offer recovery choices',
			async (_description, local) => {
				const get = vi.fn().mockResolvedValue(local);
				const load = vi.fn().mockRejectedValue(new Error('Relay unavailable'));
				const service = createService({ get, load });

				await expect(
					service.get('markup-publisher', descriptor)
				).rejects.toThrow('Relay unavailable');
				// The lookup view reads local data only after the remote failure.
				expect(load).toHaveBeenCalledOnce();
				expect(get).not.toHaveBeenCalled();
				await expect(service.getLocal('markup-publisher', descriptor))
					.resolves.toEqual(local);
				expect(get).toHaveBeenCalledOnce();
			}
		);

		it('returns the newly installed markup rather than the older local copy', async () => {
			const previous = createTextMarkup();
			const updated = {
				...previous,
				markings: { 'paragraph-1': { '3': { class: ['bg-highlightb'] } } }
			};
			let accepted = previous;
			const load = vi.fn(async () => {
				accepted = updated;
				return true;
			});
			const get = vi.fn(async () => accepted);
			const service = createService({ get, load });

			await expect(service.get('markup-publisher', descriptor)).resolves.toEqual(updated);
			expect(load).toHaveBeenCalledOnce();
			expect(get).toHaveBeenCalledOnce();
		});
		it(
			'reads installed markup after successful Resource loading',
			async () => {
				const installed =
					createTextMarkup();

				const get =
					vi.fn()
						.mockResolvedValue(installed);

				const service =
					createService({
						get,
						load:
							vi.fn()
								.mockResolvedValue(
									true
								)
					});

				await expect(
					service.get(
						'markup-publisher',
						descriptor
					)
				).resolves.toEqual(
					installed
				);
			}
		);

		it(
			'fails when a found Resource does not install the expected Domain object',
			async () => {
				const service =
					createService({
						get:
							vi.fn()
								.mockResolvedValue(
									undefined
								),
						load:
							vi.fn()
								.mockResolvedValue(
									true
								)
					});

				await expect(
					service.get(
						'markup-publisher',
						descriptor
					)
				).rejects.toThrow(
					'Normalized Content Text Markup was not installed: markup-publisher/document-publisher/articles%2Fsermon/42'
				);
			}
		);

		it(
			'atomically writes markup and publication then notifies and wakes Outbox',
			async () => {
				const textMarkup =
					createTextMarkup();

				const publication:
					ResourcePublication = {
						type:
							'resource',
						publisher:
							'markup-publisher',
						resourceId:
							'kjvonly/normalized-content/text-markup/document-publisher/articles%2Fsermon/42',
						resourceType:
							'normalized-content/text-markup',
						dataType:
							'kjvonly.normalized-content.text-markup',
						dataVersion:
							1,
						representation:
							'content',
						mediaType:
							'application/json+gzip+hex',
						value:
							textMarkup.markings
					};

				const textMarkupPut =
					vi.fn()
						.mockResolvedValue(
							undefined
						);

				const outboxPut =
					vi.fn()
						.mockResolvedValue(
							undefined
						);

				const wake =
					vi.fn();

				const onChange =
					vi.fn();

				const service =
					createService({
						createPublication:
							vi.fn()
								.mockReturnValue(
									publication
								),
						transactionRun:
							async (
								operation
							) =>
								await operation({
									textMarkup: {
										put:
											textMarkupPut
									},
									outbox: {
										put:
											outboxPut
									}
								}),
						wake
					});

				service.subscribe(
					'reader',
					textMarkup.id,
					onChange
				);

				await service.put(
					textMarkup
				);

				expect(
					textMarkupPut
				).toHaveBeenCalledWith(
					textMarkup
				);

				expect(
					outboxPut
				).toHaveBeenCalledWith(
					textMarkup.id,
					publication
				);

				expect(
					onChange
				).toHaveBeenCalledWith(
					textMarkup
				);

				expect(
					wake
				).toHaveBeenCalledOnce();
			}
		);

		it(
			'continues notifying readers and wakes Outbox when one subscriber throws after a durable save',
			async () => {
				const textMarkup = createTextMarkup();
				const wake = vi.fn();
				const received = vi.fn();
				const error = new Error('observer failed');
				const log = vi.spyOn(console, 'error')
					.mockImplementation(() => {});

				try {
					const service = createService({ wake });
					service.subscribe(
						'broken-reader',
						textMarkup.id,
						() => { throw error; }
					);
					service.subscribe(
						'healthy-reader',
						textMarkup.id,
						received
					);

					await expect(service.put(textMarkup))
						.resolves.toBeUndefined();

					expect(received).toHaveBeenCalledTimes(1);
					expect(received).toHaveBeenCalledWith(textMarkup);
					expect(wake).toHaveBeenCalledOnce();
					expect(log).toHaveBeenCalledWith(
						'Normalized Content Text Markup subscriber failed',
						error
					);
				} finally {
					log.mockRestore();
				}
			}
		);

		it(
			'does not replay an old archive refresh after a successful local save',
			async () => {
				const oldRead = deferred<NormalizedContentTextMarkup>();
				const onChange = vi.fn();
				const existing = createTextMarkup();
				const updated = {
					...existing,
					markings: { 'paragraph-1': { '3': { class: ['bg-highlightb'] } } }
				};
				const service = createService({
					get: vi.fn(() => oldRead.promise)
				});
				service.subscribe('reader', existing.id, onChange);

				const refresh = service.refresh();
				await service.put(updated);
				oldRead.resolve(existing);
				await refresh;

				expect(onChange).toHaveBeenCalledTimes(1);
				expect(onChange).toHaveBeenCalledWith(updated);
			}
		);

		it(
			'only delivers the newest overlapping archive refresh',
			async () => {
				const oldRead = deferred<NormalizedContentTextMarkup>();
				const existing = createTextMarkup();
				const updated = {
					...existing,
					markings: { 'paragraph-1': { '3': { class: ['bg-highlightc'] } } }
				};
				const get = vi.fn()
					.mockImplementationOnce(() => oldRead.promise)
					.mockResolvedValueOnce(updated);
				const onChange = vi.fn();
				const service = createService({ get });
				service.subscribe('reader', existing.id, onChange);

				const first = service.refresh();
				await service.refresh();
				oldRead.resolve(existing);
				await first;

				expect(get).toHaveBeenCalledTimes(2);
				expect(onChange).toHaveBeenCalledTimes(1);
				expect(onChange).toHaveBeenCalledWith(updated);
			}
		);

		it(
			'does not send a pending refresh to a replacement subscriber',
			async () => {
				const oldRead = deferred<NormalizedContentTextMarkup>();
				const existing = createTextMarkup();
				const original = vi.fn();
				const replacement = vi.fn();
				const service = createService({
					get: vi.fn(() => oldRead.promise)
				});
				service.subscribe('reader', existing.id, original);

				const refresh = service.refresh();
				service.unsubscribe('reader');
				service.subscribe('reader', existing.id, replacement);
				oldRead.resolve(existing);
				await refresh;

				expect(original).not.toHaveBeenCalled();
				expect(replacement).not.toHaveBeenCalled();
			}
		);

		it(
			'refreshes subscribed markup from accepted local state',
			async () => {
				const textMarkup =
					createTextMarkup();

				const onChange =
					vi.fn();

				const service =
					createService({
						get:
							vi.fn()
								.mockResolvedValue(
									textMarkup
								)
					});

				service.subscribe(
					'reader',
					textMarkup.id,
					onChange
				);

				await service.refresh();

				expect(
					onChange
				).toHaveBeenCalledWith(
					textMarkup
				);
			}
		);
	}
);

type ServiceOverrides = {
	readonly get?:
		ReturnType<typeof vi.fn>;

	readonly load?:
		ReturnType<typeof vi.fn>;

	readonly transactionRun?:
		<TResult>(
			operation:
				(
					stores:
						NormalizedContentTextMarkupWriteStores
				) => Promise<TResult>
		) => Promise<TResult>;

	readonly createPublication?:
		ReturnType<typeof vi.fn>;

	readonly wake?:
		ReturnType<typeof vi.fn>;
};

function createService(
	overrides:
		ServiceOverrides = {}
): NormalizedContentTextMarkupService {
	return new NormalizedContentTextMarkupService(
		{
			get:
				overrides.get ??
				vi.fn()
					.mockResolvedValue(
						undefined
					)
		},
		{
			load:
				overrides.load ??
				vi.fn()
					.mockResolvedValue(
						false
					)
		},
		{
			run:
				overrides.transactionRun ??
				(async (operation) =>
					await operation({
						textMarkup: {
							put:
								vi.fn()
									.mockResolvedValue(
										undefined
									)
						},
						outbox: {
							put:
								vi.fn()
									.mockResolvedValue(
										undefined
									)
						}
					}))
		},
		{
			create:
				overrides.createPublication ??
				vi.fn()
					.mockReturnValue({})
		},
		{
			wake:
				overrides.wake ??
				vi.fn()
		},
		{
			validate:
				vi.fn()
					.mockImplementation(
						(value) =>
							value
					)
		}
	);
}

function createTextMarkup():
	NormalizedContentTextMarkup {
	return {
		id:
			'markup-publisher/document-publisher/articles%2Fsermon/42',

		document: {
			publisher:
				'document-publisher',
			resourceId:
				'articles/sermon',
			modifiedAt:
				42
		},

		markings: {
			'paragraph-1': {
				'3': {
					class: [
						'bg-highlighta'
					]
				}
			}
		}
	};
}

/** A controlled pending read for refresh/notification concurrency tests. */
function deferred<T>(): {
	readonly promise: Promise<T>;
	readonly resolve: (value: T) => void;
} {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((accept) => { resolve = accept; });
	return { promise, resolve };
}
