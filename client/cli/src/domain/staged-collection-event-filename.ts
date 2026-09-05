export interface StagedCollectionEventMetadata {
	readonly collectionName:
	string;

	readonly createdAt:
	number;

	readonly eventId:
	string;
}


const EVENT_ID_PATTERN =
	/^[0-9a-f]{64}$/;


const FILENAME_PATTERN =
	/^(.*)--(\d+)--([0-9a-f]{64})\.json$/;

const MAX_STAGED_COLLECTION_NAME_BYTES =
	128;


const MAX_STAGED_COLLECTION_EVENT_FILENAME_BYTES =
	255;

export function buildStagedCollectionEventFilename(
	metadata:
		StagedCollectionEventMetadata
): string {

	if (
		metadata.collectionName.length ===
		0
	) {
		throw new Error(
			'Collection name is empty.'
		);
	}

	if (
		Buffer.byteLength(
			metadata.collectionName,
			'utf8'
		) >
		MAX_STAGED_COLLECTION_NAME_BYTES
	) {
		throw new Error(
			`Collection name exceeds ${MAX_STAGED_COLLECTION_NAME_BYTES} UTF-8 bytes.`
		);
	}

	if (
		!Number.isInteger(
			metadata.createdAt
		) ||
		metadata.createdAt < 0
	) {
		throw new Error(
			'Invalid collection event created at.'
		);
	}


	if (
		!EVENT_ID_PATTERN.test(
			metadata.eventId
		)
	) {
		throw new Error(
			'Invalid collection event ID.'
		);
	}


	const filename =
		(
			`${metadata.collectionName}` +
			`--${metadata.createdAt}` +
			`--${metadata.eventId}.json`
		);


	assertFilename(
		filename
	);


	return filename;
}


export function parseStagedCollectionEventFilename(
	filename:
		string
): StagedCollectionEventMetadata {

	try {
		assertFilename(
			filename
		);
	}
	catch {
		throw new Error(
			`Malformed staged collection event filename: ${filename}`
		);
	}
	const match =
		FILENAME_PATTERN.exec(
			filename
		);


	if (
		match ===
		null
	) {
		throw new Error(
			`Malformed staged collection event filename: ${filename}`
		);
	}


	const collectionName =
		match[1];

	if (collectionName &&
		Buffer.byteLength(
			collectionName,
			'utf8'
		) >
		MAX_STAGED_COLLECTION_NAME_BYTES
	) {
		throw new Error(
			`Malformed staged collection event filename: ${filename}`
		);
	}

	const createdAtText =
		match[2];


	const eventId =
		match[3];


	if (
		collectionName ===
		undefined ||
		collectionName.length ===
		0 ||
		createdAtText ===
		undefined ||
		eventId ===
		undefined
	) {
		throw new Error(
			`Malformed staged collection event filename: ${filename}`
		);
	}


	const createdAt =
		Number(
			createdAtText
		);


	if (
		!Number.isInteger(
			createdAt
		) ||
		createdAt < 0
	) {
		throw new Error(
			`Malformed staged collection event filename: ${filename}`
		);
	}


	return {
		collectionName,
		createdAt,
		eventId
	};
}

function assertFilename(
	filename:
		string
): void {

	if (
		Buffer.byteLength(
			filename,
			'utf8'
		) >
			MAX_STAGED_COLLECTION_EVENT_FILENAME_BYTES
	) {
		throw new Error(
			`Staged collection event filename exceeds ${MAX_STAGED_COLLECTION_EVENT_FILENAME_BYTES} UTF-8 bytes.`
		);
	}
}