export function createStrongsId(
	bibleVersionId: string,
	key: string
): string {
	return `${bibleVersionId}/${key}`;
}