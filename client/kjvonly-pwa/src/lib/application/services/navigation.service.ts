import type {
	Component
} from 'svelte';

import {
	get,
	writable,
	type Writable
} from 'svelte/store';

import type {
	Modules
} from '$lib/application/models/modules.model';

import type {
	ResourceSelections
} from '$lib/application/resources/resource-selections';

export type NavigationStateValue =
	| string
	| number
	| boolean
	| null
	| ResourceSelections
	| NavigationStateValue[]
	| {
		[key: string]:
			NavigationStateValue;
	};

/**
 * Serializable state owned by one navigation view.
 *
 * Resource selections live with the view state because only Resource-backed
 * views need them. Other views can persist only the semantic state they need.
 */
export type NavigationViewState = {
	resourceSelections?:
		ResourceSelections;

	[key: string]:
		| NavigationStateValue
		| undefined;
};

/**
 * Serializable description of one entry in the flat navigation stack.
 *
 * `module` identifies the owning Module, `view` identifies the concrete page
 * inside that Module, and `state` contains only JSON-safe semantic state used
 * to rebuild the runtime view after reload.
 */
export interface NavigationState<
	TView extends
		string | number =
		string | number
> {
	readonly module: Modules;
	readonly view: TView;
	readonly state: NavigationViewState;
}

export interface NavigationComponentProps {
	clientHeight: number;
	obj: Record<string, unknown>;
}

export type NavigationComponent =
	Component<NavigationComponentProps>;

export interface NavigationView<
	TObj extends
		Record<string, unknown> =
		Record<string, unknown>
> {
	readonly component:
		NavigationComponent;

	obj: TObj;
}

export class NavigationService {
	readonly views:
		Writable<NavigationView[]> =
			writable([]);

	/**
	 * Reconstructs the runtime stack from already-resolved NavigationViews.
	 *
	 * Feature code owns the mapping from serialized NavigationState values to
	 * runtime component constructors and obj values. Setting the complete stack
	 * at once lets the renderer mount the restored hierarchy in one pass.
	 */
	hydrate(
		views:
			readonly NavigationView[]
	): void {
		this.views.set([
			...views
		]);
	}

	push(
		view: NavigationView
	): void {
		this.views.set([
			...get(this.views),
			view
		]);
	}

	/**
	 * Navigates back one entry while keeping stack mechanics encapsulated from
	 * view components.
	 */
	back(): void {
		const views =
			get(this.views);

		if (views.length <= 1) {
			return;
		}

		this.views.set(
			views.slice(
				0,
				-1
			)
		);
	}
}
