import {
	describe,
	expect,
	it
} from 'vitest';

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
	NoteCandidate
} from './note-candidate';

import type {
	ValidatedNoteCandidate
} from './validated-note-candidate';

import {
	NOTES_RESOURCE_TYPE
} from './note-interpreter';

import {
	NoteResourceHandler,
	type NoteResourceInstaller
} from './note-resource-handler';

describe(
	'NoteResourceHandler',
	() => {
		it(
			'interprets validates and installs Note candidates',
			async () => {
				const interpreter =
					new FakeInterpreter([
						createCandidate(
							'note-1'
						),
						createCandidate(
							'note-2'
						)
					]);

				const validator =
					new FakeValidator();

				const installer =
					new FakeInstaller();

				const handler =
					new NoteResourceHandler(
						interpreter,
						validator,
						installer
					);

				const resource =
					createResource();

				await handler.handle(
					resource
				);

				expect(
					validator.candidates.map(
						(candidate) =>
							candidate.noteId
					)
				).toEqual([
					'note-1',
					'note-2'
				]);

				expect(
					installer.resource
				).toBe(
					resource
				);

				expect(
					installer.candidates.map(
						(candidate) =>
							candidate.noteId
					)
				).toEqual([
					'note-1',
					'note-2'
				]);
			}
		);

		it(
			'does not install when validation fails',
			async () => {
				const installer =
					new FakeInstaller();

				const handler =
					new NoteResourceHandler(
						new FakeInterpreter([
							createCandidate(
								'note-1'
							)
						]),
						new ThrowingValidator(),
						installer
					);

				await expect(
					handler.handle(
						createResource()
					)
				).rejects.toThrow(
					'validation failed'
				);

				expect(
					installer.installCount
				).toBe(0);
			}
		);
	}
);

class FakeInterpreter
	implements ResourceInterpreter<NoteCandidate> {

	readonly resourceType =
		NOTES_RESOURCE_TYPE;

	constructor(
		private readonly candidates:
			readonly NoteCandidate[]
	) {}

	interpret(): Iterable<NoteCandidate> {
		return this.candidates;
	}
}

class FakeValidator
	implements ResourceValidator<
		NoteCandidate,
		ValidatedNoteCandidate
	> {

	readonly candidates:
		NoteCandidate[] =
		[];

	validate(
		candidate:
			NoteCandidate
	): ValidatedNoteCandidate {
		this.candidates.push(
			candidate
		);

		return {
			name:
				candidate.name,
			noteId:
				candidate.noteId,
			note: {
				bibleLocationRef:
					undefined,
				bibleReferenceText:
					undefined,
				text:
					'',
				html:
					'',
				title:
					'',
				dateCreated:
					0,
				dateUpdated:
					0,
				tags:
					[]
			}
		};
	}
}

class ThrowingValidator
	implements ResourceValidator<
		NoteCandidate,
		ValidatedNoteCandidate
	> {

	validate(): ValidatedNoteCandidate {
		throw new Error(
			'validation failed'
		);
	}
}

class FakeInstaller
	implements NoteResourceInstaller {

	installCount = 0;

	resource:
		DecodedResourceContent |
		undefined;

	candidates:
		readonly ValidatedNoteCandidate[] =
		[];

	async install(
		resource:
			DecodedResourceContent,
		candidates:
			readonly ValidatedNoteCandidate[]
	): Promise<void> {
		this.installCount += 1;
		this.resource =
			resource;
		this.candidates =
			candidates;
	}
}

function createCandidate(
	noteId: string
): NoteCandidate {
	return {
		name:
			'default',
		noteId,
		value:
			{}
	};
}

function createResource():
	DecodedResourceContent {
	return {
		publisher:
			'publisher',
		resourceType:
			NOTES_RESOURCE_TYPE,
		resourceId:
			`${NOTES_RESOURCE_TYPE}/default`,
		modifiedAt:
			100,
		mediaType:
			'application/json',
		value:
			{}
	};
}
