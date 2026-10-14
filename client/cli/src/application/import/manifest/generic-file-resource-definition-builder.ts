import { createHash } from 'node:crypto';
import { basename, relative, resolve } from 'node:path';

import {
	isCanonicalFilesystemPath,
	joinFilesystemPath
} from '#domain/filesystem/filesystem-path.js';
import type { ResourceDefinition } from '#domain/manifest/manifest.js';
import type { ImportSourceFile } from '../classification/filesystem-import-classifier.js';
import type { FileFormatRegistry } from '../format/file-format-registry.js';

/** Generic files have an opaque payload contract, not a parsed semantic document. */
export interface GenericFileResourceContract {
	readonly resourceType: string;
	readonly dataType: string;
	readonly dataVersion: 1;
}

/** Stable production identities for files that do not have a validated semantic contract. */
export const GENERIC_FILE_RESOURCE_CONTRACTS = {
	audio: { resourceType: 'media/audio', dataType: 'kjvonly.audio', dataVersion: 1 },
	video: { resourceType: 'media/video', dataType: 'kjvonly.video', dataVersion: 1 },
	image: { resourceType: 'media/image', dataType: 'kjvonly.image', dataVersion: 1 },
	file: { resourceType: 'generic/file', dataType: 'kjvonly.file', dataVersion: 1 }
} as const satisfies Record<string, GenericFileResourceContract>;

/** One ordinary Manifest Resource, ready for the existing object-upload builder. */
export interface CompiledGenericFileResource {
	/** Internal, deterministic staging name (not a public Resource identity). */
	readonly name: string;
	/** Full path to be referenced by a later Filesystem placement. */
	readonly filesystemPath: string;
	readonly definition: ResourceDefinition;
}

/**
 * Compiles an opaque source file into one descriptor-backed Resource definition.
 * Physical MIME selection is delegated to FileFormatRegistry. No content read,
 * validation, compression, staging or publication happens here.
 *
 * The caller must resolve and validate semantic candidates FIRST. In particular,
 * malformed explicit `.nd.json` documents must never reach this generic fallback.
 */
export class GenericFileResourceDefinitionBuilder {
	constructor(private readonly formats: Pick<FileFormatRegistry, 'resolve'>) {}

	build(request: {
		readonly directory: string;
		readonly filesystemRoot: string;
		readonly file: ImportSourceFile;
	}): CompiledGenericFileResource {
		const { directory, filesystemRoot, file } = request;
		if (!isCanonicalFilesystemPath(filesystemRoot)) {
			throw new Error(`Invalid Filesystem root: ${filesystemRoot}`);
		}
		const actual = relative(resolve(directory), resolve(file.sourcePath)).split('\\').join('/');
		if (basename(file.relativePath).startsWith('.') ||
			!isCanonicalFilesystemPath(file.relativePath) ||
			actual !== file.relativePath) {
			throw new Error(`Generic import file must be a canonical descendant of source root: "${file.relativePath}".`);
		}
		const lowerPath = file.relativePath.toLowerCase();
		if (lowerPath.endsWith('.nd.json') || lowerPath.endsWith('.nd.json.gz')) {
			throw new Error(`Normalized Documents require semantic validation before import: "${file.relativePath}".`);
		}
		if (!Number.isSafeInteger(file.size) || file.size < 0) {
			throw new Error(`Invalid file size for "${file.relativePath}".`);
		}

		const filesystemPath = joinFilesystemPath(filesystemRoot, file.relativePath);
		const format = this.formats.resolve(file.relativePath);
		const contract = format.baseMediaType.startsWith('audio/')
			? GENERIC_FILE_RESOURCE_CONTRACTS.audio
			: format.baseMediaType.startsWith('video/')
				? GENERIC_FILE_RESOURCE_CONTRACTS.video
				: format.baseMediaType.startsWith('image/')
					? GENERIC_FILE_RESOURCE_CONTRACTS.image
					: GENERIC_FILE_RESOURCE_CONTRACTS.file;

		return {
			name: `generic-file-${createHash('sha256').update(filesystemPath).digest('hex')}`,
			filesystemPath,
			definition: {
				path: file.relativePath,
				event: {
					encoding: ['gzip', 'hex'],
					tags: [
						['d', `kjvonly/files/${filesystemPath}`],
						['m', 'application/json+gzip+hex'],
						['t', contract.resourceType],
						['dataType', contract.dataType],
						['dataVersion', String(contract.dataVersion)],
						['representation', 'descriptors']
					]
				},
				// Always preserve the file's source bytes. In particular, `.gz`
				// already carries gzip bytes and MUST NOT be compressed again.
				'object-upload': { mediaType: format.mediaType, encoding: [] }
			}
		};
	}
}
