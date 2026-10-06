import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	ResourceDescriptor
} from '$lib/resource';

import {
	Modules
} from '../../models/modules.model';

import {
	ResourceModuleResolver
} from './resource-module-resolver';

function descriptor(
	overrides: Partial<
		ResourceDescriptor['metadata']
	> = {}
): ResourceDescriptor {
	return {
		metadata: {
			publisher: 'publisher',
			resourceId: 'library/item',
			resourceType: 'normalized-content/document',
			dataType: 'kjvonly.normalized-document',
			dataVersion: 1,
			modifiedAt: 1,
			representation: 'content',
			mediaType: 'application/json',
			...overrides
		},
		strategy: {
			type: 'inline',
			data: null
		}
	};
}

describe(
	'ResourceModuleResolver',
	() => {
		it(
			'prefers a specialized Resource Type Module over a compatible data-type fallback',
			() => {
				const resolver =
					new ResourceModuleResolver([
						{
							module: Modules.BIBLE,
							view: 'bible.reader',
							match: {
								resourceType: 'bible/chapter'
							},
							createState: () => ({
								location: 'chapter'
							})
						},
						{
							module: Modules.ARCHIVE,
							view: 'normalized-content.root',
							match: {
								dataType: 'kjvonly.normalized-document'
							},
							createState: () => ({
								generic: true
							})
						}
					]);

				const destination =
					resolver.resolve(
						descriptor({
							resourceType: 'bible/chapter'
						})
					);

				expect(destination).toEqual({
					module: Modules.BIBLE,
					view: 'bible.reader',
					state: {
						location: 'chapter'
					}
				});
			}
		);

		it(
			'falls back to a compatible data-type Module when no Resource Type Module matches',
			() => {
				const resolver =
					new ResourceModuleResolver([
						{
							module: Modules.ARCHIVE,
							view: 'normalized-content.root',
							match: {
								dataType: 'kjvonly.normalized-document'
							},
							createState: () => ({})
						}
					]);

				expect(
					resolver.resolve(
						descriptor()
					).view
				).toBe(
					'normalized-content.root'
				);
			}
		);

		it(
			'uses the configured default when multiple Modules support the same data type',
			() => {
				const resolver =
					new ResourceModuleResolver([
						{
							module: Modules.ARCHIVE,
							view: 'reader.one',
							match: {
								dataType: 'kjvonly.audio'
							},
							createState: () => ({})
						},
						{
							module: Modules.PROFILE,
							view: 'reader.two',
							match: {
								dataType: 'kjvonly.audio'
							},
							isDefault: true,
							createState: () => ({})
						}
					]);

				expect(
					resolver.resolve(
						descriptor({
							dataType: 'kjvonly.audio'
						})
					).module
				).toBe(
					Modules.PROFILE
				);
			}
		);

		it(
			'uses feature compatibility checks before selecting a registration',
			() => {
				const supports =
					vi.fn(
						(resource: ResourceDescriptor) =>
							resource.metadata.resourceId.endsWith(
								'/v1'
							)
					);

				const resolver =
					new ResourceModuleResolver([
						{
							module: Modules.ARCHIVE,
							view: 'audio.root',
							match: {
								dataType: 'kjvonly.audio'
							},
							supports,
							createState: () => ({})
						}
					]);

				expect(
					resolver.resolve(
						descriptor({
							dataType: 'kjvonly.audio',
							resourceId: 'audio/item/v1'
						})
					).view
				).toBe(
					'audio.root'
				);

				expect(supports).toHaveBeenCalledOnce();
			}
		);

		it(
			'rejects ambiguous compatible Modules when no default exists',
			() => {
				const resolver =
					new ResourceModuleResolver([
						{
							module: Modules.ARCHIVE,
							view: 'reader.one',
							match: {
								dataType: 'kjvonly.audio'
							},
							createState: () => ({})
						},
						{
							module: Modules.PROFILE,
							view: 'reader.two',
							match: {
								dataType: 'kjvonly.audio'
							},
							createState: () => ({})
						}
					]);

				expect(
					() => resolver.resolve(
						descriptor({
							dataType: 'kjvonly.audio'
						})
					)
				).toThrow(
					'Multiple Modules can open Resource dataType without one default'
				);
			}
		);

		it(
			'rejects duplicate defaults for the same registration key',
			() => {
				expect(
					() => new ResourceModuleResolver([
						{
							module: Modules.ARCHIVE,
							view: 'reader.one',
							match: {
								dataType: 'kjvonly.audio'
							},
							isDefault: true,
							createState: () => ({})
						},
						{
							module: Modules.PROFILE,
							view: 'reader.two',
							match: {
								dataType: 'kjvonly.audio'
							},
							isDefault: true,
							createState: () => ({})
						}
					])
				).toThrow(
					'Resource Module default already registered: dataType:kjvonly.audio'
				);
			}
		);

		it(
			'rejects Resources without a compatible Module',
			() => {
				const resolver =
					new ResourceModuleResolver([]);

				expect(
					() => resolver.resolve(
						descriptor()
					)
				).toThrow(
					'No Module registered for Resource'
				);
			}
		);
	}
);
