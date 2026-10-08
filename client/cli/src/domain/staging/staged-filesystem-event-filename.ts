/** Filename metadata identifying one generated Filesystem Resource revision. */
export interface StagedFilesystemEventMetadata {
	readonly filesystemName:
		string;

	readonly inputRevision:
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


const FILENAME_PATTERN =
	/^(.*)--([0-9a-f]{32})--(\d+)--([0-9a-f]{64})\.json$/;


const MAX_FILESYSTEM_NAME_BYTES =
	128;


const MAX_FILENAME_BYTES =
	255;


/** Builds the deterministic filename for one staged generated Filesystem event. */
export function buildStagedFilesystemEventFilename(
	metadata:
		StagedFilesystemEventMetadata
): string {
	assertFilesystemName(
		metadata.filesystemName
	);

	assertInputRevision(
		metadata.inputRevision
	);

	assertCreatedAt(
		metadata.createdAt
	);

	assertEventId(
		metadata.eventId
	);


	const filename =
		(
			`${metadata.filesystemName}` +
			`--${metadata.inputRevision}` +
			`--${metadata.createdAt}` +
			`--${metadata.eventId}.json`
		);


	assertFilenameLength(
		filename
	);


	return filename;
}


/** Parses and validates one staged generated Filesystem event filename. */
export function parseStagedFilesystemEventFilename(
	filename:
		string
): StagedFilesystemEventMetadata {
	assertFilenameLength(
		filename
	);


	const match =
		FILENAME_PATTERN.exec(
			filename
		);


	if (
		match === null
	) {
		throw new Error(
			`Malformed staged Filesystem event filename: ${filename}`
		);
	}


	const filesystemName =
		match[1];

	const inputRevision =
		match[2];

	const createdAtText =
		match[3];

	const eventId =
		match[4];


	if (
		filesystemName === undefined ||
		inputRevision === undefined ||
		createdAtText === undefined ||
		eventId === undefined
	) {
		throw new Error(
			`Malformed staged Filesystem event filename: ${filename}`
		);
	}


	const createdAt =
		Number(
			createdAtText
		);


	try {
		assertFilesystemName(
			filesystemName
		);
		assertInputRevision(
			inputRevision
		);
		assertCreatedAt(
			createdAt
		);
		assertEventId(
			eventId
		);
	}
	catch {
		throw new Error(
			`Malformed staged Filesystem event filename: ${filename}`
		);
	}


	return {
		filesystemName,
		inputRevision,
		createdAt,
		eventId
	};
}


function assertFilesystemName(
	filesystemName:
		string
): void {
	if (
		filesystemName.length === 0
	) {
		throw new Error(
			'Filesystem name is empty.'
		);
	}


	if (
		Buffer.byteLength(
			filesystemName,
			'utf8'
		) >
		MAX_FILESYSTEM_NAME_BYTES
	) {
		throw new Error(
			`Filesystem name exceeds ${MAX_FILESYSTEM_NAME_BYTES} UTF-8 bytes.`
		);
	}


	if (
		filesystemName.includes('/') ||
		filesystemName.includes('\\')
	) {
		throw new Error(
			'Filesystem name must not contain path separators.'
		);
	}
}


function assertInputRevision(
	value:
		string
): void {
	if (
		!INPUT_REVISION_PATTERN.test(
			value
		)
	) {
		throw new Error(
			'Invalid Filesystem input revision.'
		);
	}
}


function assertEventId(
	value:
		string
): void {
	if (
		!EVENT_ID_PATTERN.test(
			value
		)
	) {
		throw new Error(
			'Invalid Filesystem event ID.'
		);
	}
}


function assertCreatedAt(
	createdAt:
		number
): void {
	if (
		!Number.isInteger(
			createdAt
		) ||
		createdAt < 0
	) {
		throw new Error(
			'Invalid Filesystem event created at.'
		);
	}
}


function assertFilenameLength(
	filename:
		string
): void {
	if (
		Buffer.byteLength(
			filename,
			'utf8'
		) >
		MAX_FILENAME_BYTES
	) {
		throw new Error(
			`Staged Filesystem event filename exceeds ${MAX_FILENAME_BYTES} UTF-8 bytes.`
		);
	}
}
