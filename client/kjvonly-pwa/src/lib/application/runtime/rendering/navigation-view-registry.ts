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

	registerAll(
		registrations:
			readonly NavigationViewRegistration[]
	): void {
		for (const registration of registrations) {
			this.register(registration);
		}
	}

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
