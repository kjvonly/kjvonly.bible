import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, readdir, readlink, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
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
import { NormalizedDocumentResourceDefinitionBuilder } from '../manifest/normalized-document-resource-definition-builder.js';
import { BuildFilesystemImport } from '../manifest/build-filesystem-import.js';
import { FilesystemImportManifestCompiler } from '../manifest/filesystem-import-manifest-compiler.js';
import { FilesystemFileCompilerRegistry, NormalizedDocumentFileCompiler, GenericFileCompiler } from '../manifest/filesystem-file-compiler-registry.js';
import { GenericFileResourceDefinitionBuilder } from '../manifest/generic-file-resource-definition-builder.js';
import { createDefaultFileFormatRegistry } from '../format/file-format-registry.js';

import { BuildFilesystemDirectory } from './build-filesystem-directory.js';
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
	const importer = new BuildFilesystemImport(
		new FilesystemImportManifestCompiler(new FilesystemFileCompilerRegistry([
			new NormalizedDocumentFileCompiler(
				new FilesystemSemanticImportResolver(
					new FilesystemImportClassifier([new NormalizedDocumentRecognizer()]),
					semanticRegistry
				),
				(path, encoding) => new NodeImportContentReader(path, encoding),
				new NormalizedDocumentResourceDefinitionBuilder(),
				createDefaultFileFormatRegistry()
			),
			new GenericFileCompiler(new GenericFileResourceDefinitionBuilder(createDefaultFileFormatRegistry()))
		])),
		executor
	);

	let currentStaging = staging;
	let failManifestWrite = false;
	const workflow = new BuildFilesystemDirectory(
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

describe('Filesystem directory — real signed staging', () => {
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
		expect(eventTags(filesystemEvent).m).toBe('application/json+gzip+hex');
		const mappings = JSON.parse(gunzipSync(Buffer.from(filesystemEvent.content, 'hex')).toString('utf8'));
		expect(Object.keys(mappings).sort()).toEqual([`library/${smallPath}`, `library/${largePath}`].sort());
		for (const [path, event] of [[smallPath, inline.event], [largePath, external.event]] as const) {
			const descriptor = mappings[`library/${path}`].descriptor;
			expect(descriptor.metadata.resourceId).toBe(eventTags(event).d);
			expect(descriptor.metadata.publisher).toBe(event.pubkey);
			expect(descriptor.metadata.modifiedAt).toBe(event.created_at);
			expect(descriptor.strategy.type).toBe('nostr');
		}
	});

	it('stages pre-gzipped documents unchanged and publishes gzip media metadata', async () => {
		const fixture = await createFixture();
		const gzPath = 'books/compressed.nd.json.gz';
		const original = Buffer.from('{"blocks":[]}');
		const gzipBytes = gzipSync(original);
		await mkdir(dirname(join(fixture.source, gzPath)), { recursive: true });
		await writeFile(join(fixture.source, gzPath), gzipBytes);
		const manifest = await fixture.useCase.build(fixture.request);
		const compiled = Object.values(manifest.resources).find(resource => resource.path === gzPath)!;
		expect(compiled['object-upload']).toEqual({ mediaType: 'application/json+gzip', encoding: [] });
		const staged = await stagedResource(fixture, manifest, gzPath);
		expect(eventTags(staged.event).representation).toBe('descriptors');
		const descriptors = JSON.parse(gunzipSync(Buffer.from(staged.event.content, 'hex')).toString('utf8'));
		expect(descriptors[0].metadata.mediaType).toBe('application/json+gzip');
		const artifacts = await fixture.artifacts.list(fixture.staging, staged.name);
		expect(artifacts).toHaveLength(1);
		expect(artifacts[0]?.kind).toBe('symlink');
		expect(await readFile(artifacts[0]!.path)).toEqual(gzipBytes);
		expect(gunzipSync(await readFile(artifacts[0]!.path))).toEqual(original);
	});

	it('stages mixed generic files without altering bytes or losing media types', async () => {
		const fixture = await createFixture();
		const samples = [
			{ path: 'books/manual.pdf', mediaType: 'application/pdf', bytes: Buffer.from('%PDF-1.7\nexample') },
			{ path: 'books/letter.docx', mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', bytes: Buffer.from('fake-docx-bytes') },
			{ path: 'books/letter.odt', mediaType: 'application/vnd.oasis.opendocument.text', bytes: Buffer.from('fake-odt-bytes') },
			{ path: 'sermons/recording.mp3', mediaType: 'audio/mpeg', bytes: Buffer.from([0x49, 0x44, 0x33, 0, 1]) },
			{ path: 'archives/backup.tar.xz', mediaType: 'application/x-xz', bytes: Buffer.from([0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00]) },
			{ path: 'archives/unknown.xyz', mediaType: 'application/octet-stream', bytes: Buffer.from([0, 1, 255]) },
			{ path: 'books/manual.pdf.gz', mediaType: 'application/pdf+gzip', bytes: gzipSync(Buffer.from('%PDF-1.7\nexample')) }
		];
		for (const sample of samples) {
			await mkdir(dirname(join(fixture.source, sample.path)), { recursive: true });
			await writeFile(join(fixture.source, sample.path), sample.bytes);
		}
		const manifest = await fixture.useCase.build(fixture.request);
		expect(Object.keys(manifest.resources)).toHaveLength(samples.length + 2);
		const [filesystemEntry] = await fixture.filesystems.list(fixture.staging);
		const filesystemEvent = await fixture.filesystems.read(filesystemEntry!);
		const filesystem = JSON.parse(gunzipSync(Buffer.from(filesystemEvent.content, 'hex')).toString('utf8'));

		for (const sample of samples) {
			const definition = Object.values(manifest.resources).find(resource => resource.path === sample.path)!;
			expect(definition['object-upload']).toEqual({ mediaType: sample.mediaType, encoding: [] });
			const { name, event } = await stagedResource(fixture, manifest, sample.path);
			expect(verifyEvent(event)).toBe(true);
			expect(eventTags(event)).toMatchObject({
				d: `kjvonly/files/library/${sample.path}`,
				representation: 'descriptors'
			});
			const descriptors = JSON.parse(gunzipSync(Buffer.from(event.content, 'hex')).toString('utf8'));
			expect(descriptors).toHaveLength(1);
			expect(descriptors[0].metadata.mediaType).toBe(sample.mediaType);
			const artifacts = await fixture.artifacts.list(fixture.staging, name);
			expect(artifacts).toHaveLength(1);
			expect(artifacts[0]?.kind).toBe('symlink');
			expect(await readlink(artifacts[0]!.path)).toBe(join(fixture.source, sample.path));
			expect(await readFile(artifacts[0]!.path)).toEqual(sample.bytes);
			expect(descriptors[0].strategy.data.sha256).toBe(artifacts[0]!.metadata.sha256);
			expect(filesystem[`library/${sample.path}`].descriptor.metadata.resourceId)
				.toBe(eventTags(event).d);
		}
	});

	it('reuses unchanged generic artifacts and refreshes only a changed file and the Filesystem', async () => {
		const fixture = await createFixture();
		const pdfPath = 'books/report.pdf';
		const audioPath = 'sermons/recording.mp3';
		await writeDocument(fixture.source, pdfPath, '%PDF-1.7\nfirst report');
		await writeDocument(fixture.source, audioPath, 'first recording bytes');

		const first = await fixture.useCase.build(fixture.request);
		const firstPdf = await stagedResource(fixture, first, pdfPath);
		const firstAudio = await stagedResource(fixture, first, audioPath);
		const firstPdfArtifact = (await fixture.artifacts.list(fixture.staging, firstPdf.name))[0]!;
		const firstAudioArtifact = (await fixture.artifacts.list(fixture.staging, firstAudio.name))[0]!;
		const firstFilesystem = (await fixture.filesystems.list(fixture.staging))[0]!.eventId;

		// A new staging generation should reuse all signed events and hashes.
		const second = await fixture.useCase.build(fixture.request);
		expect((await stagedResource(fixture, second, pdfPath)).event.id).toBe(firstPdf.event.id);
		expect((await stagedResource(fixture, second, audioPath)).event.id).toBe(firstAudio.event.id);
		expect((await fixture.artifacts.list(fixture.staging, firstPdf.name))[0]?.metadata.sha256)
			.toBe(firstPdfArtifact.metadata.sha256);
		expect((await fixture.artifacts.list(fixture.staging, firstAudio.name))[0]?.metadata.sha256)
			.toBe(firstAudioArtifact.metadata.sha256);
		expect((await fixture.filesystems.list(fixture.staging))[0]?.eventId).toBe(firstFilesystem);

		// Changing only the PDF must rebuild its object and descriptor, not the MP3.
		await writeDocument(fixture.source, pdfPath, '%PDF-1.7\nsecond report with different size');
		const third = await fixture.useCase.build(fixture.request);
		const changedPdf = await stagedResource(fixture, third, pdfPath);
		expect(changedPdf.event.id).not.toBe(firstPdf.event.id);
		expect(eventTags(changedPdf.event).d).toBe(eventTags(firstPdf.event).d);
		expect((await fixture.artifacts.list(fixture.staging, changedPdf.name))[0]?.metadata.sha256)
			.not.toBe(firstPdfArtifact.metadata.sha256);
		expect((await stagedResource(fixture, third, audioPath)).event.id).toBe(firstAudio.event.id);
		expect((await fixture.artifacts.list(fixture.staging, firstAudio.name))[0]?.metadata.sha256)
			.toBe(firstAudioArtifact.metadata.sha256);
		expect((await fixture.filesystems.list(fixture.staging))[0]?.eventId).not.toBe(firstFilesystem);
	});

	it('rejects invalid gzip documents without replacing the last publication manifest', async () => {
		const fixture = await createFixture();
		await fixture.useCase.build(fixture.request);
		const previousManifest = await readFile(fixture.output, 'utf8');
		await writeDocument(fixture.source, 'books/invalid.nd.json.gz', 'not gzip');
		await expect(fixture.useCase.build(fixture.request)).rejects.toThrow('Cannot read import');
		expect(await readFile(fixture.output, 'utf8')).toBe(previousManifest);
	});

	it('rejects gzip containing invalid JSON instead of publishing as an opaque Resource', async () => {
		const fixture = await createFixture();
		await mkdir(join(fixture.source, 'books'), { recursive: true });
		await writeFile(join(fixture.source, 'books/invalid.nd.json.gz'), gzipSync(Buffer.from('{"unrelated":true}')));
		await expect(fixture.useCase.build(fixture.request)).rejects.toThrow('not a validated Normalized Document');
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
	it('rebuilds unchanged inline documents as Blossom descriptors when inline limit becomes zero', async () => {
		const fixture = await createFixture();
		const first = await fixture.useCase.build(fixture.request);
		const inline = (await stagedResource(fixture, first, smallPath)).event;
		const large = (await stagedResource(fixture, first, largePath)).event;
		const firstFilesystem = (await fixture.filesystems.list(fixture.staging))[0]!.eventId;

		const second = await fixture.useCase.build({ ...fixture.request, inlineLimitBytes: 0 });
		const external = await stagedResource(fixture, second, smallPath);
		expect(eventTags(external.event)).toMatchObject({
			d: eventTags(inline).d, representation: 'descriptors'
		});
		expect(external.event.id).not.toBe(inline.id);
		expect((await fixture.artifacts.list(fixture.staging, external.name))).toHaveLength(1);
		expect((await stagedResource(fixture, second, largePath)).event.id).toBe(large.id);
		expect((await fixture.filesystems.list(fixture.staging))[0]?.eventId).not.toBe(firstFilesystem);
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


describe('Filesystem directory — generated Manifest publication', () => {
	/** Uses the real generated Manifest loader, staged-artifact publisher and Nostr event publisher.
	 * Network endpoints are replaced by recording adapters so this test requires no relay or Blossom server.
	 */
	function createPublisher(
		fixture: ReturnType<typeof createImporter>,
		expectedMediaTypes?: Set<string>
	) {
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
					if (expectedMediaTypes) {
						expect(expectedMediaTypes.has(request.mediaType)).toBe(true);
						expectedMediaTypes.delete(request.mediaType);
					} else {
						expect(request.mediaType).toBe('application/json');
						expect(request.size).toBeGreaterThan(1024 * 1024);
					}
					expect(request.artifactPath).toContain(fixture.staging);
					return 'uploaded' as const;
				}
			},
			fixture.logger
		);
		const closeRelay = vi.fn();
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
				},
				close: relay => {
					expect(relay).toBe('wss://relay.example');
					closeRelay();
				}
			},
			fixture.logger
		);
		return {
			calls, published, closeRelay,
			publisher: new PublishManifestUseCase(loader, preflight, blossom, nostr, fixture.logger)
		};
	}

	it('loads the generated JSON Manifest, publishes the staged Blossom object first, then signed Resources and Filesystem', async () => {
		const fixture = await createFixture();
		const manifest = await fixture.useCase.build(fixture.request);
		const { publisher, calls, published, closeRelay } = createPublisher(fixture);

		const first = await publisher.publish(fixture.output);
		expect(closeRelay).toHaveBeenCalledOnce();
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
		expect(closeRelay).toHaveBeenCalledTimes(2);
		expect(second.filter(result => result.type === 'nostr' && (result.data as { status: string }).status === 'already-present'))
			.toHaveLength(3);
		expect(calls.slice(before).filter(call => call.startsWith('nostr:'))).toEqual([]);
	});

	it('publishes mixed file media types to Blossom before their Nostr descriptors', async () => {
		const fixture = await createFixture();
		const files = [
			{ path: 'files/report.pdf', mediaType: 'application/pdf' },
			{ path: 'files/report.odt', mediaType: 'application/vnd.oasis.opendocument.text' },
			{ path: 'files/audio.mp3', mediaType: 'audio/mpeg' },
			{ path: 'files/unknown.bin', mediaType: 'application/octet-stream' }
		];
		for (const file of files) {
			await mkdir(dirname(join(fixture.source, file.path)), { recursive: true });
			await writeFile(join(fixture.source, file.path), `uninterpreted source bytes: ${file.path}`);
		}
		await fixture.useCase.build(fixture.request);
		const mediaTypes = new Set(['application/json', ...files.map(file => file.mediaType)]);
		const { publisher, calls, published } = createPublisher(fixture, mediaTypes);
		const results = await publisher.publish(fixture.output);
		expect(mediaTypes.size).toBe(0);
		expect(results.filter(result => result.type === 'blossom')).toHaveLength(files.length + 1);
		expect(results.filter(result => result.type === 'nostr')).toHaveLength(files.length + 3);
		expect(published.size).toBe(files.length + 3);
		expect(calls.indexOf('nostr:resource')).toBeGreaterThan(calls.lastIndexOf('blossom'));
		expect(calls.at(-1)).toBe('nostr:filesystem');
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
