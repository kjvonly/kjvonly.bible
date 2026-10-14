import { basename } from 'node:path';
import {
	isCanonicalFilesystemPath
} from '#domain/filesystem/filesystem-path.js';
import {
	validateManifest,
	type Manifest,
	type ResourceDefinition,
	type FilesystemDirectoryDefinition
} from '#domain/manifest/manifest.js';
import { deriveSourceKey } from '#domain/source/source-key.js';
import type { ImportSourceFile } from '../classification/filesystem-import-classifier.js';
import { FilesystemFileCompilerRegistry } from './filesystem-file-compiler-registry.js';
import {
	filesystemImportManifestDefinition,
	filesystemImportManifestName
} from './filesystem-import-manifest-definition.js';

export interface CompileFilesystemImportManifestRequest {
	readonly directory: string;
	readonly filesystemRoot: string;
	readonly manifest: Manifest;
	readonly files: readonly ImportSourceFile[];
	readonly inlineLimitBytes?: number;
}

/**
 * Assembles a single Filesystem Manifest from independently compiled files.
 * It knows nothing about Normalized Documents, media types, or generic files:
 * those decisions belong exclusively to the registered per-file strategies.
 */
export class FilesystemImportManifestCompiler {
	constructor(private readonly registry: FilesystemFileCompilerRegistry) {}

	async compile(request: CompileFilesystemImportManifestRequest): Promise<Manifest> {
		const { directory, filesystemRoot, files, manifest } = request;
		if (!isCanonicalFilesystemPath(filesystemRoot)) {
			throw new Error(`Invalid Filesystem root: ${filesystemRoot}`);
		}
		if (files.length === 0) throw new Error('No files to compile into a Filesystem.');
		const filesystemName = filesystemImportManifestName(filesystemRoot);
		if (Object.hasOwn(manifest.filesystems, filesystemName)) {
			throw new Error(`Filesystem manifest name already exists: ${filesystemName}`);
		}

		const resources: Record<string, ResourceDefinition> = { ...manifest.resources };
		const directories = new Map<string, FilesystemDirectoryDefinition>();
		const occupiedPaths = new Set<string>();
		const sorted = [...files].sort((a, b) => a.relativePath < b.relativePath ? -1 : a.relativePath > b.relativePath ? 1 : 0);
		for (const file of sorted) {
			const result = await this.registry.compile({ ...request, file });
			if (occupiedPaths.has(result.filesystemPath)) {
				throw new Error(`Duplicate import path: ${result.filesystemPath}`);
			}
			occupiedPaths.add(result.filesystemPath);
			if (Object.hasOwn(resources, result.name)) {
				throw new Error(`Resource manifest name already exists: ${result.name}`);
			}
			resources[result.name] = result.definition;
			const path = result.definition.path;
			const lastSlash = path.lastIndexOf('/');
			const parent = lastSlash < 0 ? '' : path.slice(0, lastSlash);
			const filename = basename(path);
			const placement = directories.get(parent) ?? { path: parent, resources: {}, collections: {} };
			if (Object.hasOwn(placement.resources, filename) || Object.hasOwn(placement.collections, filename)) {
				throw new Error(`Duplicate Filesystem placement: ${result.filesystemPath}`);
			}
			placement.resources[filename] = { resource: result.name, key: deriveSourceKey(filename) };
			directories.set(parent, placement);
		}
		return validateManifest({
			...manifest,
			resources,
			filesystems: {
				...manifest.filesystems,
				[filesystemName]: filesystemImportManifestDefinition(
					filesystemRoot, [...directories.values()].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
				)
			}
		});
	}
}
