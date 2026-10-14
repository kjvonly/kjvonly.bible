import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { validateManifest } from '#domain/manifest/manifest.js';
import { createDefaultFileFormatRegistry } from '../format/file-format-registry.js';
import { GenericFileResourceDefinitionBuilder } from './generic-file-resource-definition-builder.js';

const builder = new GenericFileResourceDefinitionBuilder(createDefaultFileFormatRegistry());
const directory = resolve('/tmp/kjvonly-import');

function build(relativePath: string, size = 10) {
	return builder.build({
		directory,
		filesystemRoot: 'app-filesystem',
		file: { relativePath, sourcePath: resolve(directory, relativePath), size }
	});
}

function tagValue(tags: readonly (readonly string[])[], name: string): string | undefined {
	return tags.find(tag => tag[0] === name)?.[1];
}

describe('GenericFileResourceDefinitionBuilder', () => {
	it.each([
		['audio/sermon.mp3', 'audio/mpeg', 'media/audio', 'kjvonly.audio'],
		['video/lecture.mp4', 'video/mp4', 'media/video', 'kjvonly.video'],
		['images/cover.jpg', 'image/jpeg', 'media/image', 'kjvonly.image'],
		['books/commentary.pdf', 'application/pdf', 'generic/file', 'kjvonly.file'],
		['books/letter.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'generic/file', 'kjvonly.file'],
		['books/letter.odt', 'application/vnd.oasis.opendocument.text', 'generic/file', 'kjvonly.file'],
		['archives/books.zip', 'application/zip', 'generic/file', 'kjvonly.file'],
		['archives/books.tar.xz', 'application/x-xz', 'generic/file', 'kjvonly.file'],
		['unknown/file.abc', 'application/octet-stream', 'generic/file', 'kjvonly.file']
	])('builds %s with matching metadata', (path, mediaType, resourceType, dataType) => {
		const result = build(path);
		const tags = result.definition.event.tags;
		expect(result.filesystemPath).toBe(`app-filesystem/${path}`);
		expect(result.definition.path).toBe(path);
		expect(tagValue(tags, 'd')).toBe(`kjvonly/files/app-filesystem/${path}`);
		expect(tagValue(tags, 't')).toBe(resourceType);
		expect(tagValue(tags, 'dataType')).toBe(dataType);
		expect(tagValue(tags, 'dataVersion')).toBe('1');
		expect(tagValue(tags, 'representation')).toBe('descriptors');
		expect(result.definition['object-upload']).toEqual({ mediaType, encoding: [] });
	});

	it('preserves existing gzip bytes without requesting a second encoding', () => {
		const result = build('audio/sermon.mp3.gz');
		expect(tagValue(result.definition.event.tags, 'dataType')).toBe('kjvonly.audio');
		expect(result.definition['object-upload']).toEqual({
			mediaType: 'audio/mpeg+gzip', encoding: []
		});
	});

	it('generates stable names without depending on file size or media type', () => {
		const original = build('books/report.PDF');
		expect(original.name).toMatch(/^generic-file-[a-f0-9]{64}$/);
		expect(build('books/report.PDF', 999).name).toBe(original.name);
		expect(build('books/report.pdf').name).not.toBe(original.name);
	});

	it('produces a Resource accepted by the existing manifest schema', () => {
		const result = build('archives/source.tar.gz');
		const manifest = validateManifest({
			version: 1, kind: 37770, staging: { path: './.staging' },
			nostr: { relays: ['ws://localhost:3334'] },
			strategies: { local: { type: 'blossom', urls: ['http://localhost:3335'] } },
			defaults: { strategy: 'local' },
			resources: { [result.name]: result.definition },
			collections: {}, filesystems: {}
		});
		expect(manifest.resources[result.name]?.['object-upload']).toEqual({
			mediaType: 'application/x-tar+gzip', encoding: []
		});
	});

	it.each([
		['books/chapter.nd.json', '/tmp/kjvonly-import/books/chapter.nd.json', 10],
		['books/chapter.nd.json.gz', '/tmp/kjvonly-import/books/chapter.nd.json.gz', 10],
		['../escape.pdf', '/tmp/escape.pdf', 10],
		['books/../escape.pdf', '/tmp/kjvonly-import/escape.pdf', 10],
		['books/.hidden.pdf', '/tmp/kjvonly-import/books/.hidden.pdf', 10],
		['books/book.pdf', '/tmp/kjvonly-import/elsewhere.pdf', 10],
		['books/file.pdf', '/tmp/kjvonly-import/books/file.pdf', -1]
	])('rejects invalid source metadata for %s', (relativePath, sourcePath, size) => {
		expect(() => builder.build({
			directory, filesystemRoot: 'app-filesystem',
			file: { relativePath, sourcePath, size }
		})).toThrow();
	});
});
