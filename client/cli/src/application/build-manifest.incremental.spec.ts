import {
    mkdtemp,
    mkdir,
    readdir,
    rm,
    unlink,
    writeFile
} from 'node:fs/promises';

import {
    join
} from 'node:path';

import {
    tmpdir
} from 'node:os';

import {
    gzipSync
} from 'node:zlib';

import {
    afterEach,
    describe,
    expect,
    it,
    vi
} from 'vitest';

import {
    GzipEncoder
} from '../adapters/encoding/gzip-encoder.js';

import {
    HexEncoder
} from '../adapters/encoding/hex-encoder.js';

import {
    LocalNostrSigner
} from '../adapters/nostr/local-nostr-signer.js';

import {
    NodeSourceRepository
} from '../adapters/source/node-source-repository.js';

import {
    NodeSignedEventStagingRepository
} from '../adapters/staging/node-signed-event-staging-repository.js';

import type {
    Manifest
} from '../domain/manifest.js';

import type {
    ManifestLoader
} from '../ports/manifest-loader.js';

import {
    BuildManifestUseCase
} from './build-manifest.js';

import {
    EncodingRegistry
} from './encoding/encoding-registry.js';

import {
    InlineEventBuilder
} from './inline-event-builder.js';

import {
    SourceExpander
} from './source-expander.js';
import {
    BlossomDescriptorStrategyBuilder
} from '../adapters/strategy/blossom-descriptor-strategy-builder.js';

import {
    NodeArtifactStagingRepository
} from '../adapters/staging/node-artifact-staging-repository.js';

import {
    DescriptorBackedResourceBuilder
} from './descriptor-backed-resource-builder.js';

import {
    DescriptorEventBuilder
} from './descriptor-event-builder.js';

import {
    DescriptorStrategyRegistry
} from './descriptor-strategy-registry.js';

import {
    ObjectArtifactStager
} from './object-artifact-stager.js';

import {
    ResourceDescriptorBuilder
} from './resource-descriptor-builder.js';

const directories:
    string[] = [];


const secretKey =
    '01'.repeat(
        32
    );


async function createDirectory():
    Promise<string> {

    const directory =
        await mkdtemp(
            join(
                tmpdir(),
                'kjvonly-incremental-'
            )
        );


    directories.push(
        directory
    );


    return directory;
}


function createManifest():
    Manifest {

    return {
        version:
            1,

        kind:
            37770,

        staging: {
            path:
                './.kjvonly'
        },

        nostr: {
            relays: [
                'wss://relay.example'
            ]
        },

        strategies:
            {},

        resources: {
            chapters: {
                path:
                    './data',

                event: {
                    encoding: [
                        'hex'
                    ],

                    tags: [
                        [
                            'd',
                            'kjvonly/test/${key}'
                        ],
                        [
                            'm',
                            'application/json+gzip+hex'
                        ]
                    ]
                }
            }
        },

        collections:
            {}
    };
}



function createBuild(
    directory:
        string,

    manifest:
        Manifest,

    sourceRepository:
        NodeSourceRepository
): BuildManifestUseCase {

    const encodingRegistry =
        new EncodingRegistry([
            new GzipEncoder(),
            new HexEncoder()
        ]);


    const clock = {
        nowEpochSeconds:
            () =>
                1_000
    };


    const eventStagingRepository =
        new NodeSignedEventStagingRepository();


    const artifactStagingRepository =
        new NodeArtifactStagingRepository();


    const objectArtifactStager =
        new ObjectArtifactStager(
            sourceRepository,
            encodingRegistry,
            artifactStagingRepository
        );


    const descriptorStrategyRegistry =
        new DescriptorStrategyRegistry([
            new BlossomDescriptorStrategyBuilder()
        ]);

    const signer =
        new LocalNostrSigner(
            secretKey
        );

    const loader:
        ManifestLoader = {
        load:
            async () => ({
                path:
                    join(
                        directory,
                        'manifest.yaml'
                    ),

                directory,

                manifest
            })
    };

    const descriptorEventBuilder =
        new DescriptorEventBuilder(
            encodingRegistry,
            signer,
            clock,
            new ResourceDescriptorBuilder()
        );


    const descriptorBackedResourceBuilder =
        new DescriptorBackedResourceBuilder(
            objectArtifactStager,
            descriptorStrategyRegistry,
            descriptorEventBuilder,
            signer,
            eventStagingRepository
        );


    return new BuildManifestUseCase(
        loader,

        new SourceExpander(
            sourceRepository
        ),

        sourceRepository,

        new InlineEventBuilder(
            sourceRepository,
            encodingRegistry,
            signer,
            clock
        ),

        signer,

        eventStagingRepository,

        descriptorBackedResourceBuilder
    );
}


afterEach(
    async () => {

        for (
            const directory
            of directories.splice(0)
        ) {
            await rm(
                directory,
                {
                    recursive:
                        true,

                    force:
                        true
                }
            );
        }
    }
);


