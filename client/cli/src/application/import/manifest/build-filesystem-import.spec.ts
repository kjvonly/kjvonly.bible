import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { validateManifest } from '#domain/manifest/manifest.js';
import { createDefaultFileFormatRegistry } from '../format/file-format-registry.js';
import { GenericFileResourceDefinitionBuilder } from './generic-file-resource-definition-builder.js';
import {
	FilesystemFileCompilerRegistry, GenericFileCompiler, NormalizedDocumentFileCompiler
} from './filesystem-file-compiler-registry.js';
import { FilesystemImportManifestCompiler } from './filesystem-import-manifest-compiler.js';
import { NormalizedDocumentResourceDefinitionBuilder } from './normalized-document-resource-definition-builder.js';
import { BuildFilesystemImport } from './build-filesystem-import.js';
import type { FilesystemSemanticImportResolver } from '../resolution/filesystem-semantic-import-resolver.js';

const directory = '/tmp/source';
const manifest = validateManifest({
	version: 1, kind: 37770, staging: { path: '/tmp/staging' },
	nostr: { relays: ['ws://localhost:3334'] },
	defaults: { strategy: 'local' },
	strategies: { local: { type: 'blossom', urls: ['http://localhost:3335'] } }
});
function setup(valid = true) {
	const semantic = {
		dataType: 'kjvonly.normalized-document', dataVersion: 1,
		resourceType: 'normalized-content/document', objectType: 'normalized-content/document', validate: () => {}
	};
	const resolver = {
		resolve: vi.fn(async () => valid
			? { kind: 'semantic' as const, definition: semantic }
			: { kind: 'unvalidated' as const, failures: [{ dataType: semantic.dataType, cause: new Error('invalid schema') }] })
	} as unknown as FilesystemSemanticImportResolver;
	const formats = createDefaultFileFormatRegistry();
	const compiler = new FilesystemImportManifestCompiler(new FilesystemFileCompilerRegistry([
		new NormalizedDocumentFileCompiler(resolver,
			() => ({ readPrefix: async () => new Uint8Array(), readAll: async () => new Uint8Array() }),
			new NormalizedDocumentResourceDefinitionBuilder(), formats),
		new GenericFileCompiler(new GenericFileResourceDefinitionBuilder(formats))
	]));
	const build = vi.fn(async () => {});
	return { workflow: new BuildFilesystemImport(compiler, { build }), build };
}
const files = [
	{ sourcePath: resolve(directory, 'chapters/a.nd.json'), relativePath: 'chapters/a.nd.json', size: 50 },
	{ sourcePath: resolve(directory, 'media/audio.mp3'), relativePath: 'media/audio.mp3', size: 1000 }
];

describe('BuildFilesystemImport', () => {
	it('assembles one mixed Manifest and calls the shared executor once', async () => {
		const { workflow, build } = setup();
		const result = await workflow.build({ directory, filesystemRoot: 'app-filesystem', manifest, files, inlineLimitBytes: 0 });
		expect(Object.keys(result.resources)).toHaveLength(2);
		expect(Object.keys(result.filesystems)).toHaveLength(1);
		expect(build).toHaveBeenCalledOnce();
		expect(build).toHaveBeenCalledWith({ directory, manifest: result, origin: 'filesystem-import' });
		expect(Object.values(result.resources).every(value => !!value['object-upload'])).toBe(true);
	});

	it('does not stage any Resources when explicit semantic validation fails', async () => {
		const { workflow, build } = setup(false);
		await expect(workflow.build({ directory, filesystemRoot: 'app-filesystem', manifest, files })).rejects.toThrow('invalid schema');
		expect(build).not.toHaveBeenCalled();
	});
});
