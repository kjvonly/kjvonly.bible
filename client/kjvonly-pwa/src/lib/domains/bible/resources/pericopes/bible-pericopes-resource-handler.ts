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
	ResourceHandler
} from '$lib/resource/installation/resource-handler';

import type {
	BiblePericopesCandidate
} from './bible-pericopes-candidate';

import type {
	ValidatedBiblePericopesCandidate
} from './validated-bible-pericopes-candidate';

import {
	BIBLE_PERICOPES_RESOURCE_TYPE
} from './bible-pericopes-interpreter';

export interface BiblePericopesResourceInstaller {
	install(
		resource:
			DecodedResourceContent,

		candidates:
			readonly ValidatedBiblePericopesCandidate[]
	): Promise<void>;
}

export class BiblePericopesResourceHandler
	implements ResourceHandler {

	readonly resourceType =
		BIBLE_PERICOPES_RESOURCE_TYPE;

	constructor(
		private readonly interpreter:
			ResourceInterpreter<
				BiblePericopesCandidate
			>,

		private readonly validator:
			ResourceValidator<
				BiblePericopesCandidate,
				ValidatedBiblePericopesCandidate
			>,

		private readonly installer:
			BiblePericopesResourceInstaller
	) { }

	async handle(
		resource:
			DecodedResourceContent
	): Promise<void> {
		const candidates =
			[
				...this.interpreter.interpret(
					resource
				)
			];

		const validated =
			candidates.map(
				(candidate) =>
					this.validator.validate(
						candidate
					)
			);

		await this.installer.install(
			resource,
			validated
		);
	}
}
