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
	BibleSearchIndexCandidate
} from './bible-search-index-candidate';

import type {
	ValidatedBibleSearchIndexCandidate
} from './validated-bible-search-index-candidate';

import {
	BIBLE_SEARCH_RESOURCE_TYPE
} from './bible-search-index-interpreter';

export interface BibleSearchIndexResourceInstaller {
	install(
		resource:
			DecodedResourceContent,

		candidates:
			readonly ValidatedBibleSearchIndexCandidate[]
	): Promise<void>;
}

export class BibleSearchIndexResourceHandler
	implements ResourceHandler {

	readonly resourceType =
		BIBLE_SEARCH_RESOURCE_TYPE;

	constructor(
		private readonly interpreter:
			ResourceInterpreter<
				BibleSearchIndexCandidate
			>,

		private readonly validator:
			ResourceValidator<
				BibleSearchIndexCandidate,
				ValidatedBibleSearchIndexCandidate
			>,

		private readonly installer:
			BibleSearchIndexResourceInstaller
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
