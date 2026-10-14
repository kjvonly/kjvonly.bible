import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	FileManagerSearchDocument
} from './file-manager-search-document';

import {
	FileManagerSearchIndex
} from './file-manager-search-index';

describe(
	'FileManagerSearchIndex',
	() => {
		it(
			'searches generic Resource metadata across mounted roots',
			async () => {
				const index =
					new FileManagerSearchIndex();

				await index.initialize([
					document({
						id: 'grace',
						name: 'Grace Alone',
						path: 'sermons/spurgeon/grace',
						filesystemPublisher: 'alice',
						rootPath: 'sermons',
						resourceType: 'normalized-content/document',
						category: 'sermons',
						dataType: 'kjvonly.normalized-document',
						mediaType: 'application/json'
					}),
					document({
						id: 'faith',
						name: 'Faith Comes by Hearing',
						path: 'audio/messages/faith',
						filesystemPublisher: 'bob',
						rootPath: 'audio',
						resourceType: 'mock/audio',
						category: 'sermons',
						dataType: 'kjvonly.audio',
						mediaType: 'audio/mpeg'
					})
				]);

				expect(
					await index.search({ text: 'grace' })
				).toEqual([
					'grace'
				]);

				expect(
					await index.search({ text: 'kjvonly.audio' })
				).toEqual([
					'faith'
				]);

				expect(
					await index.search({ text: 'audio/mpeg' })
				).toEqual([
					'faith'
				]);
			}
		);

		it(
			'applies exact metadata filters independently of text matching',
			async () => {
				const index =
					new FileManagerSearchIndex();

				await index.initialize([
					document({
						id: 'one',
						name: 'One',
						path: 'library/one',
						filesystemPublisher: 'alice',
						rootPath: 'library',
						resourceType: 'mock/audio',
						category: 'sermons',
						dataType: 'kjvonly.audio',
						mediaType: 'audio/mpeg',
						fileType: 'audio'
					}),
					document({
						id: 'two',
						name: 'Two',
						path: 'library/two',
						filesystemPublisher: 'bob',
						rootPath: 'library',
						resourceType: 'normalized-content/document',
						category: 'articles',
						dataType: 'kjvonly.normalized-document',
						mediaType: 'application/json'
					})
				]);

				expect(
					await index.search({
						text: '',
						filters: {
							dataType: 'kjvonly.audio',
							mediaType: 'audio/mpeg',
							fileType: 'audio',
							filesystemPublisher: 'alice',
							category: 'sermons'
						}
					})
				).toEqual([
					'one'
				]);
			}
		);

		it(
			'searches and filters target Resource publisher independently from filesystem publisher',
			async () => {
				const index =
					new FileManagerSearchIndex();

				await index.initialize([
					document({
						id: 'mapped',
						name: 'Mapped Resource',
						path: 'library/mapped',
						filesystemPublisher: 'filesystem-publisher',
						resourcePublisher: 'target-publisher'
					})
				]);

				expect(
					await index.search({
						text: 'target-publisher'
					})
				).toEqual([
					'mapped'
				]);

				expect(
					await index.search({
						text: '',
						filters: {
							filesystemPublisher: 'filesystem-publisher',
							resourcePublisher: 'target-publisher'
						}
					})
				).toEqual([
					'mapped'
				]);
			}
		);

		it(
			'returns natural filename order for unfiltered and text search',
			async () => {
				const index = new FileManagerSearchIndex();
				await index.initialize([
					document({ id: '20', name: 'Chapter 20.nd.json', path: 'library/20' }),
					document({ id: '2', name: 'Chapter 2.nd.json', path: 'library/2' }),
					document({ id: '10', name: 'Chapter 10.nd.json', path: 'library/10' }),
					document({ id: '1', name: 'Chapter 1.nd.json', path: 'library/1' })
				]);

				expect(await index.search({ text: '' }))
					.toEqual(['1', '2', '10', '20']);
				expect(await index.search({ text: 'Chapter' }))
					.toEqual(['1', '2', '10', '20']);
			}
		);

		it(
			'replaces its complete in-memory snapshot on initialize',
			async () => {
				const index =
					new FileManagerSearchIndex();

				await index.initialize([
					document({
						id: 'old',
						name: 'Old',
						path: 'library/old'
					})
				]);

				await index.initialize([
					document({
						id: 'new',
						name: 'New',
						path: 'library/new'
					})
				]);

				expect(
					await index.search({ text: '' })
				).toEqual([
					'new'
				]);
			}
		);
	}
);

function document(
	overrides: Partial<FileManagerSearchDocument> &
		Pick<FileManagerSearchDocument, 'id' | 'name' | 'path'>
): FileManagerSearchDocument {
	return {
		filesystemPublisher: 'alice',
		rootPath: 'library',
		resourcePublisher: 'resource-publisher',
		resourceType: 'normalized-content/document',
		category: 'documents',
		dataType: '',
		mediaType: 'application/json',
		fileType: 'document',
		...overrides
	};
}
