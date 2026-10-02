import type {
	AvailableNote
} from '../models/available-note';

import type {
	NotesStore
} from '../persistence/notes-store';

import type {
	FilesystemSearchByIndex,
	FilesystemSearchMatch
} from '$lib/domains/filesystem';

import {
	createNoteIdForDescriptor
} from '../resources/notes-resource-source';

import {
	NOTES_RESOURCE_TYPE
} from '../resources/notes-resource-contract';

interface NotesFilesystemSearchPort {
	search(
		byIndex:
			FilesystemSearchByIndex,
		text: string
	): Promise<
		readonly FilesystemSearchMatch[]
	>;
}

/**
 * Notes-facing Resource availability boundary.
 *
 * This service searches mounted filesystem catalogs for Resources owned by the
 * Notes family and projects individual descriptors into AvailableNote values.
 * Accepted Notes remain authoritative: descriptors whose Note identity already
 * exists in Notes persistence are omitted from availability results.
 */
export class NotesAvailabilityService {

	constructor(
		private readonly store:
			Pick<
				NotesStore,
				'get'
			>,

		private readonly filesystem:
			NotesFilesystemSearchPort
	) {}

	/** Finds individual Note Resources advertised by mounted filesystems. */
	async search(
		text: string
	): Promise<
		readonly AvailableNote[]
	> {
		const matches =
			await this.filesystem.search(
				{
					index: 'category',
					value:
						NOTES_RESOURCE_TYPE
				},
				text
			);

		const candidates =
			new Map<
				string,
				AvailableNote
			>();

		for (const match of matches) {
			const descriptor =
				match.entry.descriptor;

			if (
				descriptor.metadata.category !==
					NOTES_RESOURCE_TYPE
			) {
				continue;
			}

			let noteId: string;

			try {
				noteId =
					createNoteIdForDescriptor(
						descriptor
					);
			} catch {
				// Bundle/invalid Note descriptors are not individual list entries.
				continue;
			}

			const existingCandidate =
				candidates.get(
					noteId
				);

			if (
				existingCandidate !==
					undefined &&
				existingCandidate.descriptor
					.metadata.modifiedAt >=
					descriptor.metadata.modifiedAt
			) {
				continue;
			}

			candidates.set(
				noteId,
				{
					id: noteId,
					name:
						createAvailableNoteName(
							match
						),
					filesystemPublisher:
						match.publisher,
					rootPath:
						match.rootPath,
					path:
						match.entry.path,
					descriptor
				}
			);
		}

		const availability =
			await Promise.all(
				[...candidates.values()]
					.map(
						async (candidate) => ({
							candidate,
							existing:
								await this.store.get(
									candidate.id
								)
						})
					)
			);

		return availability
			.filter(
				({ existing }) =>
					existing === undefined
			)
			.map(
				({ candidate }) =>
					candidate
			);
	}
}

function createAvailableNoteName(
	match: FilesystemSearchMatch
): string {
	const descriptorName =
		match.entry.descriptor
			.metadata.name;

	if (descriptorName !== undefined) {
		return descriptorName;
	}

	const pathSegments =
		match.entry.path
			.split('/')
			.filter(Boolean);

	return (
		pathSegments[
			pathSegments.length - 1
		] ??
		match.entry.descriptor
			.metadata.resourceId
	);
}
