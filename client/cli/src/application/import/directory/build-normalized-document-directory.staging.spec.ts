import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, readdir, readlink, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { verifyEvent } from 'nostr-tools/pure';
import { NormalizedDocumentValidator } from '@kjvonly/normalized-content';
import { GzipEncoder } from '#adapters/encoding/gzip-encoder.js';
import { HexEncoder } from '#adapters/encoding/hex-encoder.js';
import { NodeSourceRepository } from '#adapters/source/node-source-repository.js';
import { NodeSignedEventStagingRepository } from '#adapters/staging/node-signed-event-staging-repository.js';
import { NodeCollectionEventStagingRepository } from '#adapters/staging/node-collection-event-staging-repository.js';
import { NodeFilesystemEventStagingRepository } from '#adapters/staging/node-filesystem-event-staging-repository.js';
import { NodeArtifactStagingRepository } from '#adapters/staging/node-artifact-staging-repository.js';
import { NodeNostrEventStagingRepository } from '#adapters/staging/node-nostr-event-staging-repository.js';
import { NodeManifestLoader } from '#adapters/manifest/node-manifest-loader.js';
import { BlossomArtifactPublisher } from '#application/publish/blossom/blossom-artifact-publisher.js';
import { NostrStagedEventPublisher } from '#application/publish/nostr/nostr-staged-event-publisher.js';
import { PublicationPreflight } from '#application/publish/preflight/publication-preflight.js';
import { PublishManifestUseCase } from '#application/publish/publish-manifest.js';
import { LocalNostrSigner } from '#adapters/nostr/signer/local-nostr-signer.js';
import { BlossomDescriptorStrategyBuilder } from '#adapters/strategy/blossom-descriptor-strategy-builder.js';
import { NodeImportDirectoryWalker } from '#adapters/import/node-import-directory-walker.js';
import { NodeImportContentReader } from '#adapters/import/node-import-content-reader.js';
import { NodeGeneratedManifestWriter } from '#adapters/import/node-generated-manifest-writer.js';
import { NodeImportStagingWorkspace } from '#adapters/import/node-import-staging-workspace.js';
import { ManifestBuildExecutor } from '#application/build/manifest-build-executor.js';
import { EncodingRegistry } from '#application/build/encoding/encoding-registry.js';
import { SourceExpander } from '#application/build/source/source-expander.js';
import { InlineEventBuilder } from '#application/build/inline/inline-event-builder.js';
import { ObjectArtifactStager } from '#application/build/artifact/object-artifact-stager.js';
import { DescriptorBackedResourceBuilder } from '#application/build/descriptor/descriptor-backed-resource-builder.js';
import { DescriptorEventBuilder } from '#application/build/descriptor/descriptor-event-builder.js';
import { DescriptorStrategyRegistry } from '#application/build/descriptor/descriptor-strategy-registry.js';
import { ResourceDescriptorBuilder } from '#application/build/descriptor/resource-descriptor-builder.js';
import { NostrEventResourceDescriptorBuilder } from '#application/build/descriptor/nostr-event-resource-descriptor-builder.js';
import { CollectionBuilder } from '#application/build/collection/collection-builder.js';
import { CollectionEventBuilder } from '#application/build/collection/collection-event-builder.js';
import { FilesystemBuilder } from '#application/build/filesystem/filesystem-builder.js';
import { FilesystemContentBuilder } from '#application/build/filesystem/filesystem-content-builder.js';
import { FilesystemEventBuilder } from '#application/build/filesystem/filesystem-event-builder.js';
import { FilesystemImportClassifier } from '../classification/filesystem-import-classifier.js';
import { NormalizedDocumentRecognizer } from '../classification/recognizers/normalized-document-recognizer.js';
import { FilesystemSemanticImportResolver } from '../resolution/filesystem-semantic-import-resolver.js';
import { SemanticTypeRegistry } from '../../semantic/semantic-type-registry.js';
import { createNormalizedDocumentSemanticType } from '../../semantic/definitions/normalized-document-semantic-type.js';
import { NormalizedDocumentManifestCompiler } from '../manifest/normalized-document-manifest-compiler.js';
import { BuildNormalizedDocumentImport } from '../manifest/build-normalized-document-import.js';
import { BuildNormalizedDocumentDirectory } from './build-normalized-document-directory.js';
import { validateManifest, type Manifest } from '#domain/manifest/manifest.js';
import type { SignedNostrEvent } from '#domain/event/nostr-event.js';

const tempDirectories: string[] = [];
const smallPath = 'books/short.nd.json';
const largePath = 'sermons/long.nd.json';
const stagingDirectoryName = '.staging';

