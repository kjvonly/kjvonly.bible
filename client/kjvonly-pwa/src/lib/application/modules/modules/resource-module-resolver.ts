import type {
	ResourceDescriptor
} from '$lib/resource';

import type {
	Modules
} from '../../models/modules.model';

import type {
	NavigationViewState
} from '../../services/navigation.service';

/**
 * Application-level Resource classification used to select candidate Modules.
 *
 * `resourceType` registrations represent specialized application experiences.
 * Data-type registrations represent generic semantic capabilities and are only
 * considered when no compatible `resourceType` registration exists.
 */
export type ResourceModuleMatch =
	| {
		readonly resourceType: string;
	}
	| {
		readonly dataType: string;
	};

/**
 * Feature-owned declaration that one Module can open a class of Resources.
 *
 * `supports` is intentionally descriptor-aware. It can express additional
 * compatibility rules such as supported `dataVersion` values.
 */
export interface ResourceModuleRegistration<
	TView extends string | number = string | number
> {
	readonly module: Modules;
	readonly view: TView;
	readonly match: ResourceModuleMatch;
	readonly isDefault?: boolean;
	readonly supports?: (
		descriptor: ResourceDescriptor
	) => boolean;
	readonly createState: (
		descriptor: ResourceDescriptor
	) => NavigationViewState;
}

/** Destination chosen for one Resource open request. */
export interface ResourceModuleDestination<
	TView extends string | number = string | number
> {
	readonly module: Modules;
	readonly view: TView;
	readonly state: NavigationViewState;
}

/**
 * Resolves the application's preferred Module for a ResourceDescriptor.
 *
 * Resolution policy:
 *
 * 1. Compatible `resourceType` registrations are considered first because
 *    Resource Type describes application meaning and specialized experience.
 * 2. If none match, compatible data-type registrations are considered as the
 *    generic semantic fallback.
 * 3. One candidate resolves directly. Multiple candidates require exactly one
 *    application default until user Module preferences/chooser support lands.
 *
 * Registration order is never used as implicit precedence.
 */
export class ResourceModuleResolver {
	constructor(
		private readonly registrations:
			readonly ResourceModuleRegistration[]
	) {
		this.assertUniqueDefaults();
	}

	resolve(
		descriptor: ResourceDescriptor
	): ResourceModuleDestination {
		const resourceTypeCandidates =
			this.compatibleRegistrations(
				descriptor,
				'resourceType'
			);

		if (resourceTypeCandidates.length > 0) {
			return this.createDestination(
				descriptor,
				this.selectRegistration(
					descriptor,
					resourceTypeCandidates,
					'resourceType'
				)
			);
		}

		const dataTypeCandidates =
			this.compatibleRegistrations(
				descriptor,
				'dataType'
			);

		if (dataTypeCandidates.length > 0) {
			return this.createDestination(
				descriptor,
				this.selectRegistration(
					descriptor,
					dataTypeCandidates,
					'dataType'
				)
			);
		}

		throw new Error(
			`No Module registered for Resource: ${descriptor.metadata.publisher}/${descriptor.metadata.resourceId}`
		);
	}

	private compatibleRegistrations(
		descriptor: ResourceDescriptor,
		kind: 'resourceType' | 'dataType'
	): readonly ResourceModuleRegistration[] {
		return this.registrations.filter(
			(registration) => {
				if (
					kind === 'resourceType' &&
					'resourceType' in registration.match
				) {
					return (
						registration.match.resourceType ===
							descriptor.metadata.resourceType &&
						this.supports(
							registration,
							descriptor
						)
					);
				}

				if (
					kind === 'dataType' &&
					'dataType' in registration.match
				) {
					return (
						registration.match.dataType ===
							descriptor.metadata.dataType &&
						this.supports(
							registration,
							descriptor
						)
					);
				}

				return false;
			}
		);
	}

	private supports(
		registration: ResourceModuleRegistration,
		descriptor: ResourceDescriptor
	): boolean {
		return (
			registration.supports?.(
				descriptor
			) ?? true
		);
	}

	private selectRegistration(
		descriptor: ResourceDescriptor,
		registrations:
			readonly ResourceModuleRegistration[],
		kind: 'resourceType' | 'dataType'
	): ResourceModuleRegistration {
		if (registrations.length === 1) {
			return registrations[0];
		}

		const defaults =
			registrations.filter(
				(registration) =>
					registration.isDefault === true
			);

		if (defaults.length === 1) {
			return defaults[0];
		}

		const key =
			kind === 'resourceType'
				? descriptor.metadata.resourceType
				: descriptor.metadata.dataType;

		throw new Error(
			`Multiple Modules can open Resource ${kind} without one default: ${key}`
		);
	}

	private createDestination(
		descriptor: ResourceDescriptor,
		registration: ResourceModuleRegistration
	): ResourceModuleDestination {
		return {
			module: registration.module,
			view: registration.view,
			state: registration.createState(
				descriptor
			)
		};
	}

	private assertUniqueDefaults(): void {
		const defaults =
			new Map<string, ResourceModuleRegistration>();

		for (const registration of this.registrations) {
			if (registration.isDefault !== true) {
				continue;
			}

			const key =
				'resourceType' in registration.match
					? `resourceType:${registration.match.resourceType}`
					: `dataType:${registration.match.dataType}`;

			if (defaults.has(key)) {
				throw new Error(
					`Resource Module default already registered: ${key}`
				);
			}

			defaults.set(
				key,
				registration
			);
		}
	}
}
