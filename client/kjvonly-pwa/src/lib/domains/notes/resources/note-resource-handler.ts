import type {
	DecodedResourceContent,
	ResourceHandler
} from '$lib/resource';

import type {
	ResourceInterpreter
} from '$lib/resource';

import type {
	ResourceValidator
} from '$lib/resource';

import type {
	NoteCandidate
} from './note-candidate';

import type {
	ValidatedNoteCandidate
} from './validated-note-candidate';

import {
	NOTES_RESOURCE_TYPE
} from './note-interpreter';

export interface NoteResourceInstaller {
	install(
		resource:
			DecodedResourceContent,

		candidates:
			readonly ValidatedNoteCandidate[]
	): Promise<void>;
}

export class NoteResourceHandler
	implements ResourceHandler {

	readonly resourceType =
		NOTES_RESOURCE_TYPE;

	constructor(
		private readonly interpreter:
			ResourceInterpreter<
				NoteCandidate
			>,

		private readonly validator:
			ResourceValidator<
				NoteCandidate,
				ValidatedNoteCandidate
			>,

		private readonly installer:
			NoteResourceInstaller
	) {}

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
