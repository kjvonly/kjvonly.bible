import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	RESOURCE_INSTALLATIONS,
	type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	ResourcePublicationResolver,
	type DecodedResourceContent,
	type ResourceInstallOutcome,
	type ResourceInstallation
} from '$lib/resource';

import {
	KJVONLY_ARCHIVE_VERSION,
	type KJVOnlyArchiveV1
} from './kjvonly-archive';

import {
	KJVOnlyArchiveImporter
} from './kjvonly-archive-importer';

describe(
	'KJVOnlyArchiveImporter',
	() => {
		it(
			'skips an archived Resource revision that is not newer than local state',
			async () => {
				const archive =
					createArchive();

				const publicationCreate =
					vi.fn();

				const processDecoded =
					vi.fn();

				const importer =
					createImporter({
						archive,
						localInstallations: [
							createInstallation({
								modifiedAt:
									100
							})
						],
						publicationCreate,
						processDecoded
					});

				const result =
					await importer.import(
						new Uint8Array()
					);

				expect(
					result.resources
				).toEqual([
					{
						id:
							'note:publisher/default/note-1',
						status:
							'current',
						resourceId:
							'kjvonly/notes/entries/default/note-1'
					}
				]);

				expect(
					publicationCreate
				).not.toHaveBeenCalled();

				expect(
					processDecoded
				).not.toHaveBeenCalled();
			}
		);

		it(
			'reconstructs a newer archived Domain Object as decoded Resource content',
			async () => {
				const archive =
					createArchive({
						domainValue: {
							id:
								'publisher/default/note-1',
							text:
								'archived note'
						}
					});

				const processDecoded =
					vi.fn(
						async (
							resource:
								DecodedResourceContent
						): Promise<ResourceInstallOutcome> => ({
							reference: {
								publisher:
									resource.publisher,
								resourceId:
									resource.resourceId
							},
							resourceType:
								resource.resourceType,
							status:
								'handled'
						})
					);

				const importer =
					createImporter({
						archive,
						localInstallations: [
							createInstallation({
								modifiedAt:
									99
							})
						],
						processDecoded
					});

				const result =
					await importer.import(
						new Uint8Array()
					);

				expect(
					processDecoded
				).toHaveBeenCalledWith({
					publisher:
						'publisher',
					resourceType:
						'kjvonly/notes/entries',
					resourceId:
						'kjvonly/notes/entries/default/note-1',
					modifiedAt:
						100,
					mediaType:
						'application/json+gzip+hex',
					value: {
						text:
							'resource note'
					}
				});

				expect(
					result.resources
				).toEqual([
					{
						id:
							'note:publisher/default/note-1',
						status:
							'handled',
						resourceType:
							'kjvonly/notes/entries',
						resourceId:
							'kjvonly/notes/entries/default/note-1'
					}
				]);
			}
		);

		it(
			'processes an archived Resource when there is no local Resource Installation',
			async () => {
				const processDecoded =
					vi.fn(
						async (
							resource:
								DecodedResourceContent
						): Promise<ResourceInstallOutcome> => ({
							reference: {
								publisher:
									resource.publisher,
								resourceId:
									resource.resourceId
							},
							resourceType:
								resource.resourceType,
							status:
								'handled'
						})
					);

				const importer =
					createImporter({
						processDecoded
					});

				await importer.import(
					new Uint8Array()
				);

				expect(
					processDecoded
				).toHaveBeenCalledTimes(
					1
				);
			}
		);

		it(
			'reports a Domain object type without publication preparation as unsupported',
			async () => {
				const archive =
					createArchive({
						objectType:
							'bible/chapter'
					});

				const processDecoded =
					vi.fn();

				const importer =
					createImporter({
						archive,
						registrations:
							[],
						processDecoded
					});

				const result =
					await importer.import(
						new Uint8Array()
					);

				expect(
					result.resources[0]
				).toEqual({
					id:
						'note:publisher/default/note-1',
					status:
						'unsupported'
				});

				expect(
					processDecoded
				).not.toHaveBeenCalled();
			}
		);

		it(
			'rejects reconstructed Resource identity with a different publisher',
			async () => {
				const processDecoded =
					vi.fn();

				const importer =
					createImporter({
						publicationPublisher:
							'other-publisher',
						processDecoded
					});

				const result =
					await importer.import(
						new Uint8Array()
					);

				expect(
					result.resources[0]
						.status
				).toBe(
					'failed'
				);

				expect(
					result.resources[0]
						.error
				).toEqual(
					expect.objectContaining({
						message:
							'Archived Resource publisher does not match Resource Installation for note:publisher/default/note-1.'
					})
				);

				expect(
					processDecoded
				).not.toHaveBeenCalled();
			}
		);
	}
);

