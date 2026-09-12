import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	BibleParagraphs
} from '$lib/domains/bible/models/bible-paragraphs.model';

import {
	createBibleParagraphsId
} from '$lib/domains/bible/models/bible-paragraphs.model';

import {
	BIBLE_PARAGRAPHS_OBJECT_TYPE
} from '$lib/domains/bible/persistence/bible-paragraphs-store';

import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	ResourceInstallation
} from '$lib/resource/installation/resource-installation';

import type {
	BibleParagraphsInstallationStores,
	BibleParagraphsInstallationTransaction
} from './bible-paragraphs-installation-stores';

import {
	BibleParagraphsInstaller
} from './bible-paragraphs-installer';

import type {
	ValidatedBibleParagraphsCandidate
} from './validated-bible-paragraphs-candidate';

describe(
	'BibleParagraphsInstaller',
	() => {
		it(
			'installs every Paragraph Chapter and its provenance in one transaction',
			async () => {
				const transaction =
					new FakeInstallationTransaction();

				const installer =
					new BibleParagraphsInstaller(
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

							paragraphs: {
								'1_1_1_0': {}
							}
						}),
						createCandidate({
							chapterRef:
								'1_2',

							paragraphs:
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
					createBibleParagraphsId(
						resource.publisher,
						'default',
						'1_1'
					);

				const secondId =
					createBibleParagraphsId(
						resource.publisher,
						'default',
						'1_2'
					);

				expect(
					transaction.paragraphs.get(
						firstId
					)
				).toEqual({
					id:
						firstId,

					chapterRef:
						'1_1',

					paragraphs: {
						'1_1_1_0': {}
					}
				});

				expect(
					transaction.paragraphs.get(
						secondId
					)
				).toEqual({
					id:
						secondId,

					chapterRef:
						'1_2',

					paragraphs:
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
						BIBLE_PARAGRAPHS_OBJECT_TYPE,

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
			'installs a newer Resource over an existing Paragraph Chapter',
			async () => {
				const transaction =
					new FakeInstallationTransaction();

				const resource =
					createResource({
						modifiedAt:
							200
					});

				const objectId =
					createBibleParagraphsId(
						resource.publisher,
						'default',
						'1_1'
					);

				transaction.setInstallation({
					id:
						`${BIBLE_PARAGRAPHS_OBJECT_TYPE}:${objectId}`,

					objectType:
						BIBLE_PARAGRAPHS_OBJECT_TYPE,

					objectId,

					publisher:
						resource.publisher,

					resourceId:
						resource.resourceId,

					modifiedAt:
						100
				});

				const installer =
					new BibleParagraphsInstaller(
						transaction
					);

				await installer.install(
					resource,
					[
						createCandidate({
							paragraphs: {
								'1_1_2_0': {}
							}
						})
					]
				);

				expect(
					transaction.paragraphs.get(
						objectId
					)?.paragraphs
				).toEqual({
					'1_1_2_0': {}
				});

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
			'skips an %s installed Paragraph Chapter',
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
					createBibleParagraphsId(
						resource.publisher,
						'default',
						'1_1'
					);

				transaction.setInstallation({
					id:
						`${BIBLE_PARAGRAPHS_OBJECT_TYPE}:${objectId}`,

					objectType:
						BIBLE_PARAGRAPHS_OBJECT_TYPE,

					objectId,

					publisher:
						resource.publisher,

					resourceId:
						resource.resourceId,

					modifiedAt:
						existingModifiedAt
				});

				const installer =
					new BibleParagraphsInstaller(
						transaction
					);

				await installer.install(
					resource,
					[
						createCandidate()
					]
				);

				expect(
					transaction.paragraphs.size
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
					createBibleParagraphsId(
						resource.publisher,
						'default',
						'1_2'
					);

				transaction.setInstallation({
					id:
						`${BIBLE_PARAGRAPHS_OBJECT_TYPE}:${skippedId}`,

					objectType:
						BIBLE_PARAGRAPHS_OBJECT_TYPE,

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
					new BibleParagraphsInstaller(
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

							paragraphs:
								{}
						})
					]
				);

				expect(
					transaction.paragraphs.size
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
			'rejects candidates from multiple Paragraph sources before opening a transaction',
			async () => {
				const transaction =
					new FakeInstallationTransaction();

				const installer =
					new BibleParagraphsInstaller(
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
					'Bible Paragraphs Resource contains multiple sources.'
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
					new BibleParagraphsInstaller(
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
			'kjvonly/overlays/paragraphs/default',

		resourceType:
			'kjvonly/overlays/paragraphs',

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
		Partial<ValidatedBibleParagraphsCandidate> =
		{}
): ValidatedBibleParagraphsCandidate {
	return {
		source:
			'default',

		chapterRef:
			'1_1',

		paragraphs: {
			'1_1_1_0': {}
		},

		...overrides
	};
}

class FakeInstallationTransaction
	implements BibleParagraphsInstallationTransaction {

	runCount =
		0;

	readonly paragraphs =
		new Map<
			string,
			BibleParagraphs
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
					BibleParagraphsInstallationStores
			) => Promise<TResult>
	): Promise<TResult> {
		this.runCount +=
			1;

		return await operation({
			paragraphs: {
				get:
					async (
						id
					) =>
						this.paragraphs.get(
							id
						),

				put:
					async (
						paragraphs
					) => {
						this.paragraphs.set(
							paragraphs.id,
							paragraphs
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
