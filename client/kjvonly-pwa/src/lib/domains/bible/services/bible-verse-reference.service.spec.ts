import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	Verse,
	Word
} from '../models/bible.model';

import {
	BibleVerseReferenceService
} from './bible-verse-reference.service';

const service =
	new BibleVerseReferenceService();

describe(
	'BibleVerseReferenceService',
	() => {
		it(
			'extracts all atomic references in word order',
			() => {
				const verse = createVerse([
					createWord(
						'beginning',
						[
							'H7225;1/1/2;1_1_1'
						]
					),
					createWord(
						'God',
						[
							'G430',
							'1/1/3'
						]
					)
				]);

				expect(
					service.extractAll(verse)
				).toEqual({
					refs: [
						'H7225',
						'1/1/2',
						'1_1_1',
						'G430',
						'1/1/3'
					],
					strongsRefs: [
						'H7225',
						'G430'
					],
					crossRefs: [
						'1/1/2',
						'1/1/3'
					],
					strongsWords: [
						'beginning',
						'God'
					]
				});
			}
		);

		it(
			'extracts Strong\'s and Bible cross references without footnotes',
			() => {
				const verse = createVerse([
					createWord(
						'beginning',
						[
							'H7225;1/1/2;1_1_1'
						]
					),
					createWord(
						'God',
						[
							'G430;G433;1/1/3'
						]
					)
				]);

				expect(
					service
						.extractStrongsAndCrossReferences(
							verse
						)
				).toEqual({
					refs: [
						'H7225',
						'1/1/2',
						'G430',
						'G433',
						'1/1/3'
					],
					strongsRefs: [
						'H7225',
						'G430',
						'G433'
					],
					crossRefs: [
						'1/1/2',
						'1/1/3'
					],
					strongsWords: [
						'beginning',
						'God',
						'God'
					]
				});
			}
		);
	}
);

function createVerse(
	words: Word[]
): Verse {
	return {
		number: 1,
		words,
		text: words
			.map((word) => word.text)
			.join(' ')
	};
}

function createWord(
	text: string,
	href: string[] | null
): Word {
	return {
		text,
		class: null,
		href,
		emphasis: false
	};
}
