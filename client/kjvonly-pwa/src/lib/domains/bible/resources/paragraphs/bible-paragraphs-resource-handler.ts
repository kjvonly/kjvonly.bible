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
	BibleParagraphsCandidate
} from './bible-paragraphs-candidate';

import type {
	ValidatedBibleParagraphsCandidate
} from './validated-bible-paragraphs-candidate';

import {
	BIBLE_PARAGRAPHS_RESOURCE_TYPE
} from './bible-paragraphs-interpreter';

export interface BibleParagraphsResourceInstaller {
	install(
		resource:
			DecodedResourceContent,

		candidates:
			readonly ValidatedBibleParagraphsCandidate[]
	): Promise<void>;
}

export class BibleParagraphsResourceHandler
	implements ResourceHandler {

	readonly resourceType =
		BIBLE_PARAGRAPHS_RESOURCE_TYPE;

	constructor(
		private readonly interpreter:
			ResourceInterpreter<
				BibleParagraphsCandidate
			>,

		private readonly validator:
			ResourceValidator<
				BibleParagraphsCandidate,
				ValidatedBibleParagraphsCandidate
			>,

		private readonly installer:
			BibleParagraphsResourceInstaller
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
