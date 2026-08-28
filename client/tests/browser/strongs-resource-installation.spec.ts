import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PublishedResourceReference,
	ResourceRepresentation,
	ResourceRepresentationType,
	VerifiedResourceContent
} from '$lib/resource/models/resource.model';

import {
	ResourceContentDecoratorBuilder
} from '$lib/resource/content/resource-content-decorator-builder';

import {
	JsonResourceContentDecorator
} from '$lib/resource/content/json-resource-content-decorator';

import {
	ResourceContentDecoder
} from '$lib/resource/content/resource-content-decoder';

import {
	StrongsInterpreter
} from '$lib/domains/strongs/resources/definitions/strongs-interpreter';

import {
	StrongsValidator
} from '$lib/domains/strongs/resources/definitions/strongs-validator';

import {
	StrongsInstaller
} from '$lib/domains/strongs/resources/definitions/strongs-installer';

import {
	StrongsResourceHandler
} from '$lib/domains/strongs/resources/definitions/strongs-resource-handler';

import {
	StrongsResourceService
} from '$lib/domains/strongs/resources/definitions/strongs-resource-service';

import {
	IndexedDBStrongsInstallationTransaction
} from '$lib/domains/strongs/persistence/strongs-installation-transaction';

import {
	STRONGS_DEFINITION_OBJECT_TYPE
} from '$lib/domains/strongs/persistence/strongs-store';

import {
	createStrongsId
} from '$lib/domains/strongs/utils/strongs-identity';

import {
	createBibleVersionId
} from '$lib/domains/bible/utils/bible-identity';

import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	createStoredDomainObjectId,
	getApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	createResourceInstallationId
} from '$lib/resource/installation/resource-installation';

