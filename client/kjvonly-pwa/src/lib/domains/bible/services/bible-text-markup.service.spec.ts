import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import type {
	ResourcePublication
} from '$lib/resource/publication/resource-publication';

import type {
	BibleTextMarkup
} from '$lib/domains/bible/models/bible-text-markup.model';

import {
	BibleTextMarkupResourcePublication
} from '$lib/domains/bible/resources/text-markup/bible-text-markup-resource-publication';

import type {
	BibleTextMarkupWriteStores
} from '$lib/domains/bible/resources/text-markup/bible-text-markup-write-stores';

import {
	createBibleTextMarkupId
} from '$lib/domains/bible/models/bible-text-markup.model';

import {
	BibleTextMarkupService
} from './bible-text-markup.service';

describe(
	'BibleTextMarkupService',
	() => {
		it(
			'returns installed Text Markup without loading a Resource',
			async () => {
				const source =
					createSource();

				const textMarkup =
					createTextMarkup(
						createBibleTextMarkupId(
							source.publisher,
							'kjvs',
							'1_1'
						)
					);

				const store =
					new FakeTextMarkupStore([
						textMarkup
					]);

				const loader =
					new FakeResourceLoader();

				const service =
					createService(
						store,
						loader
					);

				const result =
					await service.get(
						source,
						'1_1_3_2'
					);

				expect(
					result
				).toBe(
					textMarkup
				);

				expect(
					store.ids
				).toEqual([
					'publisher/kjvs/1_1'
				]);

				expect(
					loader.calls
				).toEqual([]);
			}
		);

		it(
			'loads and rereads Text Markup on a local miss',
			async () => {
				const source =
					createSource();

				const textMarkupId =
					createBibleTextMarkupId(
						source.publisher,
						'kjvs',
						'1_1'
					);

				const textMarkup =
					createTextMarkup(
						textMarkupId
					);

				const store =
					new FakeTextMarkupStore();

				const loader =
					new FakeResourceLoader(
						async () => {
							store.values.set(
								textMarkupId,
								textMarkup
							);

							return true;
						}
					);

				const service =
					createService(
						store,
						loader
					);

				const result =
					await service.get(
						source,
						'1_1'
					);

				expect(
					result
				).toBe(
					textMarkup
				);

				expect(
					loader.calls
				).toEqual([
					{
						source,
						key:
							'1_1'
					}
				]);

				expect(
					store.ids
				).toEqual([
					textMarkupId,
					textMarkupId
				]);
			}
		);

		it(
			'returns empty Text Markup when no published Resource exists',
			async () => {
				const source =
					createSource();

				const store =
					new FakeTextMarkupStore();

				const loader =
					new FakeResourceLoader(
						async () =>
							false
					);

				const service =
					createService(
						store,
						loader
					);

				await expect(
					service.get(
						source,
						'2_3_4'
					)
				).resolves.toEqual({
					id:
						'publisher/kjvs/2_3',

					chapterRef:
						'2_3',

					markings:
						{}
				});

				expect(
					store.ids
				).toEqual([
					'publisher/kjvs/2_3'
				]);
			}
		);

		it(
			'creates the Text Markup id from the selected publisher, name, and Chapter reference',
			async () => {
				const source =
					createSource({
						publisher:
							'publisher-a',

						resourceId:
							'kjvonly/overlays/text-markup/study'
					});

				const store =
					new FakeTextMarkupStore();

				const service =
					createService(
						store,
						new FakeResourceLoader(
							async () =>
								false
						)
					);

				const result =
					await service.get(
						source,
						'2_3_4'
					);

				expect(
					result.id
				).toBe(
					'publisher-a/study/2_3'
				);

				expect(
					store.ids
				).toEqual([
					'publisher-a/study/2_3'
				]);
			}
		);

		it(
			'throws when Resource processing succeeds but Text Markup is not installed',
			async () => {
				const store =
					new FakeTextMarkupStore();

				const service =
					createService(
						store,
						new FakeResourceLoader(
							async () =>
								true
						)
					);

				await expect(
					service.get(
						createSource(),
						'1_1'
					)
				).rejects.toThrow(
					'Bible Text Markup was not installed'
				);

				expect(
					store.ids
				).toEqual([
					'publisher/kjvs/1_1',
					'publisher/kjvs/1_1'
				]);
			}
		);

		it(
			'propagates Resource loading failures',
			async () => {
				const service =
					createService(
						new FakeTextMarkupStore(),
						new FakeResourceLoader(
							async () => {
								throw new Error(
									'resolution failed'
								);
							}
						)
					);

				await expect(
					service.get(
						createSource(),
						'1_1'
					)
				).rejects.toThrow(
					'resolution failed'
				);
			}
		);

		it(
			'rejects a source for another Resource Type',
			async () => {
				const store =
					new FakeTextMarkupStore();

				const loader =
					new FakeResourceLoader();

				const service =
					createService(
						store,
						loader
					);

				await expect(
					service.get(
						createSource({
							resourceId:
								'kjvonly/bible/chapters/kjvs'
						}),
						'1_1'
					)
				).rejects.toThrow(
					'Invalid Bible Text Markup Resource Type'
				);

				expect(
					store.ids
				).toEqual([]);

				expect(
					loader.calls
				).toEqual([]);
			}
		);

		it(
			'rejects the Text Markup Resource Type root as the selected source',
			async () => {
				const service =
					createService(
						new FakeTextMarkupStore(),
						new FakeResourceLoader()
					);

				await expect(
					service.get(
						createSource({
							resourceId:
								'kjvonly/overlays/text-markup'
						}),
						'1_1'
					)
				).rejects.toThrow(
					'Invalid Bible Text Markup Resource source'
				);
			}
		);

		it(
			'rejects a chapter Text Markup Resource as the selected source',
			async () => {
				const service =
					createService(
						new FakeTextMarkupStore(),
						new FakeResourceLoader()
					);

				await expect(
					service.get(
						createSource({
							resourceId:
								'kjvonly/overlays/text-markup/kjvs/1_1'
						}),
						'1_1'
					)
				).rejects.toThrow(
					'Invalid Bible Text Markup Resource source'
				);
			}
		);

		it(
			'atomically persists Text Markup and pending Resource publication intent',
			async () => {
				const textMarkup =
					createTextMarkup(
						'publisher/kjvs/1_1'
					);

				const writeTransaction =
					new FakeWriteTransaction();

				const service =
					createService(
						new FakeTextMarkupStore(),
						new FakeResourceLoader(),
						writeTransaction
					);

				await service.put(
					textMarkup
				);

				expect(
					writeTransaction.runCount
				).toBe(
					1
				);

				expect(
					writeTransaction.textMarkup
				).toEqual([
					textMarkup
				]);

				expect(
					writeTransaction.publications
				).toEqual([
					{
						publisher:
							'publisher',

						resourceType:
							'kjvonly/overlays/text-markup',

						resourceId:
							'kjvonly/overlays/text-markup/kjvs/1_1',

						representation:
							'content',

						mediaType:
							'application/json+gzip+hex',

						value:
							textMarkup.markings
					}
				]);
			}
		);

		it(
			'notifies local subscribers after commit and before waking the Outbox',
			async () => {
				const events:
					string[] =
						[];

				const wake =
					vi.fn(
						() => {
							events.push(
								'wake'
							);
						}
					);

				const writeTransaction =
					new FakeWriteTransaction(
						() => {
							events.push(
								'commit'
							);
						}
					);

				const service =
					createService(
						new FakeTextMarkupStore(),
						new FakeResourceLoader(),
						writeTransaction,
						wake
					);

				service.subscribe(
					'reader-a',
					'publisher/kjvs/1_1',
					() => {
						events.push(
							'notify'
						);
					}
				);

				await service.put(
					createTextMarkup(
						'publisher/kjvs/1_1'
					)
				);

				expect(
					events
				).toEqual([
					'commit',
					'notify',
					'wake'
				]);
			}
		);

		it(
			'notifies only subscribers for the updated Text Markup id',
			async () => {
				const matching =
					vi.fn();

				const other =
					vi.fn();

				const service =
					createService(
						new FakeTextMarkupStore(),
						new FakeResourceLoader()
					);

				service.subscribe(
					'reader-a',
					'publisher/kjvs/1_1',
					matching
				);

				service.subscribe(
					'reader-b',
					'publisher/kjvs/1_2',
					other
				);

				const textMarkup =
					createTextMarkup(
						'publisher/kjvs/1_1'
					);

				await service.put(
					textMarkup
				);

				expect(
					matching
				).toHaveBeenCalledWith(
					textMarkup
				);

				expect(
					other
				).not.toHaveBeenCalled();
			}
		);

		it(
			'unsubscribes a local Text Markup subscriber',
			async () => {
				const onChange =
					vi.fn();

				const service =
					createService(
						new FakeTextMarkupStore(),
						new FakeResourceLoader()
					);

				service.subscribe(
					'reader-a',
					'publisher/kjvs/1_1',
					onChange
				);

				service.unsubscribe(
					'reader-a'
				);

				await service.put(
					createTextMarkup(
						'publisher/kjvs/1_1'
					)
				);

				expect(
					onChange
				).not.toHaveBeenCalled();
			}
		);

		it(
			'derives the outbound Resource from the Domain Object on put',
			async () => {
				const textMarkup =
					createTextMarkup(
						'other-publisher/study/1_1'
					);

				const writeTransaction =
					new FakeWriteTransaction();

				const service =
					createService(
						new FakeTextMarkupStore(),
						new FakeResourceLoader(),
						writeTransaction
					);

				await service.put(
					textMarkup
				);

				expect(
					writeTransaction.publications[0]
				).toMatchObject({
					publisher:
						'other-publisher',

					resourceId:
						'kjvonly/overlays/text-markup/study/1_1'
				});
			}
		);
	}
);

