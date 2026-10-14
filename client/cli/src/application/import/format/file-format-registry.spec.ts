import { describe, expect, it } from 'vitest';
import {
	FileFormatRegistry,
	createDefaultFileFormatRegistry
} from './file-format-registry.js';

const registry = createDefaultFileFormatRegistry();

describe('FileFormatRegistry', () => {
	it.each([
		['chapters/Genesis.nd.json', 'application/json'],
		['books/Study.JSON', 'application/json'],
		['sermons/lesson.mp3', 'audio/mpeg'],
		['books/research.pdf', 'application/pdf'],
		['library/letter.DOCX', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
		['library/letter.odt', 'application/vnd.oasis.opendocument.text'],
		['library/budget.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
		['library/budget.ods', 'application/vnd.oasis.opendocument.spreadsheet'],
		['library/slides.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
		['library/slides.odp', 'application/vnd.oasis.opendocument.presentation'],
		['library/drawing.odg', 'application/vnd.oasis.opendocument.graphics'],
		['library/novel.epub', 'application/epub+zip'],
		['library/chapters.jsonl', 'application/x-ndjson'],
		['archives/backup.zip', 'application/zip'],
		['archives/backup.7z', 'application/x-7z-compressed'],
		['archives/backup.rar', 'application/vnd.rar'],
		['archives/source.tar', 'application/x-tar'],
		['archives/backup.tgz', 'application/gzip'],
		['archives/source.tar.xz', 'application/x-xz'],
		['archives/source.tar.bz2', 'application/x-bzip2'],
		['archives/source.tar.zst', 'application/zstd'],
		['archives/source.tar.zstd', 'application/zstd'],
		['covers/front.JPEG', 'image/jpeg'],
		['videos/lesson.mp4', 'video/mp4'],
		['notes/README.md', 'text/markdown'],
		['library/no-extension', 'application/octet-stream'],
		['library/unknown.xyz', 'application/octet-stream']
	])('recognizes %s as %s without encoding it', (filename, mediaType) => {
		expect(registry.resolve(filename)).toEqual({
			baseMediaType: mediaType,
			mediaType,
			sourceEncoding: []
		});
	});

	it.each([
		['chapter.nd.json.gz', 'application/json'],
		['sermon.MP3.GZ', 'audio/mpeg'],
		['books/text.pdf.gz', 'application/pdf'],
		['archives/source.tar.gz', 'application/x-tar'],
		['library/letter.docx.gz', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
		['unknown.xyz.gz', 'application/octet-stream'],
		['backup.gz', 'application/octet-stream']
	])('recognizes %s as already gzipped %s', (filename, baseMediaType) => {
		expect(registry.resolve(filename)).toEqual({
			baseMediaType,
			mediaType: `${baseMediaType}+gzip`,
			sourceEncoding: ['gzip']
		});
	});

	it('keeps ZIP-based office documents as opaque files, not gzip wrappers', () => {
		for (const filename of ['report.docx', 'report.odt', 'sheet.xlsx', 'book.epub']) {
			const format = registry.resolve(filename);
			expect(format.sourceEncoding).toEqual([]);
			expect(format.mediaType).toBe(format.baseMediaType);
		}
	});

	it('prefers the longest suffix independently of registration order', () => {
		const custom = new FileFormatRegistry([
			{ extension: '.json', mediaType: 'application/json' },
			{ extension: '.nd.json', mediaType: 'application/vnd.kjvonly-document' }
		]);
		expect(custom.resolve('chapter.nd.json').baseMediaType)
			.toBe('application/vnd.kjvonly-document');
		expect(custom.resolve('chapter.nd.json.gz').mediaType)
			.toBe('application/vnd.kjvonly-document+gzip');
	});

	it('rejects ambiguous or invalid registrations', () => {
		expect(() => new FileFormatRegistry([
			{ extension: '.pdf', mediaType: 'application/pdf' },
			{ extension: '.pdf', mediaType: 'text/plain' }
		])).toThrow('Invalid or duplicate file format: .pdf');
		expect(() => new FileFormatRegistry([
			{ extension: 'pdf', mediaType: 'application/pdf' }
		])).toThrow('Invalid or duplicate file format: pdf');
		expect(() => new FileFormatRegistry([
			{ extension: '.pdf', mediaType: 'not-a-mime' }
		])).toThrow('Invalid or duplicate file format: .pdf');
	});
});
