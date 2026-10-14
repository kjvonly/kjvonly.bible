import type { Manifest, ResourceDefinition } from '#domain/manifest/manifest.js';
import type { ImportSourceFile } from '../classification/filesystem-import-classifier.js';
import type { ImportContentReader } from '../resolution/filesystem-semantic-import-resolver.js';
import { FilesystemSemanticImportResolver } from '../resolution/filesystem-semantic-import-resolver.js';
import type { FileFormatRegistry, ResolvedFileFormat } from '../format/file-format-registry.js';
import { GenericFileResourceDefinitionBuilder } from './generic-file-resource-definition-builder.js';
import { NormalizedDocumentResourceDefinitionBuilder } from './normalized-document-resource-definition-builder.js';

/** Shared compilation context; no filesystem events or staging occur per file. */
export interface CompileFilesystemFileRequest {
	readonly directory: string;
	readonly filesystemRoot: string;
	readonly manifest: Manifest;
	readonly file: ImportSourceFile;
	readonly inlineLimitBytes?: number;
}

export interface CompiledFilesystemFile {
	readonly name: string;
	readonly filesystemPath: string;
	readonly definition: ResourceDefinition;
}

/** An ordered strategy selected from the discovered path; first match wins. */
export interface FilesystemFileCompiler {
	readonly name: string;
	matches(file: ImportSourceFile): boolean;
	compile(request: CompileFilesystemFileRequest): CompiledFilesystemFile | Promise<CompiledFilesystemFile>;
}

/** Dispatch is independent of MIME format lookup and semantic validation. */
export class FilesystemFileCompilerRegistry {
	constructor(private readonly compilers: readonly FilesystemFileCompiler[]) {
		const names = new Set<string>();
		for (const compiler of compilers) {
			if (!compiler.name.trim() || names.has(compiler.name)) {
				throw new Error(`Invalid or duplicate filesystem compiler: ${compiler.name}`);
			}
			names.add(compiler.name);
		}
	}

	async compile(request: CompileFilesystemFileRequest): Promise<CompiledFilesystemFile> {
		const compiler = this.compilers.find(candidate => candidate.matches(request.file));
		if (!compiler) {
			throw new Error(`No filesystem compiler for "${request.file.relativePath}".`);
		}
		return compiler.compile(request);
	}
}

/** Strict semantic strategy: invalid `.nd.json` never falls through to generic. */
export class NormalizedDocumentFileCompiler implements FilesystemFileCompiler {
	readonly name = 'normalized-document';

	constructor(
		private readonly resolver: FilesystemSemanticImportResolver,
		private readonly reader: (sourcePath: string, sourceEncoding: ResolvedFileFormat['sourceEncoding']) => ImportContentReader,
		private readonly builder: NormalizedDocumentResourceDefinitionBuilder,
		private readonly formats: Pick<FileFormatRegistry, 'resolve'>
	) {}

	matches(file: ImportSourceFile): boolean {
		return file.relativePath.toLowerCase().endsWith('.nd.json') ||
			file.relativePath.toLowerCase().endsWith('.nd.json.gz');
	}

	async compile(request: CompileFilesystemFileRequest): Promise<CompiledFilesystemFile> {
		const { file } = request;
		const format = this.formats.resolve(file.relativePath);
		// Validation reads decoded bytes; staging still sees the original source path.
		const result = await this.resolver.resolve(file, this.reader(file.sourcePath, format.sourceEncoding));
		if (result.kind === 'unvalidated') {
			const details = result.failures.map(failure =>
				`${failure.dataType}: ${failure.cause instanceof Error ? failure.cause.message : String(failure.cause)}`
			).join('; ');
			throw new Error(`File "${file.relativePath}" is not a validated Normalized Document (unvalidated): ${details}`);
		}
		if (result.kind !== 'semantic' || result.definition.dataType !== 'kjvonly.normalized-document') {
			throw new Error(`File "${file.relativePath}" is not a validated Normalized Document (${result.kind}).`);
		}
		return this.builder.build({ ...request, definition: result.definition, format });
	}
}

/** Opaque fallback: FileFormatRegistry resolves MIME; original bytes are preserved. */
export class GenericFileCompiler implements FilesystemFileCompiler {
	readonly name = 'generic-file';
	constructor(private readonly builder: GenericFileResourceDefinitionBuilder) {}
	matches(): boolean { return true; }
	compile(request: CompileFilesystemFileRequest): CompiledFilesystemFile {
		return this.builder.build(request);
	}
}
