import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	BibleBooknames
} from '$lib/domains/bible/models/bible-booknames.model';

import {
	BIBLE_BOOKNAMES_OBJECT_TYPE
} from '$lib/domains/bible/persistence/bible-booknames-store';

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
	BibleBooknamesInstallationStores,
	BibleBooknamesInstallationTransaction
} from './bible-booknames-installation-stores';

import {
	BibleBooknamesInstaller
} from './bible-booknames-installer';

import type {
	ValidatedBibleBooknamesCandidate
} from './validated-bible-booknames-candidate';

describe(
	'BibleBooknamesInstaller',
	() => {
		it(
			'installs new Bible Booknames',
			async () => {
				const transaction =
					new FakeBibleBooknamesInstallationTransaction();

				const installer =
					new BibleBooknamesInstaller(
						transaction
					);

				await installer.install(
					createResource(),
					[
						createCandidate()
					]
				);

				expect(
					transaction.booknames.get(
						'publisher/default'
					)
				).toEqual({
					id:
						'publisher/default',

					...createBooknamesContent()
				});
			}
		);

		it(
			'creates Resource Installation provenance',
			async () => {
				const transaction =
					new FakeBibleBooknamesInstallationTransaction();

				const installer =
					new BibleBooknamesInstaller(
						transaction
					);

				await installer.install(
					createResource(),
					[
						createCandidate()
					]
				);

				const objectId =
					'publisher/default';

				const installationId =
					createResourceInstallationId(
						BIBLE_BOOKNAMES_OBJECT_TYPE,
						objectId
					);

				expect(
					transaction.resourceInstallations.get(
						installationId
					)
				).toEqual({
					id:
						installationId,

					objectType:
						BIBLE_BOOKNAMES_OBJECT_TYPE,

					objectId,

					publisher:
						'publisher',

					resourceId:
						'kjvonly/bible/booknames/default',

					modifiedAt:
						200
				});
			}
		);

		it(
			'replaces Bible Booknames when the incoming Resource is newer',
			async () => {
				const transaction =
					new FakeBibleBooknamesInstallationTransaction();

				seedInstallation(
					transaction,
					100
				);

				transaction.booknames.set(
					'publisher/default',
					{
						id:
							'publisher/default',

						...createBooknamesContent({
							booknamesById: {
								'1':
									'Old Genesis'
							}
						})
					}
				);

				const installer =
					new BibleBooknamesInstaller(
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
					transaction.booknames.get(
						'publisher/default'
					)?.booknamesById['1']
				).toBe(
					'Genesis'
				);

				expect(
					getInstallation(
						transaction
					)?.modifiedAt
				).toBe(
					200
				);
			}
		);

		it(
			'skips Bible Booknames when the installed Resource is newer',
			async () => {
				const transaction =
					new FakeBibleBooknamesInstallationTransaction();

				seedInstallation(
					transaction,
					300
				);

				const existing = {
					id:
						'publisher/default',

					...createBooknamesContent({
						booknamesById: {
							'1':
								'Newer Genesis'
						}
					})
				};

				transaction.booknames.set(
					existing.id,
					existing
				);

				const installer =
					new BibleBooknamesInstaller(
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
					transaction.booknames.get(
						'publisher/default'
					)?.booknamesById['1']
				).toBe(
					'Newer Genesis'
				);

				expect(
					transaction.booknamesPutCount
				).toBe(
					0
				);
			}
		);

		it(
			'skips Bible Booknames when modifiedAt is equal',
			async () => {
				const transaction =
					new FakeBibleBooknamesInstallationTransaction();

				seedInstallation(
					transaction,
					200
				);

				const installer =
					new BibleBooknamesInstaller(
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
					transaction.booknamesPutCount
				).toBe(
					0
				);

				expect(
					transaction.resourceInstallationPutCount
				).toBe(
					0
				);
			}
		);

		it(
			'uses one installation transaction for the Resource',
			async () => {
				const transaction =
					new FakeBibleBooknamesInstallationTransaction();

				const installer =
					new BibleBooknamesInstaller(
						transaction
					);

				await installer.install(
					createResource(),
					[
						createCandidate()
					]
				);

				expect(
					transaction.runCount
				).toBe(
					1
				);
			}
		);

		it(
			'does nothing for an empty candidate collection',
			async () => {
				const transaction =
					new FakeBibleBooknamesInstallationTransaction();

				const installer =
					new BibleBooknamesInstaller(
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
			'rejects more than one Booknames candidate',
			async () => {
				const transaction =
					new FakeBibleBooknamesInstallationTransaction();

				const installer =
					new BibleBooknamesInstaller(
						transaction
					);

				await expect(
					installer.install(
						createResource(),
						[
							createCandidate(),
							createCandidate({
								key:
									'other'
							})
						]
					)
				).rejects.toThrow(
					'Bible Booknames Resource must produce exactly one candidate.'
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
			'kjvonly/bible/booknames/default',

		resourceType:
			'kjvonly/bible/booknames',

		modifiedAt:
			200,

		mediaType:
			'application/json',

		value:
			{},

		...overrides
	};
}

function createCandidate(
	overrides:
		Partial<ValidatedBibleBooknamesCandidate> =
		{}
): ValidatedBibleBooknamesCandidate {
	return {
		key:
			'default',

		content:
			createBooknamesContent(),

		...overrides
	};
}

function createBooknamesContent(
	overrides:
		Partial<
			ValidatedBibleBooknamesCandidate[
				'content'
			]
		> =
		{}
): ValidatedBibleBooknamesCandidate['content'] {
	return {
		booknamesById: {
			'1':
				'Genesis'
		},

		booknamesByName: {
			Genesis:
				1
		},

		shortNames: {
			'1':
				'Gen'
		},

		maxChapterById: {
			'1':
				1
		},

		bookchapterversecountById: {
			'1': {
				'1':
					31
			}
		},

		...overrides
	};
}

function seedInstallation(
	transaction:
		FakeBibleBooknamesInstallationTransaction,
	modifiedAt:
		number
): void {
	const objectId =
		'publisher/default';

	const installation:
		ResourceInstallation = {
			id:
				createResourceInstallationId(
					BIBLE_BOOKNAMES_OBJECT_TYPE,
					objectId
				),

			objectType:
				BIBLE_BOOKNAMES_OBJECT_TYPE,

			objectId,

			publisher:
				'publisher',

			resourceId:
				'kjvonly/bible/booknames/default',

			modifiedAt
		};

	transaction.resourceInstallations.set(
		installation.id,
		installation
	);
}

function getInstallation(
	transaction:
		FakeBibleBooknamesInstallationTransaction
): ResourceInstallation |
	undefined {
	return transaction.resourceInstallations.get(
		createResourceInstallationId(
			BIBLE_BOOKNAMES_OBJECT_TYPE,
			'publisher/default'
		)
	);
}

class FakeBibleBooknamesInstallationTransaction
	implements BibleBooknamesInstallationTransaction {

	readonly booknames =
		new Map<
			string,
			BibleBooknames
		>();

	readonly resourceInstallations =
		new Map<
			string,
			ResourceInstallation
		>();

	runCount =
		0;

	booknamesPutCount =
		0;

	resourceInstallationPutCount =
		0;

	async run<TResult>(
		operation:
			(
				stores:
					BibleBooknamesInstallationStores
			) => Promise<TResult>
	): Promise<TResult> {
		this.runCount++;

		return await operation({
			booknames: {
				get:
					async (
						id
					) =>
						this.booknames.get(
							id
						),

				put:
					async (
						booknames
					) => {
						this.booknamesPutCount++;

						this.booknames.set(
							booknames.id,
							booknames
						);
					}
			},

			resourceInstallations: {
				get:
					async (
						objectType,
						objectId
					) =>
						this.resourceInstallations.get(
							createResourceInstallationId(
								objectType,
								objectId
							)
						),

				put:
					async (
						installation
					) => {
						this.resourceInstallationPutCount++;

						this.resourceInstallations.set(
							installation.id,
							installation
						);
					}
			}
		});
	}
}
