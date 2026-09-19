import {
	describe,
	expect,
	it
} from 'vitest';

import {
	KJVOnlyArchiveValidator
} from './kjvonly-archive-validator';

const ID =
	'notes/note:publisher/default/note-1';

function createArchive() {
	return {
		version: 1,
		domain_objects: {
			[ID]: {
				id: ID,
				objectType:
					'notes/note',
				objectId:
					'publisher/default/note-1',
				value: {
					title:
						'Archive note'
				}
			}
		},
		resource_installations: {
			[ID]: {
				id: ID,
				objectType:
					'notes/note',
				objectId:
					'publisher/default/note-1',
				publisher:
					'publisher',
				resourceId:
					'kjvonly/notes/default/note-1',
				modifiedAt:
					100
			}
		}
	};
}

describe(
	'KJVOnlyArchiveValidator',
	() => {
		it(
			'accepts a structurally valid archive',
			() => {
				const archive =
					createArchive();

				expect(
					new KJVOnlyArchiveValidator()
						.validate(
							archive
						)
				).toBe(
					archive
				);
			}
		);

		it(
			'accepts a local Resource Installation without resourceId',
			() => {
				const archive =
					createArchive();

				delete (
					archive.resource_installations[
						ID
					] as {
						resourceId?: string;
					}
				).resourceId;

				expect(
					() =>
						new KJVOnlyArchiveValidator()
							.validate(
								archive
							)
				).not.toThrow();
			}
		);

		it(
			'accepts an empty archive',
			() => {
				expect(
					() =>
						new KJVOnlyArchiveValidator()
							.validate({
								version: 1,
								domain_objects: {},
								resource_installations: {}
							})
				).not.toThrow();
			}
		);

		it(
			'rejects an unsupported archive version',
			() => {
				const archive =
					createArchive();

				expect(
					() =>
						new KJVOnlyArchiveValidator()
							.validate({
								...archive,
								version: 2
							})
				).toThrow(
					'Unsupported KJVOnly archive version: 2.'
				);
			}
		);

		it(
			'rejects a Domain Object whose map key does not match its id',
			() => {
				const archive =
					createArchive();

				archive.domain_objects[
					ID
				].id =
					'notes/note:different';

				expect(
					() =>
						new KJVOnlyArchiveValidator()
							.validate(
								archive
							)
				).toThrow(
					'Domain Object key'
				);
			}
		);

		it(
			'rejects a Resource Installation without a matching Domain Object',
			() => {
				const archive =
					createArchive();

				const invalidArchive = {
					...archive,
					domain_objects: {}
				};

				expect(
					() =>
						new KJVOnlyArchiveValidator()
							.validate(
								invalidArchive
							)
				).toThrow(
					`Resource Installation ${ID} has no matching Domain Object.`
				);
			}
		);

		it(
			'rejects paired records with different objectType',
			() => {
				const archive =
					createArchive();

				archive.resource_installations[
					ID
				].objectType =
					'bible/chapter';

				expect(
					() =>
						new KJVOnlyArchiveValidator()
							.validate(
								archive
							)
				).toThrow(
					`objectType mismatch for ${ID}.`
				);
			}
		);

		it(
			'rejects paired records with different objectId',
			() => {
				const archive =
					createArchive();

				archive.resource_installations[
					ID
				].objectId =
					'publisher/default/different';

				expect(
					() =>
						new KJVOnlyArchiveValidator()
							.validate(
								archive
							)
				).toThrow(
					`objectId mismatch for ${ID}.`
				);
			}
		);

		it(
			'rejects a non-integer modifiedAt',
			() => {
				const archive =
					createArchive();

				archive.resource_installations[
					ID
				].modifiedAt =
					100.5;

				expect(
					() =>
						new KJVOnlyArchiveValidator()
							.validate(
								archive
							)
				).toThrow(
					'requires a non-negative integer modifiedAt.'
				);
			}
		);
	}
);
