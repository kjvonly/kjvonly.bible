import { describe, expect, it } from 'vitest';

import type { FilesystemEntry } from '$lib/domains/filesystem';
import type { ResourceDescriptor } from '$lib/resource';

import { createFileManagerOpenSequence } from './file-manager-open-sequence';

function entry(path: string): FilesystemEntry {
	return {
		path,
		descriptor: {
			metadata: {
				publisher: 'publisher',
				resourceId: path,
				resourceType: 'generic/file',
				dataType: 'generic.file',
				dataVersion: 1,
				modifiedAt: 1,
				representation: 'content',
				mediaType: 'application/octet-stream'
			},
			strategy: { type: 'test', data: null }
		} as ResourceDescriptor
	};
}

describe('File Manager Resource open sequences', () => {
	it('preserves displayed order and selected position across mixed extensions', () => {
		const entries = [
			entry('book/Chapter-1.nd.json'),
			entry('book/Chapter-2.mp3'),
			entry('book/Chapter-2.nd.json'),
			entry('book/Chapter-10.nd.json'),
			entry('book/Chapter-11.JSON')
		];
		const sequence = createFileManagerOpenSequence(entries, 2);
		expect(sequence?.items.map(item => item.fileName)).toEqual([
			'Chapter-1.nd.json', 'Chapter-2.nd.json', 'Chapter-10.nd.json'
		]);
		expect(sequence?.index).toBe(1);
		expect(sequence?.items[1].descriptor).toBe(entries[2].descriptor);
	});

	it('translates first, middle and last selections from the mixed displayed list', () => {
		const entries = [
			entry('book/Track-1.mp3'),
			entry('book/Chapter-1.nd.json'),
			entry('book/Cover.png'),
			entry('book/Chapter-2.nd.json'),
			entry('book/Track-2.mp3'),
			entry('book/Chapter-3.nd.json')
		];
		for (const [displayedIndex, expectedSequenceIndex] of [[1, 0], [3, 1], [5, 2]]) {
			const sequence = createFileManagerOpenSequence(entries, displayedIndex);
			expect(sequence?.items.map(item => item.fileName)).toEqual([
				'Chapter-1.nd.json', 'Chapter-2.nd.json', 'Chapter-3.nd.json'
			]);
			expect(sequence?.index).toBe(expectedSequenceIndex);
			expect(sequence?.items[expectedSequenceIndex].descriptor)
				.toBe(entries[displayedIndex].descriptor);
		}
	});

	it('passes an MP3 sequence without needing an audio viewer registration', () => {
		const entries = [entry('music/1.MP3'), entry('music/readme.txt'), entry('music/2.mp3')];
		expect(createFileManagerOpenSequence(entries, 2)).toEqual({
			items: [
				{ descriptor: entries[0].descriptor, fileName: '1.MP3' },
				{ descriptor: entries[2].descriptor, fileName: '2.mp3' }
			],
			index: 1
		});
	});

	it('keeps extensionless and single compatible files as standalone opens', () => {
		expect(createFileManagerOpenSequence([entry('book/intro'), entry('book/outro')], 0))
			.toBeUndefined();
		expect(createFileManagerOpenSequence([entry('book/1.nd.json'), entry('book/2.mp3')], 0))
			.toBeUndefined();
		expect(createFileManagerOpenSequence([], 0)).toBeUndefined();
	});
});
