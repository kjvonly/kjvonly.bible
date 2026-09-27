import type {
	NavigationComponent
} from '$lib/application/services/navigation.service';

export interface NavigationViewRegistration<
	TView extends string | number = string | number
> {
	readonly view: TView;
	readonly component: NavigationComponent;
}

/**
 * Runtime registry of globally namespaced navigation view components
 * contributed by application Modules during application composition.
 */
export class NavigationViewRegistry {
	private readonly registrations =
		new Map<
			string | number,
			NavigationComponent
		>();

	/**
	 * Registers one globally namespaced view ID. Duplicate IDs fail application
	 * composition so runtime resolution never depends on registration order.
	 */
	register(
		registration: NavigationViewRegistration
	): void {
		if (
			this.registrations.has(
				registration.view
			)
		) {
			throw new Error(
				`Navigation view already registered: ${registration.view}`
			);
		}

		this.registrations.set(
			registration.view,
			registration.component
		);
	}

	/**
	 * Registers a feature-owned group of navigation views through the same
	 * duplicate protection as individual registration.
	 */
	registerAll(
		registrations:
			readonly NavigationViewRegistration[]
	): void {
		for (const registration of registrations) {
			this.register(registration);
		}
	}

	/**
	 * Returns whether a runtime component exists for the stable view ID.
	 * This is a capability check only; feature-specific state is not validated.
	 */
	has(
		view: string | number
	): boolean {
		return this.registrations.has(
			view
		);
	}

	/**
	 * Resolves a registered view ID or fails explicitly for stale/unknown IDs.
	 */
	require(
		view: string | number
	): NavigationComponent {
		const component =
			this.registrations.get(view);

		if (!component) {
			throw new Error(
				`Navigation view not registered: ${view}`
			);
		}

		return component;
	}
}