/** Creates the real Node adapters, signed-event builders and directory importer without network publication. */
function createImporter(workspace: string, manifest: Manifest) {
	const source = join(workspace, 'source');
	const config = join(workspace, 'config');
	const output = join(workspace, 'output', 'published.json');
	const staging = join(config, stagingDirectoryName);
	const sourceRepository = new NodeSourceRepository();
	const resources = new NodeSignedEventStagingRepository();
	const artifacts = new NodeArtifactStagingRepository();
	const collections = new NodeCollectionEventStagingRepository();
	const filesystems = new NodeFilesystemEventStagingRepository();
	const signer = new LocalNostrSigner('01'.repeat(32));
	const clock = { nowEpochSeconds: () => 1_000 };
	const logger = { verbose: (_message: string, _context?: unknown) => {} };
	const encoding = new EncodingRegistry([new GzipEncoder(), new HexEncoder()]);
	const resourceDescriptors = new ResourceDescriptorBuilder();
	const nostrDescriptors = new NostrEventResourceDescriptorBuilder();
	const executor = new ManifestBuildExecutor(
		new SourceExpander(sourceRepository),
		sourceRepository,
		new InlineEventBuilder(sourceRepository, encoding, signer, clock),
		signer,
		resources,
		new DescriptorBackedResourceBuilder(
			new ObjectArtifactStager(sourceRepository, encoding, artifacts, logger),
			new DescriptorStrategyRegistry([new BlossomDescriptorStrategyBuilder()]),
			new DescriptorEventBuilder(encoding, signer, clock, resourceDescriptors),
			resourceDescriptors, signer, resources, logger
		),
		new CollectionBuilder(
			new CollectionEventBuilder(encoding, signer, clock),
			nostrDescriptors, collections, logger
		),
		new FilesystemBuilder(
			new FilesystemContentBuilder(resources, collections, nostrDescriptors),
			new FilesystemEventBuilder(encoding, signer, clock),
			filesystems, logger
		),
		logger
	);
	const semanticRegistry = new SemanticTypeRegistry([
		createNormalizedDocumentSemanticType(new NormalizedDocumentValidator())
	]);
	const importer = new BuildNormalizedDocumentImport(
		new FilesystemSemanticImportResolver(
			new FilesystemImportClassifier([new NormalizedDocumentRecognizer()]),
			semanticRegistry
		),
			path => new NodeImportContentReader(path),
			new NormalizedDocumentManifestCompiler(),
			executor
	);
	let currentStaging = staging;
	let failManifestWrite = false;
	const workflow = new BuildNormalizedDocumentDirectory(
		new NodeImportDirectoryWalker(),
		{ load: async () => ({ path: join(config, 'manifest.yaml'), directory: config, manifest }) },
		importer,
		{ write: async (path, generated) => {
			if (failManifestWrite) throw new Error('publication Manifest write failed');
			await new NodeGeneratedManifestWriter().write(path, generated);
		} },
		new NodeImportStagingWorkspace()
	);
	const useCase = { build: async (request: Parameters<typeof workflow.build>[0]) => {
		const result = await workflow.build(request);
		currentStaging = result.staging.path;
		return result;
	} };
	return {
		useCase, resources, artifacts, collections, filesystems, sourceRepository, signer, logger,
		get staging() { return currentStaging; },
		setManifestWriteFailure(enabled: boolean) { failManifestWrite = enabled; },
		output, source,
		request: {
			directory: source,
			manifestPath: join(config, 'manifest.yaml'),
			outputManifestPath: output,
			filesystemRoot: 'library'
		}
	};
}

function eventTags(event: SignedNostrEvent): Record<string, string> {
	return Object.fromEntries(event.tags.map(([name, value]) => [name, value]));
}

async function writeDocument(root: string, relativePath: string, contents: string) {
	const path = resolve(root, relativePath);
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, contents);
	return path;
}

async function createFixture() {
	const workspace = await mkdtemp(join(tmpdir(), 'kjvonly-normalized-staging-'));
	tempDirectories.push(workspace);
	const manifest = validateManifest({
		version: 1,
		kind: 37770,
		staging: { path: stagingDirectoryName },
		nostr: { relays: ['wss://relay.example'] },
		defaults: { strategy: 'main' },
		strategies: { main: { type: 'blossom', urls: ['https://blossom.example'] } }
	});
	const fixture = createImporter(workspace, manifest);
	const smallContents = '{"blocks":[]}';
	const largeContents = smallContents + ' '.repeat(1024 * 1024);
	await writeDocument(fixture.source, smallPath, smallContents);
	await writeDocument(fixture.source, largePath, largeContents);
	await writeDocument(fixture.source, 'not-a-document.txt', 'ignored');
	// Preserve the live `staging` getter: object spread would snapshot the
	// baseline directory before the first import selects a staging generation.
	return Object.assign(fixture, { smallContents, largeContents });
}