class FakeWriteTransaction {
	constructor(
		private readonly onComplete:
			() => void =
				() => {}
	) {}

	readonly textMarkup:
		BibleTextMarkup[] =
			[];

	readonly publications:
		ResourcePublication[] =
			[];

	runCount =
		0;

	async run<TResult>(
		operation:
			(
				stores:
					BibleTextMarkupWriteStores
			) => Promise<TResult>
	): Promise<TResult> {
		this.runCount +=
			1;

		const result =
			await operation({
				textMarkup: {
					put:
						async (
							textMarkup
						) => {
							this.textMarkup.push(
								textMarkup
							);
						}
				},

				outbox: {
					put:
						async (
							_objectId,
							resource
						) => {
							this.publications.push(
								resource
							);
						}
				}
			});

		this.onComplete();

		return result;
	}
}

function createService(
	store:
		FakeTextMarkupStore,

	loader:
		FakeResourceLoader,

	writeTransaction:
		FakeWriteTransaction =
			new FakeWriteTransaction(),

	wake:
		ReturnType<typeof vi.fn> =
			vi.fn()
): BibleTextMarkupService {
	return new BibleTextMarkupService(
		store,
		loader,
		writeTransaction,
		new BibleTextMarkupResourcePublication(),
		{
			wake
		}
	);
}

