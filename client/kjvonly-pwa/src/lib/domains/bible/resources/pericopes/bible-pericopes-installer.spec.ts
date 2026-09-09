import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	BiblePericopes
} from '$lib/domains/bible/models/bible-pericopes.model';

import {
	createBiblePericopesId
} from '$lib/domains/bible/models/bible-pericopes.model';

import {
	BIBLE_PERICOPES_OBJECT_TYPE
} from '$lib/domains/bible/persistence/bible-pericopes-store';

import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	ResourceInstallation
} from '$lib/resource/installation/resource-installation';

import type {
	BiblePericopesInstallationStores,
	BiblePericopesInstallationTransaction
} from './bible-pericopes-installation-stores';

import {
	BiblePericopesInstaller
} from './bible-pericopes-installer';

import type {
	ValidatedBiblePericopesCandidate
} from './validated-bible-pericopes-candidate';

describe(
	'BiblePericopesInstaller',
	() => {
		it(
			'installs every Pericope Chapter and its provenance in one transaction',
			async () => {
				const transaction =
					new FakeInstallationTransaction();

				const installer =
					new BiblePericopesInstaller(
						transaction
					);

				const resource =
					createResource();

				await installer.install(
					resource,
					[
						createCandidate({
							chapterRef:
								'1_1',

							pericopes:
								createPericopeMap(
									'1_1_1',
									'The Creation'
								)
						}),
						createCandidate({
							chapterRef:
								'1_2',

							pericopes:
								{}
						})
					]
				);

				expect(
					transaction.runCount
				).toBe(
					1
				);

				const firstId =
					createBiblePericopesId(
						resource.publisher,
						'default',
						'1_1'
					);

				const secondId =
					createBiblePericopesId(
						resource.publisher,
						'default',
						'1_2'
					);

				expect(
					transaction.pericopes.get(
						firstId
					)
				).toEqual({
					id:
						firstId,

					chapterRef:
						'1_1',

					pericopes:
						createPericopeMap(
							'1_1_1',
							'The Creation'
						)
				});

				expect(
					transaction.pericopes.get(
						secondId
					)
				).toEqual({
					id:
						secondId,

					chapterRef:
						'1_2',

					pericopes:
						{}
				});

				expect(
					transaction.installations
				).toHaveLength(
					2
				);

				expect(
					transaction.installations[0]
				).toMatchObject({
					objectType:
						BIBLE_PERICOPES_OBJECT_TYPE,

					objectId:
						firstId,

					publisher:
						resource.publisher,

					resourceId:
						resource.resourceId,

					modifiedAt:
						resource.modifiedAt
				});
			}
		);

		it(
			'installs a newer Resource over an existing Pericope Chapter',
			async () => {
				const transaction =
					new FakeInstallationTransaction();

				const resource =
					createResource({
						modifiedAt:
							200
					});

				const objectId =
					createBiblePericopesId(
						resource.publisher,
						'default',
						'1_1'
					);

				transaction.setInstallation({
					id:
						`${BIBLE_PERICOPES_OBJECT_TYPE}:${objectId}`,

					objectType:
						BIBLE_PERICOPES_OBJECT_TYPE,

					objectId,

					publisher:
						resource.publisher,

					resourceId:
						resource.resourceId,

					modifiedAt:
						100
				});

				const installer =
					new BiblePericopesInstaller(
						transaction
					);

				await installer.install(
					resource,
					[
						createCandidate({
							pericopes:
								createPericopeMap(
									'1_1_2',
									'The First Day'
								)
						})
					]
				);

				expect(
					transaction.pericopes.get(
						objectId
					)?.pericopes
				).toEqual(
					createPericopeMap(
						'1_1_2',
						'The First Day'
					)
				);

				expect(
					transaction.installations.at(-1)?.modifiedAt
				).toBe(
					200
				);
			}
		);

		it.each([
			[
				'equal',
				200
			],
			[
				'older',
				300
			]
		])(
			'skips an %s installed Pericope Chapter',
			async (
				_label: string,
				existingModifiedAt: number
			) => {
				const transaction =
					new FakeInstallationTransaction();

				const resource =
					createResource({
						modifiedAt:
							200
					});

				const objectId =
					createBiblePericopesId(
						resource.publisher,
						'default',
						'1_1'
					);

				transaction.setInstallation({
					id:
						`${BIBLE_PERICOPES_OBJECT_TYPE}:${objectId}`,

					objectType:
						BIBLE_PERICOPES_OBJECT_TYPE,

					objectId,

					publisher:
						resource.publisher,

					resourceId:
						resource.resourceId,

					modifiedAt:
						existingModifiedAt
				});

				const installer =
					new BiblePericopesInstaller(
						transaction
					);

				await installer.install(
					resource,
					[
						createCandidate()
					]
				);

				expect(
					transaction.pericopes.size
				).toBe(
					0
				);

				expect(
					transaction.installations
				).toHaveLength(
					0
				);
			}
		);

		it(
			'can install and skip different Chapters from the same bundle',
			async () => {
				const transaction =
					new FakeInstallationTransaction();

				const resource =
					createResource();

				const skippedId =
					createBiblePericopesId(
						resource.publisher,
						'default',
						'1_2'
					);

				transaction.setInstallation({
					id:
						`${BIBLE_PERICOPES_OBJECT_TYPE}:${skippedId}`,

					objectType:
						BIBLE_PERICOPES_OBJECT_TYPE,

					objectId:
						skippedId,

					publisher:
						resource.publisher,

					resourceId:
						resource.resourceId,

					modifiedAt:
						resource.modifiedAt
				});

				const installer =
					new BiblePericopesInstaller(
						transaction
					);

				await installer.install(
					resource,
					[
						createCandidate({
							chapterRef:
								'1_1'
						}),
						createCandidate({
							chapterRef:
								'1_2',

							pericopes:
								{}
						})
					]
				);

				expect(
					transaction.pericopes.size
				).toBe(
					1
				);

				expect(
					transaction.installations
				).toHaveLength(
					1
				);
			}
		);

		it(
			'rejects candidates from multiple Pericope sources before opening a transaction',
			async () => {
				const transaction =
					new FakeInstallationTransaction();

				const installer =
					new BiblePericopesInstaller(
						transaction
					);

				await expect(
					installer.install(
						createResource(),
						[
							createCandidate(),
							createCandidate({
								source:
									'custom',

								chapterRef:
									'1_2'
							})
						]
					)
				).rejects.toThrow(
					'Bible Pericopes Resource contains multiple sources.'
				);

				expect(
					transaction.runCount
				).toBe(
					0
				);
			}
		);

		it(
			'does not open a transaction for an empty candidate collection',
			async () => {
				const transaction =
					new FakeInstallationTransaction();

				const installer =
					new BiblePericopesInstaller(
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
			'kjvonly/overlays/pericopes/default',

		resourceType:
			'kjvonly/overlays/pericopes',

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
		Partial<ValidatedBiblePericopesCandidate> =
		{}
): ValidatedBiblePericopesCandidate {
	return {
		source:
			'default',

		chapterRef:
			'1_1',

		pericopes:
			createPericopeMap(
				'1_1_1',
				'The Creation'
			),

		...overrides
	};
}

class FakeInstallationTransaction
	implements BiblePericopesInstallationTransaction {

	runCount =
		0;

	readonly pericopes =
		new Map<
			string,
			BiblePericopes
		>();

	readonly installations:
		ResourceInstallation[] =
		[];

	private readonly existingInstallations =
		new Map<
			string,
			ResourceInstallation
		>();

	setInstallation(
		installation:
			ResourceInstallation
	): void {
		this.existingInstallations.set(
			`${installation.objectType}:${installation.objectId}`,
			installation
		);
	}

	async run<TResult>(
		operation:
			(
				stores:
					BiblePericopesInstallationStores
			) => Promise<TResult>
	): Promise<TResult> {
		this.runCount +=
			1;

		return await operation({
			pericopes: {
				get:
					async (
						id
					) =>
						this.pericopes.get(
							id
						),

				put:
					async (
						pericopes
					) => {
						this.pericopes.set(
							pericopes.id,
							pericopes
						);
					}
			},

			resourceInstallations: {
				get:
					async (
						objectType,
						objectId
					) =>
						this.existingInstallations.get(
							`${objectType}:${objectId}`
						),

				put:
					async (
						installation
					) => {
						this.installations.push(
							installation
						);
						this.setInstallation(
							installation
						);
					}
			}
		});
	}
}


function createPericopeMap(
	ref: string,
	text: string
) {
	return {
		[ref]: [
			{
				text,
				ref,
				words: [
					{
						text,
						class:
							null,
						href:
							null,
						emphasis:
							false
					}
				]
			}
		]
	};
}
