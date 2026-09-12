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
	BibleBooknamesCandidate
} from './bible-booknames-candidate';

import type {
	ValidatedBibleBooknamesCandidate
} from './validated-bible-booknames-candidate';

import {
	BIBLE_BOOKNAMES_RESOURCE_TYPE
} from './bible-booknames-interpreter';

export interface BibleBooknamesResourceInstaller {
	install(
		resource:
			DecodedResourceContent,

		candidates:
			readonly ValidatedBibleBooknamesCandidate[]
	): Promise<void>;
}

export class BibleBooknamesResourceHandler
	implements ResourceHandler {

	readonly resourceType =
		BIBLE_BOOKNAMES_RESOURCE_TYPE;

	constructor(
		private readonly interpreter:
			ResourceInterpreter<
				BibleBooknamesCandidate
			>,

		private readonly validator:
			ResourceValidator<
				BibleBooknamesCandidate,
				ValidatedBibleBooknamesCandidate
			>,

		private readonly installer:
			BibleBooknamesResourceInstaller
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
