import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	Note
} from '$lib/domains/notes/models/note.model';

import {
	createNoteId
} from '$lib/domains/notes/models/note-id';

import {
	NOTE_OBJECT_TYPE
} from '$lib/domains/notes/persistence/notes-store';

import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	ResourceInstallation
} from '$lib/resource/installation/resource-installation';

import type {
	NotesInstallationStores,
	NotesInstallationTransaction
} from './notes-installation-stores';

import {
	NoteInstaller
} from './note-installer';

import type {
	ValidatedNoteCandidate
} from './validated-note-candidate';

describe(
	'NoteInstaller',
	() => {
		it(
			'installs missing Notes and provenance in one transaction',
			async () => {
				const transaction =
					new FakeInstallationTransaction();

				const installer =
					new NoteInstaller(
						transaction
					);

				const resource =
					createResource();

				await installer.install(
					resource,
					[
						createCandidate()
					]
				);

				const id =
					createNoteId(
						resource.publisher,
						'default',
						'note-1'
					);

				expect(
					transaction.runCount
				).toBe(1);

				expect(
					transaction.notes.get(
						id
					)
				).toEqual({
					id,
					bibleLocationRef:
						'kjvs/1_1_1',
					bibleReferenceText:
						'Genesis 1:1',
					text:
						'Note text',
					html:
						'<p>Note text</p>',
					title:
						'Note title',
					dateCreated:
						100,
					dateUpdated:
						200,
					tags:
						[]
				});

				expect(
					transaction.installations
				).toEqual([
					expect.objectContaining({
						objectType:
							NOTE_OBJECT_TYPE,
						objectId:
							id,
						publisher:
							resource.publisher,
						resourceId:
							resource.resourceId,
						modifiedAt:
							resource.modifiedAt
					})
				]);
			}
		);

		it(
			'does not replace an already accepted local Note',
			async () => {
				const transaction =
					new FakeInstallationTransaction();

				const resource =
					createResource({
						modifiedAt:
							300
					});

				const id =
					createNoteId(
						resource.publisher,
						'default',
						'note-1'
					);

				transaction.notes.set(
					id,
					{
						id,
						bibleLocationRef:
							undefined,
						bibleReferenceText:
							undefined,
						text:
							'Local text',
						html:
							'<p>Local text</p>',
						title:
							'Local Note',
						dateCreated:
							100,
						dateUpdated:
							250,
						tags:
							[]
					}
				);

				const installer =
					new NoteInstaller(
						transaction
					);

				await installer.install(
					resource,
					[
						createCandidate()
					]
				);

				expect(
					transaction.notes.get(
						id
					)?.text
				).toBe(
					'Local text'
				);

				expect(
					transaction.installations
				).toEqual([]);
			}
		);

		it(
			'rejects candidates from multiple Notes names',
			async () => {
				const installer =
					new NoteInstaller(
						new FakeInstallationTransaction()
					);

				await expect(
					installer.install(
						createResource(),
						[
							createCandidate(),
							createCandidate({
								name:
									'study'
							})
						]
					)
				).rejects.toThrow(
					'Notes Resource contains multiple names.'
				);
			}
		);
	}
);

class FakeInstallationTransaction
	implements NotesInstallationTransaction {

	runCount = 0;

	readonly notes =
		new Map<
			string,
			Note
		>();

	readonly installations:
		ResourceInstallation[] =
		[];

	async run<TResult>(
		operation:
			(
				stores:
					NotesInstallationStores
			) => Promise<TResult>
	): Promise<TResult> {
		this.runCount += 1;

		return await operation({
			notes: {
				get:
					async (
						id
					) =>
						this.notes.get(
							id
						),

				put:
					async (
						note
					) => {
						this.notes.set(
							note.id,
							note
						);
					}
			},

			resourceInstallations: {
				get:
					async () =>
						undefined,

				put:
					async (
						installation
					) => {
						this.installations.push(
							installation
						);
					}
			}
		});
	}
}

function createCandidate(
	overrides:
		Partial<ValidatedNoteCandidate> =
		{}
): ValidatedNoteCandidate {
	return {
		name:
			'default',
		noteId:
			'note-1',
		note: {
			bibleLocationRef:
				'kjvs/1_1_1',
			bibleReferenceText:
				'Genesis 1:1',
			text:
				'Note text',
			html:
				'<p>Note text</p>',
			title:
				'Note title',
			dateCreated:
				100,
			dateUpdated:
				200,
			tags:
				[]
		},
		...overrides
	};
}

function createResource(
	overrides:
		Partial<DecodedResourceContent> =
		{}
): DecodedResourceContent {
	return {
		publisher:
			'publisher',
		resourceType:
			'kjvonly/notes/entries',
		resourceId:
			'kjvonly/notes/entries/default/note-1',
		modifiedAt:
			200,
		mediaType:
			'application/json',
		value:
			{},
		...overrides
	};
}