describe(
	"Strong's Resource installation",
	() => {
		it(
			"decodes validates and installs a Strong's bundle into IndexedDB",
			async () => {
				const publisher =
					createPublisher();

				const resourceId =
					'kjvonly/bible/strongs/kjvs';

				const eventId =
					'a'.repeat(
						64
					);

				const g1Content =
					createStrongsContent(
						'G1'
					);

				const h1Content =
					createStrongsContent(
						'H1'
					);

				const service =
					createService([
						createVerifiedContent({
							publisher,
							resourceId,
							eventId,

							content:
								JSON.stringify({
									G1:
										g1Content,

									H1:
										h1Content
								})
						})
					]);

				const result =
					await service.install({
						publisher,
						resourceId
					});

				expect(
					result
				).toBe(
					true
				);

				const db =
					await getApplicationDB();

				const bibleVersionId =
					createBibleVersionId(
						publisher,
						'kjvs'
					);

				const g1Id =
					createStrongsId(
						bibleVersionId,
						'G1'
					);

				const h1Id =
					createStrongsId(
						bibleVersionId,
						'H1'
					);

				expect(
					await db.get(
						DOMAIN_OBJECTS,
						createStoredDomainObjectId(
							STRONGS_DEFINITION_OBJECT_TYPE,
							g1Id
						)
					)
				).toEqual({
					id:
						createStoredDomainObjectId(
							STRONGS_DEFINITION_OBJECT_TYPE,
							g1Id
						),

					objectType:
						STRONGS_DEFINITION_OBJECT_TYPE,

					objectId:
						g1Id,

					value: {
						id:
							g1Id,

						...g1Content
					}
				});

				expect(
					await db.get(
						DOMAIN_OBJECTS,
						createStoredDomainObjectId(
							STRONGS_DEFINITION_OBJECT_TYPE,
							h1Id
						)
					)
				).toEqual({
					id:
						createStoredDomainObjectId(
							STRONGS_DEFINITION_OBJECT_TYPE,
							h1Id
						),

					objectType:
						STRONGS_DEFINITION_OBJECT_TYPE,

					objectId:
						h1Id,

					value: {
						id:
							h1Id,

						...h1Content
					}
				});

				const g1InstallationId =
					createResourceInstallationId(
						STRONGS_DEFINITION_OBJECT_TYPE,
						g1Id
					);

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						g1InstallationId
					)
				).toEqual({
					id:
						g1InstallationId,

					objectType:
						STRONGS_DEFINITION_OBJECT_TYPE,

					objectId:
						g1Id,

					publisher,

					resourceId,

					eventId,

					modifiedAt:
						200
				});
			}
		);

		it(
			"installs nothing when any Strong's bundle candidate fails validation",
			async () => {
				const publisher =
					createPublisher();

				const resourceId =
					'kjvonly/bible/strongs/kjvs';

				const service =
					createService([
						createVerifiedContent({
							publisher,
							resourceId,

							content:
								JSON.stringify({
									G1:
										createStrongsContent(
											'G1'
										),

									G2: {
										...createStrongsContent(
											'G2'
										),

										number:
											'G1'
									}
								})
						})
					]);

				await expect(
					service.install({
						publisher,
						resourceId
					})
				).rejects.toThrow();

				const db =
					await getApplicationDB();

				const bibleVersionId =
					createBibleVersionId(
						publisher,
						'kjvs'
					);

				const g1Id =
					createStrongsId(
						bibleVersionId,
						'G1'
					);

				const g2Id =
					createStrongsId(
						bibleVersionId,
						'G2'
					);

				expect(
					await db.get(
						DOMAIN_OBJECTS,
						createStoredDomainObjectId(
							STRONGS_DEFINITION_OBJECT_TYPE,
							g1Id
						)
					)
				).toBeUndefined();

				expect(
					await db.get(
						DOMAIN_OBJECTS,
						createStoredDomainObjectId(
							STRONGS_DEFINITION_OBJECT_TYPE,
							g2Id
						)
					)
				).toBeUndefined();

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						createResourceInstallationId(
							STRONGS_DEFINITION_OBJECT_TYPE,
							g1Id
						)
					)
				).toBeUndefined();

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						createResourceInstallationId(
							STRONGS_DEFINITION_OBJECT_TYPE,
							g2Id
						)
					)
				).toBeUndefined();
			}
		);

		it(
			'commits each resolved descriptor independently',
			async () => {
				const publisher =
					createPublisher();

				const g1ResourceId =
					'kjvonly/bible/strongs/kjvs/G1';

				const g2ResourceId =
					'kjvonly/bible/strongs/kjvs/G2';

				const eventA =
					'a'.repeat(
						64
					);

				const eventB =
					'b'.repeat(
						64
					);

				const service =
					createService(
						[
							createVerifiedContent({
								publisher,

								resourceId:
									g1ResourceId,

								eventId:
									eventA,

								modifiedAt:
									100,

								content:
									JSON.stringify(
										createStrongsContent(
											'G1'
										)
									)
							}),

							createVerifiedContent({
								publisher,

								resourceId:
									g2ResourceId,

								eventId:
									eventB,

								modifiedAt:
									200,

								content:
									JSON.stringify({
										...createStrongsContent(
											'G2'
										),

										number:
											'G1'
									})
							})
						],
						'descriptors'
					);

				await expect(
					service.install({
						publisher,

						resourceId:
							'kjvonly/bible/strongs/kjvs'
					})
				).rejects.toThrow();

				const db =
					await getApplicationDB();

				const bibleVersionId =
					createBibleVersionId(
						publisher,
						'kjvs'
					);

				const g1Id =
					createStrongsId(
						bibleVersionId,
						'G1'
					);

				const g2Id =
					createStrongsId(
						bibleVersionId,
						'G2'
					);

				/*
				 * Descriptor A completed its own
				 * installation transaction.
				 */
				expect(
					await db.get(
						DOMAIN_OBJECTS,
						createStoredDomainObjectId(
							STRONGS_DEFINITION_OBJECT_TYPE,
							g1Id
						)
					)
				).toEqual({
					id:
						createStoredDomainObjectId(
							STRONGS_DEFINITION_OBJECT_TYPE,
							g1Id
						),

					objectType:
						STRONGS_DEFINITION_OBJECT_TYPE,

					objectId:
						g1Id,

					value: {
						id:
							g1Id,

						...createStrongsContent(
							'G1'
						)
					}
				});

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						createResourceInstallationId(
							STRONGS_DEFINITION_OBJECT_TYPE,
							g1Id
						)
					)
				).toMatchObject({
					objectId:
						g1Id,

					eventId:
						eventA,

					modifiedAt:
						100
				});

				/*
				 * Descriptor B failed validation,
				 * so its installation transaction
				 * never began.
				 */
				expect(
					await db.get(
						DOMAIN_OBJECTS,
						createStoredDomainObjectId(
							STRONGS_DEFINITION_OBJECT_TYPE,
							g2Id
						)
					)
				).toBeUndefined();

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						createResourceInstallationId(
							STRONGS_DEFINITION_OBJECT_TYPE,
							g2Id
						)
					)
				).toBeUndefined();
			}
		);
	}
);

