export interface NoteIdParts {
	readonly publisher:
		string;

	readonly name:
		string;

	readonly noteId:
		string;
}

export function createNoteId(
	publisher: string,
	name: string,
	noteId: string
): string {
	validateSegment(
		'publisher',
		publisher
	);
	validateSegment(
		'name',
		name
	);
	validateSegment(
		'note id',
		noteId
	);

	return `${publisher}/${name}/${noteId}`;
}

export function parseNoteId(
	id: string
): NoteIdParts {
	const parts =
		id.split('/');

	if (
		parts.length !== 3 ||
		parts.some(
			(part) =>
				part.length === 0
		)
	) {
		throw new Error(
			`Invalid Note id: ${id}`
		);
	}

	const [
		publisher,
		name,
		noteId
	] = parts;

	return {
		publisher,
		name,
		noteId
	};
}

function validateSegment(
	label: string,
	value: string
): void {
	if (
		value.length === 0 ||
		value.includes('/')
	) {
		throw new Error(
			`Invalid Note ${label}: ${value}`
		);
	}
}
