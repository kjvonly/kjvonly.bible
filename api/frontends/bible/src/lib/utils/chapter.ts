export function extractBookChapter(chapterKey: string): string {
	let bcvw = chapterKey.split('_');
	if (bcvw.length > 2) {
		chapterKey = `${bcvw[0]}_${bcvw[1]}`;
	}
	return chapterKey;
}
