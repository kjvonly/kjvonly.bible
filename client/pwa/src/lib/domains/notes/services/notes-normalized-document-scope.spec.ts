import { describe, expect, it } from 'vitest';
import type { Note, NotesById } from '../models/note.model';
import {
	filterNotesByNormalizedDocumentScope,
	noteBelongsToNormalizedDocumentScope,
	createNormalizedDocumentAssociationForScope,
	createNormalizedDocumentWordNoteMarkers
} from './notes-normalized-document-scope';

const document = { publisher: 'alice', resourceId: 'some/opaque%id' };
const address = { blockId: '__proto__', contentIndex: 3 };

function note(id: string, association?: Note['association']): Note {
	return {
		id, bibleLocationRef: undefined, bibleReferenceText: undefined,
		association, text: '', html: '', title: id,
		dateCreated: 0, dateUpdated: 0, tags: []
	};
}

const notes: NotesById = {
	document: note('document', {
		kind: 'normalized-document', document, target: { kind: 'document' }
	}),
	currentWord: note('currentWord', {
		kind: 'normalized-document', document,
		target: { kind: 'word', address }
	}),
	secondNoteAtWord: note('secondNoteAtWord', {
		kind: 'normalized-document', document,
		target: { kind: 'word', address }
	}),
	otherWord: note('otherWord', {
		kind: 'normalized-document', document,
		target: { kind: 'word',
			address: { ...address, contentIndex: 2 } }
	}),
	otherDocument: note('otherDocument', {
		kind: 'normalized-document',
		document: { ...document, resourceId: 'some/opaque%id2' },
		target: { kind: 'document' }
	}),
	otherPublisher: note('otherPublisher', {
		kind: 'normalized-document',
		document: { ...document, publisher: 'bob' },
		target: { kind: 'document' }
	}),
	bible: { ...note('bible'), bibleLocationRef: '1_1_1' },
	standalone: note('standalone')
};

describe('normalized document Note scope', () => {
	it('includes document and all word Notes for the logical Resource', () => {
		expect(Object.keys(filterNotesByNormalizedDocumentScope(notes, {
			kind: 'document', document
		}))).toEqual(['document', 'currentWord', 'secondNoteAtWord', 'otherWord']);
	});

	it('word scope matches all Notes at one address, independent of document revisions', () => {
		const scope = { kind: 'word' as const, document, address };
		expect(Object.keys(filterNotesByNormalizedDocumentScope(notes, scope)))
			.toEqual(['currentWord', 'secondNoteAtWord']);
		expect(noteBelongsToNormalizedDocumentScope(notes.otherWord, scope))
			.toBe(false);
		expect(noteBelongsToNormalizedDocumentScope(notes.otherDocument, scope))
			.toBe(false);
	});
});


describe('scope-driven normalized document Note drafts', () => {
	it('creates a document association from the document list', () => {
		expect(createNormalizedDocumentAssociationForScope({
			kind: 'document', document
		})).toEqual({
			kind: 'normalized-document',
			document,
			target: { kind: 'document' }
		});
	});

	it('creates a canonical word association from the word list', () => {
		expect(createNormalizedDocumentAssociationForScope({
			kind: 'word', document,
			address
		})).toEqual({
			kind: 'normalized-document',
			document,
			target: { kind: 'word', address }
		});
	});
});


describe('normalized document inline Note membership', () => {
	it('projects word Notes only for the active logical Resource', () => {
		const markers = createNormalizedDocumentWordNoteMarkers(notes, document);
		expect([...markers.entries()].map(([block, indexes]) =>
			[block, [...indexes]])).toEqual([['__proto__', [3, 2]]]);
		expect(markers.get('__proto__')?.size).toBe(2);
		expect(markers.get('other-block')).toBeUndefined();
	});

	it('does not emit markers for document Notes or unrelated publishers', () => {
		const markers = createNormalizedDocumentWordNoteMarkers({
			document: notes.document,
			otherPublisher: notes.otherPublisher,
			bible: notes.bible,
			standalone: notes.standalone
		}, document);
		expect(markers.size).toBe(0);
	});
});
