import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createNewNoteDraft
} from './note-draft';

describe(
	'createNewNoteDraft',
	() => {
		it(
			'creates a standalone draft without Bible metadata',
			() => {
				const note =
					createNewNoteDraft({
						kind: 'standalone',
						id: 'note-1',
						now: 10
					});

				expect(note).toMatchObject({
					id: 'note-1',
					bibleLocationRef: undefined,
					bibleReferenceText: undefined,
					text: '',
					html: '',
					title: 'Note',
					dateCreated: 10,
					dateUpdated: 10,
					tags: []
				});
			}
		);

		it(
			'creates a chapter draft without manufacturing verse content',
			() => {
				const note =
					createNewNoteDraft({
						kind: 'chapter',
						id: 'note-2',
						now: 20,
						bibleLocationRef:
							'43_3',
						bookName: 'John',
						chapterNumber: 3
					});

				expect(note).toMatchObject({
					bibleLocationRef:
						'43_3',
					bibleReferenceText:
						'John 3',
					title: 'John 3',
					text: 'John 3\n',
					html:
						'<h1>John 3</h1><p></p>'
				});
			}
		);

		it(
			'creates a verse-level draft without a word suffix',
			() => {
				const note =
					createNewNoteDraft({
						kind: 'verse',
						id: 'note-3',
						now: 30,
						bibleLocationRef:
							'43_3_16_0',
						bookName: 'John',
						chapterNumber: 3,
						verseNumber: 16,
						wordIndex: 0,
						verseText:
							'For God so loved the world'
					});

				expect(note).toMatchObject({
					bibleLocationRef:
						'43_3_16_0',
					bibleReferenceText:
						'John 3:16',
					title: 'John 3:16',
					text:
						'John 3:16\nFor God so loved the world'
				});
			}
		);

		it(
			'preserves verse-derived content for a word draft',
			() => {
				const note =
					createNewNoteDraft({
						kind: 'verse',
						id: 'note-3',
						now: 30,
						bibleLocationRef:
							'43_3_16_7',
						bookName: 'John',
						chapterNumber: 3,
						verseNumber: 16,
						wordIndex: 7,
						verseText:
							'For God so loved the world'
					});

				expect(note).toMatchObject({
					bibleLocationRef:
						'43_3_16_7',
					bibleReferenceText:
						'John 3:16',
					title: 'John 3:16:7',
					text:
						'John 3:16:7\nFor God so loved the world',
					html:
						'<h1>John 3:16:7</h1><p><italic>For God so loved the world</italic></p>'
				});
			}
		);
	}
);
