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


	return (
		`${metadata.collectionName}` +
		`--${metadata.createdAt}` +
		`--${metadata.eventId}.json`
	);
}


export function parseStagedCollectionEventFilename(
	filename:
		string
): StagedCollectionEventMetadata {

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