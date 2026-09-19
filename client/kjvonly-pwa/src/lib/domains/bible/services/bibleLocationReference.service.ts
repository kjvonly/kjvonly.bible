export class BibleLocationReferenceService {
	/**
	 * Reduces a reference chapter key to BookID.
	 *
	 * @param ref any reference
	 * @returns
	 */
	extractBookID(ref: string): string {
		const locationRef = this.extractLocationRef(ref);
		const [bookID] = locationRef.split('_');

		return bookID;
	}

	/**
	 * Reduces a reference chapter key to BookID.
	 *
	 * @param ref any reference
	 * @returns
	 */
	extractChapter(ref: string): number {
		const locationRef = this.extractLocationRef(ref);
		const [, chapter] = locationRef.split('_');

		return chapter ? parseInt(chapter, 10) : 1;
	}

	/**
	 *
	 * @param ref a cross reference i.e. 47/5/3
	 * @returns a bible location reference 47_5_3
	 */
	convertCrossRefToBibleLocationRef(ref: string): string {
		return ref.replaceAll('/', '_');
	}
	
	/**
	 * Returns the version from a Bible location ref when present.
	 *
	 * Example:
	 * - `kjv/GEN_1_3_5` -> `kjv`
	 * - `GEN_1_3_5` -> `undefined`
	 */
	extractVersion(ref: string): string | undefined {
		const [version, locationRef] = ref.split('/');

		return locationRef ? version : undefined;
	}

	/**
	 * Removes the version from a Bible location ref when present.
	 *
	 * Example:
	 * - `kjv/GEN_1_3_5` -> `GEN_1_3_5`
	 * - `GEN_1_3_5` -> `GEN_1_3_5`
	 */
	extractLocationRef(ref: string): string {
		const [, locationWithVersion] = ref.split('/');

		return locationWithVersion ?? ref;
	}

	/**
	 * Reduces a Bible location reference to `bookId_chapter`.
	 *
	 * Example:
	 * - `kjv/GEN_1_3_5` -> `GEN_1`
	 * - `GEN_1_3_5` -> `GEN_1`
	 */
	extractBookIDChapter(ref: string): string {
		const locationRef = this.extractLocationRef(ref);
		const [bookId, chapter] = locationRef.split('_');

		if (!bookId || !chapter) {
			throw new Error(`Invalid bible location ref: ${ref}`);
		}

		return `${bookId}_${chapter}`;
	}

	/**
	 * Reduces a Bible location reference to:
	 *
	 * - `version/bookId_chapter` when version exists
	 * - `bookId_chapter` when version does not exist
	 *
	 * Example:
	 * - `kjv/GEN_1_3_5` -> `kjv/GEN_1`
	 * - `GEN_1_3_5` -> `GEN_1`
	 */
	extractVersionBookIDChapter(ref: string): string {
		const version = this.extractVersion(ref);
		const bookIDChapter = this.extractBookIDChapter(ref);

		return version
			? `${version}/${bookIDChapter}`
			: bookIDChapter;
	}

	extractVersesOrOne(ref: string): number[] {
		const locationRef = this.extractLocationRef(ref);
		const bcv = locationRef.split('_');
		if (bcv.length > 2) {
			const verses = bcv[2].split('-');
			const s = parseInt(verses[0], 10);
			const e = parseInt(verses[1], 10);

			if (!Number.isNaN(s) && !Number.isNaN(e)) {
				return [s - 1, e];
			} else {
				return [0, 0];
			}
		}

		return [0, 0];
	}

	extractVerse(ref: string): number {
		const locationRef = this.extractLocationRef(ref);
		const bcv = locationRef.split('_');
		if (bcv.length > 2) {
			return this.extractFirstVerse(bcv[2]);
		}
		return 1;
	}

	extractFirstVerse(verse: string) {
		if (verse.includes('-')) {
			verse = verse.split('-')[0];
		}
		return parseInt(verse, 10);
	}

	extractWordIndexOrDefault(
		bibleLocationRef: string,
		defaultWordIndex?: string | undefined
	): string {
		if (!defaultWordIndex) {
			defaultWordIndex = '0';
		}
		const locationRef = this.extractLocationRef(bibleLocationRef);
		const refs = locationRef.split('_');
		if (refs.length === 4) {
			return refs[3];
		}

		return defaultWordIndex;
	}

	hasVerse(ref: string) {
		return this.extractLocationRef(ref).split('_').length > 2;
	}

	makeBibleLocationRef(
		bookID: string,
		chapter: number,
		verseNumber: number
	): string {
		return `${bookID}_${chapter}_${verseNumber}`;
	}
}
