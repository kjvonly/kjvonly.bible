import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	Strongs
} from '$lib/domains/strongs/models/strongs.model';

import {
	STRONGS_DEFINITION_OBJECT_TYPE
} from '$lib/domains/strongs/persistence/strongs-store';

import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import {
	createResourceInstallationId,
	type ResourceInstallation
} from '$lib/resource/installation/resource-installation';

import type {
	StrongsInstallationStores,
	StrongsInstallationTransaction
} from './strongs-installation-stores';

import {
	StrongsInstaller
} from './strongs-installer';

import type {
	ValidatedStrongsCandidate
} from './validated-strongs-candidate';

describe(
	'StrongsInstaller',
	() => {
		it(
			'installs a new Strong\'s definition',
			async () => {
				const transaction =
					new FakeStrongsInstallationTransaction();

				const installer =
					new StrongsInstaller(
						transaction
					);

				await installer.install(
					createResource(),
					[
						createCandidate()
					]
				);

				expect(
					transaction.strongs.get(
						'publisher/kjvs/G1'
					)
				).toEqual({
					id:
						'publisher/kjvs/G1',

					...createStrongsContent()
				});
			}
		);

		it(
			'creates Resource Installation provenance',
			async () => {
				const transaction =
					new FakeStrongsInstallationTransaction();

				const installer =
					new StrongsInstaller(
						transaction
					);

				await installer.install(
					createResource(),
					[
						createCandidate()
					]
				);

				const strongsId =
					'publisher/kjvs/G1';

				const installationId =
					createResourceInstallationId(
						STRONGS_DEFINITION_OBJECT_TYPE,
						strongsId
					);

				expect(
					transaction.resourceInstallations.get(
						installationId
					)
				).toEqual({
					id:
						installationId,

					objectType:
						STRONGS_DEFINITION_OBJECT_TYPE,

					objectId:
						strongsId,

					publisher:
						'publisher',

					resourceId:
						'kjvonly/strongs/definitions/kjvs',

					modifiedAt:
						200
				});
			}
		);

		it(
			'replaces a Strong\'s definition when the Resource is newer',
			async () => {
				const transaction =
					new FakeStrongsInstallationTransaction();

				const strongsId =
					'publisher/kjvs/G1';

				transaction.strongs.set(
					strongsId,
					{
						id:
							strongsId,

						...createStrongsContent({
							strongsDef:
								'old definition'
						})
					}
				);

				transaction.resourceInstallations.set(
					createResourceInstallationId(
						STRONGS_DEFINITION_OBJECT_TYPE,
						strongsId
					),
					createInstallation({
						objectId:
							strongsId,

						modifiedAt:
							100
					})
				);

				const installer =
					new StrongsInstaller(
						transaction
					);

				await installer.install(
					createResource({
						modifiedAt:
							200
					}),
					[
						createCandidate({
							content:
								createStrongsContent({
									strongsDef:
										'new definition'
								})
						})
					]
				);

				expect(
					transaction.strongs.get(
						strongsId
					)?.strongsDef
				).toBe(
					'new definition'
				);

				expect(
					transaction.resourceInstallations.get(
						createResourceInstallationId(
							STRONGS_DEFINITION_OBJECT_TYPE,
							strongsId
						)
					)?.modifiedAt
				).toBe(
					200
				);
			}
		);

		it(
			'does not replace a Strong\'s definition when the Resource is older',
			async () => {
				const transaction =
					new FakeStrongsInstallationTransaction();

				const strongsId =
					'publisher/kjvs/G1';

				transaction.strongs.set(
					strongsId,
					{
						id:
							strongsId,

						...createStrongsContent({
							strongsDef:
								'current definition'
						})
					}
				);

				transaction.resourceInstallations.set(
					createResourceInstallationId(
						STRONGS_DEFINITION_OBJECT_TYPE,
						strongsId
					),
					createInstallation({
						objectId:
							strongsId,

						modifiedAt:
							300
					})
				);

				const installer =
					new StrongsInstaller(
						transaction
					);

				await installer.install(
					createResource({
						modifiedAt:
							200
					}),
					[
						createCandidate({
							content:
								createStrongsContent({
									strongsDef:
										'older definition'
								})
						})
					]
				);

				expect(
					transaction.strongs.get(
						strongsId
					)?.strongsDef
				).toBe(
					'current definition'
				);

				expect(
					transaction.strongsPutCount
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
			'does not replace a Strong\'s definition when modifiedAt is equal',
			async () => {
				const transaction =
					new FakeStrongsInstallationTransaction();

				const strongsId =
					'publisher/kjvs/G1';

				transaction.strongs.set(
					strongsId,
					{
						id:
							strongsId,

						...createStrongsContent({
							strongsDef:
								'current definition'
						})
					}
				);

				transaction.resourceInstallations.set(
					createResourceInstallationId(
						STRONGS_DEFINITION_OBJECT_TYPE,
						strongsId
					),
					createInstallation({
						objectId:
							strongsId,

						modifiedAt:
							200
					})
				);

				const installer =
					new StrongsInstaller(
						transaction
					);

				await installer.install(
					createResource({
						modifiedAt:
							200
					}),
					[
						createCandidate({
							content:
								createStrongsContent({
									strongsDef:
										'different definition'
								})
						})
					]
				);

				expect(
					transaction.strongs.get(
						strongsId
					)?.strongsDef
				).toBe(
					'current definition'
				);

				expect(
					transaction.strongsPutCount
				).toBe(
					0
				);
			}
		);

		it(
			'handles mixed install and skip decisions in one bundle',
			async () => {
				const transaction =
					new FakeStrongsInstallationTransaction();

				const g1Id =
					'publisher/kjvs/G1';

				const g2Id =
					'publisher/kjvs/G2';

				transaction.strongs.set(
					g1Id,
					{
						id:
							g1Id,

						...createStrongsContent({
							number:
								'G1',

							strongsDef:
								'newer local G1'
						})
					}
				);

				transaction.resourceInstallations.set(
					createResourceInstallationId(
						STRONGS_DEFINITION_OBJECT_TYPE,
						g1Id
					),
					createInstallation({
						objectId:
							g1Id,

						modifiedAt:
							300
					})
				);

				const installer =
					new StrongsInstaller(
						transaction
					);

				await installer.install(
					createResource({
						modifiedAt:
							200
					}),
					[
						createCandidate({
							key:
								'G1',

							content:
								createStrongsContent({
									number:
										'G1',

									strongsDef:
										'bundle G1'
								})
						}),

						createCandidate({
							key:
								'G2',

							content:
								createStrongsContent({
									number:
										'G2',

									strongsDef:
										'bundle G2'
								})
						})
					]
				);

				expect(
					transaction.strongs.get(
						g1Id
					)?.strongsDef
				).toBe(
					'newer local G1'
				);

				expect(
					transaction.strongs.get(
						g2Id
					)?.strongsDef
				).toBe(
					'bundle G2'
				);
			}
		);

		it(
			'uses one transaction for the entire Resource',
			async () => {
				const transaction =
					new FakeStrongsInstallationTransaction();

				const installer =
					new StrongsInstaller(
						transaction
					);

				await installer.install(
					createResource(),
					[
						createCandidate({
							key:
								'G1'
						}),

						createCandidate({
							key:
								'G2',

							content:
								createStrongsContent({
									number:
										'G2'
								})
						}),

						createCandidate({
							key:
								'H1',

							content:
								createStrongsContent({
									number:
										'H1'
								})
						})
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
					new FakeStrongsInstallationTransaction();

				const installer =
					new StrongsInstaller(
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

				expect(
					transaction.strongs.size
				).toBe(
					0
				);

				expect(
					transaction.resourceInstallations.size
				).toBe(
					0
				);
			}
		);

		it(
			'rejects candidates from multiple Bible versions before starting the transaction',
			async () => {
				const transaction =
					new FakeStrongsInstallationTransaction();

				const installer =
					new StrongsInstaller(
						transaction
					);

				await expect(
					installer.install(
						createResource(),
						[
							createCandidate({
								version:
									'kjvs'
							}),

							createCandidate({
								version:
									'kjv'
							})
						]
					)
				).rejects.toThrow(
					'Strong\'s Resource contains multiple Bible versions.'
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
			'kjvonly/strongs/definitions/kjvs',

		resourceType:
			'kjvonly/strongs/definitions',

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
		Partial<ValidatedStrongsCandidate> =
			{}
): ValidatedStrongsCandidate {

	return {
		version:
			'kjvs',

		key:
			'G1',

		content:
			createStrongsContent(),

		...overrides
	};
}

function createStrongsContent(
	overrides:
		Record<string, unknown> =
			{}
) {
	return {
		number:
			'G1',

		originalWord:
			'Α',

		partsOfSpeech:
			'noun',

		phoneticSpelling:
			'alpha',

		transliteratedWord:
			'A',

		usageByBook:
			[],

		usageByWord:
			[],

		brownDef:
			null,

		strongsDef:
			'definition',

		thayersDef:
			null,

		...overrides
	};
}

function createInstallation(
	overrides:
		Partial<ResourceInstallation> =
			{}
): ResourceInstallation {

	const objectId =
		overrides.objectId ??
		'publisher/kjvs/G1';

	return {
		id:
			createResourceInstallationId(
				STRONGS_DEFINITION_OBJECT_TYPE,
				objectId
			),

		objectType:
			STRONGS_DEFINITION_OBJECT_TYPE,

		objectId,

		publisher:
			'publisher',

		resourceId:
			'kjvonly/strongs/definitions/kjvs',

		modifiedAt:
			100,

		...overrides
	};
}

class FakeStrongsInstallationTransaction
	implements StrongsInstallationTransaction {

	readonly strongs =
		new Map<
			string,
			Strongs
		>();

	readonly resourceInstallations =
		new Map<
			string,
			ResourceInstallation
		>();

	runCount =
		0;

	strongsPutCount =
		0;

	resourceInstallationPutCount =
		0;

	async run<TResult>(
		operation:
			(
				stores:
					StrongsInstallationStores
			) => Promise<TResult>
	): Promise<TResult> {

		this.runCount++;

		return operation({
			strongs: {
				get:
					async (
						id
					) =>
						this.strongs.get(
							id
						),

				put:
					async (
						strongs
					) => {
						this.strongsPutCount++;

						this.strongs.set(
							strongs.id,
							strongs
						);
					}
			},

			resourceInstallations: {
				get:
					async (
						objectType,
						objectId
					) => {
						return this
							.resourceInstallations
							.get(
								createResourceInstallationId(
									objectType,
									objectId
								)
							);
					},

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