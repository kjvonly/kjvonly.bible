export function createBibleVersionId(
	publisher: string,
	version: string
): string {
	return `${publisher}/${version}`;
}

export function createChapterId(
	publisher: string,
	version: string,
	chapterRef: string
): string {
	return `${createBibleVersionId(
		publisher,
		version
	)}/${chapterRef}`;
}