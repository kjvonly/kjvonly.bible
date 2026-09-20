import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	ResourcePublicationResolver
} from './resource-publication-resolver';

describe(
	'ResourcePublicationResolver',
	() => {
		it(
			'resolves Resource publication preparation by Domain object type',
			() => {
				const create =
					vi.fn(
						(
							objectId: string,
							value: unknown
						) => ({
							type:
								'resource' as const,
							publisher:
								'publisher',
							resourceType:
								'kjvonly/notes/entries',
							resourceId:
								`kjvonly/notes/entries/default/${objectId}`,
							representation:
								'content' as const,
							mediaType:
								'application/json+gzip+hex',
							value
						})
					);

				const resolver =
					new ResourcePublicationResolver([
						{
							objectType:
								'note',
							create
						}
					]);

				const value = {
					text:
						'note'
				};

				const publication =
					resolver.resolve(
						'note',
						'note-1',
						value
					);

				expect(
					create
				).toHaveBeenCalledWith(
					'note-1',
					value
				);

				expect(
					publication?.resourceId
				).toBe(
					'kjvonly/notes/entries/default/note-1'
				);
			}
		);

		it(
			'returns undefined for an unregistered Domain object type',
			() => {
				const resolver =
					new ResourcePublicationResolver([]);

				expect(
					resolver.resolve(
						'bible/chapter',
						'publisher/kjvs/1_1',
						{}
					)
				).toBeUndefined();
			}
		);

		it(
			'rejects duplicate Domain object type registrations',
			() => {
				const registration = {
					objectType:
						'note',
					create:
						() => ({
							type:
								'resource' as const,
							publisher:
								'publisher',
							resourceType:
								'kjvonly/notes/entries',
							resourceId:
								'kjvonly/notes/entries/default/note-1',
							representation:
								'content' as const,
							mediaType:
								'application/json',
							value:
								{}
						})
				};

				expect(
					() =>
						new ResourcePublicationResolver([
							registration,
							registration
						])
				).toThrow(
					'Duplicate Resource publication registration: note'
				);
			}
		);
	}
);
