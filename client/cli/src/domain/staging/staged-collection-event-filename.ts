/** Metadata identifying one current generated Collection Resource staging file. */
export interface StagedCollectionEventMetadata {
	readonly collectionName:
		string;

	readonly inputRevision:
		string;

	readonly createdAt:
		number;

	readonly eventId:
		string;
}


/** Metadata parsed from current or legacy Collection staging filenames. */
export interface ParsedStagedCollectionEventMetadata {
	readonly collectionName:
		string;

	/** Absent only for legacy pre-reuse Collection staging filenames. */
	readonly inputRevision?:
		string;

	readonly createdAt:
		number;

	readonly eventId:
		string;
}


const INPUT_REVISION_PATTERN =
	/^[0-9a-f]{32}$/;


const EVENT_ID_PATTERN =
	/^[0-9a-f]{64}$/;


const CURRENT_FILENAME_PATTERN =
	/^(.*)--([0-9a-f]{32})--(\d+)--([0-9a-f]{64})\.v2\.json$/;


const LEGACY_FILENAME_PATTERN =
	/^(.*)--(\d+)--([0-9a-f]{64})\.json$/;


const MAX_STAGED_COLLECTION_NAME_BYTES =
	128;


const MAX_STAGED_COLLECTION_EVENT_FILENAME_BYTES =
	255;


/** Builds the deterministic current filename for one staged Collection event. */
export function buildStagedCollectionEventFilename(
	metadata:
		StagedCollectionEventMetadata
): string {
	assertCollectionName(
		metadata.collectionName
	);


	if (
		!INPUT_REVISION_PATTERN.test(
			metadata.inputRevision
		)
	) {
		throw new Error(
			'Invalid Collection input revision.'
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
			`--${metadata.inputRevision}` +
			`--${metadata.createdAt}` +
			`--${metadata.eventId}.v2.json`
		);


	assertFilename(
		filename
	);


	return filename;
}


/**
 * Parses and validates one current or legacy staged Collection-event filename.
 * Legacy files remain readable so the next build can migrate them by rebuilding
 * once with semantic revision metadata.
 */
export function parseStagedCollectionEventFilename(
	filename:
		string
): ParsedStagedCollectionEventMetadata {
	try {
		assertFilename(
			filename
		);
	}
	catch {
		throw malformedFilename(
			filename
		);
	}


	const currentMatch =
		CURRENT_FILENAME_PATTERN.exec(
			filename
		);

	const legacyMatch =
		currentMatch === null
			? LEGACY_FILENAME_PATTERN.exec(
				filename
			)
			: null;


	const collectionName =
		currentMatch?.[1] ??
		legacyMatch?.[1];

	const inputRevision =
		currentMatch?.[2];

	const createdAtText =
		currentMatch?.[3] ??
		legacyMatch?.[2];

	const eventId =
		currentMatch?.[4] ??
		legacyMatch?.[3];


	if (
		collectionName === undefined ||
		createdAtText === undefined ||
		eventId === undefined
	) {
		throw malformedFilename(
			filename
		);
	}


	const createdAt =
		Number(
			createdAtText
		);


	try {
		assertCollectionName(
			collectionName
		);

		if (
			inputRevision !== undefined &&
			!INPUT_REVISION_PATTERN.test(
				inputRevision
			)
		) {
			throw new Error();
		}

		if (
			!Number.isInteger(
				createdAt
			) ||
			createdAt < 0 ||
			!EVENT_ID_PATTERN.test(
				eventId
			)
		) {
			throw new Error();
		}
	}
	catch {
		throw malformedFilename(
			filename
		);
	}


	return {
		collectionName,
		...(inputRevision === undefined
			? {}
			: { inputRevision }),
		createdAt,
		eventId
	};
}


function assertCollectionName(
	collectionName:
		string
): void {
	if (
		collectionName.length === 0
	) {
		throw new Error(
			'Collection name is empty.'
		);
	}


	if (
		Buffer.byteLength(
			collectionName,
			'utf8'
		) >
			MAX_STAGED_COLLECTION_NAME_BYTES
	) {
		throw new Error(
			`Collection name exceeds ${MAX_STAGED_COLLECTION_NAME_BYTES} UTF-8 bytes.`
		);
	}
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


function malformedFilename(
	filename:
		string
): Error {
	return new Error(
		`Malformed staged collection event filename: ${filename}`
	);
}
