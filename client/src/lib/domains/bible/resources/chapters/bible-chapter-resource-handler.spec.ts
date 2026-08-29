import {
    describe,
    expect,
    it
} from 'vitest';

import type {
    DecodedResourceContent
} from '$lib/resource/models/resource.model';

import type {
    BibleChapterCandidate
} from './bible-chapter-candidate';

import type {
    ValidatedBibleChapterCandidate
} from './validated-bible-chapter-candidate';

import {
    BibleChapterResourceHandler
} from './bible-chapter-resource-handler';
import { BIBLE_CHAPTER_RESOURCE_TYPE } from './bible-chapter-interpreter';

describe(
    'BibleChapterResourceHandler',
    () => {
        it(
            'interprets validates and installs the Resource',
            async () => {
                const interpreter =
                    new FakeInterpreter([
                        createCandidate(
                            '1_1'
                        ),
                        createCandidate(
                            '1_2'
                        )
                    ]);

                const validator =
                    new FakeValidator();

                const installer =
                    new FakeInstaller();

                const handler =
                    new BibleChapterResourceHandler(
                        interpreter,
                        validator,
                        installer
                    );

                const resource =
                    createResource();

                await handler.handle(
                    resource
                );

                expect(
                    interpreter.resources
                ).toEqual([
                    resource
                ]);

                expect(
                    validator.candidates.map(
                        (candidate) =>
                            candidate.chapterRef
                    )
                ).toEqual([
                    '1_1',
                    '1_2'
                ]);

                expect(
                    installer.resources
                ).toEqual([
                    resource
                ]);

                expect(
                    installer.candidateBatches
                    [0]
                        .map(
                            (candidate) =>
                                candidate.chapterRef
                        )
                ).toEqual([
                    '1_1',
                    '1_2'
                ]);
            }
        );

        it(
            'validates every interpreted candidate before installation',
            async () => {
                const calls:
                    string[] = [];

                const interpreter =
                    new FakeInterpreter(
                        [
                            createCandidate(
                                '1_1'
                            ),
                            createCandidate(
                                '1_2'
                            )
                        ],
                        calls
                    );

                const validator =
                    new FakeValidator(
                        calls
                    );

                const installer =
                    new FakeInstaller(
                        calls
                    );

                const handler =
                    new BibleChapterResourceHandler(
                        interpreter,
                        validator,
                        installer
                    );

                await handler.handle(
                    createResource()
                );

                expect(
                    calls
                ).toEqual([
                    'interpret',
                    'validate:1_1',
                    'validate:1_2',
                    'install'
                ]);
            }
        );

        it(
            'does not install when candidate validation fails',
            async () => {
                const interpreter =
                    new FakeInterpreter([
                        createCandidate(
                            '1_1'
                        ),
                        createCandidate(
                            '1_2'
                        ),
                        createCandidate(
                            '1_3'
                        )
                    ]);

                const validator =
                    new FakeValidator(
                        undefined,
                        '1_2'
                    );

                const installer =
                    new FakeInstaller();

                const handler =
                    new BibleChapterResourceHandler(
                        interpreter,
                        validator,
                        installer
                    );

                await expect(
                    handler.handle(
                        createResource()
                    )
                ).rejects.toThrow(
                    'validation failed'
                );

                expect(
                    validator.candidates.map(
                        (candidate) =>
                            candidate.chapterRef
                    )
                ).toEqual([
                    '1_1',
                    '1_2'
                ]);

                expect(
                    installer.resources
                ).toHaveLength(
                    0
                );

                expect(
                    installer.candidateBatches
                ).toHaveLength(
                    0
                );
            }
        );

        it(
            'does not install when interpretation fails',
            async () => {
                const interpreter =
                    new ThrowingInterpreter();

                const validator =
                    new FakeValidator();

                const installer =
                    new FakeInstaller();

                const handler =
                    new BibleChapterResourceHandler(
                        interpreter,
                        validator,
                        installer
                    );

                await expect(
                    handler.handle(
                        createResource()
                    )
                ).rejects.toThrow(
                    'interpretation failed'
                );

                expect(
                    validator.candidates
                ).toHaveLength(
                    0
                );

                expect(
                    installer.resources
                ).toHaveLength(
                    0
                );
            }
        );

        it(
            'passes an empty candidate collection to the installer',
            async () => {
                const interpreter =
                    new FakeInterpreter(
                        []
                    );

                const validator =
                    new FakeValidator();

                const installer =
                    new FakeInstaller();

                const handler =
                    new BibleChapterResourceHandler(
                        interpreter,
                        validator,
                        installer
                    );

                const resource =
                    createResource();

                await handler.handle(
                    resource
                );

                expect(
                    validator.candidates
                ).toHaveLength(
                    0
                );

                expect(
                    installer.resources
                ).toEqual([
                    resource
                ]);

                expect(
                    installer.candidateBatches
                ).toEqual([
                    []
                ]);
            }
        );

        it(
            'exposes its Resource Type',
            () => {
                const interpreter =
                    new FakeInterpreter(
                        []
                    );

                const validator =
                    new FakeValidator();

                const installer =
                    new FakeInstaller();

                const handler =
                    new BibleChapterResourceHandler(
                        interpreter,
                        validator,
                        installer
                    );
                expect(
                    handler.resourceType
                ).toBe(
                    BIBLE_CHAPTER_RESOURCE_TYPE
                );
            }
        );
    }
);

