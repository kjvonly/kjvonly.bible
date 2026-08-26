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
	BibleChapterCandidate
} from './bible-chapter-candidate';

import type {
	ValidatedBibleChapterCandidate
} from './validated-bible-chapter-candidate';

export interface BibleChapterResourceInstaller {
	install(
		resource:
			DecodedResourceContent,

		candidates:
			readonly ValidatedBibleChapterCandidate[]
	): Promise<void>;
}

export class BibleChapterResourceHandler {

	constructor(
		private readonly interpreter:
			ResourceInterpreter<
				BibleChapterCandidate
			>,

		private readonly validator:
			ResourceValidator<
				BibleChapterCandidate,
				ValidatedBibleChapterCandidate
			>,

		private readonly installer:
			BibleChapterResourceInstaller
	) {}

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