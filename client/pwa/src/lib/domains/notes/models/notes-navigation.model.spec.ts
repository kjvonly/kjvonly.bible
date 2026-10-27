import {
	describe,
	expect,
	it
} from 'vitest';

import {
	NOTES_BIBLE_SCOPE_KINDS,
	parseNotesBibleScope,
	parseNotesBibleNavigationIntent,
	parseNotesNavigationIntent,
	parseNotesNormalizedDocumentNavigationIntent,
	parseNotesNormalizedDocumentScope,
	parseNotesNormalizedDocumentTarget
} from './notes-navigation.model';

describe(
	'Notes navigation intent',
	() => {
		it(
			'parses an explicit exact Bible scope independently from the create location',
			() => {
				expect(
					parseNotesNavigationIntent({
						noteID: 'note-1',
						bibleScope: {
							kind: 'exact',
							bibleLocationRef:
								'43_3_16_7'
						},
						createBibleLocationRef:
							'43_3_16_9'
					})
				).toEqual({
					noteID: 'note-1',
					bibleScope: {
						kind:
							NOTES_BIBLE_SCOPE_KINDS.EXACT,
						bibleLocationRef:
							'43_3_16_7'
					},
					createBibleLocationRef:
						'43_3_16_9'
				});
			}
		);

		it(
			'parses a chapter Bible scope',
			() => {
				expect(
					parseNotesNavigationIntent({
						bibleScope: {
							kind: 'chapter',
							bibleLocationRef:
								'43_3'
						}
					})
				).toEqual({
					bibleScope: {
						kind:
							NOTES_BIBLE_SCOPE_KINDS.CHAPTER,
						bibleLocationRef:
							'43_3'
					}
				});
			}
		);

		it(
			'rejects the removed root-level Bible location field',
			() => {
				expect(
					() =>
						parseNotesNavigationIntent({
							bibleLocationRef:
								'43_3_16_7'
						})
				).toThrow(
					'Invalid Notes Bible location state; use bibleScope'
				);
			}
		);

		it(
			'keeps scope and create location independently optional',
			() => {
				expect(
					parseNotesNavigationIntent({})
				).toEqual({});

				expect(
					parseNotesNavigationIntent({
						createBibleLocationRef:
							'43_3_16_7'
					})
				).toEqual({
					createBibleLocationRef:
						'43_3_16_7'
				});
			}
		);

		it(
			'rejects invalid Notes-owned navigation values',
			() => {
				expect(
					() =>
						parseNotesNavigationIntent({
							noteID: 1
						})
				).toThrow(
					'Invalid Notes note ID state'
				);

				expect(
					() =>
						parseNotesNavigationIntent({
							createBibleLocationRef: false
						})
				).toThrow(
					'Invalid Notes create Bible location state'
				);
			}
		);
	}
);

describe(
	'parseNotesBibleScope',
	() => {
		it(
			'rejects an invalid scope kind',
			() => {
				expect(
					() =>
						parseNotesBibleScope({
							kind: 'verse',
							bibleLocationRef:
								'43_3_16_0'
						})
				).toThrow(
					'Invalid Notes Bible scope kind'
				);
			}
		);

		it(
			'rejects a non-string scope location',
			() => {
				expect(
					() =>
						parseNotesBibleScope({
							kind: 'chapter',
							bibleLocationRef: 43
						})
				).toThrow(
					'Invalid Notes Bible scope location state'
				);
			}
		);
	}
);

const document = {
	publisher: 'publisher',
	resourceId: 'opaque/path%with/slashes'
};
const address = { blockId: '__proto__', contentIndex: 3 };

const wordScope = {
	kind: 'word' as const,
	document,
	address
};
const wordTarget = {
	kind: 'normalized-document' as const,
	document,
	target: {
		kind: 'word' as const,
		address
	}
};