function createResource():
    DecodedResourceContent {
    return {
        publisher:
            'publisher',

        resourceId:
            'kjvonly/bible/chapters/kjvs',

        resourceType:
            'kjvonly/bible/chapters',

        eventId:
            'event-id',

        modifiedAt:
            200,

        mediaType:
            'application/json',

        value: {}
    };
}

function createCandidate(
    chapterRef: string
): BibleChapterCandidate {
    return {
        version:
            'kjvs',

        chapterRef,

        value: {
            number:
                Number(
                    chapterRef.split(
                        '_'
                    )[1]
                ),

            bookName:
                'Genesis',

            verses: {},

            verseMap: {},

            footnotes: {}
        }
    };
}

function createValidatedCandidate(
    candidate:
        BibleChapterCandidate
): ValidatedBibleChapterCandidate {
    return {
        version:
            candidate.version,

        chapterRef:
            candidate.chapterRef,

        content:
            candidate.value as
            ValidatedBibleChapterCandidate[
            'content'
            ]
    };
}

class FakeInterpreter {
    readonly resourceType =
        'kjvonly/bible/chapters';

    readonly resources:
        DecodedResourceContent[] =
        [];

    constructor(
        private readonly candidates:
            readonly BibleChapterCandidate[],

        private readonly calls?:
            string[]
    ) { }

    interpret(
        resource:
            DecodedResourceContent
    ): Iterable<
        BibleChapterCandidate
    > {
        this.resources.push(
            resource
        );

        this.calls?.push(
            'interpret'
        );

        return this.candidates;
    }
}

class ThrowingInterpreter {
    readonly resourceType =
        'kjvonly/bible/chapters';

    interpret(
        _resource:
            DecodedResourceContent
    ): Iterable<
        BibleChapterCandidate
    > {
        throw new Error(
            'interpretation failed'
        );
    }
}

class FakeValidator {

    readonly candidates:
        BibleChapterCandidate[] =
        [];

    constructor(
        private readonly calls?:
            string[],

        private readonly failingChapterRef?:
            string
    ) { }

    validate(
        candidate:
            BibleChapterCandidate
    ): ValidatedBibleChapterCandidate {
        this.candidates.push(
            candidate
        );

        this.calls?.push(
            `validate:${candidate.chapterRef}`
        );

        if (
            candidate.chapterRef ===
            this.failingChapterRef
        ) {
            throw new Error(
                'validation failed'
            );
        }

        return createValidatedCandidate(
            candidate
        );
    }
}

class FakeInstaller {

    readonly resources:
        DecodedResourceContent[] =
        [];

    readonly candidateBatches:
        ValidatedBibleChapterCandidate[][] =
        [];

    constructor(
        private readonly calls?:
            string[]
    ) { }

    async install(
        resource:
            DecodedResourceContent,

        candidates:
            readonly ValidatedBibleChapterCandidate[]
    ): Promise<void> {
        this.resources.push(
            resource
        );


        this.candidateBatches
            .push(
                [
                    ...candidates
                ]
            );

        this.calls?.push(
            'install'
        );
    }
}