function createService(
	contents:
		readonly VerifiedResourceContent[],

	representation:
		ResourceRepresentationType =
			'content'
): StrongsResourceService {

	const discovery =
		new FakeDiscovery(
			createRepresentation(
				representation
			)
		);

	const resolver =
		new FakeResolver(
			contents
		);

	const decoder =
		createDecoder();

	const installationTransaction =
		new IndexedDBStrongsInstallationTransaction(
			getApplicationDB
		);

	const installer =
		new StrongsInstaller(
			installationTransaction
		);

	const handler =
		new StrongsResourceHandler(
			new StrongsInterpreter(),
			new StrongsValidator(),
			installer
		);

	return new StrongsResourceService(
		discovery,
		resolver,
		decoder,
		handler
	);
}

function createDecoder():
	ResourceContentDecoder {

	const builder =
		new ResourceContentDecoratorBuilder([
			{
				token:
					'application/json',

				decorate:
					(inner) =>
						new JsonResourceContentDecorator(
							inner
						)
			}
		]);

	return new ResourceContentDecoder(
		builder
	);
}

function createVerifiedContent(
	overrides:
		Partial<VerifiedResourceContent> =
			{}
): VerifiedResourceContent {

	return {
		publisher:
			'publisher',

		resourceId:
			'kjvonly/bible/strongs/kjvs',

		resourceType:
			'kjvonly/bible/strongs',

		eventId:
			'a'.repeat(
				64
			),

		modifiedAt:
			200,

		mediaType:
			'application/json',

		content:
			'{}',

		...overrides
	};
}

function createRepresentation(
	representation:
		ResourceRepresentationType
): ResourceRepresentation {

	return {
		publisher:
			'publisher',

		resourceId:
			'kjvonly/bible/strongs/kjvs',

		resourceType:
			'kjvonly/bible/strongs',

		eventId:
			'c'.repeat(
				64
			),

		modifiedAt:
			200,

		representation,

		mediaType:
			'application/json',

		payload:
			'{}'
	};
}

function createStrongsContent(
	number: string
) {
	return {
		number,

		originalWord:
			number.startsWith(
				'G'
			) ?
				'Α' :
				'אָב',

		partsOfSpeech:
			'noun',

		phoneticSpelling:
			'word',

		transliteratedWord:
			'word',

		usageByBook:
			[],

		usageByWord:
			[],

		brownDef:
			null,

		strongsDef:
			'definition',

		thayersDef:
			null
	};
}

function createPublisher():
	string {

	const value =
		crypto
			.randomUUID()
			.replaceAll(
				'-',
				''
			);

	return (
		value +
		value
	);
}

class FakeDiscovery {

	constructor(
		private readonly representation:
			ResourceRepresentation
	) {}

	async get(
		_reference:
			PublishedResourceReference
	): Promise<
		ResourceRepresentation |
		null
	> {
		return this.representation;
	}
}

class FakeResolver {

	constructor(
		private readonly contents:
			readonly VerifiedResourceContent[]
	) {}

	async resolve(
		_resource:
			ResourceRepresentation
	): Promise<
		readonly VerifiedResourceContent[]
	> {
		return this.contents;
	}
}