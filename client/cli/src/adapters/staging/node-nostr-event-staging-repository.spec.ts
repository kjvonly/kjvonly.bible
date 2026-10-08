import {
    mkdtemp,
    mkdir,
    rm
} from 'node:fs/promises';

import {
    join
} from 'node:path';

import {
    tmpdir
} from 'node:os';

import {
    afterEach,
    describe,
    expect,
    it,
    vi
} from 'vitest';

import {
    NodeNostrEventStagingRepository
} from './node-nostr-event-staging-repository.js';

import type {
    CollectionEventStagingRepository
} from '#ports/staging/collection-event-staging-repository.js';

import type {
    SignedEventStagingRepository
} from '#ports/staging/signed-event-staging-repository.js';

import type {
    FilesystemEventStagingRepository
} from '#ports/staging/filesystem-event-staging-repository.js';


function createEmptyFilesystemEventStagingRepository():
    FilesystemEventStagingRepository {

    return {
        list:
            async () => [],

        read:
            vi.fn(),

        stage:
            vi.fn(),

        remove:
            vi.fn()
    };
}


describe(
    'NodeNostrEventStagingRepository',
    () => {

        const temporaryDirectories:
            string[] = [];


        afterEach(
            async () => {

                await Promise.all(
                    temporaryDirectories.map(
                        path =>
                            rm(
                                path,
                                {
                                    recursive:
                                        true,

                                    force:
                                        true
                                }
                            )
                    )
                );
            }
        );


        it(
            'lists Resource, Collection, and Filesystem events independently without reading them',
            async () => {

                const stagingRoot =
                    await mkdtemp(
                        join(
                            tmpdir(),
                            'kjvonly-nostr-staging-'
                        )
                    );


                temporaryDirectories.push(
                    stagingRoot
                );


                await mkdir(
                    join(
                        stagingRoot,
                        'events',
                        'chapters'
                    ),
                    {
                        recursive:
                            true
                    }
                );


                await mkdir(
                    join(
                        stagingRoot,
                        'events',
                        '__collections__'
                    ),
                    {
                        recursive:
                            true
                    }
                );


                await mkdir(
                    join(
                        stagingRoot,
                        'events',
                        '__filesystems__'
                    ),
                    {
                        recursive:
                            true
                    }
                );


                const resourcePath =
                    join(
                        stagingRoot,
                        'events',
                        'chapters',
                        'resource.json'
                    );


                const collectionPath =
                    join(
                        stagingRoot,
                        'events',
                        '__collections__',
                        'collection.json'
                    );


                const filesystemPath =
                    join(
                        stagingRoot,
                        'events',
                        '__filesystems__',
                        'filesystem.json'
                    );


                const signedEventRead =
                    vi.fn();


                const signedEventStagingRepository:
                    SignedEventStagingRepository = {
                    list:
                        vi.fn(
                            async (
                                _stagingRoot:
                                    string,

                                resourceName:
                                    string
                            ) => {

                                expect(
                                    resourceName
                                ).toBe(
                                    'chapters'
                                );


                                return [
                                    {
                                        path:
                                            resourcePath,

                                        metadata: {
                                            key:
                                                '1_1',

                                            sourceMtimeMs:
                                                100,

                                            sourceSize:
                                                200,

                                            definitionRevision:
                                                '12345678',

                                            createdAt:
                                                1000,

                                            eventId:
                                                'a'.repeat(
                                                    64
                                                )
                                        }
                                    }
                                ];
                            }
                        ),

                    read:
                        signedEventRead,

                    stage:
                        vi.fn(),

                    remove:
                        vi.fn()
                };


                const collectionEventRead =
                    vi.fn();


                const collectionEventStagingRepository:
                    CollectionEventStagingRepository = {
                    list:
                        vi.fn(
                            async () => [
                                {
                                    path:
                                        collectionPath,

                                    collectionName:
                                        'application-defaults',

                                    createdAt:
                                        1001,

                                    eventId:
                                        'b'.repeat(
                                            64
                                        )
                                }
                            ]
                        ),

                    read:
                        collectionEventRead,

                    stage:
                        vi.fn(),

                    remove:
                        vi.fn()
                };


                const filesystemEventRead =
                    vi.fn();


                const filesystemEventStagingRepository:
                    FilesystemEventStagingRepository = {
                    list:
                        vi.fn(
                            async () => [
                                {
                                    path:
                                        filesystemPath,

                                    filesystemName:
                                        'library',

                                    inputRevision:
                                        'c'.repeat(
                                            32
                                        ),

                                    createdAt:
                                        1002,

                                    eventId:
                                        'c'.repeat(
                                            64
                                        )
                                }
                            ]
                        ),

                    read:
                        filesystemEventRead,

                    stage:
                        vi.fn(),

                    remove:
                        vi.fn()
                };


                const repository =
                    new NodeNostrEventStagingRepository(
                        signedEventStagingRepository,
                        collectionEventStagingRepository,
                        filesystemEventStagingRepository
                    );


                expect(
                    await repository.list(
                        stagingRoot,
                        'resource'
                    )
                ).toEqual([
                    {
                        path:
                            resourcePath,

                        eventId:
                            'a'.repeat(
                                64
                            ),

                        createdAt:
                            1000
                    }
                ]);


                expect(
                    await repository.list(
                        stagingRoot,
                        'collection'
                    )
                ).toEqual([
                    {
                        path:
                            collectionPath,

                        eventId:
                            'b'.repeat(
                                64
                            ),

                        createdAt:
                            1001
                    }
                ]);


                expect(
                    await repository.list(
                        stagingRoot,
                        'filesystem'
                    )
                ).toEqual([
                    {
                        path:
                            filesystemPath,

                        eventId:
                            'c'.repeat(
                                64
                            ),

                        createdAt:
                            1002
                    }
                ]);


                expect(
                    signedEventStagingRepository.list
                ).toHaveBeenCalledTimes(
                    1
                );


                expect(
                    collectionEventStagingRepository.list
                ).toHaveBeenCalledTimes(
                    1
                );


                expect(
                    filesystemEventStagingRepository.list
                ).toHaveBeenCalledTimes(
                    1
                );


                expect(
                    signedEventRead
                ).not.toHaveBeenCalled();


                expect(
                    collectionEventRead
                ).not.toHaveBeenCalled();


                expect(
                    filesystemEventRead
                ).not.toHaveBeenCalled();
            }
        );
        it(
            'reads a staged resource event through the signed event repository',
            async () => {

                const stagingRoot =
                    '/tmp/staging';


                const path =
                    '/tmp/staging/events/chapters/event.json';


                const event = {
                    id:
                        'a'.repeat(
                            64
                        ),

                    pubkey:
                        'b'.repeat(
                            64
                        ),

                    created_at:
                        1000,

                    kind:
                        37770,

                    tags:
                        [],

                    content:
                        'content',

                    sig:
                        'c'.repeat(
                            128
                        )
                };


                const sourceEntry = {
                    path,

                    metadata: {
                        key:
                            '1_1',

                        sourceMtimeMs:
                            100,

                        sourceSize:
                            200,

                        definitionRevision:
                            '12345678',

                        createdAt:
                            1000,

                        eventId:
                            event.id
                    }
                };


                const signedEventRead =
                    vi.fn(
                        async () =>
                            event
                    );


                const signedEventStagingRepository:
                    SignedEventStagingRepository = {
                    list:
                        vi.fn(
                            async () => [
                                sourceEntry
                            ]
                        ),

                    read:
                        signedEventRead,

                    stage:
                        vi.fn(),

                    remove:
                        vi.fn()
                };


                const collectionEventStagingRepository:
                    CollectionEventStagingRepository = {
                    list:
                        vi.fn(
                            async () => []
                        ),

                    read:
                        vi.fn(),

                    stage:
                        vi.fn(),

                    remove:
                        vi.fn()
                };


                const repository =
                    new NodeNostrEventStagingRepository(
                        signedEventStagingRepository,
                        collectionEventStagingRepository,
                        createEmptyFilesystemEventStagingRepository()
                    );


                const result =
                    await repository.read({
                        path,

                        eventId:
                            event.id,

                        createdAt:
                            1000
                    });


                expect(
                    result
                ).toBe(
                    event
                );


                expect(
                    signedEventRead
                ).toHaveBeenCalledWith(
                    sourceEntry
                );
            }
        );

        it(
            'reads a staged collection event through the collection event repository',
            async () => {

                const path =
                    '/tmp/staging/events/__collections__/event.json';


                const event = {
                    id:
                        'a'.repeat(
                            64
                        ),

                    pubkey:
                        'b'.repeat(
                            64
                        ),

                    created_at:
                        1000,

                    kind:
                        37770,

                    tags:
                        [],

                    content:
                        'content',

                    sig:
                        'c'.repeat(
                            128
                        )
                };


                const sourceEntry = {
                    path,

                    collectionName:
                        'application-defaults',

                    createdAt:
                        1000,

                    eventId:
                        event.id
                };


                const signedEventStagingRepository:
                    SignedEventStagingRepository = {
                    list:
                        vi.fn(
                            async () => []
                        ),

                    read:
                        vi.fn(),

                    stage:
                        vi.fn(),

                    remove:
                        vi.fn()
                };


                const collectionEventRead =
                    vi.fn(
                        async () =>
                            event
                    );


                const collectionEventStagingRepository:
                    CollectionEventStagingRepository = {
                    list:
                        vi.fn(
                            async () => [
                                sourceEntry
                            ]
                        ),

                    read:
                        collectionEventRead,

                    stage:
                        vi.fn(),

                    remove:
                        vi.fn()
                };


                const repository =
                    new NodeNostrEventStagingRepository(
                        signedEventStagingRepository,
                        collectionEventStagingRepository,
                        createEmptyFilesystemEventStagingRepository()
                    );


                const result =
                    await repository.read({
                        path,

                        eventId:
                            event.id,

                        createdAt:
                            1000
                    });


                expect(
                    result
                ).toBe(
                    event
                );


                expect(
                    collectionEventRead
                ).toHaveBeenCalledWith(
                    sourceEntry
                );
            }
        );

        it(
            'reads a staged Filesystem event through the Filesystem event repository',
            async () => {

                const path =
                    '/tmp/staging/events/__filesystems__/event.json';


                const event = {
                    id:
                        'a'.repeat(
                            64
                        ),

                    pubkey:
                        'b'.repeat(
                            64
                        ),

                    created_at:
                        1000,

                    kind:
                        37770,

                    tags:
                        [],

                    content:
                        'content',

                    sig:
                        'c'.repeat(
                            128
                        )
                };


                const sourceEntry = {
                    path,

                    filesystemName:
                        'library',

                    inputRevision:
                        'd'.repeat(
                            32
                        ),

                    createdAt:
                        1000,

                    eventId:
                        event.id
                };


                const filesystemEventRead =
                    vi.fn(
                        async () =>
                            event
                    );


                const filesystemEventStagingRepository:
                    FilesystemEventStagingRepository = {
                    list:
                        vi.fn(
                            async () => [
                                sourceEntry
                            ]
                        ),

                    read:
                        filesystemEventRead,

                    stage:
                        vi.fn(),

                    remove:
                        vi.fn()
                };


                const repository =
                    new NodeNostrEventStagingRepository(
                        {
                            list:
                                async () => [],

                            read:
                                vi.fn(),

                            stage:
                                vi.fn(),

                            remove:
                                vi.fn()
                        },
                        {
                            list:
                                async () => [],

                            read:
                                vi.fn(),

                            stage:
                                vi.fn(),

                            remove:
                                vi.fn()
                        },
                        filesystemEventStagingRepository
                    );


                const result =
                    await repository.read({
                        path,

                        eventId:
                            event.id,

                        createdAt:
                            1000
                    });


                expect(
                    result
                ).toBe(
                    event
                );


                expect(
                    filesystemEventRead
                ).toHaveBeenCalledWith(
                    sourceEntry
                );
            }
        );

    }
);