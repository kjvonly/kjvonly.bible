import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import type { Manifest, ResourceDefinition } from '#domain/manifest/manifest.js';
import type { SignedNostrEvent } from '#domain/event/nostr-event.js';
import { calculateEventDefinitionRevision } from '#domain/event/event-definition-revision.js';
import type { ResourceDescriptor } from '#domain/resource/resource-descriptor.js';
import type { ConcreteSource } from '#domain/source/concrete-source.js';
import type { SourceRepository } from '#ports/source/source-repository.js';
import type { EventSigner } from '#ports/nostr/event-signer.js';
import type {
	SignedEventStagingRepository,
	StagedEventEntry
} from '#ports/staging/signed-event-staging-repository.js';

import type { SourceExpander } from './source/source-expander.js';
import type { InlineEventBuilder } from './inline/inline-event-builder.js';
import type { DescriptorBackedResourceBuilder } from './descriptor/descriptor-backed-resource-builder.js';
import type { CollectionBuilder } from './collection/collection-builder.js';
import { ManifestBuildExecutor, type ManifestBuildInput } from './manifest-build-executor.js';

const publisher = 'a'.repeat(64);
const stagingRoot = resolve('/content', '.kjvonly');

const event: SignedNostrEvent = {
	id: 'b'.repeat(64),
	pubkey: publisher,
	created_at: 100,
	kind: 37770,
	tags: [],
	content: '{}',
	sig: 'c'.repeat(128)
};

const inlineResource: ResourceDefinition = {
	path: 'books/part-1.json',
	event: {
		encoding: [],
		tags: [['d', 'kjvonly/document/library/books/part-1.json']]
	}
};

function createManifest(resources: Manifest['resources'] = {}): Manifest {
	return {
		version: 1,
		kind: 37770,
		staging: { path: '.kjvonly' },
		nostr: { relays: ['wss://relay.example'] },
		strategies: {},
		resources,
		collections: {},
		filesystems: {}
	};
}

function createSource(
	resourceName: string,
	resource: ResourceDefinition
): ConcreteSource {
	return {
		resourceName,
		key: 'part-1',
		path: '/content/books/part-1.json',
		event: resource.event,
		objectUpload: resource['object-upload']
	};
}

function createStagedEntry(
	source: ConcreteSource,
	overrides: Partial<StagedEventEntry['metadata']> = {}
): StagedEventEntry {
	return {
		path: '/content/.kjvonly/resource/part-1.json',
		metadata: {
			key: source.key,
			sourceMtimeMs: 25,
			sourceSize: 8,
			definitionRevision: calculateEventDefinitionRevision({
				kind: 37770,
				event: source.event,
				publisher
			}),
			createdAt: event.created_at,
			eventId: event.id,
			...overrides
		}
	};
}

/** Creates in-memory boundaries so the executor, not its collaborators, is under test. */
function createFixture(manifest: Manifest = createManifest()) {
	const order: string[] = [];
	const sourceExpander = {
		expand: vi.fn(async (): Promise<readonly ConcreteSource[]> => [])
	};
	const sourceRepository = {
		getFileMetadata: vi.fn(async () => ({ mtimeMs: 25, size: 8 }))
	};
	const inlineEventBuilder = {
		build: vi.fn(async () => event)
	};
	const signer = {
		getPublicKey: vi.fn(async () => publisher)
	};
	const stagingRepository = {
		list: vi.fn(async (): Promise<readonly StagedEventEntry[]> => []),
		read: vi.fn(async () => event),
		stage: vi.fn(async () => {
			order.push('stage');
			return createStagedEntry(createSource('inline', inlineResource));
		}),
		remove: vi.fn(async () => {})
	};
	const descriptorBackedResourceBuilder = {
		build: vi.fn(async (): Promise<readonly ResourceDescriptor[]> => {
			order.push('descriptor');
			return [];
		})
	};
	const collectionBuilder = {
		build: vi.fn(async () => {
			order.push('collection');
		})
	};
	const filesystemBuilder = {
		build: vi.fn(async () => {
			order.push('filesystem');
		})
	};
	const logger = { verbose: vi.fn() };
	const input: ManifestBuildInput = {
		directory: '/content',
		manifest,
		origin: 'recursive-discovery'
	};

	const executor = new ManifestBuildExecutor(
		sourceExpander as unknown as SourceExpander,
		sourceRepository as unknown as SourceRepository,
		inlineEventBuilder as unknown as InlineEventBuilder,
		signer as unknown as EventSigner,
		stagingRepository as unknown as SignedEventStagingRepository,
		descriptorBackedResourceBuilder as unknown as DescriptorBackedResourceBuilder,
		collectionBuilder as unknown as CollectionBuilder,
		filesystemBuilder,
		logger
	);

	return {
		executor,
		input,
		order,
		sourceExpander,
		sourceRepository,
		inlineEventBuilder,
		signer,
		stagingRepository,
		descriptorBackedResourceBuilder,
		collectionBuilder,
		filesystemBuilder,
		logger
	};
}

