import { createHash } from 'node:crypto';
import { basename, relative, resolve } from 'node:path';

import {
	isCanonicalFilesystemPath,
	joinFilesystemPath
} from '#domain/filesystem/filesystem-path.js';
import type { Manifest, ResourceDefinition } from '#domain/manifest/manifest.js';
import type { ImportSourceFile } from '../classification/filesystem-import-classifier.js';
import type { ResolvedFileFormat } from '../format/file-format-registry.js';
import type { SemanticTypeDefinition } from '../../semantic/semantic-type-registry.js';

/** Maximum uncompressed source file size in bytes included inline (1 MiB, inclusive). */
export const DEFAULT_NORMALIZED_DOCUMENT_INLINE_LIMIT = 1024 * 1024;

/** Builds one validated Normalized Document Resource definition. Filesystem assembly is generic. */
export class NormalizedDocumentResourceDefinitionBuilder {
	/** Preserves the established Normalized Document Resource identity and inline policy. */
	build(request: {
		readonly directory: string;
		readonly filesystemRoot: string;
		readonly manifest: Manifest;
		readonly file: ImportSourceFile;
		readonly definition: SemanticTypeDefinition;
		readonly format: ResolvedFileFormat;
		readonly inlineLimitBytes?: number;
	}): { readonly name: string; readonly filesystemPath: string; readonly definition: ResourceDefinition } {
		const { directory, filesystemRoot, manifest, file, definition, format } = request;
		const inlineLimit = request.inlineLimitBytes ?? DEFAULT_NORMALIZED_DOCUMENT_INLINE_LIMIT;
		if (!Number.isSafeInteger(inlineLimit) || inlineLimit < 0) {
			throw new Error('Normalized Document inline limit must be a nonnegative integer.');
		}
		if (!isCanonicalFilesystemPath(filesystemRoot)) {
			throw new Error(`Invalid Filesystem root: ${filesystemRoot}`);
		}
		const path = this.assertSourcePath(directory, file);
		if (!Number.isSafeInteger(file.size) || file.size < 0) {
			throw new Error(`Invalid file size for "${path}".`);
		}
		if (definition.dataType !== 'kjvonly.normalized-document') {
			throw new Error(`Non-Normalized Document semantic contract for "${path}": ${definition.dataType}`);
		}
		if (format.baseMediaType !== 'application/json' ||
			format.sourceEncoding.some(encoding => encoding !== 'gzip') ||
			format.sourceEncoding.length > 1) {
			throw new Error(`Unsupported Normalized Document source format for "${path}".`);
		}
		const filesystemPath = joinFilesystemPath(filesystemRoot, path);
		// A gzip source must stay external: inline Nostr encoding would gzip it twice.
		const external = format.sourceEncoding.length > 0 || file.size > inlineLimit;
		if (external && (
			manifest.defaults?.strategy === undefined ||
			manifest.strategies[manifest.defaults.strategy] === undefined
		)) {
			throw new Error(`External storage strategy required for "${path}".`);
		}
		return {
			name: this.logicalName('normalized-document', filesystemPath),
			filesystemPath,
			definition: {
				path,
				event: {
					encoding: ['gzip', 'hex'],
					tags: [
						['d', `kjvonly/normalized-content/documents/${filesystemPath}`],
						['m', 'application/json+gzip+hex'],
						['t', definition.resourceType],
						['dataType', definition.dataType],
						['dataVersion', String(definition.dataVersion)],
						['representation', external ? 'descriptors' : 'content']
					]
				},
				...(external ? {
					'object-upload': { mediaType: format.mediaType, encoding: [] }
				} : {})
			}
		};
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
