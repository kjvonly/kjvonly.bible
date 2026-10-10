import { createHash } from 'node:crypto';
import { basename, relative, resolve } from 'node:path';

import {
	isCanonicalFilesystemPath,
	joinFilesystemPath
} from '#domain/filesystem/filesystem-path.js';
import {
	validateManifest,
	type Manifest,
	type ResourceDefinition,
	type FilesystemDirectoryDefinition
} from '#domain/manifest/manifest.js';
import { deriveSourceKey } from '#domain/source/source-key.js';
import type { ImportSourceFile } from '../classification/filesystem-import-classifier.js';
import type { SemanticTypeDefinition } from '../../semantic/semantic-type-registry.js';

/** Maximum original file size in bytes included inline (1 MiB, inclusive). */
export const DEFAULT_NORMALIZED_DOCUMENT_INLINE_LIMIT = 1024 * 1024;

/** One source file after complete validation against a semantic contract. */
export interface ValidatedNormalizedDocumentFile {
	readonly file: ImportSourceFile;
	readonly definition: SemanticTypeDefinition;
}

/**
 * Inputs for generating ordinary Manifest definitions, not signed events.
 * `directory` is the source tree root and base path for the shared executor.
 */
export interface CompileNormalizedDocumentManifestRequest {
	readonly directory: string;
	readonly filesystemRoot: string;
	readonly manifest: Manifest;
	readonly documents: readonly ValidatedNormalizedDocumentFile[];
	/** Original-file size limit in bytes, inclusive; larger files use object upload. */
	readonly inlineLimitBytes?: number;
}

/**
 * Compiles validated Normalized Documents into standard Resource and Filesystem
 * definitions. Each canonical `<root>/<relative-path>` becomes both the
 * mirrored Filesystem placement and the path suffix of the replaceable `d`
 * identity. The SHA-256-based Manifest *name* is staging-only, not the source
 * content fingerprint. Publication, encoding, signing, and staging remain with
 * ManifestBuildExecutor and its existing collaborators.
 */
export class NormalizedDocumentManifestCompiler {
	/**
	 * @param request Publication configuration, root and already-validated files.
	 * @returns A validated Manifest suitable for the common build executor.
	 * @throws For unsafe/mismatched source paths, name collisions, or missing
	 * external storage configuration for a document above the inline limit.
	 */
	compile(request: CompileNormalizedDocumentManifestRequest): Manifest {
		const { directory, filesystemRoot, documents, manifest } = request;
		const inlineLimit = request.inlineLimitBytes ?? DEFAULT_NORMALIZED_DOCUMENT_INLINE_LIMIT;
		if (!Number.isSafeInteger(inlineLimit) || inlineLimit < 0) {
			throw new Error('Normalized Document inline limit must be a nonnegative integer.');
		}
		if (!isCanonicalFilesystemPath(filesystemRoot)) {
			throw new Error(`Invalid Filesystem root: ${filesystemRoot}`);
		}
		if (documents.length === 0) {
			throw new Error('No validated Normalized Documents to compile.');
		}

		const filesystemName = this.logicalName('normalized-filesystem', filesystemRoot);
		if (Object.hasOwn(manifest.filesystems, filesystemName)) {
			throw new Error(`Filesystem manifest name already exists: ${filesystemName}`);
		}

		const resources: Record<string, ResourceDefinition> = { ...manifest.resources };
		const directories = new Map<string, FilesystemDirectoryDefinition>();
		const paths = new Set<string>();
		const sorted = [...documents].sort((a, b) =>
			a.file.relativePath < b.file.relativePath ? -1 : a.file.relativePath > b.file.relativePath ? 1 : 0
		);

		for (const { file, definition } of sorted) {
			const path = this.assertSourcePath(directory, file);
			if (!Number.isSafeInteger(file.size) || file.size < 0) {
				throw new Error(`Invalid file size for "${path}".`);
			}
			if (definition.dataType !== 'kjvonly.normalized-document') {
				throw new Error(`Non-Normalized Document semantic contract for "${path}": ${definition.dataType}`);
			}
			const fullPath = joinFilesystemPath(filesystemRoot, path);
			if (paths.has(fullPath)) throw new Error(`Duplicate import path: ${fullPath}`);
			paths.add(fullPath);

			const resourceName = this.logicalName('normalized-document', fullPath);
			if (Object.hasOwn(resources, resourceName)) {
				throw new Error(`Resource manifest name already exists: ${resourceName}`);
			}

			const external = file.size > inlineLimit;
			if (external && (
				manifest.defaults?.strategy === undefined ||
				manifest.strategies[manifest.defaults.strategy] === undefined
			)) {
				throw new Error(`External storage strategy required for "${path}".`);
			}

			resources[resourceName] = {
				path,
				event: {
					encoding: ['gzip', 'hex'],
					tags: [
						['d', `kjvonly/normalized-content/documents/${fullPath}`],
						['m', 'application/json+gzip+hex'],
						['t', definition.resourceType],
						['dataType', definition.dataType],
						['dataVersion', String(definition.dataVersion)],
						['representation', external ? 'descriptors' : 'content']
					]
				},
				...(external ? {
					'object-upload': {
						mediaType: 'application/json',
						encoding: []
					}
				} : {})
			};

			const segments = path.split('/');
			const filename = segments.pop()!;
			const directoryPath = segments.join('/');
			const placement = directories.get(directoryPath) ?? {
				path: directoryPath,
				resources: {},
				collections: {}
			};
			placement.resources[filename] = {
				resource: resourceName,
				key: deriveSourceKey(basename(path))
			};
			directories.set(directoryPath, placement);
		}

		return validateManifest({
			...manifest,
			resources,
			filesystems: {
				...manifest.filesystems,
				[filesystemName]: {
					root: filesystemRoot,
					event: {
						encoding: ['hex'],
						tags: [
							['d', `kjvonly/filesystem/${filesystemRoot}`],
							['m', 'application/json+hex'],
							['t', 'filesystem/entry'],
							['dataType', 'kjvonly.filesystem.entries'],
							['dataVersion', '1'],
							['representation', 'content']
						]
					},
					directories: [...directories.values()]
				}
			}
		});
	}

	/** Confirms that the user's logical relative path matches its actual root-relative source path. */
	private assertSourcePath(directory: string, file: ImportSourceFile): string {
		const actual = relative(resolve(directory), resolve(file.sourcePath)).split('\\').join('/');
		// SourceExpander deliberately skips dot-prefixed filenames; reject them
		// here instead of producing a Filesystem placement with no staged key.
		if (basename(file.relativePath).startsWith('.') ||
			!isCanonicalFilesystemPath(file.relativePath) ||
			actual !== file.relativePath ||
			actual === '..' || actual.startsWith('../')) {
			throw new Error(`Import file must be a canonical descendant of source root: "${file.relativePath}".`);
		}
		return actual;
	}

	/** Internal staging name only; never substitutes for public `d` or Filesystem path. */
	private logicalName(prefix: string, path: string): string {
		return `${prefix}-${createHash('sha256').update(path).digest('hex')}`;
	}
}
