export interface ChapterResourceLoader {
	load(
		publisher: string,
		version: string,
		chapterRef: string
	): Promise<boolean>;
}