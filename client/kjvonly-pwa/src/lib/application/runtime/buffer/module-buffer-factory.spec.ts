import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	Modules
} from '$lib/application/models/modules.model';

import type {
	ResourceSelections
} from '$lib/application/resources/resource-selections';

import {
	Buffer
} from './models/buffer.model';

import {
	ModuleBufferFactory,
	type ModuleResourceSelectionsBuilder
} from './module-buffer-factory';

describe(
	'ModuleBufferFactory',
	() => {
		it(
			'creates an independent Buffer with the target module selections',
			() => {
				const selections = {
					'resource/type': {
						publisher:
							'publisher',

						resourceId:
							'resource/type/source'
					}
				};

				const builder =
					createBuilder({
						independent:
							selections
					});

				const factory =
					new ModuleBufferFactory(
						builder
					);

				const buffer =
					factory.independent(
						Modules.BIBLE,
						{
							bibleLocationRef:
								'1_1'
						}
					);

				expect(
					builder.independent
				).toHaveBeenCalledWith(
					Modules.BIBLE
				);

				expect(
					buffer.componentName
				).toBe(
					Modules.BIBLE
				);

				expect(
					buffer.resourceSelections
				).toEqual(
					selections
				);

				expect(
					buffer.bag
				).toEqual({
					bibleLocationRef:
						'1_1'
				});
			}
		);

		it(
			'creates a related Buffer using the originating Buffer selections',
			() => {
				const originating =
					new Buffer({
						'resource/type': {
							publisher:
								'origin',

							resourceId:
								'resource/type/origin'
						}
					});

				const inherited = {
					'resource/type': {
						publisher:
							'origin',

						resourceId:
							'resource/type/origin'
					}
				};

				const builder =
					createBuilder({
						related:
							inherited
					});

				const factory =
					new ModuleBufferFactory(
						builder
					);

				const buffer =
					factory.related(
						Modules.SEARCH,
						originating,
						{
							query:
								'faith'
						}
					);

				expect(
					builder.related
				).toHaveBeenCalledWith(
					Modules.SEARCH,
					originating
						.resourceSelections
				);

				expect(
					buffer.componentName
				).toBe(
					Modules.SEARCH
				);

				expect(
					buffer.resourceSelections
				).toEqual(
					inherited
				);
			}
		);

		it(
			'creates a new Buffer identity for a related module',
			() => {
				const originating =
					new Buffer();

				const factory =
					new ModuleBufferFactory(
						createBuilder()
					);

				const buffer =
					factory.related(
						Modules.NOTES,
						originating
					);

				expect(
					buffer
				).not.toBe(
					originating
				);

				expect(
					buffer.key
				).not.toBe(
					originating.key
				);
			}
		);

		it(
			'copies navigation context into the new Buffer',
			() => {
				const bag = {
					bibleLocationRef:
						'10_1'
				};

				const factory =
					new ModuleBufferFactory(
						createBuilder()
					);

				const buffer =
					factory.related(
						Modules.BIBLE,
						new Buffer(),
						bag
					);

				expect(
					buffer.bag
				).toEqual(
					bag
				);

				expect(
					buffer.bag
				).not.toBe(
					bag
				);
			}
		);

		it(
			'does not implicitly copy the originating Buffer navigation context',
			() => {
				const originating =
					new Buffer();

				originating.bag = {
					query:
						'old module state'
				};

				const factory =
					new ModuleBufferFactory(
						createBuilder()
					);

				const buffer =
					factory.related(
						Modules.BIBLE,
						originating
					);

				expect(
					buffer.bag
				).toEqual({});
			}
		);
	}
);

function createBuilder(
	results: {
		independent?:
			ResourceSelections;

		related?:
			ResourceSelections;
	} = {}
): ModuleResourceSelectionsBuilder & {
	independent:
		ReturnType<typeof vi.fn>;

	related:
		ReturnType<typeof vi.fn>;
} {
	return {
		independent:
			vi.fn(
				() =>
					results.independent ??
					{}
			),

		related:
			vi.fn(
				() =>
					results.related ??
					{}
			)
	};
}
