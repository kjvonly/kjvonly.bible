import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	ResourceDomainObjectFactory
} from './resource-domain-object-factory';

import {
	ResourceDomainObjectFactoryResolver
} from './resource-domain-object-factory-resolver';

function createFactory(
	resourceType: string
): ResourceDomainObjectFactory {
	return {
		resourceType,
		create:
			() => []
	};
}

describe(
	'ResourceDomainObjectFactoryResolver',
	() => {
		it(
			'resolves a factory by Resource Type',
			() => {
				const factory =
					createFactory(
						'sermons'
					);

				const resolver =
					new ResourceDomainObjectFactoryResolver([
						factory
					]);

				expect(
					resolver.resolve(
						'sermons'
					)
				).toBe(
					factory
				);
			}
		);

		it(
			'fails for an unsupported Resource Type',
			() => {
				const resolver =
					new ResourceDomainObjectFactoryResolver([]);

				expect(
					() =>
						resolver.resolve(
							'future/things'
						)
				).toThrow(
					'Unsupported Resource Type: future/things'
				);
			}
		);

		it(
			'rejects duplicate Resource Type registrations',
			() => {
				expect(
					() =>
						new ResourceDomainObjectFactoryResolver([
							createFactory(
								'sermons'
							),
							createFactory(
								'sermons'
							)
						])
				).toThrow(
					'Duplicate Resource Domain object factory: sermons'
				);
			}
		);
	}
);