describe('ManifestBuildExecutor', () => {
	it('executes an in-memory Manifest without loading YAML, even with no Resources', async () => {
		const fixture = createFixture();

		await fixture.executor.build(fixture.input);

		expect(fixture.signer.getPublicKey).toHaveBeenCalledTimes(1);
		expect(fixture.sourceExpander.expand).not.toHaveBeenCalled();
		expect(fixture.order).toEqual(['collection', 'filesystem']);
		expect(fixture.collectionBuilder.build).toHaveBeenCalledWith({
			manifest: fixture.input.manifest,
			stagingRoot,
			publisher,
			descriptorsByResource: new Map()
		});
		expect(fixture.filesystemBuilder.build).toHaveBeenCalledWith({
			manifest: fixture.input.manifest,
			stagingRoot,
			publisher
		});
	});

	it('expands and stages inline Resources before Collections and Filesystems', async () => {
		const manifest = createManifest({ inline: inlineResource });
		const fixture = createFixture(manifest);
		const source = createSource('inline', inlineResource);
		fixture.sourceExpander.expand.mockResolvedValueOnce([source]);

		await fixture.executor.build(fixture.input);

		expect(fixture.sourceExpander.expand).toHaveBeenCalledWith({
			manifestDirectory: '/content',
			resourceName: 'inline',
			resource: inlineResource
		});
		expect(fixture.stagingRepository.list).toHaveBeenCalledWith(stagingRoot, 'inline');
		expect(fixture.sourceRepository.getFileMetadata).toHaveBeenCalledWith(source.path);
		expect(fixture.inlineEventBuilder.build).toHaveBeenCalledWith(source, 37770, undefined);
		expect(fixture.stagingRepository.stage).toHaveBeenCalledWith({
			stagingRoot,
			resourceName: 'inline',
			key: source.key,
			sourceMtimeMs: 25,
			sourceSize: 8,
			definitionRevision: calculateEventDefinitionRevision({
				kind: 37770,
				event: source.event,
				publisher
			}),
			createdAt: event.created_at,
			event,
			previous: undefined
		});
		expect(fixture.order).toEqual(['stage', 'collection', 'filesystem']);
		expect(fixture.descriptorBackedResourceBuilder.build).not.toHaveBeenCalled();
	});

	it('passes descriptor-backed Resource results into the Collection phase', async () => {
		const resource: ResourceDefinition = {
			...inlineResource,
			'object-upload': { mediaType: 'application/pdf', encoding: [] }
		};
		const manifest = createManifest({ document: resource });
		const fixture = createFixture(manifest);
		const sources = [createSource('document', resource)];
		const descriptor: ResourceDescriptor = {
			metadata: {
				publisher,
				resourceId: 'kjvonly/document/library/books/part-1.json',
				resourceType: 'document',
				dataType: 'kjvonly.document',
				dataVersion: 1,
				modifiedAt: 100,
				representation: 'descriptors',
				mediaType: 'application/pdf'
			},
			strategy: { type: 'blossom', data: {} }
		};
		fixture.sourceExpander.expand.mockResolvedValueOnce(sources);
		fixture.descriptorBackedResourceBuilder.build.mockImplementationOnce(async () => {
			fixture.order.push('descriptor');
			return [descriptor];
		});

		await fixture.executor.build(fixture.input);

		expect(fixture.descriptorBackedResourceBuilder.build).toHaveBeenCalledWith({
			manifest,
			stagingRoot,
			resourceName: 'document',
			sources
		});
		expect(fixture.collectionBuilder.build).toHaveBeenCalledWith({
			manifest,
			stagingRoot,
			publisher,
			descriptorsByResource: new Map([['document', [descriptor]]])
		});
		expect(fixture.stagingRepository.list).not.toHaveBeenCalled();
		expect(fixture.sourceRepository.getFileMetadata).not.toHaveBeenCalled();
		expect(fixture.inlineEventBuilder.build).not.toHaveBeenCalled();
		expect(fixture.order).toEqual(['descriptor', 'collection', 'filesystem']);
	});

	it('reuses unchanged staged Resources and removes obsolete staged keys', async () => {
		const fixture = createFixture(createManifest({ inline: inlineResource }));
		const source = createSource('inline', inlineResource);
		const existing = createStagedEntry(source);
		const obsolete = createStagedEntry(source, { key: 'old-part' });
		fixture.sourceExpander.expand.mockResolvedValueOnce([source]);
		fixture.stagingRepository.list.mockResolvedValueOnce([existing, obsolete]);

		await fixture.executor.build(fixture.input);

		expect(fixture.stagingRepository.read).toHaveBeenCalledTimes(1);
		expect(fixture.stagingRepository.read).toHaveBeenCalledWith(existing);
		expect(fixture.inlineEventBuilder.build).not.toHaveBeenCalled();
		expect(fixture.stagingRepository.stage).not.toHaveBeenCalled();
		expect(fixture.stagingRepository.remove).toHaveBeenCalledTimes(1);
		expect(fixture.stagingRepository.remove).toHaveBeenCalledWith(obsolete);
		expect(fixture.logger.verbose).toHaveBeenCalledWith('build.resource.reused', {
			resourceName: 'inline', key: source.key, eventId: event.id
		});
		expect(fixture.order).toEqual(['collection', 'filesystem']);
	});

	it('rebuilds changed Resources while passing the previous event timestamp', async () => {
		const fixture = createFixture(createManifest({ inline: inlineResource }));
		const source = createSource('inline', inlineResource);
		const previous = createStagedEntry(source, { sourceMtimeMs: 24 });
		fixture.sourceExpander.expand.mockResolvedValueOnce([source]);
		fixture.stagingRepository.list.mockResolvedValueOnce([previous]);

		await fixture.executor.build(fixture.input);

		expect(fixture.inlineEventBuilder.build).toHaveBeenCalledWith(
			source, 37770, event.created_at
		);
		expect(fixture.stagingRepository.stage).toHaveBeenCalledWith(
			expect.objectContaining({ previous, event })
		);
		expect(fixture.stagingRepository.remove).not.toHaveBeenCalled();
	});

	it('does not build Filesystems after a Collection failure', async () => {
		const fixture = createFixture();
		fixture.collectionBuilder.build.mockRejectedValueOnce(new Error('collection failure'));

		await expect(fixture.executor.build(fixture.input)).rejects.toThrow('collection failure');

		expect(fixture.filesystemBuilder.build).not.toHaveBeenCalled();
	});

	it('does not build Collections or Filesystems after a Resource failure', async () => {
		const fixture = createFixture(createManifest({ inline: inlineResource }));
		fixture.sourceExpander.expand.mockRejectedValueOnce(new Error('source missing'));

		await expect(fixture.executor.build(fixture.input)).rejects.toThrow('source missing');

		expect(fixture.collectionBuilder.build).not.toHaveBeenCalled();
		expect(fixture.filesystemBuilder.build).not.toHaveBeenCalled();
	});
});
