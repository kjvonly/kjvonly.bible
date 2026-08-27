export interface BibleVersionIdentity {
	readonly publisher:
		string;

	readonly version:
		string;
}

export function createBibleVersionId(
	publisher: string,
	version: string
): string {
	return `${publisher}/${version}`;
}

export function parseBibleVersionId(
	bibleVersionId: string
): BibleVersionIdentity {

	const segments =
		bibleVersionId.split('/');

	if (
		segments.length !== 2 ||
		!segments[0] ||
		!segments[1]
	) {
		throw new Error(
			`Invalid Bible Version id: ${bibleVersionId}`
		);
	}

	return {
		publisher:
			segments[0],

		version:
			segments[1]
	};
}

export function createChapterId(
	bibleVersionId: string,
	chapterRef: string
): string {
	return `${bibleVersionId}/${chapterRef}`;
}


export function extractBibleVersion(
	bibleVersionId: string
): string {
	return parseBibleVersionId(
		bibleVersionId
	).version;
}

export function extractBibleVersionPublisher(
	bibleVersionId: string
): string {
	return parseBibleVersionId(
		bibleVersionId
	).publisher;
}