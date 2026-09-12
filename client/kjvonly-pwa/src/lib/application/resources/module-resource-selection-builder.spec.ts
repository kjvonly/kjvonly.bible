import {
	describe,
	expect,
	it
} from 'vitest';

import {
	Modules
} from '$lib/application/models/modules.model';

import type {
	ResourceSelections
} from './resource-selections';

import type {
	ModuleResourceSelectionBuildContext,
	ModuleResourceSelectionContributor
} from './module-resource-selection-contributor';

import {
	ModuleResourceSelectionBuilder,
	type ResourceSelectionSnapshotProvider
} from './module-resource-selection-builder';

describe(
	'ModuleResourceSelectionBuilder',
	() => {
		it(
			'delegates independent module selection construction to the registered contributor',
			() => {
				let received:
					ModuleResourceSelectionBuildContext |
					undefined;

				const result = {
					'test/resource': {
						publisher: 'publisher',
						resourceId: 'test/resource/default'
					}
				};

				const builder =
					new ModuleResourceSelectionBuilder(
						createSnapshotProvider({
							'global/resource': {
								publisher: 'global',
								resourceId: 'global/resource/default'
							}
						}),
						[
							createContributor(
								Modules.BIBLE,
								context => {
									received = context;
									return result;
								}
							)
						]
					);

				expect(
					builder.independent(
						Modules.BIBLE
					)
				).toBe(result);

				expect(
					received
				).toEqual({
					originatingSelections: {},
					currentSelections: {
						'global/resource': {
							publisher: 'global',
							resourceId: 'global/resource/default'
						}
					}
				});
			}
		);

		it(
			'passes originating Buffer selections to the contributor for related module construction',
			() => {
				let received:
					ModuleResourceSelectionBuildContext |
					undefined;

				const originatingSelections = {
					'origin/resource': {
						publisher: 'origin',
						resourceId: 'origin/resource/default'
					}
				};

				const builder =
					new ModuleResourceSelectionBuilder(
						createSnapshotProvider({}),
						[
							createContributor(
								Modules.SEARCH,
								context => {
									received = context;
									return {};
								}
							)
						]
					);

				builder.related(
					Modules.SEARCH,
					originatingSelections
				);

				expect(
					received?.originatingSelections
				).toBe(
					originatingSelections
				);
			}
		);

		it(
			'applies only the contributor registered for the target module',
			() => {
				const bibleBuild =
					{ count: 0 };

				const searchBuild =
					{ count: 0 };

				const builder =
					new ModuleResourceSelectionBuilder(
						createSnapshotProvider({}),
						[
							createContributor(
								Modules.BIBLE,
								() => {
									bibleBuild.count += 1;
									return {};
								}
							),
							createContributor(
								Modules.SEARCH,
								() => {
									searchBuild.count += 1;
									return {};
								}
							)
						]
					);

				builder.independent(
					Modules.BIBLE
				);

				expect(
					bibleBuild.count
				).toBe(1);

				expect(
					searchBuild.count
				).toBe(0);
			}
		);

		it(
			'asks for a fresh global snapshot for every module build',
			() => {
				let current =
					'first';

				const provider:
					ResourceSelectionSnapshotProvider = {
					snapshot() {
						return {
							[current]: {
								publisher: current,
								resourceId: current
							}
						};
					}
				};

				const observed:
					ResourceSelections[] =
					[];

				const builder =
					new ModuleResourceSelectionBuilder(
						provider,
						[
							createContributor(
								Modules.BIBLE,
								context => {
									observed.push(
										context.currentSelections
									);
									return {};
								}
							)
						]
					);

				builder.independent(
					Modules.BIBLE
				);

				current = 'second';

				builder.independent(
					Modules.BIBLE
				);

				expect(
					Object.keys(
						observed[0] ?? {}
					)
				).toEqual([
					'first'
				]);

				expect(
					Object.keys(
						observed[1] ?? {}
					)
				).toEqual([
					'second'
				]);
			}
		);

		it(
			'fails when a module has no registered Resource selection contributor',
			() => {
				const builder =
					new ModuleResourceSelectionBuilder(
						createSnapshotProvider({}),
						[]
					);

				expect(
					() => builder.independent(
						Modules.BIBLE
					)
				).toThrow(
					'No Resource selection contributor registered for module'
				);
			}
		);
	}
);

function createSnapshotProvider(
	selections:
		ResourceSelections
): ResourceSelectionSnapshotProvider {
	return {
		snapshot() {
			return {
				...selections
			};
		}
	};
}

function createContributor(
	module: Modules,
	build: (
		context:
			ModuleResourceSelectionBuildContext
	) => ResourceSelections
): ModuleResourceSelectionContributor {
	return {
		module,
		build
	};
}
