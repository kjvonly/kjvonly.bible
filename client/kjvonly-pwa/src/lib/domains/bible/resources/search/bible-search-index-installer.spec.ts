import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	BibleSearchIndex
} from '$lib/domains/bible/models/bible-search-index.model';

import {
	BIBLE_SEARCH_INDEX_OBJECT_TYPE,
	type BibleSearchIndexStore
} from '$lib/domains/bible/persistence/bible-search-index-store';

import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	ResourceInstallation
} from '$lib/resource/installation/resource-installation';

import {
	createResourceInstallationId
} from '$lib/resource/installation/resource-installation';

import type {
	ResourceInstallationStore
} from '$lib/resource/installation/resource-installation-store';

import type {
	BibleSearchIndexInstallationStores,
	BibleSearchIndexInstallationTransaction
} from './bible-search-index-installation-stores';

import {
	BibleSearchIndexInstaller
} from './bible-search-index-installer';

import type {
	ValidatedBibleSearchIndexCandidate
} from './validated-bible-search-index-candidate';

describe(
	'BibleSearchIndexInstaller',
	() => {
		it(
			'installs a new Bible Search Index and provenance',
			async () => {
				const transaction =
					new FakeInstallationTransaction();

				const installer =
					new BibleSearchIndexInstaller(
						transaction
					);

				await installer.install(
					createResource(),
					[
						createCandidate()
					]
				);

				expect(
					await transaction.searchIndexes.get(
						'publisher/kjvs'
					)
				).toEqual({
					id:
						'publisher/kjvs',

					version:
						'kjvs',

					chunks:
						createChunks()
				});

				const installation =
					await transaction.resourceInstallations.get(
						BIBLE_SEARCH_INDEX_OBJECT_TYPE,
						'publisher/kjvs'
					);

				expect(
					installation
				).toEqual({
					id:
						createResourceInstallationId(
							BIBLE_SEARCH_INDEX_OBJECT_TYPE,
							'publisher/kjvs'
						),

					objectType:
						BIBLE_SEARCH_INDEX_OBJECT_TYPE,

					objectId:
						'publisher/kjvs',

					publisher:
						'publisher',

					resourceId:
						'kjvonly/bible/search/kjvs',

					modifiedAt:
						200
				});
			}
		);

		it(
			'replaces the installed index when the incoming Resource is newer',
			async () => {
				const transaction =
					new FakeInstallationTransaction();

				await seedInstallation(
					transaction,
					100
				);

				await transaction.searchIndexes.put({
					id:
						'publisher/kjvs',

					version:
						'kjvs',

					chunks: {
						...createChunks(),
						map:
							'[["old"]]'
					}
				});

				const installer =
					new BibleSearchIndexInstaller(
						transaction
					);

				await installer.install(
					createResource({
						modifiedAt:
							200
					}),
					[
						createCandidate()
					]
				);

				expect(
					(
						await transaction.searchIndexes.get(
							'publisher/kjvs'
						)
					)?.chunks.map
				).toBe(
					createChunks().map
				);
			}
		);

		it.each([
			200,
			300
		])(
			'skips an incoming index when installed modifiedAt is %s',
			async (
				installedModifiedAt: number
			) => {
				const transaction =
					new FakeInstallationTransaction();

				await seedInstallation(
					transaction,
					installedModifiedAt
				);

				const existing:
					BibleSearchIndex = {
						id:
							'publisher/kjvs',

						version:
							'kjvs',

						chunks: {
							...createChunks(),
							map:
								'[["existing"]]'
						}
					};

				await transaction.searchIndexes.put(
					existing
				);

				transaction.searchIndexPutCount =
					0;

				const installer =
					new BibleSearchIndexInstaller(
						transaction
					);

				await installer.install(
					createResource({
						modifiedAt:
							200
					}),
					[
						createCandidate()
					]
				);

				expect(
					transaction.searchIndexPutCount
				).toBe(
					0
				);

				expect(
					(
						await transaction.searchIndexes.get(
							'publisher/kjvs'
						)
					)?.chunks.map
				).toBe(
					'[["existing"]]'
				);
			}
		);

		it(
			'does not open a transaction for an empty candidate collection',
			async () => {
				const transaction =
					new FakeInstallationTransaction();

				const installer =
					new BibleSearchIndexInstaller(
						transaction
					);

				await installer.install(
					createResource(),
					[]
				);

				expect(
					transaction.runCount
				).toBe(
					0
				);
			}
		);

		it(
			'rejects multiple candidates for one aggregate Search Resource',
			async () => {
				const transaction =
					new FakeInstallationTransaction();

				const installer =
					new BibleSearchIndexInstaller(
						transaction
					);

				await expect(
					installer.install(
						createResource(),
						[
							createCandidate(),
							createCandidate()
						]
					)
				).rejects.toThrow(
					'Bible Search Index Resource must produce exactly one candidate.'
				);

				expect(
					transaction.runCount
				).toBe(
					0
				);
			}
		);
	}
);

function createResource(
	overrides:
		Partial<DecodedResourceContent> =
		{}
): DecodedResourceContent {
	return {
		publisher:
			'publisher',

		resourceId:
			'kjvonly/bible/search/kjvs',

		resourceType:
			'kjvonly/bible/search',

		modifiedAt:
			200,

		mediaType:
			'application/json',

		value:
			createChunks(),

		...overrides
	};
}

function createCandidate():
	ValidatedBibleSearchIndexCandidate {
	return {
		version:
			'kjvs',

		chunks:
			createChunks()
	};
}

function createChunks() {
	return {
		reg:
			'{}',

		cfg:
			'{"doc":0,"opt":1}',

		map:
			'[]',

		ctx:
			'[]'
	};
}

async function seedInstallation(
	transaction:
		FakeInstallationTransaction,
	modifiedAt: number
): Promise<void> {
	await transaction.resourceInstallations.put({
		id:
			createResourceInstallationId(
				BIBLE_SEARCH_INDEX_OBJECT_TYPE,
				'publisher/kjvs'
			),

		objectType:
			BIBLE_SEARCH_INDEX_OBJECT_TYPE,

		objectId:
			'publisher/kjvs',

		publisher:
			'publisher',

		resourceId:
			'kjvonly/bible/search/kjvs',

		modifiedAt
	});
}

class FakeInstallationTransaction
	implements BibleSearchIndexInstallationTransaction {

	runCount =
		0;

	searchIndexPutCount =
		0;

	private readonly searchIndexValues =
		new Map<
			string,
			BibleSearchIndex
		>();

	private readonly installationValues =
		new Map<
			string,
			ResourceInstallation
		>();

	readonly searchIndexes:
		BibleSearchIndexStore = {
			get:
				async (
					id
				) =>
					this.searchIndexValues.get(
						id
					),

			put:
				async (
					searchIndex
				) => {
					this.searchIndexPutCount++;
					this.searchIndexValues.set(
						searchIndex.id,
						searchIndex
					);
				}
		};

	readonly resourceInstallations:
		ResourceInstallationStore = {
			get:
				async (
					objectType,
					objectId
				) =>
					this.installationValues.get(
						createResourceInstallationId(
							objectType,
							objectId
						)
					),

			put:
				async (
					installation
				) => {
					this.installationValues.set(
						installation.id,
						installation
					);
				}
		};

	async run<TResult>(
		operation:
			(
				stores:
					BibleSearchIndexInstallationStores
			) => Promise<TResult>
	): Promise<TResult> {
		this.runCount++;

		return await operation({
			searchIndexes:
				this.searchIndexes,

			resourceInstallations:
				this.resourceInstallations
		});
	}
}