async function stagedResource(fixture: ReturnType<typeof createImporter>, manifest: Manifest, path: string) {
	const match = Object.entries(manifest.resources).find(([, resource]) => resource.path === path);
	if (!match) throw new Error(`Missing Resource definition for ${path}`);
	const [name] = match;
	const entries = await fixture.resources.list(fixture.staging, name);
	expect(entries).toHaveLength(1);
	return { name, event: await fixture.resources.read(entries[0]!) };
}

afterEach(async () => {
	for (const directory of tempDirectories.splice(0)) {
		await rm(directory, { recursive: true, force: true });
	}
});

describe('Normalized Document directory — real signed staging', () => {
	it('signs inline and Blossom-backed Resources and a Filesystem with matching descriptors', async () => {
		const fixture = await createFixture();
		const manifest = await fixture.useCase.build(fixture.request);
		const savedManifest = validateManifest(JSON.parse(await readFile(fixture.output, 'utf8')));
		expect(savedManifest).toEqual(manifest);
		expect(manifest.staging.path).toBe(fixture.staging);
		expect(resolve(dirname(fixture.output), savedManifest.staging.path)).toBe(fixture.staging);
		expect(Object.keys(manifest.resources)).toHaveLength(2);

		const inline = await stagedResource(fixture, manifest, smallPath);
		const external = await stagedResource(fixture, manifest, largePath);
		for (const { event } of [inline, external]) expect(verifyEvent(event)).toBe(true);
		expect(eventTags(inline.event)).toMatchObject({
			d: `kjvonly/normalized-content/documents/library/${smallPath}`,
			t: 'normalized-content/document', dataType: 'kjvonly.normalized-document',
			dataVersion: '1', representation: 'content'
		});
		expect(JSON.parse(gunzipSync(Buffer.from(inline.event.content, 'hex')).toString('utf8')))
			.toEqual({ blocks: [] });
		expect(eventTags(external.event)).toMatchObject({
			d: `kjvonly/normalized-content/documents/library/${largePath}`,
			representation: 'descriptors'
		});
		const externalDescriptors = JSON.parse(gunzipSync(Buffer.from(external.event.content, 'hex')).toString('utf8'));
		expect(externalDescriptors).toHaveLength(1);
		expect(externalDescriptors[0].metadata.resourceId)
			.toBe(`kjvonly/normalized-content/documents/library/${largePath}`);
		const stagedArtifacts = await fixture.artifacts.list(fixture.staging, external.name);
		expect(stagedArtifacts).toHaveLength(1);
		expect(externalDescriptors[0].strategy.type).toBe('blossom');
		expect(externalDescriptors[0].strategy.data.sha256).toBe(stagedArtifacts[0]?.metadata.sha256);
		expect(stagedArtifacts[0]?.kind).toBe('symlink');
		expect(await readlink(stagedArtifacts[0]!.path)).toBe(join(fixture.source, largePath));

		const stagedFilesystems = await fixture.filesystems.list(fixture.staging);
		expect(stagedFilesystems).toHaveLength(1);
		const filesystemEvent = await fixture.filesystems.read(stagedFilesystems[0]!);
		expect(verifyEvent(filesystemEvent)).toBe(true);
		expect(eventTags(filesystemEvent)).toMatchObject({
			d: 'kjvonly/filesystem/library', f: 'library',
			t: 'filesystem/entry', dataType: 'kjvonly.filesystem.entries',
			dataVersion: '1', representation: 'content'
		});
		const mappings = JSON.parse(Buffer.from(filesystemEvent.content, 'hex').toString('utf8'));
		expect(Object.keys(mappings).sort()).toEqual([`library/${smallPath}`, `library/${largePath}`].sort());
		for (const [path, event] of [[smallPath, inline.event], [largePath, external.event]] as const) {
			const descriptor = mappings[`library/${path}`].descriptor;
			expect(descriptor.metadata.resourceId).toBe(eventTags(event).d);
			expect(descriptor.metadata.publisher).toBe(event.pubkey);
			expect(descriptor.metadata.modifiedAt).toBe(event.created_at);
			expect(descriptor.strategy.type).toBe('nostr');
		}
	});

	it('reuses unchanged signed events and only rebuilds changed Resource and dependent Filesystem', async () => {
		const fixture = await createFixture();
		const first = await fixture.useCase.build(fixture.request);
		const firstSmall = (await stagedResource(fixture, first, smallPath)).event;
		const firstLarge = (await stagedResource(fixture, first, largePath)).event;
		const firstFilesystem = await fixture.filesystems.list(fixture.staging);
		expect(firstFilesystem).toHaveLength(1);

		const firstStaging = fixture.staging;
		const second = await fixture.useCase.build(fixture.request);
		expect(second.staging.path).not.toBe(firstStaging);
		expect((await fixture.resources.list(firstStaging, Object.keys(first.resources)[0]!)).length).toBeGreaterThan(0);
		expect((await stagedResource(fixture, second, smallPath)).event.id).toBe(firstSmall.id);
		expect((await stagedResource(fixture, second, largePath)).event.id).toBe(firstLarge.id);
		expect((await fixture.filesystems.list(fixture.staging))[0]?.eventId).toBe(firstFilesystem[0]?.eventId);

		await writeDocument(fixture.source, smallPath, '{"blocks":[]}\n\n');
		const third = await fixture.useCase.build(fixture.request);
		const changed = (await stagedResource(fixture, third, smallPath)).event;
		expect(changed.id).not.toBe(firstSmall.id);
		expect(eventTags(changed).d).toBe(eventTags(firstSmall).d);
		expect((await stagedResource(fixture, third, largePath)).event.id).toBe(firstLarge.id);
		expect((await fixture.filesystems.list(fixture.staging))[0]?.eventId).not.toBe(firstFilesystem[0]?.eventId);
	});
	it('preserves the published Manifest and staging on a failed later commit', async () => {
		const fixture = await createFixture();
		await fixture.useCase.build(fixture.request);
		const previousRoot = fixture.staging;
		const previousManifest = await readFile(fixture.output, 'utf8');
		const previousEntries = await fixture.filesystems.list(previousRoot);
		fixture.setManifestWriteFailure(true);
		await writeDocument(fixture.source, smallPath, '{"blocks":[]}\n');
		await expect(fixture.useCase.build(fixture.request)).rejects.toThrow('publication Manifest write failed');
		expect(await readFile(fixture.output, 'utf8')).toBe(previousManifest);
		expect((await fixture.filesystems.list(previousRoot)).map(entry => entry.eventId))
			.toEqual(previousEntries.map(entry => entry.eventId));
		expect(fixture.staging).toBe(previousRoot);
	});
});


