import {
    describe,
    expect,
    it,
    vi
} from 'vitest';

import type {
    ResourceContentDecorator
} from './resource-content-decorator';

import {
    BaseResourceContentDecorator
} from './base-resource-content-decorator';

import {
    ResourceContentDecoratorBuilder
} from './resource-content-decorator-builder';

describe(
    'ResourceContentDecoratorBuilder',
    () => {
        it(
            'returns only the base decorator for an unregistered media type',
            () => {
                const builder =
                    new ResourceContentDecoratorBuilder(
                        []
                    );

                const result =
                    builder.build(
                        'audio/mpeg'
                    );

                expect(
                    result
                ).toBeInstanceOf(
                    BaseResourceContentDecorator
                );
            }
        );

        it(
            'applies a registered base media type decorator',
            () => {
                const decorated =
                    createDecorator();


                const decorate =
                    vi.fn<
                        (
                            inner: ResourceContentDecorator
                        ) => ResourceContentDecorator
                    >(
                        () =>
                            decorated
                    );

                const builder =
                    new ResourceContentDecoratorBuilder([
                        {
                            token:
                                'application/json',

                            decorate
                        }
                    ]);

                const result =
                    builder.build(
                        'application/json'
                    );

                expect(
                    decorate
                ).toHaveBeenCalledOnce();

                expect(
                    decorate.mock
                        .calls[0][0]
                ).toBeInstanceOf(
                    BaseResourceContentDecorator
                );

                expect(
                    result
                ).toBe(
                    decorated
                );
            }
        );

        it(
            'builds decorators in MIME token order',
            () => {
                const json =
                    createDecorator();

                const gzip =
                    createDecorator();

                const hex =
                    createDecorator();


                const jsonDecorator =
                    vi.fn<
                        (
                            inner: ResourceContentDecorator
                        ) => ResourceContentDecorator
                    >(
                        () =>
                            json
                    );

                const gzipDecorator =
                    vi.fn<
                        (
                            inner: ResourceContentDecorator
                        ) => ResourceContentDecorator
                    >(
                        () =>
                            gzip
                    );

                const hexDecorator =
                    vi.fn<
                        (
                            inner: ResourceContentDecorator
                        ) => ResourceContentDecorator
                    >(
                        () =>
                            hex
                    );

                const builder =
                    new ResourceContentDecoratorBuilder([
                        {
                            token:
                                'application/json',

                            decorate:
                                jsonDecorator
                        },
                        {
                            token:
                                'gzip',

                            decorate:
                                gzipDecorator
                        },
                        {
                            token:
                                'hex',

                            decorate:
                                hexDecorator
                        }
                    ]);

                const result =
                    builder.build(
                        'application/json+gzip+hex'
                    );

                expect(
                    jsonDecorator.mock
                        .calls[0][0]
                ).toBeInstanceOf(
                    BaseResourceContentDecorator
                );

                expect(
                    gzipDecorator
                ).toHaveBeenCalledWith(
                    json
                );

                expect(
                    hexDecorator
                ).toHaveBeenCalledWith(
                    gzip
                );

                expect(
                    result
                ).toBe(
                    hex
                );
            }
        );

        it(
            'allows an unregistered base media type with registered encodings',
            () => {
                const gzip =
                    createDecorator();

                const gzipDecorator =
                    vi.fn<
                        (
                            inner: ResourceContentDecorator
                        ) => ResourceContentDecorator
                    >(
                        () =>
                            gzip
                    );

                const builder =
                    new ResourceContentDecoratorBuilder([
                        {
                            token:
                                'gzip',

                            decorate:
                                gzipDecorator
                        }
                    ]);

                const result =
                    builder.build(
                        'audio/mpeg+gzip'
                    );

                expect(
                    gzipDecorator.mock
                        .calls[0][0]
                ).toBeInstanceOf(
                    BaseResourceContentDecorator
                );

                expect(
                    result
                ).toBe(
                    gzip
                );
            }
        );

        it(
            'rejects an unsupported encoding suffix',
            () => {
                const builder =
                    new ResourceContentDecoratorBuilder(
                        []
                    );

                expect(
                    () =>
                        builder.build(
                            'audio/mpeg+gzip'
                        )
                ).toThrow(
                    'Unsupported Resource content encoding: gzip'
                );
            }
        );

        it(
            'requires a media type',
            () => {
                const builder =
                    new ResourceContentDecoratorBuilder(
                        []
                    );

                expect(
                    () =>
                        builder.build(
                            ''
                        )
                ).toThrow(
                    'Resource media type is required.'
                );
            }
        );
    }
);

function createDecorator():
    ResourceContentDecorator {
    return {
        encode:
            async (
                value
            ) =>
                value,

        decode:
            async (
                value
            ) =>
                value
    };
}