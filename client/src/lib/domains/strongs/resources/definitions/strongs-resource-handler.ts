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

export interface StrongsResourceInstaller {
	install(
		resource:
			DecodedResourceContent,

		candidates:
			readonly ValidatedStrongsCandidate[]
	): Promise<void>;
}

export class StrongsResourceHandler {

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
			StrongsResourceInstaller
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