describe('normalized document Notes navigation', () => {
	it('parses a single document context without requesting a draft', () => {
		expect(parseNotesNavigationIntent({
			normalizedDocument: {
				scope: { kind: 'document', document },
				title: 'Matthew Henry — Genesis 1'
			}
		})).toEqual({
			normalizedDocument: {
				scope: { kind: 'document', document },
				title: 'Matthew Henry — Genesis 1'
			}
		});
	});

	it('keeps word creation independent of document-wide listing', () => {
		expect(parseNotesNavigationIntent({
			noteID: 'note-1',
			normalizedDocument: {
				scope: { kind: 'document', document },
				createTarget: wordTarget
			}
		})).toEqual({
			noteID: 'note-1',
			normalizedDocument: {
				scope: { kind: 'document', document },
				createTarget: wordTarget
			}
		});

		expect(parseNotesNavigationIntent({
			normalizedDocument: { scope: wordScope }
		})).toEqual({ normalizedDocument: { scope: wordScope } });
	});

	it('separates Bible and document parsing before validating association details', () => {
		expect(parseNotesBibleNavigationIntent({
			bibleScope: { kind: 'chapter', bibleLocationRef: '1_1' }
		})).toEqual({ bibleScope: { kind: 'chapter', bibleLocationRef: '1_1' } });

		expect(parseNotesNormalizedDocumentNavigationIntent({
			scope: { kind: 'document', document }
		})).toEqual({ normalizedDocument: { scope: { kind: 'document', document } } });
	});

	it('rejects malformed identities, obsolete revisions and word addresses', () => {
		const invalidScopes = [
			{ kind: 'document', document: { ...document, publisher: '' } },
			{ kind: 'document', document: { ...document, resourceId: 17 } },
			{ kind: 'document', document: { ...document, modifiedAt: 100 } },
			{ ...wordScope, documentModifiedAt: 100 },
			{ kind: 'document', document, documentModifiedAt: 100 },
			{ ...wordScope, address: { ...address, blockId: '' } },
			{ ...wordScope, address: { ...address, contentIndex: -1 } },
			{ ...wordScope, address: { ...address, contentIndex: 3.5 } },
			{ ...wordScope, kind: 'chapter' }
		];
		for (const scope of invalidScopes) {
			expect(() => parseNotesNormalizedDocumentScope(scope)).toThrow();
		}
	});

	it('rejects invalid targets and mixing Bible/document contexts', () => {
		expect(() => parseNotesNormalizedDocumentTarget({
			...wordTarget,
			target: { ...wordTarget.target, address: { ...address, contentIndex: null } }
		})).toThrow();
		expect(() => parseNotesNormalizedDocumentTarget({
			...wordTarget,
			target: { ...wordTarget.target, documentModifiedAt: 100 }
		})).toThrow('must not contain a document revision');

		expect(() => parseNotesNavigationIntent({
			bibleScope: { kind: 'chapter', bibleLocationRef: '1_1' },
			normalizedDocument: { scope: { kind: 'document', document } }
		})).toThrow('Cannot mix Bible and normalized document');

		expect(() => parseNotesNavigationIntent({
			createBibleLocationRef: '1_1_1',
			normalizedDocument: { scope: { kind: 'document', document } }
		})).toThrow('Cannot mix Bible and normalized document');

		expect(() => parseNotesNavigationIntent({
			normalizedDocument: {
				scope: { kind: 'document', document },
				createTarget: {
					...wordTarget,
					document: { ...document, resourceId: 'another-resource' }
				}
			}
		})).toThrow('does not match document scope');
	});

	it('rejects incomplete and old flat normalized-document navigation shapes', () => {
		expect(() => parseNotesNavigationIntent({
			normalizedDocument: { title: 'Missing scope' }
		})).toThrow('Invalid Notes normalized document scope');
		expect(() => parseNotesNavigationIntent({
			normalizedDocument: { scope: wordScope, title: false }
		})).toThrow('Invalid Notes normalized document title');
		expect(() => parseNotesNavigationIntent({
			normalizedDocumentScope: { kind: 'document', document }
		})).toThrow('use normalizedDocument');
	});
});