describe(
    'BuildManifest incremental staging',
    () => {

        it(
            'reuses an unchanged signed event without reading the source payload',
            async () => {

                const directory =
                    await createDirectory();


                const data =
                    join(
                        directory,
                        'data'
                    );


                await mkdir(
                    data
                );


                await writeFile(
                    join(
                        data,
                        '1_1.json.gz'
                    ),
                    gzipSync(
                        Buffer.from(
                            'chapter'
                        )
                    )
                );


                const sourceRepository =
                    new NodeSourceRepository();


                const build =
                    createBuild(
                        directory,
                        createManifest(),
                        sourceRepository
                    );


                await build.build(
                    'manifest.yaml'
                );


                const eventDirectory =
                    join(
                        directory,
                        '.kjvonly',
                        'events',
                        'chapters'
                    );


                const firstFiles =
                    await readdir(
                        eventDirectory
                    );


                const readFileSpy =
                    vi.spyOn(
                        sourceRepository,
                        'readFile'
                    );


                await build.build(
                    'manifest.yaml'
                );


                const secondFiles =
                    await readdir(
                        eventDirectory
                    );


                expect(
                    secondFiles
                ).toEqual(
                    firstFiles
                );


                expect(
                    readFileSpy
                ).not.toHaveBeenCalled();
            }
        );


        it(
            'rebuilds when the source changes',
            async () => {

                const directory =
                    await createDirectory();


                const data =
                    join(
                        directory,
                        'data'
                    );


                await mkdir(
                    data
                );


                const sourcePath =
                    join(
                        data,
                        '1_1.json.gz'
                    );


                await writeFile(
                    sourcePath,
                    gzipSync(
                        Buffer.from(
                            'first'
                        )
                    )
                );


                const sourceRepository =
                    new NodeSourceRepository();


                const build =
                    createBuild(
                        directory,
                        createManifest(),
                        sourceRepository
                    );


                await build.build(
                    'manifest.yaml'
                );


                const eventDirectory =
                    join(
                        directory,
                        '.kjvonly',
                        'events',
                        'chapters'
                    );


                const firstFiles =
                    await readdir(
                        eventDirectory
                    );


                await writeFile(
                    sourcePath,
                    gzipSync(
                        Buffer.from(
                            'second source with different size'
                        )
                    )
                );


                await build.build(
                    'manifest.yaml'
                );


                const secondFiles =
                    await readdir(
                        eventDirectory
                    );


                expect(
                    secondFiles
                ).toHaveLength(1);


                expect(
                    secondFiles[0]
                ).not.toBe(
                    firstFiles[0]
                );
            }
        );


        it(
            'rebuilds when the event definition changes',
            async () => {

                const directory =
                    await createDirectory();


                const data =
                    join(
                        directory,
                        'data'
                    );


                await mkdir(
                    data
                );


                await writeFile(
                    join(
                        data,
                        '1_1.json.gz'
                    ),
                    gzipSync(
                        Buffer.from(
                            'chapter'
                        )
                    )
                );


                const sourceRepository =
                    new NodeSourceRepository();


                const manifest =
                    createManifest();


                const build =
                    createBuild(
                        directory,
                        manifest,
                        sourceRepository
                    );


                await build.build(
                    'manifest.yaml'
                );


                const eventDirectory =
                    join(
                        directory,
                        '.kjvonly',
                        'events',
                        'chapters'
                    );


                const firstFiles =
                    await readdir(
                        eventDirectory
                    );


                manifest
                    .resources
                    .chapters
                    .event
                    .tags
                    .push([
                        'language',
                        'en'
                    ]);


                await build.build(
                    'manifest.yaml'
                );


                const secondFiles =
                    await readdir(
                        eventDirectory
                    );


                expect(
                    secondFiles
                ).toHaveLength(1);


                expect(
                    secondFiles[0]
                ).not.toBe(
                    firstFiles[0]
                );
            }
        );


        it(
            'removes staging when a source is removed',
            async () => {

                const directory =
                    await createDirectory();


                const data =
                    join(
                        directory,
                        'data'
                    );


                await mkdir(
                    data
                );


                const sourcePath =
                    join(
                        data,
                        '1_1.json.gz'
                    );


                await writeFile(
                    sourcePath,
                    gzipSync(
                        Buffer.from(
                            'chapter'
                        )
                    )
                );


                const sourceRepository =
                    new NodeSourceRepository();


                const build =
                    createBuild(
                        directory,
                        createManifest(),
                        sourceRepository
                    );


                await build.build(
                    'manifest.yaml'
                );


                await unlink(
                    sourcePath
                );


                await build.build(
                    'manifest.yaml'
                );


                const files =
                    await readdir(
                        join(
                            directory,
                            '.kjvonly',
                            'events',
                            'chapters'
                        )
                    );


                expect(
                    files
                ).toEqual(
                    []
                );
            }
        );
    }
);