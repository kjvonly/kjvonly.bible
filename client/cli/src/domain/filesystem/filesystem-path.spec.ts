import {
	describe,
	expect,
	it
} from 'vitest';

import {
	isCanonicalFilesystemDirectoryPath,
	isCanonicalFilesystemPath,
	isFilesystemPathSegment,
	isStrictFilesystemDescendant,
	joinFilesystemPath
} from './filesystem-path.js';


describe(
	'Filesystem path contract',
	() => {

		it.each([
			'library',
			'library/books',
			'library/books/theology'
		])(
			'accepts canonical complete path %s',
			value => {
				expect(
					isCanonicalFilesystemPath(
						value
					)
				).toBe(true);
			}
		);


		it.each([
			'',
			'/library',
			'library/',
			'library//books',
			'library/./books',
			'library/../books'
		])(
			'rejects non-canonical complete path %j',
			value => {
				expect(
					isCanonicalFilesystemPath(
						value
					)
				).toBe(false);
			}
		);


		it(
			'allows an empty manifest directory path for root placement',
			() => {
				expect(
					isCanonicalFilesystemDirectoryPath(
						''
					)
				).toBe(true);
			}
		);


		it.each([
			'bible',
			'bible/chapters'
		])(
			'accepts canonical manifest directory path %s',
			value => {
				expect(
					isCanonicalFilesystemDirectoryPath(
						value
					)
				).toBe(true);
			}
		);




		it(
			'joins logical Filesystem paths without host path semantics',
			() => {
				expect(
					joinFilesystemPath(
						'library',
						'',
						'books',
						'knowing-god'
					)
				).toBe(
					'library/books/knowing-god'
				);
			}
		);


		it.each([
			'library/books',
			'library/books/theology'
		])(
			'accepts strict descendant %s',
			path => {
				expect(
					isStrictFilesystemDescendant(
						'library',
						path
					)
				).toBe(true);
			}
		);


		it.each([
			'library',
			'library2/books',
			'books',
			'library/../books'
		])(
			'rejects non-descendant path %s',
			path => {
				expect(
					isStrictFilesystemDescendant(
						'library',
						path
					)
				).toBe(false);
			}
		);
		it.each([
			'genesis-1',
			'1_1',
			'kjvs-chapters'
		])(
			'accepts Filesystem segment %s',
			value => {
				expect(
					isFilesystemPathSegment(
						value
					)
				).toBe(true);
			}
		);


		it.each([
			'',
			'.',
			'..',
			'bible/chapters'
		])(
			'rejects Filesystem segment %j',
			value => {
				expect(
					isFilesystemPathSegment(
						value
					)
				).toBe(false);
			}
		);
	}
);
