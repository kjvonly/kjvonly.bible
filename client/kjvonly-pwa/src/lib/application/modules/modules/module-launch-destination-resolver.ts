import type {
	Modules
} from '../../models/modules.model';

import type {
	NavigationViewState
} from '../../services/navigation.service';

/**
 * Composition-time launch policy for one Module.
 *
 * `createState` is a factory rather than a shared object so every launcher
 * selection receives independent semantic navigation state.
 */
export interface ModuleLaunchDestinationRegistration<
	TView extends string | number = string | number
> {
	readonly module: Modules;
	readonly view: TView;
	readonly createState:
		() => NavigationViewState;
}

/**
 * Fresh semantic destination returned to the Modules launcher.
 */
export interface ModuleLaunchDestination<
	TView extends string | number = string | number
> {
	readonly view: TView;
	readonly state: NavigationViewState;
}

/**
 * Resolves the initial navigation destination for a Module selected from the
 * application Modules launcher.
 *
 * Module-specific launch policy is composed once by Application. The launcher
 * only supplies a Module identity and does not need to know Domain view IDs.
 */
export class ModuleLaunchDestinationResolver {
	private readonly registrations =
		new Map<
			Modules,
			ModuleLaunchDestinationRegistration
		>();

	/**
	 * Builds the launcher registry and fails composition on duplicate Module
	 * registrations rather than leaving precedence dependent on array order.
	 */
	constructor(
		registrations:
			readonly ModuleLaunchDestinationRegistration[]
	) {
		for (const registration of registrations) {
			if (
				this.registrations.has(
					registration.module
				)
			) {
				throw new Error(
					`Module launch destination already registered: ${registration.module}`
				);
			}

			this.registrations.set(
				registration.module,
				registration
			);
		}
	}

	/**
	 * Creates a fresh launch destination for one Module.
	 */
	resolve(
		module: Modules
	): ModuleLaunchDestination {
		const registration =
			this.registrations.get(
				module
			);

		if (!registration) {
			throw new Error(
				`Module launch destination not registered: ${module}`
			);
		}

		return {
			view:
				registration.view,
			state:
				registration.createState()
		};
	}
}
