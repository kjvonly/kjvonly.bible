export function createStrongsId(
	sourceId:
		string,
	key:
		string
): string {
	return `${sourceId}/${key}`;
}