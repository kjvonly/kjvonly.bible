import type {
	Verse
} from '../models/bible.model';

import {
	isCrossReference,
	isStrongsReference,
	tokenizeReferences
} from './reference-tokenizer.service';

export interface BibleVerseReferences {
	refs: string[];
	strongsRefs: string[];
	crossRefs: string[];
	strongsWords: string[];
}

/**
 * Extracts navigation references embedded in Bible verse words.
 *
 * Strong's words are emitted once for each Strong's reference so their
 * positions stay aligned with the Strong's references consumed by Refs.
 */
export class BibleVerseReferenceService {
	extractAll(
		verse: Verse
	): BibleVerseReferences {
		return this.extract(
			verse,
			() => true
		);
	}

	extractStrongsAndCrossReferences(
		verse: Verse
	): BibleVerseReferences {
		return this.extract(
			verse,
			(reference) =>
				isStrongsReference(reference) ||
				isCrossReference(reference)
		);
	}

	private extract(
		verse: Verse,
		includeReference: (reference: string) => boolean
	): BibleVerseReferences {
		const refs: string[] = [];
		const strongsRefs: string[] = [];
		const crossRefs: string[] = [];
		const strongsWords: string[] = [];

		for (const word of verse.words) {
			const wordReferences =
				tokenizeReferences(
					word.href ?? []
				);

			for (const reference of wordReferences) {
				if (!includeReference(reference)) {
					continue;
				}

				refs.push(reference);

				if (isStrongsReference(reference)) {
					strongsRefs.push(reference);
					strongsWords.push(word.text);
				}

				if (isCrossReference(reference)) {
					crossRefs.push(reference);
				}
			}
		}

		return {
			refs,
			strongsRefs,
			crossRefs,
			strongsWords
		};
	}
}
