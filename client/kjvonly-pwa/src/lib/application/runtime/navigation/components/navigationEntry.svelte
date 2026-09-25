<script lang="ts">
	import type {
		Component
	} from 'svelte';

	import type {
		NavigationState,
		NavigationView
	} from '../../../services/navigation.service';

	import {
		provideNavigationEntryContext
	} from '../navigation-entry-context';

	let {
		navigationView,
		clientHeight
	}: {
		navigationView: NavigationView;
		clientHeight: number;
	} = $props();

	const navigationState =
		navigationView.obj
			.navigationState;

	if (!isNavigationState(navigationState)) {
		throw new Error(
			'Navigation view is missing NavigationState.'
		);
	}

	provideNavigationEntryContext({
		navigationState
	});

	const ViewComponent =
		navigationView.component as Component<{
			clientHeight: number;
			obj: Record<string, unknown>;
		}>;

	function isNavigationState(
		value: unknown
	): value is NavigationState {
		return (
			typeof value === 'object' &&
			value !== null &&
			'module' in value &&
			'view' in value &&
			'state' in value
		);
	}
</script>

<ViewComponent
	{clientHeight}
	obj={navigationView.obj}
></ViewComponent>
