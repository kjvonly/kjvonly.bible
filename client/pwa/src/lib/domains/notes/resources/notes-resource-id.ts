/**
 * Notes-owned Resource ID grammar.
 *
 * Resource infrastructure treats `resourceId` as opaque. These helpers exist
 * only inside the Notes Domain to create and interpret Note identities.
 */
export interface NotesResourceIdentity {
	readonly name: string;
	readonly noteId?: string;
}

export function createNotesResourceId(
	name: string,
	noteId?: string
): string {
	assertPart(
		name,
		'name'
	);

	if (
		noteId !== undefined
	) {
		assertPart(
			noteId,
			'note id'
		);
	}

	return [
		'kjvonly',
		'notes',
		'note',
		name,
		...(noteId === undefined
			? []
			: [noteId])
	].join('/');
}

export function parseNotesResourceId(
	resourceId: string
): NotesResourceIdentity {
	const segments =
		resourceId.split('/');

	if (
		segments.length < 4 ||
		segments.length > 5 ||
		segments[0] !== 'kjvonly' ||
		segments[1] !== 'notes' ||
		segments[2] !== 'note' ||
		segments.some(
			(segment) =>
				segment.length === 0
		)
	) {
		throw new Error(
			`Invalid Notes Resource ID: ${resourceId}`
		);
	}

	const [
		,
		,
		,
		name,
		noteId
	] = segments;

	return {
		name,
		...(noteId === undefined
			? {}
			: { noteId })
	};
}

function assertPart(
	value: string,
	name: string
): void {
	if (
		value.length === 0 ||
		value.includes('/')
	) {
		throw new Error(
			`Invalid Notes Resource ${name}: ${value}`
		);
	}
}
