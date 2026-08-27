import {
    describe,
    expect,
    it
} from 'vitest';

import type {
    VerifiedResourceContent
} from '$lib/resource/models/resource.model';

import {
    JsonResourceContentDecorator
} from './json-resource-content-decorator';

import {
    ResourceContentDecoratorBuilder
} from './resource-content-decorator-builder';

import {
    ResourceContentDecoder
} from './resource-content-decoder';

import {
    GzipResourceContentDecorator
} from './gzip-resource-content-decorator';

import {
    HexResourceContentDecorator
} from './hex-resource-content-decorator';
import { BaseResourceContentDecorator } from './base-resource-content-decorator';


describe(
    'ResourceContentDecoder',
    () => {
        it(
            'decodes Resource content using the media type decorator chain',
            async () => {
                const decoder =
                    createDecoder();

                const result =
                    await decoder.decode(
                        createVerifiedContent()
                    );

                expect(
                    result.value
                ).toEqual({
                    chapter:
                        1
                });
            }
        );

        it(
            'passes unregistered media types through unchanged',
            async () => {
                const decoder =
                    createDecoder();

                const bytes =
                    new Uint8Array([
                        1,
                        2,
                        3
                    ]);

                const result =
                    await decoder.decode(
                        createVerifiedContent({
                            mediaType:
                                'audio/mpeg',

                            content:
                                bytes
                        })
                    );

                expect(
                    result.value
                ).toBe(
                    bytes
                );
            }
        );

        it(
            'preserves Resource metadata while decoding content',
            async () => {
                const decoder =
                    createDecoder();

                const result =
                    await decoder.decode(
                        createVerifiedContent()
                    );

                expect(
                    result
                ).toMatchObject({
                    publisher:
                        'a'.repeat(64),

                    resourceId:
                        'kjvonly/bible/chapters/kjv/1_1',

                    resourceType:
                        'kjvonly/bible/chapters',

                    eventId:
                        'b'.repeat(64),

                    modifiedAt:
                        123456,

                    mediaType:
                        'application/json'
                });
            }
        );

        it(
            'does not perform Domain validation',
            async () => {
                const decoder =
                    createDecoder();

                const result =
                    await decoder.decode(
                        createVerifiedContent({
                            content:
                                '{"anything":"goes"}'
                        })
                    );

                expect(
                    result.value
                ).toEqual({
                    anything:
                        'goes'
                });
            }
        );

        it(
            'decodes application/json+gzip+hex content',
            async () => {
                const decoder =
                    createDecoder();

                const encoder =
                    new HexResourceContentDecorator(
                        new GzipResourceContentDecorator(
                            new JsonResourceContentDecorator(
                                new BaseResourceContentDecorator()
                            )
                        )
                    );

                const content =
                    await encoder.encode({
                        chapter:
                            1,

                        bookName:
                            'Genesis'
                    });

                const result =
                    await decoder.decode(
                        createVerifiedContent({
                            mediaType:
                                'application/json+gzip+hex',

                            content:
                                content as string
                        })
                    );

                expect(
                    result.value
                ).toEqual({
                    chapter:
                        1,

                    bookName:
                        'Genesis'
                });
            }
        );
    }
);

function createDecoder():
	ResourceContentDecoder {
	const builder =
		new ResourceContentDecoratorBuilder([
			{
				token:
					'application/json',

				decorate:
					(inner) =>
						new JsonResourceContentDecorator(
							inner
						)
			},
			{
				token:
					'gzip',

				decorate:
					(inner) =>
						new GzipResourceContentDecorator(
							inner
						)
			},
			{
				token:
					'hex',

				decorate:
					(inner) =>
						new HexResourceContentDecorator(
							inner
						)
			}
		]);

	return new ResourceContentDecoder(
		builder
	);
}

function createVerifiedContent(
    overrides:
        Partial<VerifiedResourceContent> =
        {}
): VerifiedResourceContent {
    return {
        publisher:
            'a'.repeat(64),

        resourceId:
            'kjvonly/bible/chapters/kjv/1_1',

        resourceType:
            'kjvonly/bible/chapters',

        eventId:
            'b'.repeat(64),

        modifiedAt:
            123456,

        mediaType:
            'application/json',

        content:
            '{"chapter":1}',

        ...overrides
    };
}