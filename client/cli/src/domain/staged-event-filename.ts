export interface StagedEventMetadata {
	readonly key:
		string;

	readonly sourceMtimeMs:
		number;

	readonly sourceSize:
		number;

	readonly definitionRevision:
		string;

	readonly eventId:
		string;
}


const EVENT_ID_PATTERN =
	/^[0-9a-f]{64}$/;


const DEFINITION_REVISION_PATTERN =
	/^[0-9a-f]{8}$/;


export function buildStagedEventFilename(
	metadata:
		StagedEventMetadata
): string {

	assertMetadata(
		metadata
	);


	return [
		metadata.key,
		metadata.sourceMtimeMs,
		metadata.sourceSize,
		metadata.definitionRevision,
		metadata.eventId
	].join(
		'--'
	) + '.json';
}


export function parseStagedEventFilename(
	filename:
		string
): StagedEventMetadata {

	if (
		!filename.endsWith(
			'.json'
		)
	) {
		throw malformedFilename(
			filename
		);
	}


	const parts =
		filename
			.slice(
				0,
				-'.json'.length
			)
			.split(
				'--'
			);


	if (
		parts.length < 5
	) {
		throw malformedFilename(
			filename
		);
	}


	const eventId =
		parts.pop();


	const definitionRevision =
		parts.pop();


	const sourceSizeText =
		parts.pop();


	const sourceMtimeMsText =
		parts.pop();


	const key =
		parts.join(
			'--'
		);


	if (
		eventId ===
			undefined ||
		definitionRevision ===
			undefined ||
		sourceSizeText ===
			undefined ||
		sourceMtimeMsText ===
			undefined
	) {
		throw malformedFilename(
			filename
		);
	}


	const metadata:
		StagedEventMetadata = {
			key,

			sourceMtimeMs:
				Number(
					sourceMtimeMsText
				),

			sourceSize:
				Number(
					sourceSizeText
				),

			definitionRevision,

			eventId
		};


	try {
		assertMetadata(
			metadata
		);
	}
	catch {
		throw malformedFilename(
			filename
		);
	}


	return metadata;
}


function assertMetadata(
	metadata:
		StagedEventMetadata
): void {

	if (
		metadata.key.length ===
			0
	) {
		throw new Error(
			'Staged event key is empty.'
		);
	}


	if (
		!Number.isInteger(
			metadata.sourceMtimeMs
		) ||
		metadata.sourceMtimeMs < 0
	) {
		throw new Error(
			'Invalid staged event source mtime.'
		);
	}


	if (
		!Number.isInteger(
			metadata.sourceSize
		) ||
		metadata.sourceSize < 0
	) {
		throw new Error(
			'Invalid staged event source size.'
		);
	}


	if (
		!DEFINITION_REVISION_PATTERN
			.test(
				metadata
					.definitionRevision
			)
	) {
		throw new Error(
			'Invalid staged event definition revision.'
		);
	}


	if (
		!EVENT_ID_PATTERN
			.test(
				metadata.eventId
			)
	) {
		throw new Error(
			'Invalid staged event ID.'
		);
	}
}


function malformedFilename(
	filename:
		string
): Error {

	return new Error(
		`Malformed staged event filename: ${filename}`
	);
}