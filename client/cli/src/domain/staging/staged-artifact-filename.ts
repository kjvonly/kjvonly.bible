export interface StagedArtifactMetadata {
	readonly key:
		string;

	readonly sourceMtimeMs:
		number;

	readonly sourceSize:
		number;

	readonly artifactRevision:
		string;

	readonly sha256:
		string;

	readonly extension:
		string;
}


const ARTIFACT_REVISION_PATTERN =
	/^[0-9a-f]{8}$/;


const SHA256_PATTERN =
	/^[0-9a-f]{64}$/;


const FILENAME_PATTERN =
	/^(.*)--(\d+)--(\d+)--([0-9a-f]{8})--([0-9a-f]{64})(.*)$/;


export function buildStagedArtifactFilename(
	metadata:
		StagedArtifactMetadata
): string {

	assertMetadata(
		metadata
	);


	return (
		`${metadata.key}` +
		`--${metadata.sourceMtimeMs}` +
		`--${metadata.sourceSize}` +
		`--${metadata.artifactRevision}` +
		`--${metadata.sha256}` +
		metadata.extension
	);
}


export function parseStagedArtifactFilename(
	filename:
		string
): StagedArtifactMetadata {

	const match =
		FILENAME_PATTERN.exec(
			filename
		);


	if (
		match ===
			null
	) {
		throw malformedFilename(
			filename
		);
	}


	const [
		,
		key,
		sourceMtimeMs,
		sourceSize,
		artifactRevision,
		sha256,
		extension
	] = match;


	if (
		key === undefined ||
		sourceMtimeMs === undefined ||
		sourceSize === undefined ||
		artifactRevision === undefined ||
		sha256 === undefined ||
		extension === undefined
	) {
		throw malformedFilename(
			filename
		);
	}


	const metadata:
		StagedArtifactMetadata = {
			key,

			sourceMtimeMs:
				Number(
					sourceMtimeMs
				),

			sourceSize:
				Number(
					sourceSize
				),

			artifactRevision,

			sha256,

			extension
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
		StagedArtifactMetadata
): void {

	if (
		metadata.key.length ===
			0
	) {
		throw new Error(
			'Staged artifact key is empty.'
		);
	}


	if (
		!Number.isInteger(
			metadata.sourceMtimeMs
		) ||
		metadata.sourceMtimeMs < 0
	) {
		throw new Error(
			'Invalid staged artifact source mtime.'
		);
	}


	if (
		!Number.isInteger(
			metadata.sourceSize
		) ||
		metadata.sourceSize < 0
	) {
		throw new Error(
			'Invalid staged artifact source size.'
		);
	}


	if (
		!ARTIFACT_REVISION_PATTERN
			.test(
				metadata
					.artifactRevision
			)
	) {
		throw new Error(
			'Invalid staged artifact revision.'
		);
	}


	if (
		!SHA256_PATTERN
			.test(
				metadata.sha256
			)
	) {
		throw new Error(
			'Invalid staged artifact SHA-256.'
		);
	}


	if (
		metadata.extension.length >
			0 &&
		!metadata.extension
			.startsWith(
				'.'
			)
	) {
		throw new Error(
			'Invalid staged artifact extension.'
		);
	}
}


function malformedFilename(
	filename:
		string
): Error {

	return new Error(
		`Malformed staged artifact filename: ${filename}`
	);
}