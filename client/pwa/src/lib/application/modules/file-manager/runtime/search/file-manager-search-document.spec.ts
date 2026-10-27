import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createFileManagerSearchDocument
} from './file-manager-search-document';

import {
	classifySearchFileType
} from '../../resolvers/file-manager-search-file-type-resolver';

describe(
	'createFileManagerSearchDocument',
	() => {
		it(
			'keeps filesystem publisher distinct from target Resource publisher',
			() => {
				const document = createFileManagerSearchDocument({
					filesystemPublisher: 'filesystem-publisher',
					rootPath: 'library',
					entry: {
						path: 'library/resource',
						descriptor: {
							resourceMetadata: {
								category: 'sermons'
							},
							metadata: {
								publisher: 'target-publisher',
								resourceId: 'resource',
								name: 'Resource',
								resourceType: 'normalized-content/document',
								dataType: 'kjvonly.normalized-document',
								dataVersion: 1,
								modifiedAt: 1,
								representation: 'content',
								mediaType: 'application/json'
							},
							strategy: {
								type: 'test',
								data: null
							}
						}
					}
				});

				expect(document.filesystemPublisher).toBe('filesystem-publisher');
				expect(document.resourcePublisher).toBe('target-publisher');
				expect(document.resourceType).toBe('normalized-content/document');
				expect(document.category).toBe('sermons');
			}
		);
	}
);

describe(
	'classifySearchFileType',
	() => {
		it(
			'prefers physical audio/video/image media types',
			() => {
				expect(
					classifySearchFileType(
						'kjvonly.normalized-document',
						'audio/mpeg',
						'normalized-content/document',
						'sermons'
					)
				).toBe('audio');

				expect(
					classifySearchFileType(
						'',
						'video/mp4',
						'mock/video',
						''
					)
				).toBe('video');

				expect(
					classifySearchFileType(
						'',
						'image/png',
						'mock/image',
						''
					)
				).toBe('image');
			}
		);

		it(
			'classifies semantic text Resources as documents',
			() => {
				expect(
					classifySearchFileType(
						'kjvonly.normalized-document',
						'application/json',
						'normalized-content/document',
						'sermons'
					)
				).toBe('document');

				expect(
					classifySearchFileType(
						'',
						'application/pdf',
						'normalized-content/document',
						''
					)
				).toBe('document');
			}
		);

		it(
			'leaves unrecognized Resource metadata in the all-only bucket',
			() => {
				expect(
					classifySearchFileType(
						'kjvonly.unknown',
						'application/octet-stream',
						'unknown/resource',
						'misc'
					)
				).toBe('other');
			}
		);
	}
);