function createImporter(
	options: {
		readonly archive?:
			KJVOnlyArchiveV1;

		readonly localInstallations?:
			readonly ResourceInstallation[];

		readonly registrations?:
			ConstructorParameters<
				typeof ResourcePublicationResolver
			>[0];

		readonly publicationCreate?:
			ReturnType<typeof vi.fn>;

		readonly publicationPublisher?:
			string;

		readonly processDecoded?:
			ReturnType<typeof vi.fn>;
	} = {}
): KJVOnlyArchiveImporter {
	const archive =
		options.archive ??
		createArchive();

	const local =
		new Map(
			(
				options.localInstallations ??
				[]
			).map(
				installation => [
					installation.id,
					installation
				]
			)
		);

	const db = {
		get:
			async (
				storeName: string,
				id: string
			) => {
				if (
					storeName !==
						RESOURCE_INSTALLATIONS
				) {
					throw new Error(
						`Unexpected store: ${storeName}`
					);
				}

				return local.get(
					id
				);
			}
	} as unknown as Pick<
		ApplicationDB,
		'get'
	>;

	const publicationCreate =
		options.publicationCreate ??
		vi.fn(
			() => ({
				type:
					'resource' as const,
				publisher:
					options.publicationPublisher ??
					'publisher',
				resourceType:
					'kjvonly/notes/entries',
				resourceId:
					'kjvonly/notes/entries/default/note-1',
				representation:
					'content' as const,
				mediaType:
					'application/json+gzip+hex',
				value: {
					text:
						'resource note'
				}
			})
		);

	const publications =
		new ResourcePublicationResolver(
			options.registrations ?? [
				{
					objectType:
						'note',
					create:
						publicationCreate
				}
			]
		);

	const processDecoded =
		options.processDecoded ??
		vi.fn(
			async (
				resource:
					DecodedResourceContent
			): Promise<ResourceInstallOutcome> => ({
				reference: {
					publisher:
						resource.publisher,
					resourceId:
						resource.resourceId
				},
				resourceType:
					resource.resourceType,
				status:
					'handled'
			})
		);

	return new KJVOnlyArchiveImporter(
		async () => db,
		publications,
		{
			processDecoded
		},
		{
			decode:
				async () => archive
		}
	);
}

function createArchive(
	overrides: {
		readonly objectType?:
			string;

		readonly domainValue?:
			unknown;
	} = {}
): KJVOnlyArchiveV1 {
	const id =
		'note:publisher/default/note-1';

	const objectType =
		overrides.objectType ??
		'note';

	return {
		version:
			KJVONLY_ARCHIVE_VERSION,
		domain_objects: {
			[id]: {
				id,
				objectType,
				objectId:
					'publisher/default/note-1',
				value:
					overrides.domainValue ?? {
						id:
							'publisher/default/note-1'
					}
			}
		},
		resource_installations: {
			[id]:
				createInstallation({
					objectType
				})
		}
	};
}

function createInstallation(
	overrides:
		Partial<ResourceInstallation> =
		{}
): ResourceInstallation {
	return {
		id:
			'note:publisher/default/note-1',
		objectType:
			'note',
		objectId:
			'publisher/default/note-1',
		publisher:
			'publisher',
		resourceId:
			'kjvonly/notes/entries/default/note-1',
		modifiedAt:
			100,
		...overrides
	};
}
