import { describe, expect, it, vi } from 'vitest';
import { NormalizedDocumentValidator } from '@kjvonly/normalized-content';
import { FilesystemImportClassifier, type ImportFileProbe, type ImportSourceFile } from '../filesystem-import-classifier.js';
import { SemanticTypeRegistry, type SemanticTypeDefinition } from '../../../semantic/semantic-type-registry.js';
import { createNormalizedDocumentSemanticType } from '../../../semantic/definitions/normalized-document-semantic-type.js';
import { NormalizedDocumentRecognizer } from './normalized-document-recognizer.js';

const recognizer = new NormalizedDocumentRecognizer();

function file(relativePath: string, size = 200): ImportSourceFile {
	return { relativePath, sourcePath: `/source/${relativePath}`, size };
}

function probe(value: string): ImportFileProbe {
	return { readPrefix: vi.fn(async max => new TextEncoder().encode(value).subarray(0, max)) };
}

describe('NormalizedDocumentRecognizer', () => {
	it('claims a .nd.json filename without reading content or choosing a version', async () => {
		const reader = probe('invalid');
		expect(await recognizer.recognize(file('books/sermon.ND.JSON'), reader))
			.toBe('kjvonly.normalized-document');
		expect(await recognizer.recognize(file('books/sermon.ND.JSON.GZ'), reader))
			.toBe('kjvonly.normalized-document');
		expect(reader.readPrefix).not.toHaveBeenCalled();
	});

	it('recognizes ordinary JSON using a structural hint without parsing the entire file', async () => {
		const value = '{"source":"sermon", "blocks": [{"type":"paragraph"}';
		const reader = probe(value);
		expect(await recognizer.recognize(file('books/sermon.json', 100_000), reader))
			.toBe('kjvonly.normalized-document');
		expect(reader.readPrefix).toHaveBeenCalledWith(64 * 1024);
	});

	it('recognizes a large file while reading only a bounded prefix', async () => {
		const reader = probe('{"blocks": [' + ' '.repeat(70_000));
		expect(await recognizer.recognize(file('sermon.json', 10_000_000), reader))
			.toBe('kjvonly.normalized-document');
		expect(reader.readPrefix).toHaveBeenCalledWith(64 * 1024);
	});

	it('treats even malformed JSON as a candidate when its prefix has the hint', async () => {
		expect(await recognizer.recognize(file('sermon.json', 1000), probe('{"blocks": [broken')))
			.toBe('kjvonly.normalized-document');
	});

	it('does not claim unrelated extensions or JSON without a visible structural hint', async () => {
		const pdfReader = probe('{"blocks":[]}');
		expect(await recognizer.recognize(file('sermon.pdf'), pdfReader)).toBeUndefined();
		expect(pdfReader.readPrefix).not.toHaveBeenCalled();
		for (const value of ['{"unrelated":true}', '[{"type":"paragraph"}]', '{invalid', '{"blocks":{}']) {
			expect(await recognizer.recognize(file('sermon.json', Buffer.byteLength(value)), probe(value)))
				.toBeUndefined();
		}
	});

	it('cannot see a hint beyond its bounded prefix', async () => {
		const value = '{"source":"' + 'x'.repeat(65_536) + '","blocks":[]}';
		const reader = probe(value);
		expect(await recognizer.recognize(file('sermon.json', Buffer.byteLength(value)), reader))
			.toBeUndefined();
		expect(reader.readPrefix).toHaveBeenCalledWith(64 * 1024);
	});

	it('recognizes a hint in a short prefix without requiring complete content', async () => {
		const reader = probe('{"blocks":[]');
		expect(await recognizer.recognize(file('sermon.json', 100), reader))
			.toBe('kjvonly.normalized-document');
		expect(reader.readPrefix).toHaveBeenCalledWith(100);
	});

	it('skips empty files without probing and propagates probe errors with file context', async () => {
		const reader = probe('');
		expect(await recognizer.recognize(file('empty.json', 0), reader)).toBeUndefined();
		expect(reader.readPrefix).not.toHaveBeenCalled();

		const error = new Error('read failed');
		const failingReader: ImportFileProbe = { readPrefix: async () => { throw error; } };
		const classifier = new FilesystemImportClassifier([recognizer]);
		await expect(classifier.classify(file('books/sermon.json'), failingReader))
			.rejects.toThrow('Cannot recognize "books/sermon.json" with normalized-document.');
	});
});

describe('Normalized Document classification and semantic version validation', () => {
	const classifier = new FilesystemImportClassifier([recognizer]);
	const validator = new NormalizedDocumentValidator();
	const version1 = createNormalizedDocumentSemanticType(validator);

	/** Hypothetical newer contract used solely to exercise version precedence. */
	function version2(validateExtra: (value: unknown) => void): SemanticTypeDefinition {
		return {
			...version1,
			dataVersion: 2,
			validate(value: unknown) {
				validator.validate(value);
				validateExtra(value);
			}
		};
	}

	it('picks the newest version when older and newer validators both accept', async () => {
		const classification = await classifier.classify(file('books/sermon.nd.json'), probe(''));
		expect(classification).toEqual({ kind: 'candidates', dataTypes: ['kjvonly.normalized-document'] });
		if (classification.kind !== 'candidates') throw new Error('Expected candidates');

		const older = vi.fn(version1.validate);
		const newest = vi.fn(version2(() => {}).validate);
		const registry = new SemanticTypeRegistry([
			{ ...version1, validate: older },
			{ ...version2(() => {}), validate: newest }
		]);
		const resolved = await registry.resolve(classification.dataTypes[0], { blocks: [] });
		expect(resolved.dataVersion).toBe(2);
		expect(newest).toHaveBeenCalledOnce();
		expect(older).not.toHaveBeenCalled();
	});

	it('falls back to v1 if a hypothetical newer version rejects valid v1 content', async () => {
		const classification = await classifier.classify(file('books/sermon.nd.json'), probe(''));
		if (classification.kind !== 'candidates') throw new Error('Expected candidates');
		const registry = new SemanticTypeRegistry([
			version1,
			version2(value => {
				if (!('edition' in (value as object))) throw new Error('v2 requires edition');
			})
		]);
		expect((await registry.resolve(classification.dataTypes[0], { blocks: [] })).dataVersion)
			.toBe(1);
	});

	it('rejects an explicitly named malformed semantic document instead of treating it as validated', async () => {
		const classification = await classifier.classify(file('bad.nd.json'), probe(''));
		if (classification.kind !== 'candidates') throw new Error('Expected candidates');
		await expect(new SemanticTypeRegistry([version1]).resolve(classification.dataTypes[0], { unrelated: true }))
			.rejects.toThrow('No registered version of kjvonly.normalized-document accepts the content.');
	});
});