describe('Normalized Document directory — generated Manifest publication', () => {
	/** Uses the real generated Manifest loader, staged-artifact publisher and Nostr event publisher.
	 * Network endpoints are replaced by recording adapters so this test requires no relay or Blossom server.
	 */
	function createPublisher(fixture: ReturnType<typeof createImporter>) {
		const calls: string[] = [];
		const published = new Set<string>();
		const loader = new NodeManifestLoader({
			workingDirectory: dirname(fixture.output),
			runtimeEnvironment: {}
		});
		const preflight = new PublicationPreflight(
			{ check: async () => { calls.push('preflight:nostr'); } },
			{ check: async () => { calls.push('preflight:blossom'); } },
			fixture.logger
		);
		const blossom = new BlossomArtifactPublisher(
			fixture.artifacts,
			fixture.sourceRepository,
			{
				ensure: async request => {
					calls.push('blossom');
					expect(request.serverUrl).toBe('https://blossom.example');
					expect(request.mediaType).toBe('application/json');
					expect(request.artifactPath).toContain(fixture.staging);
					expect(request.size).toBeGreaterThan(1024 * 1024);
					return 'uploaded' as const;
				}
			},
			fixture.logger
		);
		const nostr = new NostrStagedEventPublisher(
			new NodeNostrEventStagingRepository(
				fixture.resources, fixture.collections, fixture.filesystems
			),
			fixture.signer,
			{
				// Reconciliation order must never control actual publication order.
				reconcile: async request => request.events
					.map(entry => entry.eventId)
					.filter(id => !published.has(id))
					.reverse()
			},
			{
				publish: async (relay, event) => {
					expect(relay).toBe('wss://relay.example');
					expect(verifyEvent(event)).toBe(true);
					calls.push(eventTags(event).t === 'filesystem/entry' ? 'nostr:filesystem' : 'nostr:resource');
					published.add(event.id);
				}
			},
			fixture.logger
		);
		return {
			calls, published,
			publisher: new PublishManifestUseCase(loader, preflight, blossom, nostr, fixture.logger)
		};
	}

	it('loads the generated JSON Manifest, publishes the staged Blossom object first, then signed Resources and Filesystem', async () => {
		const fixture = await createFixture();
		const manifest = await fixture.useCase.build(fixture.request);
		const { publisher, calls, published } = createPublisher(fixture);

		const first = await publisher.publish(fixture.output);
		expect(first.filter(result => result.type === 'blossom')).toHaveLength(1);
		expect(first.filter(result => result.type === 'nostr')).toHaveLength(3);
		expect(published.size).toBe(3);
		expect(calls.slice(2)).toEqual([
			'blossom', 'nostr:resource', 'nostr:resource', 'nostr:filesystem'
		]);
		const staged = await Promise.all([
			stagedResource(fixture, manifest, smallPath),
			stagedResource(fixture, manifest, largePath)
		]);
		for (const { event } of staged) expect(published.has(event.id)).toBe(true);
		const filesystemEntries = await fixture.filesystems.list(fixture.staging);
		expect(published.has(filesystemEntries[0]!.eventId)).toBe(true);

		// The relay already contains all staged events on the second publication.
		const before = calls.length;
		const second = await publisher.publish(fixture.output);
		expect(second.filter(result => result.type === 'nostr' && (result.data as { status: string }).status === 'already-present'))
			.toHaveLength(3);
		expect(calls.slice(before).filter(call => call.startsWith('nostr:'))).toEqual([]);
	});

	it('preserves the last publishable generation when a later document fails semantic validation', async () => {
		const fixture = await createFixture();
		const previous = await fixture.useCase.build(fixture.request);
		const previousManifest = await readFile(fixture.output, 'utf8');
		const previousStaging = fixture.staging;
		const generationDirectory = dirname(previousStaging);
		const generations = async () => (await readdir(generationDirectory))
			.filter(name => name.startsWith(`${stagingDirectoryName}.import-`)).sort();
		const previousGenerations = await generations();
		const previousResource = await stagedResource(fixture, previous, smallPath);
		const previousFilesystem = (await fixture.filesystems.list(previousStaging))[0]!;

		await writeDocument(fixture.source, 'books/failed.nd.json', '{"blocks":[42]}');
		await expect(fixture.useCase.build(fixture.request))
			.rejects.toThrow('books/failed.nd.json');

		// Failed imports must not change the publication pointer, mutate staged
		// signed events, or leave a partially built generation behind.
		expect(await readFile(fixture.output, 'utf8')).toBe(previousManifest);
		expect(fixture.staging).toBe(previousStaging);
		expect(await generations()).toEqual(previousGenerations);
		expect((await stagedResource(fixture, previous, smallPath)).event.id)
			.toBe(previousResource.event.id);
		expect((await fixture.filesystems.list(previousStaging))[0]?.eventId)
			.toBe(previousFilesystem.eventId);

		// The previous generated Manifest must still be usable by the existing
		// publication pipeline without another import or an actual network.
		const { publisher, published } = createPublisher(fixture);
		const results = await publisher.publish(fixture.output);
		expect(results.filter(result => result.type === 'blossom')).toHaveLength(1);
		expect(results.filter(result => result.type === 'nostr')).toHaveLength(3);
		expect(published.has(previousResource.event.id)).toBe(true);
		expect(published.has(previousFilesystem.eventId)).toBe(true);
	});

	it('does not publish a Resource left staged after an imported file is renamed', async () => {
		const fixture = await createFixture();
		const first = await fixture.useCase.build(fixture.request);
		const removed = await stagedResource(fixture, first, smallPath);
		const renamedPath = 'books/renamed.nd.json';
		await writeDocument(fixture.source, renamedPath, fixture.smallContents);
		await rm(join(fixture.source, smallPath));
		const current = await fixture.useCase.build(fixture.request);
		// Old staging is retained, but the generated Manifest no longer references it.
		expect(await fixture.resources.list(fixture.staging, removed.name)).toHaveLength(1);
		expect(Object.values(current.resources).some(resource => resource.path === smallPath)).toBe(false);

		const { publisher, published } = createPublisher(fixture);
		await publisher.publish(fixture.output);
		expect(published.has(removed.event.id)).toBe(false);
		expect(published.size).toBe(3); // New Resource, unchanged Resource, Filesystem
	});

	it('rejects a modified source-backed artifact before sending any Nostr events', async () => {
		const fixture = await createFixture();
		await fixture.useCase.build(fixture.request);
		await writeDocument(fixture.source, largePath, '{"blocks":[]}');
		const { publisher, calls } = createPublisher(fixture);
		await expect(publisher.publish(fixture.output)).rejects.toThrow('Staged artifact is stale');
		expect(calls).not.toContain('blossom');
		expect(calls.some(call => call.startsWith('nostr:'))).toBe(false);
	});
});
