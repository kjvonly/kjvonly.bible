import {
	describe,
	expect,
	it
} from 'vitest';

import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	createStoredDomainObjectId,
	type ApplicationDB,
	type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';

import {
	GenericResourceInstaller,
	ResourceDataTypeResolver,
	ResourceDomainObjectFactoryResolver,
	createResourceInstallationId,
	type DecodedResourceContent,
	type GenericResourceInstallationTransaction,
	type ResourceInstallOutcome,
	type ResourceInstallation
} from '$lib/resource';

import {
	NORMALIZED_CONTENT_TEXT_MARKUP_DATA_TYPE,
	NORMALIZED_CONTENT_TEXT_MARKUP_DATA_VERSION,
	NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE,
	NormalizedContentTextMarkupDataTypeHandler,
	NormalizedContentTextMarkupDomainObjectFactory,
	NormalizedContentTextMarkupResourcePublication,
	createNormalizedContentTextMarkupId,
	type NormalizedContentTextMarkup
} from '$lib/domains/normalized-content';

import {
	KJVOnlyArchiveCodec
} from '../kjvonly-archive-codec';

import {
	KJVOnlyArchiveExporter
} from '../kjvonly-archive-exporter';

import {
	KJVOnlyArchiveImporter
} from '../kjvonly-archive-importer';

import {
	createArchivePublicationResolver
} from './kjvonly-archive-worker-composition';

/** Models only the Domain Object and Resource Installation storage used here. */
class ArchiveStores {
	readonly objects = new Map<string, StoredDomainObject>();
	readonly installations = new Map<string, ResourceInstallation>();

	asDB(): ApplicationDB {
		return {
			get: async (store: string, id: string) =>
				store === DOMAIN_OBJECTS
					? this.objects.get(id)
					: this.installations.get(id),
			getAll: async (store: string) =>
				store === RESOURCE_INSTALLATIONS
					? [...this.installations.values()]
					: [...this.objects.values()]
		} as unknown as ApplicationDB;
	}
}

/** Emulates the result of a durable local Text Markup write before export. */
function storeAcceptedMarkup(
	stores: ArchiveStores,
	markup: NormalizedContentTextMarkup,
	modifiedAt: number
): void {
	const id = createStoredDomainObjectId(
		NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE,
		markup.id
	);

	const publication =
		new NormalizedContentTextMarkupResourcePublication().create(markup);

	stores.objects.set(id, {
		id,
		objectType: NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE,
		objectId: markup.id,
		dataType: NORMALIZED_CONTENT_TEXT_MARKUP_DATA_TYPE,
		dataVersion: NORMALIZED_CONTENT_TEXT_MARKUP_DATA_VERSION,
		value: markup
	});

	stores.installations.set(id, {
		id,
		objectType: NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE,
		objectId: markup.id,
		publisher: publication.publisher,
		modifiedAt
	});
}

function createMarkup(
	documentModifiedAt: number,
	color: string
): NormalizedContentTextMarkup {
	return {
		id: createNormalizedContentTextMarkupId(
			'markup-publisher',
			'document-publisher',
			'articles/a%2Fb',
			documentModifiedAt
		),
		document: {
			publisher: 'document-publisher',
			resourceId: 'articles/a%2Fb',
			modifiedAt: documentModifiedAt
		},
		markings: {
			'paragraph-1': {
				'2': { class: [color] }
			}
		}
	};
}

/** Installs decoded archive Resources through the real generic validation path. */
function createImporter(
	stores: ArchiveStores,
	codec: KJVOnlyArchiveCodec
): KJVOnlyArchiveImporter {
	const transaction: GenericResourceInstallationTransaction = {
		run: async (operation) => operation({
			domainObjects: {
				put: async (object) => {
					stores.objects.set(object.id, object);
				}
			},
			resourceInstallations: {
				get: async (objectType, objectId) =>
					stores.installations.get(
						createResourceInstallationId(objectType, objectId)
					),
				put: async (installation) => {
					stores.installations.set(installation.id, installation);
				}
			}
		})
	};

	const installer = new GenericResourceInstaller(
		new ResourceDataTypeResolver([
			new NormalizedContentTextMarkupDataTypeHandler()
		]),
		new ResourceDomainObjectFactoryResolver([
			new NormalizedContentTextMarkupDomainObjectFactory()
		]),
		transaction
	);

	return new KJVOnlyArchiveImporter(
		async () => stores.asDB(),
		createArchivePublicationResolver(),
		{
			processDecoded: async (
				resource: DecodedResourceContent
			): Promise<ResourceInstallOutcome> => {
				await installer.install(resource);

				return {
					status: 'handled',
					resourceType: resource.resourceType,
					reference: {
						publisher: resource.publisher,
						resourceId: resource.resourceId
					}
				};
			}
		},
		codec
	);
}

describe('Normalized Content Text Markup archive round-trip', () => {
	it('restores exact highlights for distinct document snapshots without merging them', async () => {
		const source = new ArchiveStores();
		const snapshot42 = createMarkup(42, 'bg-highlighta');
		const snapshot43 = createMarkup(43, 'bg-highlightb');

		storeAcceptedMarkup(source, snapshot42, 100);
		storeAcceptedMarkup(source, snapshot43, 101);

		const codec = new KJVOnlyArchiveCodec();
		const exporter = new KJVOnlyArchiveExporter(async () => source.asDB());
		const bytes = await codec.encode(await exporter.export({
			types: [{ objectType: NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE }]
		}));

		const restored = new ArchiveStores();
		const importer = createImporter(restored, codec);
		const first = await importer.import(bytes);

		expect(first.resources.map((resource) => resource.status)).toEqual([
			'handled',
			'handled'
		]);

		for (const [markup, revision] of [
			[snapshot42, 100],
			[snapshot43, 101]
		] as const) {
			const id = createStoredDomainObjectId(
				NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE,
				markup.id
			);

			expect(restored.objects.get(id)?.value).toEqual(markup);
			expect(restored.installations.get(id)).toMatchObject({
				publisher: 'markup-publisher',
				modifiedAt: revision,
				resourceId: new NormalizedContentTextMarkupResourcePublication()
					.create(markup).resourceId
			});
		}

		const second = await importer.import(bytes);
		expect(second.resources.map((resource) => resource.status)).toEqual([
			'current',
			'current'
		]);
	});

	it('does not replace a newer locally accepted highlight during archive import', async () => {
		const source = new ArchiveStores();
		const oldMarkup = createMarkup(42, 'bg-highlighta');
		storeAcceptedMarkup(source, oldMarkup, 100);

		const codec = new KJVOnlyArchiveCodec();
		const bytes = await codec.encode(
			await new KJVOnlyArchiveExporter(async () => source.asDB()).export({
				types: [{ objectType: NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE }]
			})
		);

		const restored = new ArchiveStores();
		const newer = createMarkup(42, 'bg-highlightc');
		storeAcceptedMarkup(restored, newer, 200);

		const result = await createImporter(restored, codec).import(bytes);
		const id = createStoredDomainObjectId(
			NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE,
			newer.id
		);

		expect(result.resources.map((resource) => resource.status)).toEqual([
			'current'
		]);
		expect(restored.objects.get(id)?.value).toEqual(newer);
		expect(restored.installations.get(id)?.modifiedAt).toBe(200);
	});
});
