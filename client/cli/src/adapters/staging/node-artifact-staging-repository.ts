import {
    createHash,
    randomUUID
} from 'node:crypto';

import {
    createReadStream
} from 'node:fs';

import {
    lstat,
    mkdir,
    readdir,
    rename,
    symlink,
    unlink,
    writeFile
} from 'node:fs/promises';

import {
    dirname,
    join
} from 'node:path';

import { deriveSourceKey } from '#domain/source/source-key.js';
import { deriveSourceExtension } from '#domain/source/source-extension.js';


import { ArtifactStagingRepository, StagedArtifactEntry, StageIdentityArtifactRequest, StageMaterializedArtifactRequest } from '#ports/staging/artifact-staging-repository.js';
import { parseStagedArtifactFilename, buildStagedArtifactFilename } from '#domain/staging/staged-artifact-filename.js';

/** Maximum filename component length for ext4 and other common Linux filesystems. */
const MAX_STAGING_FILENAME_BYTES = 255;
const LONG_FILENAME_DIRECTORY = 'by-filename';

/** Node filesystem adapter for external-artifact staging mechanics. */
export class NodeArtifactStagingRepository
    implements ArtifactStagingRepository {

    async list(
        stagingRoot:
            string,

        resourceName:
            string
    ): Promise<
        readonly StagedArtifactEntry[]
    > {

        const directory =
            this.getDirectory(
                stagingRoot,
                resourceName
            );


        let entries;


        try {
            entries =
                await readdir(
                    directory,
                    {
                        withFileTypes:
                            true
                    }
                );
        }
        catch (
        error:
            unknown
        ) {
            if (
                this.isFileNotFound(
                    error
                )
            ) {
                return [];
            }


            throw error;
        }


        return this.parseEntries(
            directory,
            entries
        );
    }


    async stageIdentity(
        request:
            StageIdentityArtifactRequest
    ): Promise<
        StagedArtifactEntry
    > {

        const sha256 =
            await this.calculateFileSha256(
                request.sourcePath
            );


        const metadata = {
            key:
                request.key,

            sourceMtimeMs:
                request.sourceMtimeMs,

            sourceSize:
                request.sourceSize,

            artifactRevision:
                request.artifactRevision,

            sha256,

            extension:
                request.extension
        };


        const path =
            await this.preparePath(
                request.stagingRoot,
                request.resourceName,
                metadata
            );


        const temporaryPath =
            join(dirname(path), `.${randomUUID()}.tmp`);


        await symlink(
            request.sourcePath,
            temporaryPath
        );


        await rename(
            temporaryPath,
            path
        );


        await this.removePrevious(
            request.previous,
            path
        );


        return {
            path,

            metadata,

            kind:
                'symlink',

            size:
                request.sourceSize
        };
    }


    async stageMaterialized(
        request:
            StageMaterializedArtifactRequest
    ): Promise<
        StagedArtifactEntry
    > {

        const sha256 =
            this.calculateBytesSha256(
                request.bytes
            );


        const metadata = {
            key:
                request.key,

            sourceMtimeMs:
                request.sourceMtimeMs,

            sourceSize:
                request.sourceSize,

            artifactRevision:
                request.artifactRevision,

            sha256,

            extension:
                request.extension
        };


        const path =
            await this.preparePath(
                request.stagingRoot,
                request.resourceName,
                metadata
            );


        const temporaryPath =
            join(dirname(path), `.${randomUUID()}.tmp`);


        await writeFile(
            temporaryPath,
            request.bytes
        );


        await rename(
            temporaryPath,
            path
        );


        await this.removePrevious(
            request.previous,
            path
        );


        return {
            path,

            metadata,

            kind:
                'file',

            size:
                request.bytes
                    .byteLength
        };
    }


    async remove(
        entry:
            StagedArtifactEntry
    ): Promise<void> {

        try {
            await unlink(
                entry.path
            );
        }
        catch (
        error:
            unknown
        ) {
            if (
                !this.isFileNotFound(
                    error
                )
            ) {
                throw error;
            }
        }
    }


    private async parseEntries(
        directory: string,
        entries: readonly import('node:fs').Dirent[]
    ): Promise<readonly StagedArtifactEntry[]> {
        const staged: StagedArtifactEntry[] = [];
        for (const entry of entries) {
            if (entry.name.startsWith('.')) continue;
            if (entry.isDirectory() && entry.name === LONG_FILENAME_DIRECTORY) {
                staged.push(...await this.parseLongFilenameEntries(join(directory, entry.name)));
                continue;
            }
            staged.push(await this.parseStagedEntry(directory, entry));
        }

        const keys = new Set<string>();
        for (const entry of staged) {
            if (keys.has(entry.metadata.key)) {
                throw new Error(`Multiple staged artifacts found for key: ${entry.metadata.key}`);
            }
            keys.add(entry.metadata.key);
        }
        return staged.sort((a, b) => a.metadata.key < b.metadata.key ? -1 : a.metadata.key > b.metadata.key ? 1 : 0);
    }

    /** Long source names live in a directory named after the original basename.
     * This keeps each component within the filesystem limit and retains enough
     * information to reconstruct the exact metadata without a sidecar file.
     */
    private async parseLongFilenameEntries(directory: string): Promise<StagedArtifactEntry[]> {
        const staged: StagedArtifactEntry[] = [];
        const sourceNames = await readdir(directory, { withFileTypes: true });
        for (const sourceName of sourceNames) {
            if (!sourceName.isDirectory() || sourceName.name.startsWith('.')) {
                throw new Error(`Invalid long-name staged artifact directory: ${sourceName.name}`);
            }
            const sourceDirectory = join(directory, sourceName.name);
            const key = deriveSourceKey(sourceName.name);
            const extension = deriveSourceExtension(sourceName.name);
            const artifacts = await readdir(sourceDirectory, { withFileTypes: true });
            for (const artifact of artifacts) {
                if (artifact.name.startsWith('.')) continue;
                // Reconstruct the legacy parseable filename using the directory's
                // original basename. The staged leaf stores only revision metadata.
                const originalFilename = `${key}${artifact.name}${extension}`;
                staged.push(await this.parseStagedEntry(sourceDirectory, artifact, originalFilename));
            }
        }
        return staged;
    }

    private async parseStagedEntry(
        directory: string,
        entry: import('node:fs').Dirent,
        parseName = entry.name
    ): Promise<StagedArtifactEntry> {
        const kind = entry.isSymbolicLink() ? 'symlink' : entry.isFile() ? 'file' : undefined;
        if (kind === undefined) {
            throw new Error(`Invalid staged artifact entry: ${entry.name}`);
        }
        const path = join(directory, entry.name);
        const metadata = parseStagedArtifactFilename(parseName);
        const fileMetadata = await lstat(path);
        return {
            path,
            metadata,
            kind,
            size: kind === 'symlink' ? metadata.sourceSize : fileMetadata.size
        };
    }

    private async preparePath(
        stagingRoot: string,
        resourceName: string,
        metadata: import('#domain/staging/staged-artifact-filename.js').StagedArtifactMetadata
    ): Promise<string> {
        const directory = this.getDirectory(stagingRoot, resourceName);
        const filename = buildStagedArtifactFilename(metadata);
        if (Buffer.byteLength(filename, 'utf8') <= MAX_STAGING_FILENAME_BYTES) {
            await mkdir(directory, { recursive: true });
            return join(directory, filename);
        }

        // SourceExpander derives the key and extension from one actual basename.
        // It is already <=255 bytes on supported filesystems; splitting the
        // staging revision into a child filename avoids appending >100 bytes to it.
        const originalBasename = `${metadata.key}${metadata.extension}`;
        if (originalBasename === '.' || originalBasename === '..' ||
            originalBasename.includes('/') || originalBasename.includes('\\') ||
            Buffer.byteLength(originalBasename, 'utf8') > MAX_STAGING_FILENAME_BYTES) {
            throw new Error(`Invalid staged artifact source filename: ${originalBasename}`);
        }
        const location = join(directory, LONG_FILENAME_DIRECTORY, originalBasename);
        const suffix = filename.slice(metadata.key.length, -metadata.extension.length || undefined);
        if (Buffer.byteLength(suffix, 'utf8') > MAX_STAGING_FILENAME_BYTES) {
            throw new Error('Staged artifact revision metadata exceeds filename limit.');
        }
        await mkdir(location, { recursive: true });
        return join(location, suffix);
    }

    private getDirectory(
        stagingRoot:
            string,

        resourceName:
            string
    ): string {

        return join(
            stagingRoot,
            'artifacts',
            resourceName
        );
    }


    private async removePrevious(
        previous:
            StagedArtifactEntry |
            undefined,

        currentPath:
            string
    ): Promise<void> {

        if (
            previous ===
            undefined ||
            previous.path ===
            currentPath
        ) {
            return;
        }


        await unlink(
            previous.path
        );
    }


    private async calculateFileSha256(
        path:
            string
    ): Promise<string> {

        const hash =
            createHash(
                'sha256'
            );


        for await (
            const chunk
            of createReadStream(
                path
            )
        ) {
            hash.update(
                chunk as Buffer
            );
        }


        return hash.digest(
            'hex'
        );
    }


    private calculateBytesSha256(
        bytes:
            Uint8Array
    ): string {

        return createHash(
            'sha256'
        )
            .update(
                Buffer.from(
                    bytes
                )
            )
            .digest(
                'hex'
            );
    }


    private isFileNotFound(
        error:
            unknown
    ): boolean {

        return (
            error instanceof Error &&
            'code' in error &&
            error.code ===
            'ENOENT'
        );
    }
}