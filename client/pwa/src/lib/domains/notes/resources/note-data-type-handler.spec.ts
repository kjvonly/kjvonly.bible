import {
	describe,
	expect,
	it
} from 'vitest';

import {
	NoteDataTypeHandler
} from './note-data-type-handler';

import {
	NOTE_DATA_TYPE,
	NOTE_DATA_VERSION
} from './notes-resource-contract';

describe(
	'NoteDataTypeHandler',
	() => {
		it(
			'exposes the existing Note semantic contract',
			() => {
				const handler =
					new NoteDataTypeHandler();

				expect(
					handler.dataType
				).toBe(
					NOTE_DATA_TYPE
				);

				expect(
					handler.dataVersion
				).toBe(
					NOTE_DATA_VERSION
				);
			}
		);

		it(
			'validates an individual Note payload',
			() => {
				const value =
					createNoteContent();

				expect(
					new NoteDataTypeHandler()
						.validate(
							value
						)
				).toEqual(
					value
				);
			}
		);

		it(
			'validates a bundle of Note payloads',
			() => {
				const value = {
					'note-1':
						createNoteContent(),

					'note-2':
						createNoteContent({
							title:
								'Second'
						})
				};

				expect(
					new NoteDataTypeHandler()
						.validate(
							value
						)
				).toEqual(
					value
				);
			}
		);

		it(
			'rejects Resource ID inside the semantic Note payload',
			() => {
				expect(
					() =>
						new NoteDataTypeHandler()
							.validate({
								...createNoteContent(),
								id:
									'note-1'
							})
				).toThrow();
			}
		);

	it('accepts document and Resource-scoped word associations, including bundles', () => {
		const handler = new NoteDataTypeHandler();
		const document = createNoteContent({
			bibleLocationRef: undefined,
			bibleReferenceText: undefined,
			association: documentAssociation()
		});
		const word = createNoteContent({
			bibleLocationRef: undefined,
			bibleReferenceText: undefined,
			association: wordAssociation()
		});
		expect(handler.validate(document)).toEqual(document);
		expect(handler.validate({ document, word })).toEqual({ document, word });
	});

	it('rejects mixed Bible and normalized associations', () => {
		expect(() => new NoteDataTypeHandler().validate({
			...createNoteContent(), association: documentAssociation()
		})).toThrow();
	});

	it.each([
		{ document: { publisher: '', resourceId: 'opaque/id' } },
		{ document: { publisher: 'alice', resourceId: '' } },
		{ document: { publisher: 'alice', resourceId: 'opaque/id', modifiedAt: 100 } },
		{ target: { kind: 'document', contentIndex: 0 } },
		{ target: { kind: 'word', documentModifiedAt: 1, address: { blockId: 'x', contentIndex: 0 } } },
		{ target: { kind: 'word' } },
		{ target: { kind: 'word', address: { blockId: '', contentIndex: 0 } } },
		{ target: { kind: 'word', address: { blockId: 'x', contentIndex: -1 } } },
		{ target: { kind: 'word', address: { blockId: 'x', contentIndex: 1.5 } } },
		{ target: { kind: 'word', address: { blockId: 'x', contentIndex: 0, domIndex: 1 } } },
		{ unexpected: 'field' }
	])('rejects malformed normalized association %j', (overrides) => {
		const association = { ...wordAssociation(), ...overrides };
		expect(() => new NoteDataTypeHandler().validate({
			...createNoteContent(),
			bibleLocationRef: undefined,
			bibleReferenceText: undefined,
			association
		})).toThrow();
	});

	}
);

function createNoteContent(
	overrides:
		Record<string, unknown> =
		{}
): Record<string, unknown> {
	return {
		bibleLocationRef:
			'43_3_16',

		bibleReferenceText:
			'John 3:16',

		text:
			'For God so loved',

		html:
			'<p>For God so loved</p>',

		title:
			'John 3:16',

		dateCreated:
			100,

		dateUpdated:
			200,

		tags:
			[],

		...overrides
	};
}

function documentAssociation() {
	return {
		kind: 'normalized-document',
		document: { publisher: 'alice', resourceId: 'opaque/id%25' },
		target: { kind: 'document' }
	};
}

function wordAssociation() {
	return {
		...documentAssociation(),
		target: {
			kind: 'word',
			address: { blockId: '__proto__', contentIndex: 3 }
		}
	};
}