class FakeTextMarkupStore {

	readonly values =
		new Map<
			string,
			BibleTextMarkup
		>();

	readonly ids:
		string[] =
			[];

	constructor(
		textMarkup:
			readonly BibleTextMarkup[] =
				[]
	) {
		for (
			const value of textMarkup
		) {
			this.values.set(
				value.id,
				value
			);
		}
	}

	async get(
		id: string
	): Promise<
		BibleTextMarkup |
		undefined
	> {
		this.ids.push(
			id
		);

		return this.values.get(
			id
		);
	}
}

class FakeResourceLoader {

	readonly calls:
		{
			source:
				PublishedResourceReference;

			key:
				string;
		}[] =
			[];

	constructor(
		private readonly onLoad:
			(
				source:
					PublishedResourceReference,

				key:
					string
			) => Promise<boolean> =
				async () =>
					true
	) {}

	async load(
		source:
			PublishedResourceReference,

		key:
			string
	): Promise<boolean> {
		this.calls.push({
			source,
			key
		});

		return await this.onLoad(
			source,
			key
		);
	}
}

function createSource(
	overrides:
		Partial<
			PublishedResourceReference
		> =
			{}
): PublishedResourceReference {
	return {
		publisher:
			'publisher',

		resourceId:
			'kjvonly/overlays/text-markup/kjvs',

		...overrides
	};
}

function createTextMarkup(
	id: string
): BibleTextMarkup {
	return {
		id,
		chapterRef:
			'1_1',
		markings: {
			'1': {
				'0': {
					class: [
						'bg-highlighta'
					]
				}
			}
		}
	};
}
