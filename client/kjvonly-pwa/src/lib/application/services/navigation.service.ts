import type {
	Component
} from 'svelte';

import {
	get,
	writable,
	type Writable
} from 'svelte/store';

export interface NavigationView {
	readonly component:
		Component;

	obj:
		Record<string, unknown>;
}

export class NavigationService {
	readonly views:
		Writable<NavigationView[]> =
			writable([]);

	push(
		view: NavigationView
	): void {
		this.views.set([
			...get(this.views),
			view
		]);
	}

	pop(): void {
		this.views.set(
			get(this.views).slice(
				0,
				-1
			)
		);
	}
}
