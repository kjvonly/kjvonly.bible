import type {
    DecodedResourceContent
} from '$lib/resource/models/resource.model';

import type {
    ResourceInterpreter
} from '$lib/resource/interpretation/resource-interpreter';

import {
    parseResourceIdentifier
} from '$lib/resource/utils/resource-identifier';

import type {
    StrongsCandidate
} from './strongs-candidate';

export const STRONGS_RESOURCE_TYPE =
    'kjvonly/strongs/definitions';

export class StrongsInterpreter
    implements ResourceInterpreter<StrongsCandidate> {

    readonly resourceType =
        STRONGS_RESOURCE_TYPE;

    interpret(
        resource:
            DecodedResourceContent
    ): Iterable<StrongsCandidate> {

        if (
            resource.resourceType !==
            this.resourceType
        ) {
            throw new Error(
                `Invalid Strong's Resource Type: ${resource.resourceType}`
            );
        }

        const identifier =
            parseResourceIdentifier(
                resource.resourceId
            );

        if (
            identifier.resourceType !==
            this.resourceType
        ) {
            throw new Error(
                `Invalid Strong's Resource Identifier: ${resource.resourceId}`
            );
        }

        if (
            identifier.path.length ===
            2
        ) {
            const [
                version,
                key
            ] =
                identifier.path;

            return [
                {
                    version,
                    key,
                    value:
                        resource.value
                }
            ];
        }

        if (
            identifier.path.length ===
            1
        ) {
            const [
                version
            ] =
                identifier.path;

            return this.interpretBundle(
                version,
                resource.value
            );
        }

        if (
            identifier.path.length ===
            0
        ) {
            throw new Error(
                "Strong's Resource root is not supported."
            );
        }

        throw new Error(
            `Invalid Strong's Resource path: ${resource.resourceId}`
        );
    }

    private interpretBundle(
        version: string,
        value: unknown
    ): Iterable<StrongsCandidate> {

        if (
            value === null ||
            typeof value !==
            'object' ||
            Array.isArray(
                value
            )
        ) {
            throw new Error(
                "Strong's Resource bundle must be an object."
            );
        }

        return Object.entries(
            value
        ).map(
            ([
                key,
                entry
            ]) => {
                if (
                    !key ||
                    key.includes(
                        '/'
                    )
                ) {
                    throw new Error(
                        `Invalid Strong's Resource bundle key: ${key}`
                    );
                }

                return {
                    version,
                    key,
                    value:
                        entry
                };
            }
        );
    }
}