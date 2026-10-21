import type {
	Note,
	NotesById,
	NormalizedDocumentNoteAddress,
	NormalizedDocumentNoteAssociation,
	NormalizedDocumentNoteIdentity
} from '../models/note.model';

/**
 * Specifies installed Notes for one logical Resource or one canonical word.
 * It is independent of a new draft's target and ignores Resource revisions.
 */
export type NotesNormalizedDocumentScope =
	| {
		readonly kind: 'document';
		readonly document: NormalizedDocumentNoteIdentity;
	}
	| {
		readonly kind: 'word';
		readonly document: NormalizedDocumentNoteIdentity;
		readonly address: NormalizedDocumentNoteAddress;
	};

/**
 * Tests one Note against a normalized-document list scope.
 *
 * @param note - Installed Note to examine.
 * @param scope - Document-wide or exact-word Notes scope.
 * @returns Whether the Note belongs to this scope.
 */
export function noteBelongsToNormalizedDocumentScope(
	note: Note,
	scope: NotesNormalizedDocumentScope
): boolean {
	const association = note.association;

	if (
		association?.kind !== 'normalized-document' ||
		association.document.publisher !== scope.document.publisher ||
		association.document.resourceId !== scope.document.resourceId
	) {
		return false;
	}

	if (scope.kind === 'document') {
		return true;
	}

	const target = association.target;
	return (
		target.kind === 'word' &&
		target.address.blockId === scope.address.blockId &&
		target.address.contentIndex === scope.address.contentIndex
	);
}

/**
 * Filters accepted Notes by semantic document association.
 *
 * @param notes - Installed Notes indexed by Note ID.
 * @param scope - Current Notes list scope.
 * @returns Only Notes associated with this logical document or exact word.
 */
export function filterNotesByNormalizedDocumentScope(
	notes: NotesById,
	scope: NotesNormalizedDocumentScope
): NotesById {
	return Object.fromEntries(
		Object.entries(notes).filter(([, note]) =>
			noteBelongsToNormalizedDocumentScope(note, scope)
		)
	);
}

/**
 * Converts a Notes list scope into an explicit new-Note association.
 *
 * @param scope - The current document or exact-word list scope.
 * @returns Association to attach to the new Note draft.
 */
export function createNormalizedDocumentAssociationForScope(
	scope: NotesNormalizedDocumentScope
): NormalizedDocumentNoteAssociation {
	return {
		kind: 'normalized-document',
		document: scope.document,
		target: scope.kind === 'document'
			? { kind: 'document' }
			: {
				kind: 'word',
				address: scope.address
			}
	};
}

/**
 * Projects current logical-document word Notes into address membership.
 * Document-level Notes are deliberately omitted. The nested Maps safely
 * preserve opaque block IDs such as `__proto__`, and multiple Notes at one
 * word produce just one marker.
 *
 * @param notes - Accepted Notes returned by the Notes search runtime.
 * @param document - Active normalized-document Resource identity.
 * @returns Canonical block/content-index membership for renderer presentation.
 */
export function createNormalizedDocumentWordNoteMarkers(
	notes: NotesById,
	document: NormalizedDocumentNoteIdentity
): ReadonlyMap<string, ReadonlySet<number>> {
	const markers = new Map<string, Set<number>>();

	for (const note of Object.values(notes)) {
		const association = note.association;
		if (
			association?.kind !== 'normalized-document' ||
			association.document.publisher !== document.publisher ||
			association.document.resourceId !== document.resourceId ||
			association.target.kind !== 'word'
		) {
			continue;
		}

		const { blockId, contentIndex } = association.target.address;
		let indexes = markers.get(blockId);
		if (!indexes) {
			indexes = new Set<number>();
			markers.set(blockId, indexes);
		}
		indexes.add(contentIndex);
	}

	return markers;
}
