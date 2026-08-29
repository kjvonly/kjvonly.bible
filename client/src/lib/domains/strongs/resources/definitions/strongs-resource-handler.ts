import type {
    DecodedResourceContent
} from '$lib/resource/models/resource.model';

import type {
    ResourceInterpreter
} from '$lib/resource/interpretation/resource-interpreter';

import type {
    ResourceValidator
} from '$lib/resource/validation/resource-validator';

import type {
    StrongsCandidate
} from './strongs-candidate';

import type {
    ValidatedStrongsCandidate
} from './validated-strongs-candidate';

import type {
    StrongsInstaller
} from './strongs-installer';

import type {
	ResourceHandler
} from '$lib/resource/installation/resource-handler';

import {
	STRONGS_RESOURCE_TYPE
} from './strongs-interpreter';

export class StrongsResourceHandler implements ResourceHandler  {


	readonly resourceType =
		STRONGS_RESOURCE_TYPE;

    constructor(
        private readonly interpreter:
            ResourceInterpreter<
                StrongsCandidate
            >,

        private readonly validator:
            ResourceValidator<
                StrongsCandidate,
                ValidatedStrongsCandidate
            >,

        private readonly installer:
            Pick<
                StrongsInstaller,
                'install'
            >
    ) { }

    async handle(
        resource:
            DecodedResourceContent
    ): Promise<void> {

        const candidates =
            Array.from(
                this.interpreter.interpret(
                    resource
                )
            );

        const validatedCandidates =
            candidates.map(
                (candidate) =>
                    this.validator.validate(
                        candidate
                    )
            );

        await this.installer.install(
            resource,
            validatedCandidates
        );
    }
}