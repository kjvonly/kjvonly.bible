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
    join
} from 'node:path';

import {
    buildStagedArtifactFilename,
    parseStagedArtifactFilename
} from '../../domain/staged-artifact-filename.js';

import type {
    ArtifactStagingRepository,
    StageIdentityArtifactRequest,
    StageMaterializedArtifactRequest,
    StagedArtifactEntry
} from '../../ports/artifact-staging-repository.js';


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
            `${path}.${randomUUID()}.tmp`;


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
            `${path}.${randomUUID()}.tmp`;


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
	directory:
		string,

	entries:
		readonly import(
			'node:fs'
		).Dirent[]
): Promise<
	readonly StagedArtifactEntry[]
> {

	const staged:
		StagedArtifactEntry[] =
			[];


	for (
		const entry
		of entries
	) {
		if (
			entry.name
				.startsWith(
					'.'
				)
		) {
			continue;
		}


		const kind =
			entry.isSymbolicLink()
				? 'symlink'
				: entry.isFile()
					? 'file'
					: undefined;


		if (
			kind ===
				undefined
		) {
			throw new Error(
				`Invalid staged artifact entry: ${entry.name}`
			);
		}


		const path =
			join(
				directory,
				entry.name
			);


		const metadata =
			parseStagedArtifactFilename(
				entry.name
			);


		const fileMetadata =
			await lstat(
				path
			);


		staged.push({
			path,

			metadata,

			kind,

			size:
				kind ===
					'symlink'
					? metadata
						.sourceSize
					: fileMetadata
						.size
		});
	}


	const keys =
		new Set<string>();


	for (
		const entry
		of staged
	) {
		if (
			keys.has(
				entry.metadata.key
			)
		) {
			throw new Error(
				`Multiple staged artifacts found for key: ${entry.metadata.key}`
			);
		}


		keys.add(
			entry.metadata.key
		);
	}


	return staged.sort(
		(
			left,
			right
		) =>
			left.metadata.key <
				right.metadata.key
				? -1
				: left.metadata.key >
					right.metadata.key
					? 1
					: 0
	);
}


    private async preparePath(
        stagingRoot:
            string,

        resourceName:
            string,

        metadata:
            import(
            '../../domain/staged-artifact-filename.js'
            ).StagedArtifactMetadata
    ): Promise<string> {

        const directory =
            this.getDirectory(
                stagingRoot,
                resourceName
            );


        await mkdir(
            directory,
            {
                recursive:
                    true
            }
        );


        return join(
            directory,
            buildStagedArtifactFilename(
                metadata
            )
        );
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