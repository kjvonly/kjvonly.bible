import { describe, expect, it, vi } from 'vitest';
import {
	FilesystemImportClassifier,
	type FilesystemImportRecognizer,
	type ImportFileProbe,
	type ImportSourceFile
} from './filesystem-import-classifier.js';

const file: ImportSourceFile = {
	sourcePath: '/project/library/books/sermon.json',
	relativePath: 'books/sermon.json',
	size: 1234
};

function probe(): ImportFileProbe {
	return { readPrefix: vi.fn(async () => new Uint8Array([123, 125])) };
}

function recognizer(
	name: string,
	claim: string | undefined
): FilesystemImportRecognizer {
	return { name, recognize: vi.fn(async () => claim) };
}

describe('FilesystemImportClassifier', () => {
	it('returns unrecognized when no recognizer claims the file', async () => {
		const classifier = new FilesystemImportClassifier([
			recognizer('document', undefined)
		]);
		expect(await classifier.classify(file, probe()))
			.toEqual({ kind: 'unrecognized' });
	});

	it('returns candidate data types without performing version validation', async () => {
		const candidate = recognizer('document', 'kjvonly.normalized-document');
		const classifier = new FilesystemImportClassifier([candidate]);
		const reader = probe();

		expect(await classifier.classify(file, reader)).toEqual({
			kind: 'candidates',
			dataTypes: ['kjvonly.normalized-document']
		});
		expect(candidate.recognize).toHaveBeenCalledWith(file, reader);
		expect(reader.readPrefix).not.toHaveBeenCalled();
	});

	it('deduplicates multiple recognizers agreeing on the same family', async () => {
		const classifier = new FilesystemImportClassifier([
			recognizer('extension', 'kjvonly.normalized-document'),
			recognizer('content', 'kjvonly.normalized-document')
		]);
		expect(await classifier.classify(file, probe())).toEqual({
			kind: 'candidates',
			dataTypes: ['kjvonly.normalized-document']
		});
	});

	it('collects competing families independently of recognizer order', async () => {
		const first = recognizer('chapter', 'kjvonly.bible.chapter');
		const second = recognizer('strongs', 'kjvonly.strongs.definition');
		for (const recognizers of [[first, second], [second, first]]) {
			expect(await new FilesystemImportClassifier(recognizers).classify(file, probe()))
				.toEqual({
					kind: 'candidates',
					dataTypes: ['kjvonly.bible.chapter', 'kjvonly.strongs.definition']
				});
		}
	});

	it('runs all recognizers even after a positive claim', async () => {
		const second = recognizer('second', 'kjvonly.strongs.definition');
		const classifier = new FilesystemImportClassifier([
			recognizer('first', 'kjvonly.bible.chapter'), second
		]);
		await classifier.classify(file, probe());
		expect(second.recognize).toHaveBeenCalledOnce();
	});

	it('rejects duplicate recognizers and empty semantic claims', async () => {
		expect(() => new FilesystemImportClassifier([
			recognizer('same', undefined), recognizer('same', undefined)
		])).toThrow('Invalid or duplicate import recognizer: same');
		await expect(new FilesystemImportClassifier([
			recognizer('invalid', ' ')
		]).classify(file, probe())).rejects.toThrow(
			'Recognizer invalid returned an empty data type for "books/sermon.json".'
		);
	});

	it('propagates recognizer failures with the source path and original cause', async () => {
		const cause = new Error('probe failure');
		const classifier = new FilesystemImportClassifier([{
			name: 'document',
			recognize() { throw cause; }
		}]);
		let thrown: unknown;
		try {
			await classifier.classify(file, probe());
		} catch (error) {
			thrown = error;
		}
		expect(thrown).toBeInstanceOf(Error);
		expect((thrown as Error).message).toContain('books/sermon.json');
		expect((thrown as Error).cause).toBe(cause);
	});
});
