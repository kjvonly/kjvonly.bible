<script lang="ts">
	import {
		onDestroy
	} from 'svelte';

	import {
		get
	} from 'svelte/store';

	import type {
		NavigationView
	} from '../../../services/navigation.service';

	import {
		provideNavigationEntryContext
	} from '../navigation-entry-context';
	import type {
		PaneNavigationService
	} from '../../../services/pane-navigation.service';

	let {
		navigationView,
		navigation
	}: {
		navigationView: NavigationView;
		navigation: PaneNavigationService;
	} = $props();

	const pendingWhenActiveSubscriptions =
		new Set<() => void>();

	onDestroy(() => {
		for (
			const unsubscribe
			of pendingWhenActiveSubscriptions
		) {
			unsubscribe();
		}

		pendingWhenActiveSubscriptions.clear();
	});

	function isActive(): boolean {
		const views =
			get(navigation.views);

		return (
			views[views.length - 1]
				?.navigationState ===
				navigationView.navigationState
		);
	}

	provideNavigationEntryContext({
		get navigationState() {
			return navigationView.navigationState;
		},

		isActive,

		onResult(handler) {
			return navigation.onResult(
				navigationView.navigationState,
				handler
			);
		},

		whenActive(handler) {
			if (isActive()) {
				void handler();
				return () => {};
			}

			let unsubscribeStore =
				() => {};
			let detached = false;

			const detach = () => {
				if (detached) {
					return;
				}

				detached = true;
				pendingWhenActiveSubscriptions.delete(
					detach
				);
				unsubscribeStore();
			};

			pendingWhenActiveSubscriptions.add(
				detach
			);

			unsubscribeStore =
				navigation.views.subscribe(
					() => {
						if (!isActive()) {
							return;
						}

						detach();
						void handler();
					}
				);

			return detach;
		},

		updateState(key, value) {
			const navigationState =
				navigationView.navigationState;

			if (key === 'resourceSelections') {
				throw new Error(
					'Resource selections must be updated through updateResourceSelection().'
				);
			}

			if (value === undefined) {
				delete navigationState.state[key];
			} else {
				navigationState.state[key] = value;
			}

			navigation.persist();
		},

		updateResourceSelection(
			resourceType,
			value
		) {
			if (!isActive()) {
				throw new Error(
					'Resource selections can only be updated by the active navigation entry.'
				);
			}

			navigation.updateResourceSelection(
				resourceType,
				value
			);
		}
	});

	let ViewComponent = $derived(
		navigationView.component
	);
</script>

<ViewComponent></ViewComponent>
