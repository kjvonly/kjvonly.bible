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
	BibleTextMarkupCandidate
} from './bible-text-markup-candidate';

import type {
	ValidatedBibleTextMarkupCandidate
} from './validated-bible-text-markup-candidate';

import {
	BIBLE_TEXT_MARKUP_RESOURCE_TYPE
} from './bible-text-markup-interpreter';

export interface BibleTextMarkupResourceInstaller {
	install(
		resource:
			DecodedResourceContent,

		candidates:
			readonly ValidatedBibleTextMarkupCandidate[]
	): Promise<void>;
}

export class BibleTextMarkupResourceHandler
	implements ResourceHandler {

	readonly resourceType =
		BIBLE_TEXT_MARKUP_RESOURCE_TYPE;

	constructor(
		private readonly interpreter:
			ResourceInterpreter<
				BibleTextMarkupCandidate
			>,

		private readonly validator:
			ResourceValidator<
				BibleTextMarkupCandidate,
				ValidatedBibleTextMarkupCandidate
			>,

		private readonly installer:
			BibleTextMarkupResourceInstaller
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
