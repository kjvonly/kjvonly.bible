import type {
	ResourceDomainObjectFactory
} from './resource-domain-object-factory';

/** Resolves the Domain-object factory that owns one Resource Type. */
export class ResourceDomainObjectFactoryResolver {
	private readonly factories =
		new Map<
			string,
			ResourceDomainObjectFactory
		>();

	constructor(
		factories:
			readonly ResourceDomainObjectFactory[]
	) {
		for (
			const factory of factories
		) {
			if (
				this.factories.has(
					factory.resourceType
				)
			) {
				throw new Error(
					`Duplicate Resource Domain object factory: ${factory.resourceType}`
				);
			}

			this.factories.set(
				factory.resourceType,
				factory
			);
		}
	}

	resolve(
		resourceType: string
	): ResourceDomainObjectFactory {
		const factory =
			this.factories.get(
				resourceType
			);

		if (factory === undefined) {
			throw new Error(
				`Unsupported Resource Type: ${resourceType}`
			);
		}

		return factory;
	}
}
